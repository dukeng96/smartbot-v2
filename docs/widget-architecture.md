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

POST-based Server-Sent Events parser with stream buffering:

**Event types:**
- `conversation` — conversationId created on backend (sent after message enqueued)
- `delta` — text chunk streamed from LLM (sent during response generation)
- `done` — stream complete, final metadata (responseTimeMs, creditsUsed)
- `error` — error occurred, includes error message

**Parsing:**
- TextDecoder handles partial reads across boundaries
- Normalizes `\r\n` → `\n` (sse-starlette compatibility)
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

## Embedding Options

### 1. Bubble Script Tag (Recommended)

```html
<script src="https://api.example.com/widget/loader.js" data-bot-id="BOT_UUID"></script>
```

**Renders:** Floating bubble in bottom corner, click to open chat window.

**Benefits:** Non-blocking, async-loaded, doesn't affect host page.

### 2. Direct iframe

```html
<iframe src="https://api.example.com/widget/BOT_UUID" width="400" height="600"></iframe>
```

**Renders:** Chat window directly visible (no bubble, no position toggle).

**Benefits:** Embeds inline in page layout.

### 3. Direct Link

```
https://frontend.example.com/chat/BOT_UUID
```

**Renders:** Full-page chat experience in new tab/window.

**Benefits:** Standalone chat, no embedding needed.

---

## Performance Considerations

- **Bundle size:** <60KB gzipped (no framework deps)
- **Load time:** Loader script 2KB, main bundle on-demand
- **Rendering:** No virtual DOM, direct DOM manipulation, memo-ized message list
- **Scroll:** Ref-based position (not state), prevents unnecessary re-renders
- **Streaming:** Chunks appended in-place (no full message re-render)
- **Session:** Single localStorage read/write per visit

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

## Next Steps

Phase 04B (Loader + iframe serving):
- Build loader.ts as separate IIFE entry
- Serve widget dist from backend `/widget/` path
- Implement iframe.html wrapper page
- Test embed codes on external sites

See `PHASE4B-WIDGET-PLAN.md` sections 5.6–5.7 for detailed plan.
