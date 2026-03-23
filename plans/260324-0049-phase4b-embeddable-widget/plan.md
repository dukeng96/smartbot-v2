---
title: "Phase 4B — Embeddable Widget Package"
description: "3-session implementation plan: scaffold widget, wire SSE streaming, deploy with loader"
status: complete
priority: P1
effort: "30h (3 sessions × 10h)"
progress: "100% (3 of 3 sessions complete)"
branch: kai/feat/phase4b-embeddable-widget
tags: [widget, embeddable, vanilla-ts, shadow-dom, vite]
created: 2026-03-24
last_updated: 2026-03-24
completed_at: 2026-03-24
---

# Phase 4B — Embeddable Widget Package — Complete Implementation Plan

**Source:** `/docs/PHASE4B-WIDGET-PLAN.md`
**Depends on:** Phase 4A (COMPLETE)
**Effort:** ~30 hours across 3 sessions

---

## Overview

Implement the embeddable chat widget (`smartbot-widget`) that loads on third-party websites via `<script>` tag (with floating bubble) or `<iframe>` tag (inline chat). Builds on Phase 4A's widget config UI and direct-link chat page.

### Key Deliverables

| # | Deliverable | Description |
|---|---|---|
| D4 | `smartbot-widget/` package | Vanilla TS + Shadow DOM, Vite IIFE, <60KB gzipped |
| D5 | Widget loader script | `/widget/loader.js` async-loads main bundle |
| D6 | iframe widget page | `/widget/[botId]` standalone HTML, no bubble |

### Architecture Highlights

- **Framework:** Vanilla TypeScript (no React/Preact) — saves ~40KB
- **CSS Isolation:** Shadow DOM (open mode) — complete style encapsulation
- **Build:** Vite library mode → IIFE (single file)
- **Bundle target:** <60KB gzipped
- **Session persistence:** `localStorage` (not cookies)
- **SSE streaming:** POST-based with `fetch()` + `ReadableStream`
- **Auth:** None (public endpoints, server-side bot validation)
- **Dependencies:** Zero runtime npm packages

---

## Implementation Sessions

### Session 1: Scaffold & Shell (10h) ✓ COMPLETE
**Phases 5.1–5.3**

**Goal:** Project scaffolding, Shadow DOM infrastructure, 8 static UI components.

**Files created:** 17
- Project config: `package.json`, `vite.config.ts`, `tsconfig.json`
- Core: `src/index.ts`, `src/widget.ts`, `src/types.ts`
- Styles: `src/styles/base.css`, `src/styles/theme.css`
- Components: 8 files in `src/components/`

**Exit criteria:** ✓ All met
- `npm run build` produces `dist/smartbot-widget.iife.js`
- Script tag renders floating bubble in bottom-right corner
- Click bubble toggles chat window with all UI (static, no functionality)
- Shadow DOM isolation verified

---

### Session 2: API & SSE Wiring (10h) ✓ COMPLETE
**Phases 5.4–5.5**

**Goal:** API client, SSE streaming, session persistence, end-to-end chat flow.

**Files created:** 3
- `src/services/api-client.ts` — HTTP wrapper for bot config + chat (80 LOC)
- `src/services/sse-parser.ts` — POST-based SSE parser with event callbacks (70 LOC)
- `src/services/session-store.ts` — `localStorage` session management (50 LOC)

**Files modified:** All components + `src/widget.ts`

**Exit criteria:** ✓ All met
- Widget fetches bot config and applies theme (colors, fonts, position)
- Full chat flow: send message → SSE streaming → response appended
- Session persists across page reloads
- Returning users see conversation history
- Error states handled gracefully
- Bundle size: 25.27 KB raw / 7.27 KB gzipped

---

### Session 3: Deployment & Polish (10h) ✓ COMPLETE
**Phases 5.6–5.9**

**Goal:** Loader script, backend static serving, iframe page, animations, testing.

**Files created:** 2
- `src/loader.ts` — Tiny async loader (0.46KB gzipped)
- `public/iframe.html` — iframe embed page (2.3KB)

**Files modified:**
- `vite.config.ts` — Added loader as separate entry via --mode
- `genai-platform-api/src/app.module.ts` — Added `ServeStaticModule` at /widget/
- All component styles — Added slideUp animation + iOS safe-area

**Exit criteria:** ✓ All met
- `<script src="http://localhost:3000/widget/loader.js" data-bot-id="...">` works on external page
- `<iframe src="http://localhost:3000/widget/BOT_ID">` renders chat (no bubble)
- Bundle 7.37KB gzipped (widget), 0.46KB gzipped (loader)
- Mobile full-screen layout works
- `prefers-reduced-motion` respected
- All manual testing items pass

---

## Key Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Vanilla TS | No ~40KB React overhead; widget logic is simple |
| CSS Isolation | Shadow DOM (open) | Full style encapsulation; avoid ::slotted() complexity |
| Build | Vite IIFE | Single-file deployment; no module system on host page |
| Bundle target | <60KB gzip | Critical for third-party embed performance |
| Theme system | CSS Custom Properties | Runtime-configurable; penetrate Shadow DOM |
| SSE streaming | POST + fetch | EventSource is GET-only; ReadableStream is modern |
| Sessions | localStorage | Partitioned by origin; no 3rd-party cookie issues |
| Reference | Typebot | Battle-tested zero-deps widget (~5–10KB) |

---

## API Contract (No Backend Changes Needed)

Widget calls 3 existing public endpoints from `genai-platform-api`:

### 1. `GET /api/v1/chat/:botId/config`
Load bot config (name, avatar, greeting, suggested questions, widget theme).

**Response:** `{ data: { id, name, avatarUrl, greetingMessage, suggestedQuestions, widgetConfig } }`

### 2. `POST /api/v1/chat/:botId/messages` (SSE)
Send message, receive streaming response.

**Request:** `{ message, conversationId, endUserId, endUserName }`

**SSE Events:**
```
event: conversation\ndata: {"conversationId":"uuid"}\n\n
event: delta\ndata: {"content":"chunk text"}\n\n
event: done\ndata: {...}\n\n
event: error\ndata: {"error":"message"}\n\n
```

### 3. `GET /api/v1/chat/:botId/conversations/:convId/messages`
Load conversation history for returning users (header: `x-end-user-id`).

---

## File Structure & LOC Budget

### smartbot-widget/ (new package)

| Path | Purpose | Est. LOC |
|---|---|---|
| `package.json` | Package config | 25 |
| `vite.config.ts` | Build config (IIFE + loader) | 40 |
| `tsconfig.json` | TypeScript strict | 20 |
| `src/index.ts` | Auto-init entry | 30 |
| `src/widget.ts` | Main widget class | 150 |
| `src/types.ts` | Shared interfaces | 60 |
| `src/components/bubble-button.ts` | Floating action button | 60 |
| `src/components/chat-window.ts` | Chat container | 80 |
| `src/components/chat-header.ts` | Header bar | 50 |
| `src/components/message-list.ts` | Message scroll area | 70 |
| `src/components/message-bubble.ts` | Message renderer | 80 |
| `src/components/typing-indicator.ts` | Typing animation | 30 |
| `src/components/suggestion-chips.ts` | Suggestion buttons | 40 |
| `src/components/chat-input.ts` | Input + send button | 70 |
| `src/services/api-client.ts` | HTTP wrapper | 80 |
| `src/services/sse-parser.ts` | SSE stream parser | 70 |
| `src/services/session-store.ts` | localStorage session | 50 |
| `src/styles/base.css` | Shadow DOM reset | 60 |
| `src/styles/theme.css` | CSS custom properties | 80 |
| `src/styles/animations.css` | Transitions + motion | 50 |
| `src/loader.ts` | Lightweight async loader | 25 |
| `public/iframe.html` | iframe embed page | 20 |
| **Total** | | **~1,340** |

### Backend (modifications)

| File | Change | LOC |
|---|---|---|
| `genai-platform-api/src/app.module.ts` | Add `ServeStaticModule` | +10 |
| `genai-platform-api/package.json` | Add `@nestjs/serve-static` | +1 |

---

## Detailed Phase Links

- **[Session 1: Scaffold & Shell](./phase-01-scaffold-shell-components.md)** — Project setup + Shadow DOM + 8 components
- **[Session 2: API & SSE Wiring](./phase-02-api-sse-wiring.md)** — API client + streaming + session persistence
- **[Session 3: Loader & Deployment](./phase-03-loader-iframe-polish.md)** — Loader script + backend serving + animations + testing

---

## Success Criteria (All Sessions)

- [x] `<script src="...loader.js" data-bot-id="BOT_UUID">` renders working widget on any page
- [x] `<iframe src=".../widget/BOT_UUID">` renders embedded chat (no bubble)
- [x] Widget fetches bot config and applies theme
- [x] Full chat flow: send → SSE streaming → response displayed
- [x] Session persists: returning users see conversation history
- [x] Shadow DOM isolates styles from host page
- [x] Bundle <60KB gzipped (actual: 7.37KB), loader <2KB (actual: 0.46KB)
- [x] Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [x] Mobile: full-screen on <768px
- [x] `prefers-reduced-motion` respected
- [x] Zero runtime dependencies

---

## Key Lessons from Phase 4A

1. **SSE \r\n normalization:** sse-starlette sends `\r\n` between events; must normalize to `\n` before splitting
2. **Widget config → CSS vars:** Map all 16 `BotWidgetConfig` fields to CSS custom properties
3. **Markdown-lite renderer:** Regex-based (bold, italic, code, links) — ~30 lines, no full parser
4. **Session persistence:** `localStorage` key format: `smartbot_${botId}_session`
5. **Error boundaries:** Every API call can fail (network, bot not found, SSE timeout)

---

## Dependencies

### smartbot-widget/
**devDependencies only (zero runtime):**
- `typescript` ^5.x
- `vite` ^6.x
- `terser` (built-in)

### genai-platform-api/
**Add:**
- `@nestjs/serve-static` — serve widget dist at `/widget/`

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Bundle exceeds 60KB | Medium | Low | No framework; Vite tree-shaking; bundle analyzer |
| Shadow DOM browser compat | High | Low | V1 supported in all modern browsers (>97%) |
| SSE streaming on proxies | Medium | Medium | Fallback to polling if stream fails |
| localStorage blocked | Medium | Medium | Graceful degradation — widget works without persistence |
| Multiple instances conflict | Medium | Low | Namespace all globals under `window.SmartbotWidget` |
| CORS failures | High | Low | Backend public endpoints already configured |

---

## Session Timeline

```
Session 1 (10h): Scaffold → Shell → Components
    ↓
Session 2 (10h): API → SSE → Session → Wire
    ↓
Session 3 (10h): Loader → Static serving → iframe → Polish → Test
    ↓
COMPLETE
```

**Total:** ~30 hours
**Estimated calendar:** 3 working days (if full-time) or 1–2 weeks (if part-time)

