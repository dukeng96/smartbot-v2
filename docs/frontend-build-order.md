# Frontend Build Order — Smartbot v2 Platform

**Last Updated:** 2026-03-17
**Ref:** `frontend-architecture.md`, `frontend-ui-rules.md`, `figma-screen-spec.md`

---

## Overview

10 phases. Each phase delivers testable, demo-ready functionality.
Dependencies flow top-down — each phase builds on the previous.

| Phase | Name | Screens | Est. Components |
|-------|------|---------|-----------------|
| 0 | Project Scaffold | — | Config files |
| 1 | Auth | A1-A5 | 8 |
| 2 | App Shell + Dashboard | B1-B2 | 10 |
| 3 | Bot Management (List + Config) | C1-C2 | 8 |
| 4 | Bot Detail Tabs | C3-C7 | 12 |
| 5 | Knowledge Bases | D1-D4 | 10 |
| 6 | Conversations | E1-E2 | 8 |
| 7 | Analytics | F1-F2 | 7 |
| 8 | Billing | G1-G4 | 8 |
| 9 | Settings | H1-H3 | 6 |
| 10 | Widget | I1 | Separate package |

---

## Phase 0 — Project Scaffold

**Goal:** Runnable Next.js app with all tooling configured.

**Tasks:**
- [ ] `npx create-next-app@latest smartbot-web` (App Router, TypeScript, Tailwind, ESLint)
- [ ] Configure `tsconfig.json` with strict mode, path aliases (`@/`)
- [ ] Install core deps: `ky`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `sonner`, `recharts`, `react-dropzone`
- [ ] Init shadcn/ui: `npx shadcn@latest init` → install: button, input, dialog, table, tabs, badge, card, select, textarea, dropdown-menu, tooltip, progress, skeleton, separator, switch, popover, command
- [ ] Configure design tokens in `globals.css` as CSS variables (from `frontend-ui-rules.md` Section 1)
- [ ] Create folder structure per `frontend-architecture.md` Section 3
- [ ] Create `.env.local.example` with `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] Create `lib/utils/cn.ts` (clsx + twMerge)
- [ ] Create `lib/api/client.ts` — ky instance with interceptors (token attach, 401 refresh, envelope unwrap)
- [ ] Create `lib/types/api-responses.ts` — `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`
- [ ] Create `lib/stores/auth-store.ts` — Zustand: tokens, user, tenant, role
- [ ] Create `lib/stores/ui-store.ts` — Zustand: sidebarCollapsed, activeModal
- [ ] Verify: `npm run dev` starts, `npm run build` succeeds

**Depends on:** Nothing
**Unlocks:** All subsequent phases

---

## Phase 1 — Auth (A1-A5)

**Goal:** Full auth flow — register, login, logout, password reset, email verify.

**Tasks:**
- [ ] Create `lib/api/auth-api.ts` — register, login, logout, refresh, forgotPassword, resetPassword, verifyEmail, googleOAuth
- [ ] Create `lib/validations/auth-schemas.ts` — Zod schemas for each form
- [ ] Create `lib/hooks/use-auth.ts` — login/register/logout mutations, token handling
- [ ] Create `components/layout/public-layout.tsx` — centered card (420px), Smartbot logo, `#F9FAFB` bg
- [ ] Create `app/(public)/layout.tsx` using public-layout
- [ ] Create `components/features/auth/login-form.tsx` — email + password + show/hide + Google + links
- [ ] Create `components/features/auth/register-form.tsx` — fullName + email + password + strength bar + Google
- [ ] Create `components/features/auth/forgot-password-form.tsx`
- [ ] Create `components/features/auth/reset-password-form.tsx`
- [ ] Create `components/features/auth/google-oauth-button.tsx`
- [ ] Create 5 page files: login, register, forgot-password, reset-password, verify-email
- [ ] Create `middleware.ts` — route protection (public vs protected)
- [ ] Verify: register → login → redirect to dashboard → logout → back to login

**Depends on:** Phase 0
**Unlocks:** Phase 2

---

## Phase 2 — App Shell + Dashboard (B1-B2)

**Goal:** AppShell with sidebar navigation + Dashboard KPIs.

**Tasks:**
- [ ] Create `components/layout/sidebar-navigation.tsx` — 7 nav items, active state, credits indicator, collapse toggle
- [ ] Create `components/layout/sidebar-nav-item.tsx` — icon + label + active styling
- [ ] Create `components/layout/top-header.tsx` — page title (dynamic), user avatar + name + logout
- [ ] Create `components/layout/app-shell.tsx` — sidebar + header + `<main>` content wrapper
- [ ] Create `components/layout/page-header.tsx` — title + breadcrumb + actions slot
- [ ] Create `app/(dashboard)/layout.tsx` using app-shell + AuthProvider gate
- [ ] Create `components/shared/kpi-card.tsx` — large number + label + optional progress bar
- [ ] Create `components/shared/empty-state.tsx` — icon + message + CTA
- [ ] Create `components/shared/error-state.tsx` — error icon + message + retry
- [ ] Create `components/shared/loading-skeleton.tsx` — configurable skeleton patterns
- [ ] Create `lib/api/analytics-api.ts` — overview endpoint
- [ ] Create `lib/hooks/use-analytics.ts` — `useAnalyticsOverview()`
- [ ] Create `lib/hooks/use-user.ts` — `useCurrentUser()` from `/users/me`
- [ ] Create `lib/api/users-api.ts` — getMe, updateMe
- [ ] Create `app/(dashboard)/page.tsx` — 5 KPI cards + quick actions + assistant card grid
- [ ] Create `lib/utils/format-currency.ts` — VND formatting (`199.000₫`)
- [ ] Create `lib/utils/format-number.ts` — abbreviation (1.2K, 3.5M)
- [ ] Create `lib/utils/format-date.ts` — Vietnamese relative + absolute dates
- [ ] Verify: sidebar nav works, all 7 links navigate, dashboard shows KPIs, responsive collapse

**Depends on:** Phase 1 (auth required)
**Unlocks:** Phases 3-9 (all dashboard pages)

---

## Phase 3 — Bot Management: List + Config (C1-C2)

**Goal:** Bot list page + bot detail general config tab.

**Tasks:**
- [ ] Create `components/shared/data-table.tsx` — generic paginated table
- [ ] Create `components/shared/data-table-pagination.tsx`
- [ ] Create `components/shared/data-table-toolbar.tsx` — search + filters
- [ ] Create `components/shared/status-badge.tsx` — colored pill per status
- [ ] Create `components/shared/confirm-dialog.tsx` — "Bạn có chắc muốn xóa X?"
- [ ] Create `lib/api/bots-api.ts` — full bot CRUD + personality, widget, api-key, embed, KB attach/detach
- [ ] Create `lib/types/bot.ts` — Bot interface
- [ ] Create `lib/hooks/use-bots.ts` — list, detail, create, update, delete, duplicate
- [ ] Create `lib/validations/bot-schemas.ts`
- [ ] Create `components/features/bots/bot-list-cards.tsx` — 2-col card grid with avatar, stats, menu
- [ ] Create `components/features/bots/bot-create-dialog.tsx` — name + description form
- [ ] Create `app/(dashboard)/bots/page.tsx` — list with search + status filter + pagination
- [ ] Create `app/(dashboard)/bots/[botId]/layout.tsx` — breadcrumb + 6 horizontal tabs
- [ ] Create `app/(dashboard)/bots/[botId]/page.tsx` — redirect to /config
- [ ] Create `components/features/bots/bot-config-form.tsx` — basic info + RAG config + stats + actions
- [ ] Create `app/(dashboard)/bots/[botId]/config/page.tsx`
- [ ] Verify: create bot → appears in list → click → detail tabs → edit config → save

**Depends on:** Phase 2 (AppShell, shared components)
**Unlocks:** Phase 4

---

## Phase 4 — Bot Detail Tabs (C3-C7)

**Goal:** Complete all 5 remaining bot detail tabs.

**Tasks:**
- [ ] **C3 Personality:** `bot-personality-form.tsx` — system prompt, greeting, suggested questions (drag), fallback, personality JSON (tone/language/restrictions dropdowns), live preview panel
- [ ] **C4 Widget:** `bot-widget-config.tsx` + `bot-widget-preview.tsx` — theme selector, color picker, position, bubble icon, header, branding toggle, plan-gated customCSS, live preview
- [ ] **C5 API & Embed:** `bot-api-key-section.tsx` + `bot-embed-code-section.tsx` — generate/revoke API key, 3 embed code cards (bubble/iframe/direct), copy buttons
- [ ] Create `components/shared/copy-button.tsx` — click-to-copy with toast
- [ ] **C6 Knowledge Bases:** `bot-kb-list.tsx` + `bot-kb-attach-dialog.tsx` — attached KB table with drag-to-reorder priority, attach/detach actions
- [ ] **C7 Channels:** `bot-channel-list.tsx` — 5 channel cards (web widget, Facebook, Telegram, Zalo, API), connect/disconnect flows
- [ ] Create `lib/api/channels-api.ts` + `lib/hooks/use-channels.ts`
- [ ] Create `lib/types/channel.ts`
- [ ] Create 5 page files under `bots/[botId]/`
- [ ] Verify: each tab loads, forms save, widget preview updates, KB attach/detach works

**Depends on:** Phase 3 (bot detail layout + shell)
**Unlocks:** Phase 10 (widget shares preview logic from C4)

---

## Phase 5 — Knowledge Bases (D1-D4)

**Goal:** Full KB CRUD + document management pipeline.

**Tasks:**
- [ ] Create `lib/api/knowledge-bases-api.ts` + `lib/api/documents-api.ts`
- [ ] Create `lib/types/knowledge-base.ts` + `lib/types/document.ts`
- [ ] Create `lib/hooks/use-knowledge-bases.ts` + `lib/hooks/use-documents.ts`
- [ ] Create `lib/validations/kb-schemas.ts` + `lib/validations/document-schemas.ts`
- [ ] **D1:** `kb-list-table.tsx` + `kb-create-dialog.tsx` — table with status, actions, create modal
- [ ] **D2:** `kb-detail-form.tsx` — editable name/description/chunking, stats, reprocess all, character usage bar
- [ ] **D3:** `document-list-table.tsx` — type badges, status, progress bar+step, enabled toggle
- [ ] Create `components/shared/file-upload-zone.tsx` — drag-and-drop, multi-file queue
- [ ] `document-upload-dialog.tsx` + `document-url-dialog.tsx` + `document-text-dialog.tsx`
- [ ] `document-processing-badge.tsx` — status + step + progress bar
- [ ] **D4:** `document-detail-view.tsx` — info grid, processing stepper (3 steps), stats, metadata JSON, actions
- [ ] Create 4 page files: KB list, KB detail, doc list, doc detail
- [ ] Verify: create KB → upload docs → see processing status → view detail → toggle enabled → delete

**Depends on:** Phase 2 (shared components: DataTable, StatusBadge, FileUploadZone)
**Can run parallel with:** Phase 3 (no shared state)

---

## Phase 6 — Conversations (E1-E2)

**Goal:** Conversation list + chat thread viewer with RAG debug.

**Tasks:**
- [ ] Create `lib/api/conversations-api.ts`
- [ ] Create `lib/types/conversation.ts` + `lib/types/message.ts`
- [ ] Create `lib/hooks/use-conversations.ts`
- [ ] Create `lib/hooks/use-sse-chat.ts` — SSE streaming (POST → EventSource → accumulate chunks)
- [ ] **E1:** `conversation-list-table.tsx` + `conversation-bot-selector.tsx` — bot dropdown, channel/status/date filters, table (user, channel badge, messages, lastMessageAt timestamp, status, rating)
- [ ] **E2:** `chat-thread.tsx` — scrollable chat with timestamp-ordered bubbles
- [ ] `chat-message-bubble.tsx` — assistant (white, left) / user (`#EDE9FE`, right) + timestamp
- [ ] `chat-rag-debug-panel.tsx` — expandable: search query, sources, model, tokens, credits
- [ ] `chat-message-feedback.tsx` — 👍 👎 per assistant message
- [ ] `conversation-rating-dialog.tsx` — 1-5 stars + feedback text
- [ ] Create 2 page files: conversation list, conversation detail
- [ ] Verify: select bot → filter → click row → see chat thread → expand RAG debug → rate

**Depends on:** Phase 3 (bot list needed for bot selector dropdown)
**Unlocks:** Phase 7 (analytics references conversation data)

---

## Phase 7 — Analytics (F1-F2)

**Goal:** Analytics overview with KPIs + charts + bot-specific analytics.

**Tasks:**
- [ ] Extend `lib/api/analytics-api.ts` — conversations, messages, credits, channels, top-questions, satisfaction
- [ ] Extend `lib/hooks/use-analytics.ts` — all analytics queries with period + botId params
- [ ] Create `components/shared/period-filter.tsx` — 7d / 30d / 90d pill toggle
- [ ] **F1:** `analytics-kpi-grid.tsx` — 5 KPI cards (no percentage change badges)
- [ ] `conversations-chart.tsx` — Recharts area chart, purple fill
- [ ] `channels-pie-chart.tsx` — Recharts donut chart + legend
- [ ] `credits-chart.tsx` — Recharts area/bar chart
- [ ] **F2:** `top-questions-table.tsx` — numbered list with count badges
- [ ] `satisfaction-chart.tsx` — horizontal bar chart (1-5 stars distribution)
- [ ] Create 2 page files: analytics overview, bot-specific analytics
- [ ] Verify: period filter changes data, bot filter narrows charts, all charts render

**Depends on:** Phase 2 (KPI card shared component)
**Can run parallel with:** Phases 5, 6

---

## Phase 8 — Billing (G1-G4)

**Goal:** Plans pricing, subscription management, credit top-up, payment history.

**Tasks:**
- [ ] Create `lib/api/billing-api.ts` — plans, subscription CRUD, top-up, credits usage, payments, callbacks
- [ ] Create `lib/types/plan.ts` + `lib/types/subscription.ts` + `lib/types/credit-usage.ts` + `lib/types/payment-history.ts`
- [ ] Create `lib/hooks/use-billing.ts`
- [ ] **G1:** `plans-pricing-table.tsx` — 4 plan cards (Free/Starter/Advanced/Pro), monthly/yearly toggle, feature ✓/✗ lists, "Popular" badge on Advanced, current plan highlight
- [ ] `plan-select-dialog.tsx` — upgrade/downgrade confirmation
- [ ] **G2:** `subscription-detail-card.tsx` — plan info, status, period, payment method, cancel
- [ ] `credit-usage-bar.tsx` — progress bar with breakdown, reset date
- [ ] **G3:** `top-up-form.tsx` — 4 selectable credit packages (500/2000/5000/custom), payment method radios (VNPay/MoMo), order summary
- [ ] **G4:** `payment-history-table.tsx` — date, description, type badge, amount (VND), status badge, method, invoice download. Filters: date range, type, status. Export CSV
- [ ] Create 4 page files: plans, subscription, top-up, payments
- [ ] Verify: view plans → upgrade → see subscription → buy credits → view payment history

**Depends on:** Phase 2 (AppShell)
**Can run parallel with:** Phases 3-7

---

## Phase 9 — Settings (H1-H3)

**Goal:** Profile, workspace, and team member management.

**Tasks:**
- [ ] Create `lib/api/tenants-api.ts` — get/update tenant, CRUD members
- [ ] Create `lib/types/tenant.ts`
- [ ] Create `lib/hooks/use-team.ts`
- [ ] Create `lib/validations/settings-schemas.ts`
- [ ] Create `app/(dashboard)/settings/layout.tsx` — sub-tabs: Profile | Workspace | Team Members
- [ ] **H1:** `profile-form.tsx` — avatar upload, fullName, email (readonly), phone, change password (collapsible, email-auth only)
- [ ] **H2:** `workspace-form.tsx` — workspace name, slug (readonly), logo upload, plan badge, status
- [ ] **H3:** `team-members-table.tsx` — member table with role badges (Owner👑/Admin/Member/Viewer), role dropdown, remove action
- [ ] `invite-member-dialog.tsx` — email + role dropdown + quota check
- [ ] Create `components/shared/quota-warning.tsx` — "Nâng cấp gói để thêm thành viên"
- [ ] Create 3 page files: profile, workspace, team
- [ ] Verify: edit profile → save → edit workspace → invite member → change role → remove

**Depends on:** Phase 2 (AppShell)
**Can run parallel with:** Phases 3-8

---

## Phase 10 — Chat Widget (I1)

**Goal:** Embeddable chat widget as separate package (`smartbot-widget`).

**Tasks:**
- [ ] Scaffold `smartbot-widget/` — Vite + React + TypeScript (separate from smartbot-web)
- [ ] Configure for iframe/bubble embed (small bundle, no Next.js)
- [ ] Build widget shell: collapsed (56px circle) ↔ expanded (380×560px) toggle
- [ ] Widget header: assistant name + green dot + minimize/close
- [ ] Load bot config: `GET /chat/:botId/config` (name, avatar, greeting, suggestions, widget config)
- [ ] Apply widget config: theme (light/dark), primaryColor, position, bubbleIcon, headerText, customCss, showPoweredBy
- [ ] Chat input + SSE streaming (`POST /chat/:botId/messages`)
- [ ] Chat history for returning users (localStorage: conversationId + endUserId)
- [ ] Suggested question chips (click-to-send)
- [ ] Typing indicator (three animated dots)
- [ ] "Powered by Smartbot" footer (conditional)
- [ ] Auth: bot API key or domain validation (Referer header)
- [ ] Mobile responsive
- [ ] Build output: `<script>` tag for bubble, `<iframe>` for embed, direct link URL
- [ ] Verify: embed on test page → load config → chat → see streaming → history persists

**Depends on:** Phase 4 (widget config API from C4/C5)
**Independent:** Separate package, no Next.js dependency

---

## Parallel Execution Map

```
Phase 0 ─── Phase 1 ─── Phase 2 ───┬── Phase 3 ─── Phase 4 ─── Phase 10
                                    ├── Phase 5
                                    ├── Phase 6
                                    ├── Phase 7
                                    ├── Phase 8
                                    └── Phase 9
```

After Phase 2 (AppShell), phases 3 + 5-9 can run in parallel.
Phase 4 requires Phase 3 (bot detail layout). Phase 10 requires Phase 4 (widget config).
Phase 6 soft-depends on Phase 3 (bot selector), but can stub the dropdown.

---

## Quality Gates per Phase

Before marking a phase complete:
- [ ] All screens match design system tokens (colors, spacing, typography)
- [ ] 4 page states handled: loading, empty, error, success
- [ ] Vietnamese UI copy for all labels
- [ ] Responsive: desktop (≥1024px), tablet (768-1023px), mobile (<768px)
- [ ] Forms validate with Zod before submit
- [ ] API calls use correct endpoints from `backend-api-reference.md`
- [ ] No console errors, no TypeScript errors, build passes
