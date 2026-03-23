# Phase 4B — Embeddable Widget Package

**Status:** Planning
**Priority:** High
**Depends on:** Phase 4A (COMPLETE)

---

## 1. Overview

Build the embeddable chat widget (`smartbot-widget`) that third-party websites load via `<script>` tag or `<iframe>`. Phase 4A delivered admin widget configuration UI + direct link chat page. Phase 4B makes the embed codes actually functional.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D4 | `smartbot-widget/` package | Vanilla TS + Shadow DOM + Vite IIFE, <60KB gzipped |
| D5 | Widget loader script | `/widget/loader.js` served from backend static |
| D6 | iframe widget page | `/widget/[botId]` standalone HTML page |

### References

- [Phase 4A Plan](./PHASE4A-WIDGET-PLAN.md) — completed foundation
- [Widget Embedding Best Practices](../plans/reports/researcher-widget-embedding-best-practices.md)
- [Widget Open-Source Landscape](../plans/reports/researcher-widget-opensource-landscape.md)
- [Widget Reference Implementations](../plans/reports/researcher-widget-reference-implementations.md)

---

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vanilla TS (no React/Preact) | Saves ~40KB; widget is simple enough |
| CSS Isolation | Shadow DOM (open mode) | Full style isolation on host pages |
| Build | Vite library mode → IIFE | Single file, no module system needed |
| Bundle target | <60KB gzipped | Critical for embed performance |
| Theming | CSS Custom Properties | Penetrate Shadow DOM, runtime-configurable |
| SSE streaming | `fetch()` + `ReadableStream` | POST-based SSE (EventSource is GET-only) |
| Session persistence | `localStorage` | Per-site partitioned, no cookies needed |
| Auth | None (public endpoints) | Bot validated server-side via `@Public()` |
| External styling | `::part()` pseudo-elements | Controlled host-page customization |
| Reference arch | Typebot | Zero deps, Shadow DOM, ~5-10KB |

---

## 3. Project Structure

```
smartbot-widget/
├── src/
│   ├── index.ts                    # Entry point — auto-init from script tag
│   ├── widget.ts                   # Main SmartbotWidget class
│   ├── components/
│   │   ├── bubble-button.ts        # Floating chat bubble trigger
│   │   ├── chat-window.ts          # Chat window container
│   │   ├── chat-header.ts          # Header with bot name + close btn
│   │   ├── message-list.ts         # Scrollable message container
│   │   ├── message-bubble.ts       # Individual message (user/bot)
│   │   ├── typing-indicator.ts     # "Bot is typing..." animation
│   │   ├── suggestion-chips.ts     # Suggested questions row
│   │   └── chat-input.ts           # Text input + send button
│   ├── services/
│   │   ├── api-client.ts           # fetch wrapper for bot config + chat
│   │   ├── sse-parser.ts           # POST-based SSE stream parser
│   │   └── session-store.ts        # localStorage session management
│   ├── styles/
│   │   ├── base.css                # Reset + layout inside Shadow DOM
│   │   ├── theme.css               # CSS custom properties (light/dark)
│   │   └── animations.css          # Slide-in, fade, typing dots
│   └── types.ts                    # Shared interfaces
├── vite.config.ts                  # Library mode → IIFE output
├── tsconfig.json
├── package.json
└── README.md
```

**Total estimated files:** 17 source files
**Estimated LOC:** ~1,200-1,500

---

## 4. API Contract (Existing Backend)

Widget calls 3 existing public endpoints on `genai-platform-api`. No backend changes needed.

### 4.1 GET `/api/v1/chat/:botId/config`

Loads bot config on widget init. No auth.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "My Bot",
    "avatarUrl": "https://...",
    "greetingMessage": "Xin chào! Tôi có thể giúp gì?",
    "suggestedQuestions": ["Câu hỏi 1", "Câu hỏi 2"],
    "widgetConfig": {
      "theme": "light",
      "primaryColor": "#6D28D9",
      "position": "bottom-right",
      "bubbleIcon": null,
      "showPoweredBy": true,
      "customCss": null,
      "headerText": null,
      "displayName": null,
      "logoUrl": null,
      "fontColor": null,
      "backgroundColor": null,
      "userMessageColor": null,
      "botMessageColor": null,
      "fontFamily": null,
      "fontSize": null
    }
  }
}
```

### 4.2 POST `/api/v1/chat/:botId/messages` (SSE)

Send message, receive streaming response. No auth.

**Request:**
```json
{
  "message": "user text",
  "conversationId": "uuid or null",
  "endUserId": "uuid",
  "endUserName": "Anonymous"
}
```

**SSE Events:**
```
event: conversation\ndata: {"conversationId":"uuid"}\n\n
event: delta\ndata: {"content":"chunk text"}\n\n
event: done\ndata: {"conversationId":"uuid","responseTimeMs":1200,"creditsUsed":1}\n\n
event: error\ndata: {"error":"message"}\n\n
```

### 4.3 GET `/api/v1/chat/:botId/conversations/:convId/messages`

Load conversation history for returning users. Header: `x-end-user-id`.

**Response:**
```json
{
  "data": [
    { "id": "uuid", "role": "user", "content": "...", "createdAt": "..." },
    { "id": "uuid", "role": "assistant", "content": "...", "createdAt": "..." }
  ]
}
```

---

## 5. Implementation Phases

### Phase 5.1 — Project Setup & Build Pipeline

**Effort:** ~2 hours
**Files to create:** `smartbot-widget/` scaffolding (package.json, vite.config.ts, tsconfig.json)

**Steps:**

1. Create `smartbot-widget/` directory at monorepo root
2. Initialize `package.json` with:
   - `name`: `smartbot-widget`
   - `devDependencies`: `typescript`, `vite`
   - `scripts`: `dev`, `build`, `preview`
3. Configure `vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite'
   export default defineConfig({
     build: {
       lib: {
         entry: 'src/index.ts',
         name: 'SmartbotWidget',
         formats: ['iife'],
         fileName: () => 'smartbot-widget.iife.js',
       },
       cssCodeSplit: false,      // inline CSS into JS
       minify: 'terser',
       rollupOptions: {
         output: { inlineDynamicImports: true },
       },
     },
   })
   ```
4. Configure `tsconfig.json`: strict mode, ES2020 target, DOM lib
5. Create `src/types.ts` with shared interfaces (mirror `BotWidgetConfig`)
6. Verify build produces single IIFE file

**Success criteria:** `npm run build` outputs `dist/smartbot-widget.iife.js`

---

### Phase 5.2 — Core Widget Shell (Shadow DOM)

**Effort:** ~4 hours
**Files:** `src/index.ts`, `src/widget.ts`, `src/styles/base.css`, `src/styles/theme.css`

**Steps:**

1. **`src/index.ts`** — Entry point:
   - On DOMContentLoaded, find `<script>` tag with `data-bot-id`
   - Extract config from `data-*` attributes
   - Instantiate `SmartbotWidget` class
   - Export `window.SmartbotWidget` for programmatic use
   ```typescript
   document.addEventListener('DOMContentLoaded', () => {
     const script = document.querySelector('script[data-bot-id]')
     if (script) {
       const botId = script.getAttribute('data-bot-id')!
       const apiUrl = script.getAttribute('data-api-url') || ''
       window.SmartbotWidget = new SmartbotWidget({ botId, apiUrl })
     }
   })
   ```

2. **`src/widget.ts`** — Main class:
   - Creates host `<div id="smartbot-widget-root">`
   - Attaches Shadow DOM (open mode)
   - Injects base + theme CSS via Constructable Stylesheets (fallback: `<style>` tag)
   - Renders bubble button by default
   - Toggle open/close state
   - Public API: `open()`, `close()`, `toggle()`, `destroy()`
   - Fetch bot config on init → apply theme variables

3. **`src/styles/base.css`** — Shadow DOM reset:
   - Box-sizing reset, font stack
   - Container layout (fixed position, z-index: 2147483647)
   - Responsive: full-screen on mobile (<768px)

4. **`src/styles/theme.css`** — CSS custom properties:
   - Map all 16 `BotWidgetConfig` fields to CSS vars
   - Light/dark theme presets
   - `::part()` exports for host-page overrides
   ```css
   :host {
     --sb-primary: #6D28D9;
     --sb-bg: #FFFFFF;
     --sb-font-color: #111827;
     --sb-user-msg: #6D28D9;
     --sb-bot-msg: #F3F4F6;
     --sb-font-family: system-ui, sans-serif;
     --sb-font-size: 14px;
   }
   ```

**Success criteria:** Script tag renders floating bubble; clicking toggles empty chat window with Shadow DOM isolation

---

### Phase 5.3 — Chat UI Components

**Effort:** ~6 hours
**Files:** All `src/components/*.ts`

**Steps:**

1. **`bubble-button.ts`** — Floating action button:
   - Position from config (`bottom-right` / `bottom-left`)
   - Custom icon via `bubbleIcon` URL or default chat SVG
   - Pulse animation on first load
   - Click handler → `widget.toggle()`

2. **`chat-window.ts`** — Chat container:
   - Slide-up animation on open
   - Fixed dimensions: 400x600px desktop, full-screen mobile
   - Contains header, message-list, suggestion-chips, chat-input
   - Parts: `::part(chat-window)` for host styling

3. **`chat-header.ts`** — Header bar:
   - Bot avatar + display name (or `headerText`)
   - Close button (X icon)
   - Primary color background
   - Parts: `::part(chat-header)`

4. **`message-list.ts`** — Scrollable message area:
   - Auto-scroll to bottom on new messages
   - Greeting message rendered as first bot message
   - Maintains DOM efficiently (no virtual DOM needed at <100 messages)

5. **`message-bubble.ts`** — Individual message:
   - User messages: right-aligned, `userMessageColor` bg
   - Bot messages: left-aligned, `botMessageColor` bg, with avatar
   - Markdown-lite rendering: bold, italic, code, links (no full markdown parser — too heavy)
   - Streaming: content updates in-place during SSE delta events

6. **`typing-indicator.ts`** — Bot typing animation:
   - Three bouncing dots
   - Shown during SSE streaming before first delta
   - Removed when first delta arrives

7. **`suggestion-chips.ts`** — Suggested questions:
   - Horizontal scrollable row below greeting
   - Click → sends as user message
   - Hidden after first user message sent

8. **`chat-input.ts`** — Input area:
   - Textarea with auto-resize (max 4 lines)
   - Send button (arrow icon, primary color)
   - Enter to send, Shift+Enter for newline
   - Disabled during streaming
   - Parts: `::part(chat-input)`

**Success criteria:** Full chat UI renders with all components; no functionality yet (static)

---

### Phase 5.4 — API Client & SSE Streaming

**Effort:** ~4 hours
**Files:** `src/services/api-client.ts`, `src/services/sse-parser.ts`, `src/services/session-store.ts`

**Steps:**

1. **`api-client.ts`** — HTTP client:
   - `fetchBotConfig(botId)` → `GET /api/v1/chat/:botId/config`
   - `fetchChatHistory(botId, convId, endUserId)` → `GET .../conversations/:convId/messages`
   - `sendMessage(botId, payload)` → returns `ReadableStream` from `POST .../messages`
   - Base URL from `data-api-url` attribute or auto-detect from script `src`
   - Error handling: network errors, non-2xx status, timeout (30s)
   - CORS: requests include `Content-Type: application/json`

2. **`sse-parser.ts`** — POST-based SSE parser:
   - Port logic from `smartbot-web/src/lib/api/chat-api.ts` (lines 84-177)
   - `ReadableStream` → `TextDecoder` → buffer → split `\n\n` → parse events
   - Event types: `conversation`, `delta`, `done`, `error`
   - Callbacks: `onConversation`, `onDelta`, `onDone`, `onError`
   - `AbortController` support for cancellation
   ```typescript
   export function parseSSEStream(
     reader: ReadableStreamDefaultReader<Uint8Array>,
     callbacks: SseCallbacks,
   ): AbortController
   ```

3. **`session-store.ts`** — localStorage persistence:
   - Key format: `smartbot_${botId}_session`
   - Stores: `{ conversationId, endUserId, endUserName, lastActiveAt }`
   - `endUserId` = crypto.randomUUID() on first visit
   - Session expiry: 24h (configurable)
   - `getSession(botId)`, `saveSession(botId, data)`, `clearSession(botId)`
   - Graceful fallback if localStorage unavailable (incognito)

**Success criteria:** Widget fetches config, streams chat responses, persists session across page reloads

---

### Phase 5.5 — Wire Everything Together

**Effort:** ~4 hours
**Files:** Updates to `widget.ts` + all components

**Steps:**

1. **Init flow:**
   - Script loads → create widget → fetch bot config → apply theme → show bubble
   - On open: check session → if returning user, load history → render messages
   - Show greeting + suggestions if new conversation

2. **Send message flow:**
   - User types + sends → add user bubble to list → disable input
   - Show typing indicator → call `sendMessage()` SSE
   - `onConversation` → save conversationId to session
   - `onDelta` → append content to bot bubble (streaming render)
   - `onDone` → finalize message, re-enable input
   - `onError` → show error in chat, re-enable input

3. **Theme application:**
   - On config load, map `widgetConfig` fields → CSS custom properties on `:host`
   - Handle null values (use defaults from `theme.css`)
   - Apply `customCss` if present (inject into Shadow DOM `<style>`)
   - Font size mapping: `small`=13px, `medium`=14px, `large`=16px

4. **Returning user flow:**
   - Check `localStorage` for session with valid `conversationId`
   - If found + not expired: fetch history → render messages → hide suggestions
   - If expired or not found: start fresh conversation

5. **Accessibility:**
   - ARIA labels on all interactive elements
   - Focus management: trap focus in chat window when open
   - Keyboard: Escape to close, Tab navigation
   - Screen reader: live region for new messages

**Success criteria:** End-to-end chat flow works — send message, receive streaming response, session persists

---

### Phase 5.6 — Loader Script & Backend Static Serving

**Effort:** ~3 hours
**Files:** `smartbot-widget/src/loader.ts` (separate entry), backend static file route

**Steps:**

1. **`loader.ts`** — Lightweight loader (<2KB):
   - Purpose: async-load the main widget bundle
   - Reads `data-bot-id` and `data-api-url` from self `<script>` tag
   - Creates `<script>` tag pointing to `smartbot-widget.iife.js`
   - Passes config via `window.__SMARTBOT_CONFIG__`
   - Deferred loading: does not block host page
   ```typescript
   (function() {
     const self = document.currentScript as HTMLScriptElement
     const botId = self.getAttribute('data-bot-id')
     if (!botId) return
     const base = self.src.replace('/loader.js', '')
     const s = document.createElement('script')
     s.src = `${base}/smartbot-widget.iife.js`
     s.defer = true
     window.__SMARTBOT_CONFIG__ = { botId, apiUrl: self.getAttribute('data-api-url') || '' }
     document.head.appendChild(s)
   })()
   ```

2. **Vite config update** — Build loader as separate entry:
   - Two build outputs: `loader.js` (tiny) + `smartbot-widget.iife.js` (main)
   - Or single build with manual chunk splitting

3. **Backend static serving** — NestJS `ServeStaticModule`:
   - Serve `smartbot-widget/dist/` at `/widget/` path
   - Files: `/widget/loader.js`, `/widget/smartbot-widget.iife.js`
   - Add to `genai-platform-api/src/app.module.ts`:
   ```typescript
   ServeStaticModule.forRoot({
     rootPath: join(__dirname, '..', '..', 'smartbot-widget', 'dist'),
     serveRoot: '/widget',
   })
   ```
   - Cache headers: `Cache-Control: public, max-age=31536000, immutable` for hashed files
   - CORS: allow all origins (widget loaded on third-party sites)

4. **Verify embed codes work:**
   - `<script src="http://localhost:3000/widget/loader.js" data-bot-id="BOT_UUID"></script>`
   - Test on a separate HTML page (simulate third-party site)

**Success criteria:** Embed code from bot settings actually loads and renders the widget on external pages

---

### Phase 5.7 — iframe Widget Page

**Effort:** ~2 hours
**Files:** `smartbot-widget/iframe.html` or Next.js `/widget/[botId]` route

**Steps:**

1. **Option A (preferred): Static HTML in widget dist**
   - Create `smartbot-widget/public/iframe.html`:
   ```html
   <!DOCTYPE html>
   <html><head>
     <meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <style>body{margin:0;padding:0;overflow:hidden;height:100vh}</style>
   </head><body>
     <script>
       const botId = new URLSearchParams(location.search).get('botId')
         || location.pathname.split('/').pop()
       window.__SMARTBOT_CONFIG__ = { botId, apiUrl: '', mode: 'iframe' }
     </script>
     <script src="./smartbot-widget.iife.js"></script>
   </body></html>
   ```
   - Served at `/widget/:botId` via backend rewrite rule
   - Widget detects `mode: 'iframe'` → renders chat window directly (no bubble)

2. **Backend route rewrite:**
   - NestJS controller: `GET /widget/:botId` → serve `iframe.html`
   - Pass `botId` via URL path (widget JS reads from `location.pathname`)

3. **iframe mode differences:**
   - No bubble button — chat window fills container
   - No fixed positioning — uses relative/flex layout
   - No slide animations — just visible

**Success criteria:** `<iframe src="http://localhost:3000/widget/BOT_UUID">` renders functional chat

---

### Phase 5.8 — Animations & Polish

**Effort:** ~2 hours
**Files:** `src/styles/animations.css`, component updates

**Steps:**

1. **`animations.css`:**
   - Bubble pulse on load (scale 1.0 → 1.1 → 1.0)
   - Chat window slide-up on open (translateY(100%) → 0)
   - Chat window fade-out on close
   - Message bubble fade-in (opacity 0 → 1)
   - Typing indicator bouncing dots
   - `prefers-reduced-motion` media query — disable all

2. **Visual polish:**
   - Smooth scrolling in message list
   - Input focus ring matching primary color
   - Hover states on bubble, send button, suggestion chips
   - Powered-by footer: "Powered by Smartbot" with link (toggleable via config)
   - Error state: red inline message with retry button

3. **Mobile responsiveness:**
   - `<768px`: chat window = full screen overlay
   - Safe area insets for notched phones
   - Touch-friendly tap targets (min 44px)

**Success criteria:** Widget feels polished, animations are smooth, mobile UX is good

---

### Phase 5.9 — Testing & Bundle Optimization

**Effort:** ~3 hours
**Files:** test files, bundle analysis

**Steps:**

1. **Manual testing checklist:**
   - [ ] Bubble renders on fresh page
   - [ ] Click bubble → chat window opens with animation
   - [ ] Bot config loaded (name, avatar, greeting)
   - [ ] Suggested questions appear and are clickable
   - [ ] Send message → typing indicator → streaming response
   - [ ] Session persists across page reloads
   - [ ] History loads for returning users
   - [ ] Theme applies correctly (light/dark, colors, fonts)
   - [ ] Shadow DOM isolates styles from host page
   - [ ] iframe mode works (no bubble, fills container)
   - [ ] Loader script async-loads widget bundle
   - [ ] Mobile full-screen mode works
   - [ ] Multiple widgets on same page (different bots)
   - [ ] Widget `destroy()` cleans up completely
   - [ ] Error states: network error, bot not found, SSE failure

2. **Cross-browser testing:**
   - Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
   - Mobile: Chrome Android, Safari iOS

3. **Bundle optimization:**
   - Run `npx vite-bundle-visualizer`
   - Target: main bundle <60KB gzipped
   - Verify no unnecessary polyfills
   - Check tree-shaking effectiveness
   - Terser minification with `compress.passes: 2`

4. **Performance:**
   - Lighthouse embed page audit
   - First paint <500ms
   - Time to interactive <1s
   - No layout shift on bubble render

**Success criteria:** All checklist items pass, bundle <60KB gzipped, cross-browser OK

---

## 6. Widget Config → CSS Variable Mapping

| BotWidgetConfig field | CSS Custom Property | Default |
|----------------------|--------------------:|---------|
| `theme` | Toggles light/dark preset | `light` |
| `primaryColor` | `--sb-primary` | `#6D28D9` |
| `fontColor` | `--sb-font-color` | `#111827` |
| `backgroundColor` | `--sb-bg` | `#FFFFFF` |
| `userMessageColor` | `--sb-user-msg` | `#6D28D9` |
| `botMessageColor` | `--sb-bot-msg` | `#F3F4F6` |
| `fontFamily` | `--sb-font-family` | `system-ui` |
| `fontSize` | `--sb-font-size` | `14px` |
| `position` | Sets CSS `right: 20px` (bottom-right) or `left: 20px` (bottom-left) | `bottom-right` |
| `bubbleIcon` | `<img>` in bubble or default SVG | chat icon |
| `showPoweredBy` | `.powered-by { display }` | `true` |
| `customCss` | Injected `<style>` in Shadow DOM | `null` |
| `headerText` | Header text content | Bot name |
| `displayName` | Header display name | Bot name |
| `logoUrl` | Header `<img>` src | Bot avatar |

---

## 7. Embed Code Formats

Generated by `bots.service.ts:getEmbedCode()` (already exists).

### 7.1 Bubble (Script Tag)
```html
<script src="https://platform.vn/widget/loader.js" data-bot-id="BOT_UUID"></script>
```
- Loads async, non-blocking
- Renders floating bubble in bottom corner
- Click to open chat window

### 7.2 iframe
```html
<iframe src="https://platform.vn/widget/BOT_UUID" width="400" height="600" frameborder="0"></iframe>
```
- Embedded inline in page
- Chat window directly visible (no bubble)
- Communicates via `postMessage` for resize events

### 7.3 Direct Link
```
https://frontend.vn/chat/BOT_UUID
```
- Full-page chat experience (Phase 4A — already done)
- Uses Next.js public route

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| XSS in bot config | All user-provided strings escaped before DOM insertion |
| XSS in chat messages | Markdown-lite renderer escapes HTML, only allows safe tags |
| CSS injection via customCss | Scoped to Shadow DOM — cannot affect host page |
| CORS | Backend already allows `*` origin on public chat endpoints |
| Third-party cookie deprecation | Uses `localStorage` (not cookies) for session |
| Referer validation | Backend `getBotConfig` already extracts referer hostname |
| Rate limiting | Recommended: add rate limiting to chat endpoints (backend task) |
| Content-Security-Policy | Loader uses `document.createElement('script')` — CSP `script-src` must allow widget domain |
| Data exfiltration | Widget only communicates with configured API URL |

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bundle exceeds 60KB | Medium | Low | No framework deps; Vite tree-shaking; monitor with bundle analyzer |
| Shadow DOM browser compat | High | Low | Shadow DOM v1 supported in all modern browsers (>97% global) |
| SSE streaming issues on proxies | Medium | Medium | Fallback: if stream fails, retry with polling interval |
| localStorage blocked (iframe) | Medium | Medium | Graceful degradation — widget works without session persistence |
| Host page CSS leaking in | Low | Low | Shadow DOM provides complete isolation |
| Multiple widget instances conflict | Medium | Low | Namespace all globals under `window.SmartbotWidget` |
| CORS preflight failures | High | Low | Backend public endpoints already configured; verify OPTIONS handling |

---

## 10. File Change Summary

### New Files (smartbot-widget/)

| File | Purpose | Est. LOC |
|------|---------|----------|
| `package.json` | Package config | 25 |
| `vite.config.ts` | Build config (IIFE + loader) | 40 |
| `tsconfig.json` | TypeScript config | 20 |
| `src/index.ts` | Auto-init entry point | 30 |
| `src/widget.ts` | Main widget class | 150 |
| `src/types.ts` | Shared interfaces | 60 |
| `src/components/bubble-button.ts` | Floating bubble | 60 |
| `src/components/chat-window.ts` | Chat container | 80 |
| `src/components/chat-header.ts` | Header bar | 50 |
| `src/components/message-list.ts` | Message scroll area | 70 |
| `src/components/message-bubble.ts` | Message rendering | 80 |
| `src/components/typing-indicator.ts` | Typing animation | 30 |
| `src/components/suggestion-chips.ts` | Suggestion buttons | 40 |
| `src/components/chat-input.ts` | Input + send | 70 |
| `src/services/api-client.ts` | HTTP + config fetch | 80 |
| `src/services/sse-parser.ts` | SSE stream parser | 70 |
| `src/services/session-store.ts` | localStorage session | 50 |
| `src/styles/base.css` | Shadow DOM reset | 60 |
| `src/styles/theme.css` | CSS custom properties | 80 |
| `src/styles/animations.css` | Transitions + motion | 50 |
| `src/loader.ts` | Lightweight async loader | 25 |
| `public/iframe.html` | iframe embed page | 20 |
| **Total** | | **~1,340** |

### Modified Files (backend)

| File | Change | Est. LOC |
|------|--------|----------|
| `genai-platform-api/src/app.module.ts` | Add `ServeStaticModule` for `/widget/` | +10 |
| `genai-platform-api/package.json` | Add `@nestjs/serve-static` dep | +1 |

---

## 11. Dependencies

### smartbot-widget/

**devDependencies only (zero runtime deps):**
- `typescript` ^5.x
- `vite` ^6.x
- `terser` (Vite built-in)

### genai-platform-api/

- `@nestjs/serve-static` — serve widget dist as static files

---

## 12. Success Criteria

- [ ] `<script src=".../loader.js" data-bot-id="...">` renders working chat widget on any page
- [ ] `<iframe src=".../widget/BOT_ID">` renders embedded chat (no bubble)
- [ ] Widget loads bot config and applies theme (colors, fonts, position)
- [ ] Full chat flow: send message → SSE streaming → response displayed
- [ ] Session persists: returning users see conversation history
- [ ] Shadow DOM isolates all styles from host page
- [ ] Bundle size: main JS <60KB gzipped
- [ ] Loader script <2KB
- [ ] Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Mobile: full-screen chat on <768px
- [ ] `prefers-reduced-motion` respected
- [ ] No runtime dependencies (zero npm packages in production bundle)

---

## 13. Implementation Order

```
Phase 5.1 (Setup)
  ↓
Phase 5.2 (Shadow DOM Shell)
  ↓
Phase 5.3 (Chat UI Components)
  ↓
Phase 5.4 (API + SSE)
  ↓
Phase 5.5 (Wire Together)
  ↓
Phase 5.6 (Loader + Static Serving)  ←  Phase 5.7 (iframe Page)  [parallel]
  ↓
Phase 5.8 (Polish)
  ↓
Phase 5.9 (Testing + Optimization)
```

**Total estimated effort:** ~30 hours
**Critical path:** 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.9
