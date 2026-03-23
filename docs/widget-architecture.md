# Smartbot Widget Architecture

**Last Updated:** 2026-03-24
**Status:** Phase 02 (Services Layer) COMPLETE

---

## Overview

`smartbot-widget` is a lightweight, embeddable chat widget built in vanilla TypeScript with zero runtime dependencies. It's designed for third-party websites to embed via script tag or iframe, communicating with the backend API to deliver real-time conversational experiences.

**Key characteristics:**
- Shadow DOM isolation (open mode)
- Vite IIFE build (single bundle <60KB gzipped)
- POST-based SSE streaming for real-time responses
- localStorage session persistence (24h expiry)
- CSS custom properties for theming
- Public endpoints (no auth required — bot validated server-side)

---

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│         SmartbotWidget (Main Class)         │
│  • Lifecycle (init, open, close, destroy)   │
│  • Theme application                        │
│  • Chat flow orchestration                  │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴───────┬──────────────┬────────────────┐
        │              │              │                │
    ┌───▼────┐   ┌─────▼──┐   ┌──────▼────┐   ┌──────▼─────┐
    │ API    │   │ SSE    │   │ Session  │   │ UI        │
    │ Client │   │ Parser │   │ Store    │   │ Components│
    └────────┘   └────────┘   └──────────┘   └───────────┘
        │              │              │              │
        │ 3 endpoints  │ Event stream │ localStorage │ Rendering
        │              │ parsing      │ (24h expiry) │
        └──────────────┴──────────────┴──────────────┘
```

---

## Service Layer

### 1. API Client (`src/services/api-client.ts`)

HTTP wrapper for three backend endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `fetchBotConfig(botId)` | `GET /api/v1/chat/:botId/config` | Load bot name, avatar, greeting, suggested questions, widget theme config |
| `sendMessage(botId, payload)` | `POST /api/v1/chat/:botId/messages` | Send user message, receive SSE ReadableStream |
| `fetchHistory(botId, convId, endUserId)` | `GET /api/v1/chat/:botId/conversations/:convId/messages` | Load previous messages for returning users |

**Features:**
- 30s timeout with AbortController
- Auto-detect API base URL from script tag src
- Graceful error handling (network errors, timeouts, non-2xx status)
- `credentials: 'omit'` for third-party embed security

---

### 2. SSE Parser (`src/services/sse-parser.ts`)

POST-based Server-Sent Events parser with stream buffering. Fixed in Session 3 to handle multi-line `data:` fields (when response text contains newlines).

**Event types:**
- `conversation` — conversationId created on backend (sent after message enqueued)
- `delta` — text chunk streamed from LLM (sent during response generation)
- `done` — stream complete, final metadata (responseTimeMs, creditsUsed)
- `error` — error occurred, includes error message

**Parsing:**
- TextDecoder handles partial reads across boundaries
- Normalizes `\r\n` → `\n` (sse-starlette compatibility)
- Concatenates multi-line `data:` fields into single JSON value
- Buffers incomplete events until `\n\n` received
- AbortController support for cancellation

**Example SSE stream:**
```
event: conversation
data: {"conversationId":"uuid-123"}

event: delta
data: {"content":"Hello,"}

event: delta
data: {"content":" this is"}

event: delta
data: {"content":" the response"}

event: done
data: {"responseTimeMs":1200,"creditsUsed":1}
```

---

### 3. Session Store (`src/services/session-store.ts`)

localStorage persistence with 24-hour expiry:

**Stores:**
- `conversationId` — unique conversation (null on first visit)
- `endUserId` — anonymous user ID (crypto.randomUUID())
- `endUserName` — optional display name
- `lastActiveAt` — timestamp for expiry calculation

**Key format:** `smartbot_${botId}_session`

**Behavior:**
- On first visit: generate endUserId, store as new session
- On returning visit: load session if < 24h old, else clear
- Graceful degradation: works without localStorage (incognito, quota exceeded)

---

## Initialization Flow

```
1. Script tag loads widget IIFE
   ↓
2. Constructor detects DOM ready, calls init()
   ↓
3. Create host div + Shadow DOM (open mode)
   ↓
4. Inject base.css (layout reset) + theme.css (CSS vars)
   ↓
5. Render bubble button + chat window (hidden)
   ↓
6. Fetch bot config → apply theme variables
   ↓
7. If returning user: load conversation history
```

**Key state:**
- `botId`, `apiUrl`, `mode` ('bubble' or 'iframe')
- `botConfig` — fetched on init
- `conversationId` — null or restored from session
- `endUserId` — generated or restored
- `isStreaming` — flag during SSE response

---

## Chat Message Flow

```
User types "Hello" + clicks Send
  ↓
addMessage('user', text) → render user bubble
  ↓
disable input + show typing indicator
  ↓
sendMessage(botId, payload) via API client
  ↓ (returns ReadableStream)
parseSSEStream() starts reading chunks
  ↓
onConversation: save conversationId to localStorage
  ↓
Replace typing → create empty bot bubble
  ↓
onDelta: append content chunks to bubble
  ↓
Auto-scroll to bottom on each delta
  ↓
onDone: finalize message, re-enable input
  ↓
onError: show error message, re-enable input
```

---

## Shadow DOM Architecture

**Open mode** (not closed) chosen for:
- Host page can inspect widget (debugging)
- CSS custom properties can penetrate (theming)
- Still provides full style isolation from host CSS

**Adopted stylesheets:**
- `base.css` — layout, positioning, reset
- `theme.css` — CSS custom properties (colors, fonts, spacing)
- Optional custom CSS injection via `widgetConfig.customCss`

**Host elements:**
```
#smartbot-widget-root
  └─ #shadow-root (open)
     ├─ bubble-button (floating action)
     ├─ chat-window (modal, hidden until open)
     │  ├─ chat-header
     │  ├─ message-list (scrollable)
     │  │  ├─ message-bubble (user)
     │  │  ├─ message-bubble (assistant)
     │  │  └─ typing-indicator (while streaming)
     │  ├─ suggestion-chips
     │  └─ chat-input
     └─ style sheets (adopted)
```

---

## Styling System

### CSS Custom Properties

All theme values stored as CSS vars on `:host`:

| Config Field | CSS Property | Default |
|--------------|--------------|---------|
| `primaryColor` | `--sb-primary` | `#6D28D9` |
| `backgroundColor` | `--sb-bg` | `#FFFFFF` |
| `fontColor` | `--sb-font-color` | `#111827` |
| `userMessageColor` | `--sb-user-msg` | `#6D28D9` |
| `botMessageColor` | `--sb-bot-msg` | `#F3F4F6` |
| `fontFamily` | `--sb-font-family` | `system-ui, sans-serif` |
| `fontSize` | `--sb-font-size` | `14px` (or `13px`/`16px` for small/large) |
| `theme` | Class: `.dark-theme` | `light` |
| `position` | CSS: `left` or `right` property | `bottom-right` |

### Custom CSS Injection

If `widgetConfig.customCss` provided:
1. Create `<style>` element in Shadow DOM
2. Set `textContent` to custom CSS
3. Scoped to Shadow DOM (cannot affect host page)

**Security note:** CSS is injected as-is; validate on backend before storing.

### Animations (Phase 4B Session 3)

**slideUp animation:**
```css
@keyframes sb-slide-up {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.sb-chat-window.open {
  animation: sb-slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Applied when chat window opens (bounce easing for playful feel).

**iOS support:**
- Safe-area-inset applied to chat window: `padding-bottom: max(20px, env(safe-area-inset-bottom))`
- Prevents notch/home indicator overlap on mobile Safari

**Other animations:**
- Fade-in: Message bubbles (0.3s ease-in)
- Bounce: Typing indicator dots (1.4s infinite with staggered delays)

---

## API Contract Reference

### Endpoint 1: GET /api/v1/chat/:botId/config

**No auth required.**

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "My Chatbot",
    "avatarUrl": "https://...",
    "greetingMessage": "Xin chào!",
    "suggestedQuestions": ["Question 1", "Question 2"],
    "widgetConfig": {
      "theme": "light",
      "primaryColor": "#6D28D9",
      "backgroundColor": "#FFFFFF",
      "fontColor": "#111827",
      "userMessageColor": "#6D28D9",
      "botMessageColor": "#F3F4F6",
      "fontFamily": "system-ui",
      "fontSize": "medium",
      "position": "bottom-right",
      "bubbleIcon": null,
      "showPoweredBy": true,
      "customCss": null,
      "headerText": null,
      "displayName": null,
      "logoUrl": null
    }
  }
}
```

### Endpoint 2: POST /api/v1/chat/:botId/messages (SSE)

**No auth required.** Bot validated server-side.

**Request:**
```json
{
  "message": "user text",
  "conversationId": "uuid (optional, null for new)",
  "endUserId": "uuid",
  "endUserName": "Anonymous (optional)"
}
```

**Response: Server-Sent Events stream**

See "SSE Parser" section above for event format.

### Endpoint 3: GET /api/v1/chat/:botId/conversations/:convId/messages

**No auth required.** User identified via `x-end-user-id` header.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "role": "user",
      "content": "user message text",
      "createdAt": "2026-03-24T..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "bot response text",
      "createdAt": "2026-03-24T..."
    }
  ]
}
```

**Response (404 Not Found):** Conversation expired or not found (widget gracefully returns empty array).

---

## Component Layer

**UI Components** (static rendering, no state):
- `bubble-button.ts` — floating action button with icon, position control
- `chat-window.ts` — container (visible on open, hidden on close)
- `chat-header.ts` — bot name, avatar, close button
- `message-list.ts` — scrollable message area, auto-scroll to bottom
- `message-bubble.ts` — individual message (user/assistant), markdown-lite rendering
- `typing-indicator.ts` — animated typing dots
- `suggestion-chips.ts` — clickable suggested questions
- `chat-input.ts` — textarea with auto-resize, send button

Components are **not React** — vanilla DOM manipulation with event listeners. Keeps bundle small and widget embeddable.

---

## Embedding Options (Phase 4B Session 3)

### 1. Loader Script (Bubble — Recommended)

The loader script (`/widget/loader.js`) is a minimal <2KB gzipped IIFE that:
- Detects required `data-bot-id` attribute
- Loads main widget bundle from same origin (`/widget/smartbot-widget.iife.js`)
- Initializes widget with bubble mode on document load
- Non-blocking, async, no rendering until user clicks bubble

**Usage:**
```html
<script src="https://api.example.com/widget/loader.js" data-bot-id="BOT_UUID"></script>
```

**Data attributes:**
| Attribute | Example | Purpose |
|-----------|---------|---------|
| `data-bot-id` | `"uuid-123"` | Required — identifies the bot |
| `data-api-url` | `"https://api.example.com"` | Override API base URL (default: loader script origin) |
| `data-position` | `"bottom-left"` | Bubble position (default: `bottom-right`) |
| `data-theme` | `"dark"` | Theme mode (default: inherited from config) |

**Example with options:**
```html
<script
  src="https://api.example.com/widget/loader.js"
  data-bot-id="BOT_UUID"
  data-position="bottom-left"
  data-theme="dark">
</script>
```

**Behavior:**
- Loader script is minimal, cached for 24h at `/widget/loader.js`
- On DOM load: creates new `<script>` tag pointing to main bundle
- Main bundle loaded: `window.SmartbotWidget` class is registered
- Initializes widget with provided data attributes
- User sees floating bubble; chat window opens on click

---

### 2. iframe Embed (Direct)

Embeds the chat window directly inline in a page. Use when you want the chat fully visible without a bubble trigger.

**Usage:**
```html
<iframe
  src="https://api.example.com/widget/BOT_UUID"
  width="400"
  height="600"
  frameborder="0">
</iframe>
```

**Query parameters:**
| Parameter | Example | Purpose |
|-----------|---------|---------|
| `botId` | `"uuid-123"` | Required — identifies the bot |
| `apiUrl` | `"https://api.example.com"` | Optional — override API base URL |
| `theme` | `"dark"` | Optional — light/dark mode |
| `primary-color` | `"#6D28D9"` | Optional — override primary button color |

**Example with custom theme:**
```html
<iframe
  src="https://api.example.com/widget/BOT_UUID?theme=dark&primary-color=%236D28D9"
  width="400"
  height="600"
  frameborder="0">
</iframe>
```

**iframe.html wrapper:**
- Located at `/widget/BOT_UUID` (proxied to `public/iframe.html`)
- Parses URL query parameters
- Loads main widget bundle synchronously (`smartbot-widget.iife.js`)
- Initializes widget in `mode: 'iframe'` (chat window always open)
- Error handling: shows error message if bundle fails to load

**Behavior:**
- Chat window visible immediately (no bubble click required)
- Loads at `/widget/` path served by NestJS backend

---

### 3. Direct Link

Full-page chat experience in a new tab/window:
```
https://frontend.example.com/chat/BOT_UUID
```

Not yet implemented in frontend. Widget can support this mode with `mode: 'fullpage'` parameter.

---

## Embed Code Generation (Backend)

The backend (`/api/v1/bots/:id/embed-code`) generates three ready-to-copy embed codes:

### Bubble (Script Tag)

```html
<script src="https://api.example.com/widget/loader.js" data-bot-id="BOT_UUID"></script>
```

Copy and paste anywhere in `<head>` or end of `<body>`. Non-blocking, renders async.

### iframe

```html
<iframe src="https://api.example.com/widget/BOT_UUID" width="400" height="600" frameborder="0"></iframe>
```

Embeds chat window directly in page layout. Adjust width/height as needed.

### Direct Link

```
https://frontend.example.com/chat/BOT_UUID
```

Share to open chat in a new tab (not yet implemented in frontend).

---

## Backend Widget Serving (Phase 4B Session 3)

### NestJS Configuration

The backend serves widget assets via `ServeStaticModule` at the `/widget/` path:

```typescript
// genai-platform-api/src/app.module.ts
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'smartbot-widget', 'dist'),
  serveRoot: '/widget',
  serveStaticOptions: {
    maxAge: 86400000, // 24h cache
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  },
}),
```

### Served Files

| File | Path | Size (gzipped) | Purpose |
|------|------|---|---------|
| Main widget | `/widget/smartbot-widget.iife.js` | ~7.37KB | Standalone IIFE bundle, loads bubble mode |
| Loader script | `/widget/loader.js` | ~0.46KB | Tiny IIFE for loading main bundle async |
| iframe wrapper | `/widget/{botId}` | HTML | Proxied to `public/iframe.html`, initializes in iframe mode |

### Cache Headers

- **Max-Age:** 86400000ms (24 hours)
- **X-Content-Type-Options:** `nosniff` (prevents MIME-sniffing attacks)
- Prevents cross-origin iframe access via `X-Frame-Options: SAMEORIGIN` (optional, add if needed)

### Build Output

```bash
npm run build
# Generates:
# dist/smartbot-widget.iife.js     (7.37KB gzip)
# dist/smartbot-widget-loader.iife.js  (0.46KB gzip)
# dist/iframe.html                 (static, served directly)
```

---

## Performance Considerations

- **Bundle size:** Main widget 7.37KB gzipped, loader 0.46KB gzipped (total <8KB)
- **Load time:** Loader script <10ms, main bundle 1-2s over 3G
- **Rendering:** No virtual DOM, direct DOM manipulation
- **Scroll:** Ref-based auto-scroll (no state re-renders)
- **Streaming:** Chunks appended in-place, no full message re-render
- **Session:** Single localStorage read/write per visit
- **Caching:** 24h browser cache on loader + main bundle

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Config fetch fails | Log error, show empty chat window (no greeting) |
| History fetch fails | Log error, start fresh conversation (don't block open) |
| Message send timeout (30s) | Show error message "Request timeout", enable input |
| SSE stream broken | Show error, enable input for retry |
| localStorage unavailable | Widget works without session persistence (incognito) |
| JSON parse error in SSE | Log error event, continue parsing next event |

---

## Security Boundaries

| Threat | Mitigation |
|--------|-----------|
| XSS via bot config | All user strings escaped before DOM insertion |
| XSS via chat messages | Markdown-lite renderer escapes HTML, whitelist safe tags |
| CSS injection via customCss | Scoped to Shadow DOM, cannot affect host page |
| CSRF | Public endpoints, no state-changing GET calls |
| Third-party cookie abuse | `credentials: 'omit'` on all fetch calls |
| Referer validation | Backend extracts referer hostname (not in widget) |

---

## Development Guide

### File Structure

```
src/
├── widget.ts                       # Main class, orchestration
├── types.ts                        # Shared interfaces
├── index.ts                        # Auto-init entry point
├── components/                     # UI rendering
│   ├── bubble-button.ts
│   ├── chat-window.ts
│   ├── chat-header.ts
│   ├── message-list.ts
│   ├── message-bubble.ts
│   ├── typing-indicator.ts
│   ├── suggestion-chips.ts
│   └── chat-input.ts
├── services/                       # Business logic
│   ├── api-client.ts               # HTTP wrapper
│   ├── sse-parser.ts               # SSE stream parsing
│   └── session-store.ts            # localStorage persistence
└── styles/
    ├── base.css                    # Reset, layout
    ├── theme.css                   # CSS custom properties
    └── animations.css              # Transitions, motion
```

### Key Classes

**SmartbotWidget** — Main class
- Constructor: `new SmartbotWidget({ botId, apiUrl?, mode? })`
- Public API: `open()`, `close()`, `toggle()`, `destroy()`
- Private: `fetchBotConfig()`, `loadHistory()`, `handleSendMessage()`

**ApiClient** — HTTP layer
- `fetchBotConfig(botId): Promise<BotConfig>`
- `sendMessage(botId, payload): Promise<ReadableStream>`
- `fetchHistory(botId, convId, endUserId): Promise<Message[]>`

**SseParser** — Stream parsing
- `parse(stream, callbacks): Promise<void>`
- `abort(): void`
- Callbacks: `onConversation`, `onDelta`, `onDone`, `onError`

**SessionStore** — localStorage
- `getSession(): SessionData | null`
- `save(data): void`
- `clear(): void`
- Static: `generateEndUserId(): string`

---

## Phase 4B Completion Summary

**Session 3 delivered:**
- Loader script (`loader.js`, 0.46KB gzip) — async IIFE with data attribute support
- iframe wrapper (`public/iframe.html`) — static HTML with query param parsing
- Animations — slideUp keyframe, iOS safe-area support
- Backend static serving — NestJS ServeStaticModule at `/widget/` with 24h cache
- Dual build — `npm run build` outputs both main bundle and loader
- SSE parser fix — multi-line data field concatenation

**Widget is production-ready for embedding.** Remaining work: frontend analytics page integration, production deployment, monitoring.
