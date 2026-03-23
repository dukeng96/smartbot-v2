# Phase 4: Widget & Embedding System

**Created:** 2026-03-22
**Status:** Planning
**Reference:** Figma screen spec (C4, C5, I1), research reports
**Research:** 3 reports in `plans/reports/researcher-widget-*.md`

---

## 1. Context & Gap Analysis

### What Exists Today

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| C4 Widget Styling form | ~60% | `components/features/bots/bot-widget-config.tsx` | Has: theme, primaryColor, position, headerText, showPoweredBy, customCss. **New fields needed:** displayName, logo upload, fontColor, backgroundColor, receivedMessageColor, fontFamily, fontSize |
| C4 Widget Preview | ~50% | `components/features/bots/bot-widget-preview.tsx` | Static React mock (320px). Doesn't reflect new styling fields |
| C5 Embed Codes | ~90% | `components/features/bots/bot-embed-code-section.tsx` | 3 cards (bubble/iframe/directLink) + copy. Minor polish needed |
| Direct Link page | 0% | Does not exist | No public `/chat/[botId]` route |
| Widget package | 0% | `smartbot-widget/` does not exist | No actual embeddable script |
| Backend embed generation | 100% | `bots.service.ts:getEmbedCode()` | Generates all 3 embed codes. Uses `APP_URL` env |
| Backend widget config | 100% | Prisma `widgetConfig Json @default("{}")` | Flexible JSON — no migration needed for new fields |
| Types & schemas | ~60% | `lib/types/bot.ts`, `lib/validations/bot-schemas.ts` | Need expansion for new styling fields |
| API module | 100% | `lib/api/bots-api.ts` | `updateWidget()` and `getEmbedCode()` ready |

### Target Design Specification

**Target 1 — Embed Codes page:**
- 3 cards: Script Tag, Iframe, Share Link
- Each card: title + description + code block + Copy button
- Current C5 already matches this layout ~90%

**Target 2 — Styling page:**
- Left column: form with Display Name, Logo upload, Primary Color (hex + picker), Font Color, Background Color, Received Message Color, Chat Icon, Font Family dropdown, Font Size dropdown
- Right column: "Appearance Preview" — live widget mockup showing header, greeting message, chat bubbles, input field, powered-by
- This is the main gap — current form is missing several fields

**Target 3 — Direct Link page:**
- Full-page standalone chat UI
- Header bar with bot name + icon, colored with primaryColor
- Greeting message from bot
- Chat bubbles (bot left, user right)
- Input field with send button
- "Powered by" footer
- Responsive, works standalone

---

## 2. Architecture Decisions

### Decision 1: Direct Link = Next.js Public Route (not widget package)

Build `/chat/[botId]` as a Next.js public route in `smartbot-web`. Rationale:
- Simplest path to delivering target widget features
- Reuses existing API client, SSE infrastructure, auth-free `(public)` layout
- Backend already generates `directLink: ${appUrl}/chat/${botId}`
- No new project setup, build pipeline, or deployment needed
- CLAUDE.md says "smartbot-widget is independent from smartbot-web" — this applies to the embeddable bubble script, not the direct link page

### Decision 2: Widget Package = Future Phase 4B

The actual embeddable `smartbot-widget.iife.js` (for bubble `<script>` tag and `<iframe>` embed) is deferred to Phase 4B. Rationale:
- Target design shows admin UI + direct link, not the embedded-on-third-party-site experience
- Priority is delivering functional admin UI + direct link chat page
- Phase 4B is a standalone project (Vanilla TS + Shadow DOM + Vite IIFE) per research
- Phase 4A delivers all visible deliverables; Phase 4B makes embed codes functional

### Decision 3: Prisma widgetConfig — No Migration

`widgetConfig` is `Json @default("{}")`. New fields (fontColor, backgroundColor, etc.) are stored as JSON properties. Backend PATCH merges: `{ ...currentConfig, ...dto }`. No schema migration needed. Just update:
- TypeScript types (`BotWidgetConfig` interface)
- Zod validation schema (`updateWidgetSchema`)
- Backend DTO (optional — backend accepts `Record<string, any>` via JSON field)

### Decision 4: Chat SSE via Existing Backend Proxy

Direct link page uses existing `POST /api/v1/chat/:botId/messages` SSE endpoint. No new API needed. End-user identified via localStorage `endUserId` (UUID generated on first visit).

---

## 3. Deliverables

### Phase 4A — Widget Enhancement (This Plan)

| # | Deliverable | Screens |
|---|-------------|---------|
| D1 | Enhanced Styling Page | C4 — form with full styling options + live preview |
| D2 | Polished Embed Codes Page | C5 — minor refinements |
| D3 | Direct Link Chat Page | `/chat/[botId]` — functional full-page chat |

### Phase 4B — Embeddable Widget Package (Future)

| # | Deliverable | Notes |
|---|-------------|-------|
| D4 | `smartbot-widget/` package | Vanilla TS + Shadow DOM + Vite IIFE, <60KB |
| D5 | Widget loader script | `widget/loader.js` served from backend/CDN |
| D6 | iframe widget page | `/widget/[botId]` route or standalone HTML |

---

## 4. Task Breakdown

### Session 1: Admin UI Enhancement (C4 + C5) — COMPLETE

**Goal:** Build complete widget styling and embed code admin UI.
**Status:** ✓ COMPLETED 2026-03-23
**Scope:** 5 files modified, ~400 lines changed/added.

**Deliverables Completed:**
- [x] BotWidgetConfig type expanded with 8 new fields (displayName, logoUrl, fontColor, backgroundColor, userMessageColor, botMessageColor, fontFamily, fontSize)
- [x] bot-widget-config.tsx enhanced: added Branding, Colors, Typography form sections
- [x] bot-widget-preview.tsx updated: reflects all new styling fields in real-time
- [x] bot-embed-code-section.tsx: language labels added to code blocks (HTML/URL)
- [x] Build passes with no compilation errors
- [x] Code review: 8.5/10 quality score

**Files Updated:**
1. `src/lib/types/bot.ts` — BotWidgetConfig interface expansion
2. `src/lib/validations/bot-schemas.ts` — updateWidgetSchema update
3. `src/components/features/bots/bot-widget-config.tsx` — enhanced form UI
4. `src/components/features/bots/bot-widget-preview.tsx` — live preview updates
5. `src/components/features/bots/bot-embed-code-section.tsx` — code block improvements

#### Task 1.1 — Expand TypeScript Types [Sequential — Foundation] ✓ DONE

**File:** `smartbot-web/src/lib/types/bot.ts`

Add to `BotWidgetConfig`:
```typescript
interface BotWidgetConfig {
  // existing
  theme: "light" | "dark"
  primaryColor: string
  position: "bottom-right" | "bottom-left"
  bubbleIcon: string | null
  showPoweredBy: boolean
  customCss: string | null
  headerText: string | null
  // NEW — widget styling fields
  displayName: string | null        // bot display name in widget header
  logoUrl: string | null            // logo image URL (replaces avatar circle)
  fontColor: string | null          // message text color
  backgroundColor: string | null   // chat window background
  userMessageColor: string | null   // user bubble color (was primaryColor only)
  botMessageColor: string | null    // bot/received message bubble color
  fontFamily: string | null         // "Inter" | "Roboto" | "Open Sans" | etc.
  fontSize: "small" | "medium" | "large" | null
}
```

#### Task 1.2 — Expand Zod Schema [Sequential — After 1.1] ✓ DONE

**File:** `smartbot-web/src/lib/validations/bot-schemas.ts`

Added matching fields to `updateWidgetSchema`. All new fields `.nullable().optional()`.

#### Task 1.3 — Enhance Widget Config Form [Sequential — After 1.2] ✓ DONE

**File:** `smartbot-web/src/components/features/bots/bot-widget-config.tsx`

Add form sections:
1. Display Name (Input) — already have `headerText`, rename label or add separate field
2. Logo Upload (file input + preview thumbnail) — upload to backend, store URL
3. Primary Color (keep existing preset circles + hex input)
4. Font Color (hex input + color swatch)
5. Background Color (hex input + color swatch)
6. Received Message Color (hex input + color swatch)
7. Chat Icon (keep existing `bubbleIcon` field, improve UI)
8. Font Family (Select dropdown: Inter, Roboto, Open Sans, System Default)
9. Font Size (Select dropdown: Small 12px, Medium 14px, Large 16px)
10. Theme toggle (keep existing light/dark)
11. Position (keep existing)
12. Show Powered By (keep existing)
13. Custom CSS (keep existing, move to collapsible "Advanced" section)

**Note:** If file exceeds 200 lines, extract color picker and font picker into shared subcomponents.

#### Task 1.4 — Enhance Widget Preview [Parallel with 1.3] ✓ DONE

**File:** `smartbot-web/src/components/features/bots/bot-widget-preview.tsx`

Updated preview to reflect ALL new config fields:
- `displayName` → header text
- `logoUrl` → logo in header (replace colored circle)
- `fontColor` → message text color
- `backgroundColor` → chat area bg
- `userMessageColor` → user bubble (currently uses primaryColor)
- `botMessageColor` → bot bubble (currently hardcoded #F3F4F6)
- `fontFamily` → applied to all text
- `fontSize` → applied to messages

Preview improvements completed:
- Added suggested questions chips below greeting
- Added timestamp under messages
- Better mobile preview proportions

#### Task 1.5 — Polish Embed Codes Section [Parallel with 1.3] ✓ DONE

**File:** `smartbot-web/src/components/features/bots/bot-embed-code-section.tsx`

Completed polish:
- Improved card styling (icon placement, description text)
- Added "Open in new tab" action for Direct Link card
- Ensured code blocks show correct URLs with actual bot ID
- Added language labels to code blocks (HTML/URL formats)

#### Task 1.6 — Compile Check + Review ✓ DONE

- Ran `npm run build` in `smartbot-web/` — build passes with zero errors
- Fixed all TypeScript errors from new fields
- Visual review of C4 and C5 pages — complete
- Code review quality score: 8.5/10

---

### Session 2: Direct Link Chat Page — COMPLETE

**Goal:** Build functional `/chat/[botId]` page as a standalone public chat UI.
**Status:** ✓ COMPLETED 2026-03-23
**Scope:** 10 files created, 1 file modified, ~550 lines.

#### Task 2.1 — Create Public Route [Sequential — Foundation] ✓ DONE

**Files created:**
- `smartbot-web/src/app/(chat)/chat/[botId]/page.tsx` — main page (uses ChatContainer)
- `smartbot-web/src/app/(chat)/chat/[botId]/layout.tsx` — minimal layout (h-dvh, no sidebar)
- **Note:** Used `(chat)` route group instead of `(public)` to avoid PublicLayout auth card wrapper

Page behavior:
1. Fetch bot public config: `GET /api/v1/chat/:botId/config` (no auth required)
2. Apply `widgetConfig` styling to full page
3. Render chat UI

#### Task 2.2 — Chat UI Components [Sequential — After 2.1] ✓ DONE

**Files created in `smartbot-web/src/components/features/chat/`:**

- `chat-container.tsx` — Orchestrator: config loading, greeting, message list, input
- `chat-header.tsx` — Colored header bar with bot name + logo + online indicator
- `chat-message-list.tsx` — Scrollable message list with auto-scroll via ref
- `chat-message-bubble.tsx` — Individual message (bot left, user right), styled per widgetConfig
- `chat-input.tsx` — Auto-resize textarea + send button, Enter to send
- `chat-suggested-questions.tsx` — Clickable pill chips from bot config
- **Note:** "Powered by" footer integrated into chat-container (not separate file — YAGNI)

**Layout structure:**
```
┌─────────────────────────────┐
│ Header (primaryColor bg)    │ ← bot name + logo
├─────────────────────────────┤
│                             │
│ Messages (scrollable)       │ ← greeting + conversation
│   [suggested questions]     │
│                             │
├─────────────────────────────┤
│ "Powered by Smartbot"       │ ← conditional
├─────────────────────────────┤
│ Input + Send                │ ← sticky bottom
└─────────────────────────────┘
```

Full height viewport (`h-dvh`), no scrollbar on body.

#### Task 2.3 — SSE Streaming Integration [Sequential — After 2.2]

**File:** `smartbot-web/src/lib/hooks/use-chat-stream.ts`

Custom hook for chat SSE:
```typescript
function useChatStream(botId: string) {
  // POST /api/v1/chat/:botId/messages with ReadableStream
  // Accumulate chunks into full message
  // Return: messages[], sendMessage(), isStreaming, error
}
```

Uses `fetch()` + `ReadableStream` (not EventSource — POST-based SSE).
Conversation persistence via `localStorage` key: `smartbot-chat-${botId}`.

#### Task 2.4 — Session Persistence [Parallel with 2.3]

- Generate `endUserId` (UUID) on first visit, store in localStorage
- Store `conversationId` per bot in localStorage
- On page load: if existing conversationId, fetch history via `GET /api/v1/chat/:botId/conversations/:convId`
- On new conversation: let backend create new conversation on first message

#### Task 2.5 — Responsive Styling + Compile Check

- Mobile-first: full viewport height, no overflow
- Desktop: max-width 640px centered, or full width (per design spec)
- Run `npm run build` — fix errors
- Test on different viewport sizes

---

## 5. Sequential vs Parallel Analysis

```
Session 1 (Admin UI Enhancement):
  ┌─────────┐   ┌─────────┐
  │ Task 1.1 │──▶│ Task 1.2 │──┐
  │  Types   │   │ Schemas  │  │
  └─────────┘   └─────────┘  │
                               ▼
                          ┌─────────┐
                          │ Task 1.3 │ ◀── Sequential (depends on 1.1+1.2)
                          │  Form   │
                          └─────────┘
                               │
  ┌─────────┐             ┌───┴─────┐
  │ Task 1.5 │  (parallel) │ Task 1.4 │
  │  C5 Fix  │             │ Preview  │
  └─────────┘             └─────────┘
                               │
                          ┌────▼────┐
                          │ Task 1.6 │
                          │  Build  │
                          └─────────┘

Session 2 (Direct Link Chat):
  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ Task 2.1 │──▶│ Task 2.2 │──▶│ Task 2.3 │
  │  Route   │   │  UI Comp │   │  SSE     │
  └─────────┘   └─────────┘   └───┬─────┘
                                    │
                  ┌─────────┐  ┌───▼─────┐
                  │ Task 2.4 │  │ Task 2.5 │
                  │ Persist  │  │ Styling  │
                  └─────────┘  └─────────┘
                  (parallel w/ 2.3)
```

### Inter-Session Dependencies

- **Session 1 → Session 2:** Types from Task 1.1 used by chat page components. Session 1 must be committed first.
- **Session 1 and Session 2 are NOT parallelizable** because both touch `smartbot-web/` and share type definitions.

### Intra-Session Parallelism

- **Session 1:** Tasks 1.4 and 1.5 can run in parallel (different files, no overlap) using `code-reviewer` + implementation agents.
- **Session 2:** Task 2.4 can run in parallel with 2.3 (different files).

---

## 6. Claude Code Session Strategy

### Recommended: 2 Sequential Sessions

| Session | Focus | Duration Est. | Input |
|---------|-------|---------------|-------|
| **Session 1** | Admin UI (C4 Styling + C5 Embed) | Medium | This plan, Section 4 Session 1 |
| **Session 2** | Direct Link Chat Page | Medium-Large | This plan, Section 4 Session 2 |

### Session 1 Checklist ✓ COMPLETE
```
✓ Read this plan + existing widget files
✓ Task 1.1: Update BotWidgetConfig type
✓ Task 1.2: Update updateWidgetSchema
✓ Task 1.3: Enhance bot-widget-config.tsx form
✓ Task 1.4: Enhance bot-widget-preview.tsx
✓ Task 1.5: Polish bot-embed-code-section.tsx
✓ Task 1.6: npm run build — fix errors
✓ Code review via code-reviewer agent
✓ Commit: "fix: widget config re-render loop and top header dropdown menu"
```

### Session 2 Checklist ✓ COMPLETE
```
✓ Read this plan + Session 1 committed code
✓ Task 2.1: Create /chat/[botId] route + layout (moved to (chat) route group to avoid PublicLayout wrapper)
✓ Task 2.2: Build chat UI components (6 files: container, header, message-list, message-bubble, input, suggested-questions)
✓ Task 2.3: SSE streaming hook (use-chat-stream.ts + chat-api.ts)
✓ Task 2.4: Session persistence (localStorage endUserId + conversationId per bot)
✓ Task 2.5: Responsive + build check (npm run build passes, h-dvh full viewport)
✓ proxy.ts updated: /chat added as public route (separate from auth routes)
✓ Code review via code-reviewer agent
□ Commit: "feat: add direct link chat page for widget embedding"
```

### Why Not Parallel Sessions?

Both sessions modify `smartbot-web/`. File ownership conflicts:
- Shared types in `lib/types/bot.ts`
- Shared API client in `lib/api/`
- Shared `(public)` layout

Sequential is safer. Total: 2 sessions for all Phase 4A deliverables.

---

## 7. File Inventory

### Files to MODIFY (Session 1)

| File | Changes |
|------|---------|
| `src/lib/types/bot.ts` | Add 8 new fields to `BotWidgetConfig` |
| `src/lib/validations/bot-schemas.ts` | Add matching Zod fields to `updateWidgetSchema` |
| `src/components/features/bots/bot-widget-config.tsx` | Add form sections for new fields |
| `src/components/features/bots/bot-widget-preview.tsx` | Reflect all new styling fields |
| `src/components/features/bots/bot-embed-code-section.tsx` | Minor styling polish |

### Files CREATED (Session 2) ✓

| File | Purpose |
|------|---------|
| `src/app/(chat)/chat/[botId]/page.tsx` | Direct link chat page |
| `src/app/(chat)/chat/[botId]/layout.tsx` | Minimal layout (h-dvh, no shell) |
| `src/components/features/chat/chat-container.tsx` | Chat orchestrator (config, messages, input) |
| `src/components/features/chat/chat-header.tsx` | Colored header with bot name + avatar |
| `src/components/features/chat/chat-message-list.tsx` | Scrollable message list with auto-scroll |
| `src/components/features/chat/chat-message-bubble.tsx` | Individual message bubble (user/bot) |
| `src/components/features/chat/chat-input.tsx` | Auto-resize textarea + send button |
| `src/components/features/chat/chat-suggested-questions.tsx` | Clickable suggestion chips |
| `src/lib/hooks/use-chat-stream.ts` | SSE streaming hook + session persistence |
| `src/lib/api/chat-api.ts` | Public chat API module (no auth) |

### Files MODIFIED (Session 2) ✓

| File | Changes |
|------|---------|
| `src/proxy.ts` | Split PUBLIC_ROUTES into AUTH_ROUTES + PUBLIC_ROUTES, added /chat as always-accessible |

### Files NOT Modified

- `genai-platform-api/prisma/schema.prisma` — `widgetConfig Json` already flexible
- `genai-platform-api/src/modules/bots/bots.service.ts` — PATCH merges JSON, no change needed
- Backend DTOs — optional enhancement, not blocking

---

## 8. Key Implementation Details

### 8.1 Color Picker Pattern

Reuse existing `COLOR_PRESETS` circle pattern from `bot-widget-config.tsx`. For new color fields (fontColor, backgroundColor, etc.), use:
- HTML `<input type="color">` wrapped in styled button
- Hex text input alongside
- No external color picker library needed

### 8.2 Logo Upload

Options (choose simplest):
- **Option A:** Use existing avatar upload flow if backend supports it → store URL in `widgetConfig.logoUrl`
- **Option B:** Base64 data URL (quick, no backend change, but larger JSON payload)
- **Option C:** MinIO upload via existing document upload infrastructure

Recommend **Option A** if avatar upload exists, otherwise **Option B** for speed.

### 8.3 Font Family

Predefined list (Google Fonts or system fonts):
```typescript
const FONT_OPTIONS = [
  { value: "system", label: "System Default" },
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "open-sans", label: "Open Sans" },
  { value: "noto-sans", label: "Noto Sans" },
]
```

Direct link page loads selected Google Font via `<link>` tag. Widget package (Phase 4B) bundles or lazy-loads.

### 8.4 SSE Streaming Pattern

```typescript
// POST-based SSE (not EventSource which is GET-only)
const response = await fetch(`/api/v1/chat/${botId}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ conversationId, content: message }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  // Parse SSE: "event: message\ndata: {...}\n\n"
  // Accumulate into message state
}
```

### 8.5 Direct Link Page Data Flow

```
1. User opens /chat/{botId}
2. Page fetches GET /api/v1/chat/{botId}/config (no auth)
   → Returns: { name, avatarUrl, greetingMessage, suggestedQuestions, widgetConfig }
3. Page checks localStorage for existing conversationId
4. If exists: GET /api/v1/chat/{botId}/conversations/{convId} → load history
5. User sends message → POST /api/v1/chat/{botId}/messages (SSE stream)
6. Store conversationId in localStorage for next visit
```

---

## 9. Success Criteria

### Phase 4A (This Plan)

- [ ] C4 Styling page has all styling fields (displayName, logo, colors, font)
- [ ] C4 Preview reflects all styling changes in real-time
- [ ] C5 Embed Codes page renders correctly with actual bot URLs
- [ ] `/chat/[botId]` loads bot config and renders full-page chat
- [ ] `/chat/[botId]` streams responses via SSE
- [ ] `/chat/[botId]` persists conversation across page reloads
- [ ] `/chat/[botId]` is responsive (mobile + desktop)
- [ ] `/chat/[botId]` applies widgetConfig styling (colors, fonts, powered-by)
- [ ] `npm run build` passes with no errors
- [ ] All deliverables meet design specifications

### Phase 4B (Future — Not in scope)

- [ ] `smartbot-widget/` package builds to single IIFE <60KB
- [ ] Bubble script embeds on third-party site with Shadow DOM isolation
- [ ] iframe embed renders correctly
- [ ] Widget loads config from backend and applies theming
- [ ] Widget connects to SSE chat endpoint

---

## 10. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chat SSE endpoint may need CORS for direct link | Medium | Backend likely already allows CORS for public routes. Verify `main.ts` CORS config |
| Bot config endpoint may require auth | High | `GET /api/v1/chat/:botId/config` should be public. Verify route exists and is unprotected |
| Logo upload has no existing backend route | Low | Use base64 data URL as fallback (stored in widgetConfig JSON) |
| Large widgetConfig JSON may hit Prisma limits | Very Low | JSON field in PostgreSQL supports up to 255MB. A few extra string fields are negligible |
| Direct link page has no rate limiting | Medium | Add simple client-side debounce on send. Backend rate limiting is Phase 1.1 item |

---

## 11. Research References

All research reports available in `plans/reports/`:

1. **`researcher-widget-embedding-best-practices.md`** (1762 lines)
   - Shadow DOM isolation, Constructable Stylesheets, CSS custom properties
   - Vite IIFE build config, bundle optimization targets
   - CORS and SSE streaming patterns for embedded widgets
   - Script tag loading strategies (async/defer)

2. **`researcher-widget-reference-implementations.md`** (577 lines)
   - Typebot: zero deps, Shadow DOM, 3 embed modes, ~5-10KB
   - Botpress: React-based, pre-built components
   - Chatwoot: iframe-only, heavier footprint
   - Recommendation: Typebot-inspired custom build

3. **`researcher-widget-opensource-landscape.md`** (726 lines)
   - 6 projects analyzed (Typebot 9.8k stars, AnythingLLM 5.8k, Chatwoot 28k)
   - Convergent recommendation: Vanilla TS + Shadow DOM for Phase 4B
   - AnythingLLM + Typebot as primary reference architectures

### Key Research Insights Applied

1. **Direct Link first, embeddable widget second** — lower complexity, immediate value
2. **No React in widget package** (Phase 4B) — Vanilla TS + Shadow DOM = ~40KB vs React ~102KB
3. **CSS Custom Properties for theming** — works across Shadow DOM boundary
4. **POST-based SSE** via `fetch()` + `ReadableStream` — EventSource is GET-only
5. **localStorage per-site partitioning** — safe for session persistence without cookies
6. **Vite IIFE output** (Phase 4B) — single file, no module system dependency
7. **`<60KB gzipped` bundle target** (Phase 4B) — critical for third-party embed performance
