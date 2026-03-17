# Frontend Design System — Smartbot v2 Platform

**Last Updated:** 2026-03-17
**Companion doc:** `docs/frontend-ui-rules.md` (design tokens, component patterns, copy rules).
**This doc:** implementation-oriented patterns, Tailwind config, shadcn/ui mapping, page templates, reuse map, inconsistency log.

---

## 1. Tailwind CSS Variable Configuration

Map design tokens from `frontend-ui-rules.md` to CSS custom properties in `globals.css`.
shadcn/ui reads these via `components.json` → `cssVariables: true`.

### 1.1 CSS Variables (`src/styles/globals.css`)

```css
@layer base {
  :root {
    /* Primary */
    --primary: 263 70% 50%;           /* #6D28D9 */
    --primary-foreground: 0 0% 100%;  /* white */
    --primary-hover: 263 73% 42%;     /* #5B21B6 */
    --primary-light: 263 83% 95%;     /* #EDE9FE */

    /* Semantic */
    --success: 160 84% 39%;           /* #059669 */
    --success-light: 152 81% 96%;     /* #ECFDF5 */
    --warning: 38 92% 50%;            /* #D97706 */
    --warning-light: 48 96% 89%;      /* #FFFBEB */
    --destructive: 0 72% 51%;         /* #DC2626 */
    --destructive-light: 0 86% 97%;   /* #FEF2F2 */
    --info: 217 91% 60%;              /* #2563EB */
    --info-light: 214 100% 97%;       /* #EFF6FF */

    /* Surface & Background */
    --background: 210 20% 98%;        /* #F9FAFB */
    --card: 0 0% 100%;               /* #FFFFFF */
    --popover: 0 0% 100%;
    --muted: 220 14% 96%;            /* #F3F4F6 */

    /* Borders */
    --border: 220 13% 91%;           /* #E5E7EB */
    --border-light: 220 14% 96%;     /* #F3F4F6 */
    --input: 220 13% 91%;            /* same as border */
    --ring: 263 83% 95%;             /* #EDE9FE — focus ring */

    /* Text */
    --foreground: 220 13% 9%;        /* #111827 */
    --text-body: 215 14% 34%;        /* #374151 */
    --text-secondary: 220 9% 46%;    /* #6B7280 */
    --text-muted: 218 11% 65%;       /* #9CA3AF */

    /* Radius */
    --radius: 0.75rem;               /* 12px — card default */
    --radius-sm: 0.5rem;             /* 8px — buttons, inputs */
    --radius-xs: 0.375rem;           /* 6px — nav active */
    --radius-pill: 9999px;           /* badges */
  }
}
```

### 1.2 Tailwind Config Extensions (`tailwind.config.ts`)

```typescript
// Extend only what shadcn/ui defaults don't cover
const config = {
  theme: {
    extend: {
      colors: {
        'primary-hover': 'hsl(var(--primary-hover))',
        'primary-light': 'hsl(var(--primary-light))',
        success: 'hsl(var(--success))',
        'success-light': 'hsl(var(--success-light))',
        warning: 'hsl(var(--warning))',
        'warning-light': 'hsl(var(--warning-light))',
        info: 'hsl(var(--info))',
        'info-light': 'hsl(var(--info-light))',
        'border-light': 'hsl(var(--border-light))',
        'text-body': 'hsl(var(--text-body))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-muted': 'hsl(var(--text-muted))',
      },
      fontSize: {
        'page-title': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'section-heading': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'card-title': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['13px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.4' }],
        'credits-label': ['10px', { lineHeight: '1.2', fontWeight: '400' }],
      },
      width: {
        sidebar: '220px',
      },
      height: {
        header: '56px',
        'table-row': '56px',
      },
      spacing: {
        'content-pad': '32px',
        'card-pad': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        widget: '0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
};
```

---

## 2. shadcn/ui Component Customization

### 2.1 Required Primitives

Install via `npx shadcn@latest add`:

| Primitive | Used by | Customization |
|-----------|---------|---------------|
| `button` | All pages | 4 variants: default (primary), secondary, destructive (danger), ghost |
| `input` | Forms | 36px height, 8px radius, 12px padding |
| `textarea` | C3 personality, D3 text input | Same input styling |
| `select` | Filters, dropdowns | Same input sizing |
| `dialog` | 11 modals (Section K) | 480px default width, 420px for auth |
| `table` | C1, D1, D3, E1, G4, H3 | 56px row height, uppercase headers |
| `tabs` | C2-C7 bot detail, H1-H3 settings | Underline style, not default pills |
| `badge` | Status badges everywhere | Pill shape, semantic colors |
| `card` | KPI, assistant, pricing | 12px radius, 20px pad, card shadow |
| `dropdown-menu` | Table row actions (three-dot) | Standard |
| `tooltip` | Error messages on hover | Standard |
| `progress` | Credit bars, document processing | 4px height variant |
| `skeleton` | Loading states | Match page layout |
| `separator` | Card dividers | Standard |
| `switch` | Toggle fields (C3, C4, D4) | 36x20px, on=#6D28D9 |
| `avatar` | Sidebar, header, cards | 32/40/48/80px sizes |
| `alert-dialog` | Confirm delete pattern | Standard |

### 2.2 Button Variant Mapping

shadcn/ui `Button` → extend with 4 variants matching design spec:

| Design variant | shadcn variant | Tailwind overrides |
|---------------|---------------|-------------------|
| Primary | `default` | `bg-primary text-white hover:bg-primary-hover h-9 rounded-sm text-[13px] font-semibold` |
| Secondary | `outline` | `border-primary text-primary hover:bg-primary-light h-9 rounded-sm text-[13px] font-semibold` |
| Danger | `destructive` | `bg-white border border-destructive text-destructive hover:bg-destructive-light h-9 rounded-sm text-[13px] font-semibold` |
| Ghost | `ghost` | `text-primary hover:bg-primary-light h-9 rounded-sm text-[13px] font-semibold` |

Note: shadcn default `destructive` variant uses filled red bg. Override to white bg + red border per design spec.

### 2.3 Tabs Customization

Default shadcn tabs use a "pills" style. Design spec requires **underline tabs**:

```
Active tab: #6D28D9 text + 2px bottom border
Inactive tab: #6B7280 text, hover #374151
```

Customize `TabsList` + `TabsTrigger` to remove background pill and add bottom border.
Used in: bot detail (6 tabs), settings (3 tabs).

### 2.4 Badge/StatusBadge Mapping

Create `StatusBadge` shared component wrapping shadcn `Badge`:

```typescript
type StatusVariant =
  | 'active' | 'draft' | 'processing' | 'error' | 'paused'
  | 'completed' | 'failed' | 'pending' | 'refunded'
  | 'invited' | 'subscription' | 'top-up' | 'refund';
```

Each variant maps to a bg/text color pair from `frontend-ui-rules.md` Section 2.2.
All badges: 12px text, 4px 10px padding, pill radius.

---

## 3. Page Layout Templates

### 3.1 Template: List Page

**Used by:** C1 (Assistants), D1 (KBs), D3 (Documents), E1 (Conversations), G4 (Payments), H3 (Team)

```
┌─────────────────────────────────────────────┐
│ PageHeader: title (left) + CTA button (right)│
├─────────────────────────────────────────────┤
│ Toolbar: search + filter dropdowns           │
├─────────────────────────────────────────────┤
│ DataTable or CardGrid                        │
│  ... rows/cards ...                          │
├─────────────────────────────────────────────┤
│ Pagination: "Showing X of Y" + Prev/Next     │
└─────────────────────────────────────────────┘
```

**Required states:** Loading (skeleton), Empty (centered icon+message+CTA), Error (icon+message+retry), Success (table/cards).

**Shared components used:**
- `PageHeader` — title + action slot
- `DataTableToolbar` — search input + filter selects
- `DataTable` — generic paginated table
- `DataTablePagination` — page controls
- `EmptyState` — empty state pattern
- `LoadingSkeleton` — skeleton per layout
- `ErrorState` — error with retry

**Variations:**
- C1 uses **card grid** (2 columns) instead of table rows
- D3 includes **3 add buttons** (Upload Files, Add URL, Add Text) in toolbar
- E1 has **bot selector** as first filter control
- G4 includes **Export CSV** button in toolbar

### 3.2 Template: Detail Page with Tabs

**Used by:** C2-C7 (Bot detail), H1-H3 (Settings)

```
┌─────────────────────────────────────────────┐
│ Breadcrumb: ← Parent / Entity Name           │
├─────────────────────────────────────────────┤
│ TabBar: Tab1 | Tab2 | Tab3 | ...             │
├─────────────────────────────────────────────┤
│                                               │
│ Tab Content (varies per tab)                  │
│                                               │
│ Bottom actions: secondary | danger | primary  │
└─────────────────────────────────────────────┘
```

**Implementation:** Next.js nested layout at `[botId]/layout.tsx` renders breadcrumb + tabs. Each tab is a child route.

**Bot detail tabs (6):** General, Personality, Widget, API & Embed, Knowledge Bases, Channels
**Settings tabs (3):** Profile, Workspace, Team Members

### 3.3 Template: Detail Page (Breadcrumb Only)

**Used by:** D2 (KB detail), D4 (Document detail), E2 (Conversation detail), G3 (Top-up), G4 (Payment history)

```
┌─────────────────────────────────────────────┐
│ Breadcrumb: ← Parent / Entity Name           │
├─────────────────────────────────────────────┤
│                                               │
│ Content sections (cards stacked vertically)   │
│                                               │
└─────────────────────────────────────────────┘
```

### 3.4 Template: Two-Column Form + Preview

**Used by:** C3 (Personality), C4 (Widget)

```
┌────────────────────┬──────────────────┐
│ Form Column         │ Preview Column    │
│                     │                   │
│ Section 1           │ Live preview      │
│ Section 2           │ of changes        │
│ ...                 │                   │
│                     │                   │
│ [Save] button       │                   │
└────────────────────┴──────────────────┘
```

**Column ratios:**
| Screen | Form | Preview |
|--------|------|---------|
| C3 Personality | 58% | 42% |
| C4 Widget | 55% | 45% |

Implementation: `grid grid-cols-[58fr_42fr]` or `grid grid-cols-[55fr_45fr]`. Not a shared component — each page defines its own grid since ratios differ.

### 3.5 Template: Two-Column Chat + Panel

**Used by:** E2 (Conversation detail)

```
┌────────────────────────────┬────────────┐
│ Chat Thread (68%)           │ Panel (32%) │
│ ┌────────────────────────┐ │ User Info   │
│ │ Header: user + channel │ │ Metrics     │
│ ├────────────────────────┤ │ Feedback    │
│ │ Messages (scrollable)  │ │             │
│ │  Bot bubble (left)     │ │             │
│ │  User bubble (right)   │ │             │
│ └────────────────────────┘ │             │
└────────────────────────────┴────────────┘
```

Column ratio: `grid grid-cols-[68fr_32fr]`

### 3.6 Template: Auth Page

**Used by:** A1-A5 (Register, Login, Forgot PW, Reset PW, Verify Email)

```
┌─────────────────────────────────────────┐
│            #F9FAFB background            │
│                                          │
│         Smartbot logo (centered)         │
│         Tagline text (centered)          │
│                                          │
│        ┌──────────────────────┐          │
│        │   420px white card    │          │
│        │   Form fields         │          │
│        │   CTA button          │          │
│        │   Divider + OAuth     │          │
│        │   Footer link         │          │
│        └──────────────────────┘          │
│                                          │
└─────────────────────────────────────────┘
```

No sidebar, no header. Uses `(public)/layout.tsx`.

### 3.7 Template: Pricing/Selection Cards

**Used by:** G1 (Plans), G3 (Credit packages, Payment method)

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Card 1│ │Card 2│ │Card 3│ │Card 4│
│      │ │ SEL  │ │      │ │      │
│      │ │(purp)│ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘
```

Selectable card pattern (per `frontend-ui-rules.md` Section 7):
- Unselected: white bg, 1px #E5E7EB border
- Selected: #EDE9FE bg, 2px #6D28D9 border

---

## 4. Shared Component Reuse Map

### 4.1 Cross-Screen Usage

| Component | Screens | Props shape |
|-----------|---------|-------------|
| `AppShell` | All dashboard pages | `children` |
| `SidebarNavigation` | All dashboard pages | Active derived from route |
| `TopHeader` | All dashboard pages | User from auth store |
| `PageHeader` | B2, C1, D1, E1, F1, G1, G2, G3, G4, H1 | `title`, `breadcrumb?`, `actions?` |
| `DataTable` | D1, D3, E1, G4, H3, C6 | `columns`, `data`, `onRowClick?` |
| `DataTablePagination` | Same as DataTable | `meta: {total, page, limit}` |
| `DataTableToolbar` | C1, D1, D3, E1, G4 | `search?`, `filters[]`, `actions?` |
| `StatusBadge` | C1, D1, D3, E1, G2, G4, H3 | `status: StatusVariant` |
| `KpiCard` | B2 (5), F1 (5), G2 (1) | `label`, `value`, `icon?`, `progress?` |
| `ConfirmDialog` | C1, C2, C6, D1, D2, D3, E1, H3 | `title`, `message`, `onConfirm` |
| `EmptyState` | C1, D1, D3, E1, G4, C6 | `icon`, `title`, `description`, `action` |
| `LoadingSkeleton` | Every page | Variant per layout template |
| `ErrorState` | Every page | `message`, `onRetry` |
| `CopyButton` | C5 (3x embed codes) | `text` |
| `FileUploadZone` | D3 upload modal | `onFiles`, `accept`, `maxSize` |
| `PeriodFilter` | F1, F2 analytics | `value: '7d'|'30d'|'90d'`, `onChange` |
| `QuotaWarning` | C1 (bot limit), H3 (member limit) | `current`, `max`, `upgradeHref` |
| `CreditUsageBar` | Sidebar bottom, B2, G2, G3 | `used`, `allocated`, `topUp?` |

### 4.2 Feature Component Inventory

Organized by route group. Each component receives data as props from the page.

**Auth (5 components):**
- `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `GoogleOAuthButton`

**Bots (11 components):**
- `BotCardGrid` (C1 — card layout, not table)
- `BotCreateDialog`, `BotConfigForm` (C2), `BotPersonalityForm` (C3)
- `BotWidgetConfig` + `BotWidgetPreview` (C4)
- `BotApiKeySection` + `BotEmbedCodeSection` (C5)
- `BotKbList` + `BotKbAttachDialog` (C6)
- `BotChannelList` (C7)

**Knowledge Bases (8 components):**
- `KbListTable` (D1), `KbCreateDialog`, `KbDetailForm` (D2)
- `DocumentListTable` (D3), `DocumentUploadDialog`, `DocumentUrlDialog`, `DocumentTextDialog`
- `DocumentDetailView` (D4)

**Conversations (6 components):**
- `ConversationListTable` (E1), `ConversationBotSelector`
- `ChatThread` + `ChatMessageBubble` + `ChatRagDebugPanel` + `ChatMessageFeedback` (E2)

**Analytics (7 components):**
- `AnalyticsKpiGrid`, `ConversationsChart`, `MessagesChart`, `CreditsChart`, `ChannelsPieChart`
- `TopQuestionsTable`, `SatisfactionChart`

**Billing (6 components):**
- `PlansPricingTable` (G1), `SubscriptionDetailCard` (G2), `CreditUsageBar` (G2/G3)
- `TopUpForm` (G3), `PaymentHistoryTable` (G4), `PlanSelectDialog`

**Settings (4 components):**
- `ProfileForm` (H1), `WorkspaceForm` (H2), `TeamMembersTable` (H3), `InviteMemberDialog`

---

## 5. Interaction Patterns

### 5.1 Table Row Actions

All tables use three-dot menu (vertical ellipsis `MoreVertical` icon) in the last column.

**Dropdown items per entity:**
| Entity | Actions |
|--------|---------|
| Bot (C1) | View Details, Duplicate, Delete (red) |
| KB (D1) | View Details, Delete (red) |
| Document (D3) | Toggle enable, Reprocess, Delete (red) |
| Conversation (E1) | View, Archive (red) |
| Payment (G4) | Download Invoice |
| Team Member (H3) | Change Role, Remove (red) |

Pattern: last item in destructive actions is red text. Separator before destructive items.

### 5.2 Form Save Pattern

All edit forms follow the same flow:
1. Load current data → populate form (React Hook Form `defaultValues`)
2. User modifies fields
3. Bottom action row: `Cancel` (ghost) left + `Save Changes` (primary) right
4. On save: PATCH mutation → success toast "Lưu thành công" → invalidate query
5. On error: toast with error message

Used in: C2, C3, C4, D2, H1, H2.

### 5.3 Create Modal Pattern

All create actions use `Dialog` with form:
1. User clicks CTA button (e.g., "+ Create Assistant")
2. Modal opens: title, form fields, Cancel (ghost) + Create (primary)
3. On submit: POST mutation → success toast → close modal → invalidate list query → optionally redirect to detail

Modals: Bot Create, KB Create, Document Upload/URL/Text, KB Attach, Invite Member.

### 5.4 Delete Confirmation Pattern

Standard across 8+ screens using `ConfirmDialog` (wrapping `AlertDialog`):

```
Title: "Xóa [entity name]?"
Body: "Bạn có chắc muốn xóa [entity name]? Hành động này không thể hoàn tác."
Actions: "Hủy" (ghost) + "Xóa" (danger)
```

On confirm: DELETE mutation → success toast → redirect to list (if on detail) or refetch list.

### 5.5 Drag-to-Reorder Pattern

Used in C3 (suggested questions) and C6 (KB priority).

Implement with `@dnd-kit/core` + `@dnd-kit/sortable`:
- Visual handle: `⠿` grip icon on left
- On drop: call reorder/update API

### 5.6 Inline Toggle Pattern

Used in D3 (document enabled/disabled) and C4 (showPoweredBy).

Switch component. On change: immediate PATCH mutation (no save button needed), optimistic update via TanStack Query.

---

## 6. Modal/Dialog Inventory

Derived from Figma spec Section K. All use `Dialog` primitive.

| Dialog | Trigger screen | Width | Fields |
|--------|---------------|-------|--------|
| Create Bot | C1 | 480px | name (required), description |
| Create KB | D1 | 480px | name (required), description, chunkSize, chunkOverlap |
| Upload Documents | D3 | 520px | Dropzone + file queue |
| Add URL | D3 | 480px | URL input |
| Add Text | D3 | 480px | title + textarea |
| Attach KB | C6 | 480px | KB select dropdown + priority |
| Invite Member | H3 | 480px | email + role dropdown |
| Show API Key | C5 | 480px | Read-only key display + copy |
| Confirm Delete | 8+ screens | 420px | Warning text + confirm/cancel |
| Select Plan | G1 | 480px | Plan details + confirm upgrade |
| Payment Redirect | G3 | 420px | Redirect notice |

---

## 7. Data Display Conventions

### 7.1 Formatting

| Data type | Format | Example | Utility |
|-----------|--------|---------|---------|
| Currency (VND) | Dot thousands separator + ₫ suffix | `199.000₫` | `format-currency.ts` |
| Date | DD/MM/YYYY | `15/03/2026` | `format-date.ts` |
| Relative time | Vietnamese | `2 giờ trước`, `Hôm qua` | `format-date.ts` (date-fns vi locale) |
| Large numbers | Abbreviate at 1000+ | `1.2K`, `3.5M` | `format-number.ts` |
| Character counts | Full number with dot separator | `125.000` | `format-number.ts` |
| Percentages | Integer only | `42%` | — |

### 7.2 Pagination Convention

All list endpoints: `?page=1&limit=50&sortBy=createdAt&sortOrder=desc`
Response envelope: `{ data: T[], meta: { total, page, limit, totalPages } }`
UI: "Hiển thị X / Y" + "Trước" / "Tiếp" buttons.

### 7.3 Empty Values

| Scenario | Display |
|----------|---------|
| Null/undefined text | `—` (em dash) |
| No rating | "Chưa đánh giá" |
| No avatar | Colored circle with first letter of name |
| Zero count | `0` (never hide) |

---

## 8. Icon System

**Library:** Lucide React (tree-shakeable, shadcn/ui default).
**Size:** 16px stroke for navigation, 20px for card/section icons, 24px for empty states.

### Sidebar Navigation Icons

| Nav item | Lucide icon |
|----------|-------------|
| Dashboard | `LayoutGrid` |
| Assistants | `MessageSquare` |
| Knowledge Bases | `BookOpen` |
| Conversations | `MessageCircle` |
| Analytics | `BarChart` |
| Billing | `CreditCard` |
| Settings | `Settings` |

### Common Action Icons

| Action | Icon |
|--------|------|
| Create/Add | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Copy | `Copy` |
| Search | `Search` |
| Filter | `Filter` |
| More actions | `MoreVertical` |
| Close | `X` |
| Back/breadcrumb | `ArrowLeft` |
| Download | `Download` |
| Upload | `Upload` |
| External link | `ExternalLink` |
| Drag handle | `GripVertical` |

---

## 9. Responsive Breakpoints

Desktop-first SaaS layout. Sidebar behavior drives breakpoints.

| Breakpoint | Width | Sidebar | Layout |
|-----------|-------|---------|--------|
| Desktop | >= 1024px | Fixed 220px, always visible | Full layout |
| Tablet | 768-1023px | Collapsible, toggle in header | Content fills when collapsed |
| Mobile | < 768px | Hidden, hamburger opens overlay | Single column |

**Implementation:** Sidebar collapse state in `ui-store` (Zustand), persisted to localStorage.
**Card grids:** 2 columns on desktop (C1), 1 column on tablet/mobile.
**Two-column layouts:** Stack vertically on mobile (form above preview).

---

## 10. Inconsistency Log & Normalization Decisions

Issues found comparing Figma spec, STITCH prompts, UI rules, and architecture doc.

### 10.1 RESOLVED — Normalize Before Coding

| # | Issue | Source A | Source B | Decision |
|---|-------|----------|----------|----------|
| 1 | **C1 layout: cards vs table** | STITCH 2.1 shows card grid (2 cols) | Architecture doc has `bot-list-table.tsx` | **Use card grid.** Rename component to `BotCardGrid`. STITCH/Figma is visual source of truth. Other list pages (D1, E1, G4, H3) use tables. |
| 2 | **"Bots" vs "Assistants" in sidebar** | Figma spec B1 says "Bots" | STITCH design block says "Assistants" | **Use "Assistants".** STITCH design block is canonical. UI rules confirm: user-facing = "Assistant". |
| 3 | **E1 conversation row height** | STITCH 4.2 says 60px | UI rules say 56px for all tables | **Use 56px.** UI rules are the normalization target. STITCH 60px was a one-off deviation. |
| 4 | **Danger button style** | STITCH says "white bg, 1px #DC2626 border, #DC2626 text" | shadcn default `destructive` is filled red bg | **Override shadcn default** to match STITCH: white bg + red border + red text. |
| 5 | **Settings sub-nav** | STITCH 6.1 says "Sub-tabs at top" | Bot detail uses breadcrumb + tabs | **Both use horizontal tabs.** Settings at `/settings` layout renders tabs (Profile/Workspace/Team). Same `Tabs` component, same underline style. |
| 6 | **Sidebar bottom** | STITCH: Credits + progress bar + "Upgrade plan" | Architecture doc: "45 / 100" + progress + "Upgrade plan" | **Same intent, no conflict.** Implement: "CREDITS USED" label (10px uppercase), "45 / 100" (13px), 4px progress bar, "Upgrade plan" link. |
| 7 | **Header right content** | STITCH: "Alex Johnson" + avatar + chevron | Figma spec B1: "tên user, avatar, tên workspace" | **Include both.** Show workspace name (small text) + user name + avatar + dropdown. Workspace name is useful context. |
| 8 | **Dashboard assistant cards vs C1 cards** | B2 shows 3 cards in row | C1 shows 2-col card grid | **Different layouts are intentional.** B2 = summary (3 cards, horizontal row, fewer stats). C1 = full list (2-col grid, more stats). Reuse card subcomponents (avatar + name + badge) but different card compositions. |

### 10.2 OPEN — Needs Figma Verification

| # | Issue | Notes |
|---|-------|-------|
| 1 | **Two-column ratios (C3: 58/42, C4: 55/45)** | Minor difference. Could normalize to 60/40 for both. Verify with Figma before deciding. |
| 2 | **E2 chat header bar styling** | STITCH 4.3 describes a header inside the chat column. Not in UI rules. Need Figma for exact styling. |
| 3 | **D4 processing stepper** | STITCH 4.1b describes a horizontal 3-step stepper (Extracting → Chunking → Embedding). No shared component spec. May need custom component or could use simple visual indicator. |
| 4 | **G1 "Popular" badge position** | STITCH 5.2 says "top banner/badge" + "3px purple top border". Exact badge placement needs Figma. |
| 5 | **Avatar color generation** | Dashboard cards use colored circles (purple, green, orange, blue) with white initials. Need deterministic color assignment rule (e.g., hash of name → fixed palette). |

---

## 11. Build Order Recommendation

Based on dependency analysis and component reuse:

**Phase 1 — Foundation (shared infrastructure):**
1. Tailwind config + CSS variables
2. shadcn/ui primitives installation + customization (Button, Input, Badge, etc.)
3. `AppShell` layout: Sidebar + TopHeader + content wrapper
4. Shared components: PageHeader, StatusBadge, EmptyState, LoadingSkeleton, ErrorState, ConfirmDialog
5. API client (`lib/api/client.ts`) + auth store + auth hooks

**Phase 2 — Auth:**
6. Public layout + Login + Register + Forgot/Reset/Verify pages

**Phase 3 — Core CRUD:**
7. Dashboard page (B2) — uses KpiCard, assistant cards
8. Bot list (C1) — uses BotCardGrid, PageHeader, EmptyState
9. Bot detail shell + General tab (C2) — uses Tabs, Breadcrumb, BotConfigForm
10. KB list (D1) — uses DataTable, StatusBadge
11. KB detail + Documents (D2, D3) — uses DataTable, FileUploadZone

**Phase 4 — Advanced Features:**
12. Bot Personality (C3) — two-column form+preview
13. Bot Widget (C4) — two-column, selectable cards
14. Bot API & Embed (C5) — CopyButton, code blocks
15. Bot KBs + Channels (C6, C7)
16. Conversations (E1, E2) — chat bubbles, SSE streaming

**Phase 5 — Analytics & Billing:**
17. Analytics (F1, F2) — Recharts, PeriodFilter
18. Plans + Subscription (G1, G2) — pricing cards
19. Top-up + Payment History (G3, G4) — selectable cards, DataTable

**Phase 6 — Settings:**
20. Profile + Workspace + Team (H1, H2, H3) — forms, TeamMembersTable
