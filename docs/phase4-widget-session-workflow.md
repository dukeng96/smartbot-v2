# Phase 4A Widget — Session Workflow Guide

> Tổng hợp skills, prompts, deliverables cho từng session triển khai Phase 4A.
> Tham chiếu: `docs/PHASE4-WIDGET-PLAN.md` (chi tiết tasks + file inventory).

---

## Tổng quan

| Metric | Value |
|--------|-------|
| Tổng sessions | **2** |
| Tổng tasks | 11 (6 + 5) |
| Skills cần dùng | 5 trực tiếp, 2 tham khảo |
| Dependency | Session 2 phụ thuộc types từ Session 1 |

### Skills Relevance Map

| Skill | Relevance | Dùng ở session | Vai trò |
|-------|-----------|-----------------|---------|
| `/ck:cook` | **CRITICAL** | 1, 2 | Orchestrate toàn bộ workflow: plan → implement → test → review → finalize |
| `/ck:ui-styling` | **CRITICAL** | 1, 2 | shadcn/ui components + Tailwind patterns (exact match stack) |
| `/ck:ui-ux-pro-max` | **HIGH** | 1, 2 | Design system generation, UX checklist, accessibility audit |
| `/ck:react-best-practices` | **HIGH** | 2 | SSE streaming, React performance, memo/callback optimization |
| `/ck:web-frameworks` | **HIGH** | 2 | Next.js App Router, server components, route groups |
| `/ck:frontend-design` | LOW | — | Chỉ dùng nếu cần replicate từ screenshot/Figma |
| `/ck:frontend-development` | LOW | — | MUI-focused, không match stack (shadcn/ui) |

---

## Session 1: Admin UI — Widget Config + Embed Codes

### Scope
- Mở rộng C4 Widget Config (thêm 8 fields mới: displayName, logoUrl, fontColor, backgroundColor, userMessageColor, botMessageColor, fontFamily, fontSize)
- Nâng cấp Widget Preview realtime
- Polish C5 Embed Code section (3 dạng: iframe, bubble, direct link)
- 6 tasks, 5 files modify, 0 files create

### Skills to Activate

```
/ck:cook
/ck:ui-styling
/ck:ui-ux-pro-max
```

### Prompt

```
/cook docs/PHASE4-WIDGET-PLAN.md --auto

Context: Phase 4A Session 1 — Admin UI Enhancement (C4 Widget Config + C5 Embed Codes).

Read docs/PHASE4-WIDGET-PLAN.md fully, then execute Session 1 tasks (1.1 → 1.6) in order.

Required reading before implementation:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/figma-screen-spec.md (sections C4, C5)

Skill activation:
1. /ck:ui-ux-pro-max — run `--design-system "SaaS chatbot widget config" --stack shadcn` for design tokens
2. /ck:ui-styling — reference shadcn-components.md for form patterns (color picker, select, switch, input)

Task sequence:
1.1 Expand BotWidgetConfig type in src/lib/types/bot.ts (add 8 new optional fields)
1.2 Expand Zod schema in src/lib/validations/bot-schemas.ts (match new type)
1.3 Enhance bot-widget-config.tsx form (add sections: Branding, Colors, Typography)
1.4 (parallel) Enhance bot-widget-preview.tsx (realtime preview of all new fields)
1.5 (parallel) Polish bot-embed-code-section.tsx (tabbed code blocks: iframe/bubble/direct link)
1.6 Compile check: run `npm run build` in smartbot-web/

IMPORTANT:
- DO NOT create new files. Modify existing 5 files only.
- Use react-hook-form subscription pattern (form.watch callback) — NOT useEffect + form.watch() (causes re-render loop, fixed in commit f1d5d8c).
- Color picker: use native <input type="color"> wrapped in shadcn FormItem (no extra dependency).
- widgetConfig is Prisma JSON field — no backend migration needed.
- Follow docs/frontend-ui-rules.md for spacing, typography, color tokens.
```

### Expected Deliverables

| # | Deliverable | Acceptance Criteria |
|---|-------------|---------------------|
| 1 | `bot.ts` types expanded | 8 new optional fields in `BotWidgetConfig` |
| 2 | `bot-schemas.ts` Zod updated | Schema matches type, all new fields optional with defaults |
| 3 | `bot-widget-config.tsx` enhanced | 3 form sections (Branding, Colors, Typography), no re-render loop |
| 4 | `bot-widget-preview.tsx` updated | Preview reflects all config fields in realtime |
| 5 | `bot-embed-code-section.tsx` polished | Tabbed UI (iframe/bubble/direct link), copy button per tab |
| 6 | Build passes | `npm run build` exits 0 |

### Risk Notes
- Color picker UX: native `<input type="color">` looks different per browser — acceptable for MVP
- `bot-widget-config.tsx` re-render loop already fixed (commit `f1d5d8c`) — don't regress

---

## Session 2: Direct Link Chat Page `/chat/[botId]`

### Scope
- Public chat page tại `(public)/chat/[botId]/`
- Chat UI: header, message list, input, typing indicator, suggested questions
- SSE streaming via POST-based fetch + ReadableStream
- Session persistence (localStorage conversationId + endUserId)
- Responsive (mobile-first cho chat page)
- 5 tasks, 2 files modify, ~10 files create

### Skills to Activate

```
/ck:cook
/ck:ui-styling
/ck:ui-ux-pro-max
/ck:react-best-practices
/ck:web-frameworks
```

### Prompt

```
/cook docs/PHASE4-WIDGET-PLAN.md --auto

Context: Phase 4A Session 2 — Direct Link Chat Page /chat/[botId].
Session 1 is COMPLETE. Types in src/lib/types/bot.ts already have expanded BotWidgetConfig.

Read docs/PHASE4-WIDGET-PLAN.md fully, then execute Session 2 tasks (2.1 → 2.5) in order.

Required reading before implementation:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/figma-screen-spec.md (section I1)
- docs/backend-codebase-summary.md (Chat Module section — SSE format)
- docs/API-LLM-VNPT.md (LLM API reference)

Skill activation:
1. /ck:ui-ux-pro-max — run `--design-system "chatbot widget conversational UI" --stack shadcn` for chat bubble design
2. /ck:ui-styling — reference shadcn-components.md for Card, Button, Input, ScrollArea, Avatar
3. /ck:react-best-practices — optimize streaming re-renders (useCallback, memo, ref for scroll)
4. /ck:web-frameworks — Next.js App Router public route group, metadata, loading states

Task sequence:
2.1 Create public route: (public)/chat/[botId]/page.tsx + layout.tsx (no sidebar, no auth)
2.2 Create 6 chat UI components in components/features/chat/:
    - chat-container.tsx (orchestrator)
    - chat-header.tsx (bot name, avatar, status)
    - chat-message-list.tsx (scrollable, auto-scroll to bottom)
    - chat-message-bubble.tsx (user right / bot left, markdown support)
    - chat-input.tsx (textarea, send button, disabled during streaming)
    - chat-suggested-questions.tsx (clickable chips from bot config)
2.3 Create SSE streaming hook: lib/hooks/use-chat-stream.ts + lib/api/chat-api.ts
    - POST-based SSE (NOT EventSource — it's GET-only)
    - Pattern: fetch() → response.body.getReader() → TextDecoder → parse "event: message\ndata: {...}\n\n"
    - States: idle, streaming, error
    - AbortController for cancellation
2.4 (parallel with 2.3) Session persistence:
    - localStorage: conversationId + endUserId (uuid)
    - Load history on return visit via GET /api/v1/chat/:botId/conversations/:convId/messages
2.5 Responsive styling + compile check:
    - Mobile-first: full viewport height, safe-area-inset for iOS
    - Apply widgetConfig theme (primaryColor, fontFamily, etc.)
    - Run `npm run build`

IMPORTANT:
- Chat page is PUBLIC — no auth required. Bot config loaded via GET /api/v1/chat/:botId/config.
- SSE response format: "event: message\ndata: {chunk}\n\n" then "event: done\ndata: {}\n\n"
- Use refs (not state) for scroll position to avoid re-renders during streaming.
- Markdown rendering: use react-markdown (already in dependencies) or simple dangerouslySetInnerHTML for MVP.
- Vietnamese UI copy: "Nhập tin nhắn...", "Gửi", "Đang trả lời..."
- Follow docs/frontend-ui-rules.md for all spacing, colors, typography.
```

### Expected Deliverables

| # | Deliverable | Acceptance Criteria |
|---|-------------|---------------------|
| 1 | Public route | `/chat/[botId]` renders without auth, correct layout (no sidebar) |
| 2 | Chat UI | 6 components: header, message list, bubbles, input, suggestions |
| 3 | SSE streaming | Messages stream in realtime, typing indicator during stream |
| 4 | Session persistence | Returning users see previous conversation via localStorage |
| 5 | Responsive | Mobile-first, works on 375px–1440px, safe-area for iOS |
| 6 | Build passes | `npm run build` exits 0 |

### Risk Notes
- SSE parsing edge case: chunks may split across `reader.read()` boundaries — buffer partial lines
- `react-markdown` may not be installed — check `package.json`, install if missing
- iOS Safari: `100vh` includes address bar — use `dvh` or `window.innerHeight` via JS

---

## Dependency Diagram

```
Session 1                              Session 2
─────────                              ─────────
1.1 Types ─────┐                       2.1 Route ─────┐
1.2 Schemas ───┤                       2.2 UI ────────┤
1.3 Form ──────┼── 1.6 Build ──────►   2.3 SSE ───────┼── 2.5 Build
1.4 Preview ───┤   (gate)              2.4 Persist ───┘
1.5 C5 Polish ─┘
```

Session 2 depends on Session 1 completion:
- `BotWidgetConfig` type (Task 1.1) used by chat page for theming
- `widgetConfigSchema` (Task 1.2) used for config validation
- Build must pass (Task 1.6) before starting Session 2

---

## Cook Workflow per Session

Mỗi session dùng `/cook` sẽ tự động chạy pipeline:

```
Intent Detection (code mode — plan.md path detected)
  → Skip Research (plan exists)
  → Plan Review (auto-approve if --auto)
  → Implementation (TodoWrite tracking)
  → Test (tester + debugger subagents)
  → Code Review (code-reviewer subagent)
  → Finalize:
      1. project-manager → sync-back plan status
      2. docs-manager → update docs/ if needed
      3. git-manager → commit prompt
```

### Mandatory Subagents (spawned by cook)

| Phase | Subagent | Purpose |
|-------|----------|---------|
| Testing | `tester` | Run `npm run build` + lint + unit tests |
| Testing | `debugger` | Investigate failures if tests fail |
| Review | `code-reviewer` | Quality, security, performance audit |
| Finalize | `project-manager` | Update PHASE4-WIDGET-PLAN.md task checkboxes |
| Finalize | `docs-manager` | Update frontend-architecture.md if new routes added |
| Finalize | `git-manager` | Stage, commit with conventional format |

---

## Post-Session Checklist

After each session completes, verify:

- [ ] All tasks in PHASE4-WIDGET-PLAN.md marked complete for that session
- [ ] `npm run build` passes (zero errors)
- [ ] `npm run lint` passes (or warnings only)
- [ ] Conventional commit created (e.g., `feat: enhance widget config with branding/color/typography options`)
- [ ] No hardcoded secrets, no `.env` committed
- [ ] PROJECT-STATUS.md updated with Phase 4 progress

---

## Skill Quick Reference

### `/ck:ui-ux-pro-max` — Design System Generation

```bash
# Session 1: widget config UI
python .claude\skills\.venv\Scripts\python.exe %USERPROFILE%/.claude/skills/ui-ux-pro-max/scripts/search.py "SaaS chatbot widget config form" --design-system --stack shadcn

# Session 2: chat bubble UI
python .claude\skills\.venv\Scripts\python.exe %USERPROFILE%/.claude/skills/ui-ux-pro-max/scripts/search.py "chatbot conversational UI messaging" --design-system --stack shadcn

# Supplemental searches
python ... "color picker form accessibility" --domain ux
python ... "chat bubble messaging layout" --domain style
```

### `/ck:ui-styling` — Component Patterns

Key references to read during implementation:
- `references/shadcn-components.md` — Form, Input, Select, Switch, Tabs, Card, ScrollArea
- `references/shadcn-theming.md` — CSS variables, dark mode
- `references/shadcn-accessibility.md` — Focus management, ARIA for chat
- `references/tailwind-responsive.md` — Mobile-first breakpoints for chat page

### `/ck:react-best-practices` — Performance (Session 2)

Critical rules for streaming chat:
- `use-memo-callback.md` — Memoize message list rendering
- `use-ref-over-state.md` — Scroll position via ref, not state
- `avoid-unnecessary-rerenders.md` — Streaming chunks shouldn't re-render entire tree
- `suspense-boundaries.md` — Loading states for chat history

### `/ck:web-frameworks` — Next.js Patterns (Session 2)

Key references:
- App Router route groups: `(public)` for no-auth pages
- Dynamic routes: `[botId]` parameter
- Metadata API: SEO for public chat page
- Client components: chat page is fully client-side (SSE, localStorage)
