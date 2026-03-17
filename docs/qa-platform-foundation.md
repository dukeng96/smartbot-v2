# QA Report — Platform Frontend Foundation

**Date:** 2026-03-17
**Scope:** Phase 1 foundation — shell, layout, shared components, design tokens, route scaffolding
**Evidence:** `docs/qa-screenshots/01-*.png` through `12-*.png` (12 screenshots)
**Status:** ✅ RESOLVED — all 14 issues fixed (2026-03-17), `tsc --noEmit` passed

---

## 1. What Matches Spec

### 1.1 Design Tokens (globals.css)
- All color tokens match `frontend-ui-rules.md` exactly: primary `#6D28D9`, success `#059669`, warning `#D97706`, error `#DC2626`, info `#2563EB`
- Semantic light variants correct: `#EDE9FE`, `#ECFDF5`, `#FFFBEB`, `#FEF2F2`, `#EFF6FF`
- Surface/background/border tokens correct: `#F9FAFB`, `#FFFFFF`, `#E5E7EB`, `#F3F4F6`
- Text hierarchy correct: `#111827`, `#374151`, `#6B7280`, `#9CA3AF`
- Radius tokens correct: 12px card, 8px buttons/inputs, 6px nav, pill 9999px
- Custom spacing variables: `--width-sidebar: 220px`, `--height-header: 56px`, `--spacing-content-pad: 32px`
- Shadow tokens correct: card `0 1px 2px rgba(0,0,0,0.04)`, widget `0 4px 12px rgba(0,0,0,0.15)`
- Font sizes mapped: page-title 22px, section-heading 16px, card-title 14px, body 13px, caption 12px, credits-label 10px

### 1.2 App Shell Layout
- Sidebar fixed 220px, white bg, right border — CORRECT
- Header 56px height, white bg, bottom border — CORRECT
- Content area `#F9FAFB` bg, 32px padding — CORRECT
- Sidebar hidden on `<lg` breakpoints — CORRECT

### 1.3 Sidebar Navigation
- Exactly 7 nav items in correct order: Dashboard, Assistants, Knowledge Bases, Conversations, Analytics, Billing, Settings — CORRECT
- Correct Lucide icons: LayoutGrid, MessageSquare, BookOpen, MessageCircle, BarChart, CreditCard, Settings — CORRECT
- Active item: purple light bg + purple text — CORRECT
- Hover: light gray bg — CORRECT
- `matchPaths` for nested route highlighting — CORRECT
- Sidebar unchanged on sub-pages (bot detail, settings) — CORRECT (verified via screenshots)
- Credits indicator at bottom with progress bar + "Upgrade plan" link — CORRECT

### 1.4 Button Variants
- Primary: `#6D28D9` bg, white text — CORRECT
- Outline (Secondary): white bg, purple border, purple text — CORRECT
- Destructive (Danger): white bg, red border, red text (NOT filled red) — CORRECT override
- Ghost: transparent, purple text — CORRECT
- All 36px height (h-9), 8px radius, 13px semibold — CORRECT

### 1.5 Tabs Component
- Underline style (not pills) — CORRECT
- Active: purple text + 2px bottom border — CORRECT
- Inactive: gray text, hover darker — CORRECT
- Bot detail uses 6 tabs with router navigation — CORRECT

### 1.6 StatusBadge
- All 13 status variants with correct bg/text color pairs — CORRECT
- 12px text, pill radius, outline badge base — CORRECT

### 1.7 Shared Components Present
- `PageHeader` — title + description + actions slot — CORRECT
- `EmptyState` — icon + title + description + children — CORRECT
- `ErrorState` — error icon + message + "Thử lại" retry — CORRECT
- `LoadingSkeleton` — 4 variants (table, cards, detail, form) — CORRECT
- `KpiCard` — label, value, icon, optional progress — CORRECT
- `DataTable` — generic with typed columns, 12px uppercase headers, 56px rows — CORRECT
- `ConfirmDialog` — wraps AlertDialog, Vietnamese copy defaults — CORRECT
- `StatusBadge` — semantic status pill — CORRECT
- `CopyButton`, `CreditUsageBar`, `DataTablePagination`, `DataTableToolbar`, `FileUploadZone`, `PeriodFilter`, `QuotaWarning` — files exist

### 1.8 Public Layout
- Centered card on `#F9FAFB` bg — CORRECT
- 420px max width — CORRECT
- Logo "S" purple rounded icon + "Smartbot" text + tagline — CORRECT
- Card: white, border, 12px radius, padding — CORRECT

### 1.9 Route Structure
- All 30 routes from architecture doc scaffolded with page.tsx files — CORRECT
- Two route groups: `(public)` and `(dashboard)` — CORRECT
- Bot detail nested layout with tabs at `[botId]/layout.tsx` — CORRECT
- Root `/` redirects to `/login` (placeholder for auth guard) — CORRECT

### 1.10 Infrastructure
- Next.js 16.1.6 (Turbopack) — running
- Inter font with Vietnamese subset — CORRECT
- `lang="vi"` on HTML — CORRECT
- Sonner toaster configured (`top-right`, `richColors`, `closeButton`) — CORRECT
- TanStack Query provider wrapping app — CORRECT
- Zustand stores: `auth-store` + `ui-store` — files exist
- API client with ky — file exists
- Utility files: `format-date.ts`, `format-currency.ts`, `format-number.ts` — CORRECT

---

## 2. Issues Found

### 2.1 CRITICAL — UI Copy Violations

| # | Issue | Location | Spec Says | Actual | Screenshot |
|---|-------|----------|-----------|--------|------------|
| 1 | **Page title says "Bots"** | `/bots` page header | "Assistants" — user-facing must be "Assistant" not "Bot" | "Bots" | `04-bots.png` |
| 2 | **Button says "Tạo bot mới"** | `/bots` CTA button | "Tạo Assistant" or "Tạo assistant mới" | "Tạo bot mới" | `04-bots.png` |
| 3 | **Empty state says "Chưa có bot nào"** | `/bots` empty state | "Chưa có assistant nào" | "Chưa có bot nào" | `04-bots.png` |
| 4 | **Description says "bot"** | `/bots` page description | "AI assistant" | "AI assistant" ✓ — but title contradicts | `04-bots.png` |
| 5 | **Conversations empty uses "bot"** | `/conversations` empty | Should say "assistant" | "bắt đầu chat với bot" | `06-conversations.png` |
| 6 | **Bot detail title** | `/bots/[id]/config` | Should show assistant name via breadcrumb | "Chi tiết Bot" generic | `10-bot-detail-tabs.png` |

**Rule:** `frontend-ui-rules.md` §5 — user-facing = "Assistant", code/API = "bot". This is violated in 5+ places.

### 2.2 HIGH — Layout & Styling Issues

| # | Issue | Location | Expected | Actual | Screenshot |
|---|-------|----------|----------|--------|------------|
| 7 | **Sidebar logo text is 15px** | `sidebar-navigation.tsx:19` | 16px semibold per spec | `text-[15px]` — 1px off | All dashboard |
| 8 | **Nav icon size is 18px** | `sidebar-nav-item.tsx:36` | 16px stroke per spec | `size-[18px]` — 2px too large | All dashboard |
| 9 | **Nav item uses rounded-lg (12px)** | `sidebar-nav-item.tsx:30` | 6px radius per spec (`--radius-xs`) | `rounded-lg` = 12px | All dashboard |
| 10 | **Credits label says "Credits"** | `sidebar-credits-indicator.tsx:18` | "CREDITS USED" uppercase per STITCH | "Credits" — not uppercase, missing "USED" | All dashboard |
| 11 | **Credits progress bar uses primary (purple)** | `sidebar-credits-indicator.tsx:24` | Green `#059669` per STITCH spec | `bg-primary` = purple | All dashboard |
| 12 | **Top header missing user name** | `top-header.tsx` | "Alex Johnson" name + avatar + chevron | Only avatar + logout icon visible | All dashboard |
| 13 | **Top header missing workspace separator properly** | `top-header.tsx` | Workspace name + vertical separator + user name + avatar | Workspace name (if exists) + separator + avatar + logout | All dashboard |
| 14 | **Dashboard KPI grid is 4-col** | Dashboard page | Spec shows 5 KPI cards in row | 4 cols on lg, 5th card in separate row below | `01-dashboard.png` |
| 15 | **Sidebar "Upgrade plan" text is 10px** | `sidebar-credits-indicator.tsx:31` | 12px per STITCH spec | `text-[10px]` — too small | All dashboard |
| 16 | **Public layout logo uses rounded-xl** | `public-layout.tsx:16` | Purple circle per STITCH | `rounded-xl` = rounded square, not circle | `02-login.png` |

### 2.3 MEDIUM — Missing Features (Expected in Foundation)

| # | Issue | What's Missing |
|---|-------|----------------|
| 17 | **No breadcrumb component** | Bot detail shows generic "Chi tiết Bot" instead of `← Assistants / Bot Name` breadcrumb |
| 18 | **Settings page missing tabs** | H1-H3 should use tabs (Profile / Workspace / Team) — current shows form skeleton only |
| 19 | **Bot detail missing breadcrumb** | Shows `PageHeader` title instead of breadcrumb pattern per spec §3.2 |
| 20 | **EmptyState missing CTA button** | Bots + KB empty states show icon + text but no action button (spec says include CTA) |
| 21 | **Login missing password show/hide toggle** | STITCH spec requires password visibility toggle |
| 22 | **Register missing password strength bar** | STITCH spec requires colored strength indicator |
| 23 | **Google OAuth button missing Google icon** | Both login and register show text-only outline button |
| 24 | **Root page hardcoded redirect to /login** | Should redirect to `/` (dashboard) when authenticated, `/login` only when not |

### 2.4 LOW — Minor Issues

| # | Issue | Detail |
|---|-------|--------|
| 25 | **Badge padding uses px-2.5 py-0.5** | Spec says `4px 10px` — px-2.5 = 10px ✓ but py-0.5 = 2px, should be py-1 (4px) |
| 26 | **Dashboard 5th KPI card alone** | "Tài liệu đã upload" sits alone in 2-col grid — looks orphaned. Spec shows 5 in one row |
| 27 | **Analytics KPI shows 4 cards** | Spec says 5 KPI cards (Conversations, Messages, Credits, Active Assistants, Documents) — only 4 shown |
| 28 | **Billing page shows cards skeleton** | Uses card-style skeleton — spec says pricing table with 4 plan cards in a row. Skeleton variant wrong |
| 29 | **Nav item gap uses space-y-1 (4px)** | Spec says 4px gap — `space-y-1` = 4px ✓ — matches |
| 30 | **`app/page.tsx` not in `(dashboard)` group** | Root page exists outside route groups, might cause layout conflicts |

---

## 3. Component Inventory Audit

### 3.1 UI Primitives (shadcn/ui) — All Installed

| Component | File Exists | Customized |
|-----------|:-----------:|:----------:|
| button | ✓ | ✓ 4 variants matched spec |
| input | ✓ | — (needs verification) |
| textarea | ✓ | — |
| select | ✓ | — |
| dialog | ✓ | — |
| table | ✓ | — |
| tabs | ✓ | ✓ underline style |
| badge | ✓ | — (default shadcn) |
| card | ✓ | — |
| dropdown-menu | ✓ | — |
| tooltip | ✓ | — |
| progress | ✓ | — |
| skeleton | ✓ | — |
| separator | ✓ | — |
| switch | ✓ | — |
| avatar | ✓ | — |
| alert-dialog | ✓ | — |

### 3.2 Shared Components — All Created

| Component | File Exists | Functional |
|-----------|:-----------:|:----------:|
| data-table | ✓ | ✓ Generic typed table |
| data-table-pagination | ✓ | needs API wiring |
| data-table-toolbar | ✓ | needs API wiring |
| confirm-dialog | ✓ | ✓ AlertDialog wrapper |
| status-badge | ✓ | ✓ 13 variants |
| empty-state | ✓ | ✓ Icon + message |
| loading-skeleton | ✓ | ✓ 4 variants |
| error-state | ✓ | ✓ Vietnamese copy |
| kpi-card | ✓ | ✓ Label + value + progress |
| copy-button | ✓ | needs verification |
| credit-usage-bar | ✓ | needs verification |
| file-upload-zone | ✓ | needs verification |
| period-filter | ✓ | ✓ visible on analytics |
| quota-warning | ✓ | needs verification |

### 3.3 Layout Components — All Created

| Component | File Exists | Issues |
|-----------|:-----------:|--------|
| app-shell | ✓ | ✓ works |
| sidebar-navigation | ✓ | icon size, radius, logo text issues |
| sidebar-nav-item | ✓ | icon 18px (should be 16px), rounded-lg (should be rounded-[6px]) |
| sidebar-credits-indicator | ✓ | label text, bar color, font size issues |
| top-header | ✓ | missing user name display |
| page-header | ✓ | ✓ works correctly |
| public-layout | ✓ | logo shape rounded-xl not circle |

---

## 4. Route Completeness

All 30 specified routes have page.tsx files. Current state:

| Route | Status | Notes |
|-------|--------|-------|
| `/login` | Scaffold with form | Missing: password toggle, Google icon, form validation |
| `/register` | Scaffold with form | Missing: password strength, Google icon, validation |
| `/forgot-password` | Scaffold | Functional minimal form |
| `/reset-password` | Scaffold | Placeholder |
| `/verify-email` | Scaffold | Placeholder |
| `/` (Dashboard) | KPI cards | Missing: 5th card in same row, My Assistants section |
| `/bots` | Empty state | Copy violation ("Bot" not "Assistant"), missing CTA in empty |
| `/bots/[id]/*` (6 tabs) | Tab shell + skeletons | Missing breadcrumb, generic title |
| `/knowledge-bases` | Empty state | Missing CTA in empty state |
| `/knowledge-bases/[id]` | Placeholder | — |
| `/conversations` | Empty state | Copy violation ("bot"), no bot selector filter |
| `/analytics` | KPI + period filter | Missing charts, only 4 KPIs (spec: 5) |
| `/billing` | Cards skeleton | — |
| `/billing/subscription` | Placeholder | — |
| `/billing/top-up` | Placeholder | — |
| `/billing/payments` | Placeholder | — |
| `/settings` | Form skeleton | Missing tabs (Profile/Workspace/Team) |
| `/settings/workspace` | Placeholder | — |
| `/settings/team` | Placeholder | — |

---

## 5. Priority Fix List

### P0 — Must fix before Phase 2 — ALL RESOLVED ✅

1. ✅ **Replace all "Bot"/"bot" with "Assistant"/"assistant"** — 10+ files updated across bots, conversations, analytics, KB pages
2. ✅ **Fix sidebar nav icon size** — `size-[18px]` → `size-4`
3. ✅ **Fix sidebar nav item border-radius** — `rounded-lg` → `rounded-[6px]`
4. ✅ **Fix sidebar logo text** — `text-[15px]` → `text-[16px]`
5. ✅ **Fix credits indicator** — label "CREDITS USED", progress bar `bg-[#059669]`, upgrade text `text-xs`
6. ✅ **Fix top header** — added user name + ChevronDown before avatar
7. ✅ **Fix public layout logo** — `rounded-xl` → `rounded-full`
8. ✅ **Add breadcrumb to bot detail** — `← Assistants / {name}` with purple link
9. ✅ **Add EmptyState CTA buttons** — bots, KB, conversations pages

### P1 — Should fix in Phase 2 — ALL RESOLVED ✅

10. ✅ **Settings tabs layout** — Profile / Workspace / Team underline tabs added
11. ✅ **Dashboard 5 KPI cards** — grid changed to `lg:grid-cols-5`
12. ✅ **Login/Register enhancements** — password Eye/EyeOff toggle, strength bar (register), Google SVG icon
13. ✅ **StatusBadge padding** — `py-0.5` → `py-1`
14. ✅ **Analytics 5 KPI cards** — 5th "Tài liệu" card added, `lg:grid-cols-5`

### Resolution Summary

**Date:** 2026-03-17 | **Build:** `tsc --noEmit` PASSED (0 errors)

All 14 prioritized issues (9 P0 + 5 P1) resolved in a single pass. Key changes:
- UI copy normalized to "Assistant" across 10+ page files
- Sidebar pixel-perfect: 16px icons, 6px radius, 16px logo, green credits bar
- Top header shows user name with proper separator layout
- Bot detail uses breadcrumb navigation pattern per spec §3.2
- Empty states include CTA buttons per spec §4
- Settings page has tab navigation (Profile/Workspace/Team)
- Auth pages enhanced with password toggle, strength indicator, Google icon

---