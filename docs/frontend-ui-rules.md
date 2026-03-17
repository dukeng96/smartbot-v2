# Frontend UI Rules — Smartbot v2 Platform

**Last Updated:** 2026-03-17
**Source of truth:** `docs/STITCH-PROMPTS.md` design system block + Figma screen spec.

---

## 1. Design Tokens

### 1.1 Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#6D28D9` | Buttons, active nav, links, focused borders |
| `--primary-hover` | `#5B21B6` | Button hover, link hover |
| `--primary-light` | `#EDE9FE` | Active nav bg, selected card bg, user chat bubble bg |
| `--success` | `#059669` | Active badges, progress fills, verified checks |
| `--success-light` | `#ECFDF5` | Active badge bg |
| `--warning` | `#D97706` | Paused badges, caution states |
| `--warning-light` | `#FFFBEB` | Paused/warning badge bg |
| `--error` | `#DC2626` | Error badges, danger buttons, destructive actions |
| `--error-light` | `#FEF2F2` | Error badge bg, error row tint |
| `--info` | `#2563EB` | Processing badges, info states |
| `--info-light` | `#EFF6FF` | Processing badge bg |
| `--surface` | `#FFFFFF` | Cards, sidebar, header |
| `--background` | `#F9FAFB` | Content area bg, page bg for auth |
| `--border` | `#E5E7EB` | Card borders, sidebar border, input borders, table headers |
| `--border-light` | `#F3F4F6` | Table row separators |
| `--text-primary` | `#111827` | Page titles, section headings, card titles |
| `--text-body` | `#374151` | Body text, input text, nav items |
| `--text-secondary` | `#6B7280` | Secondary text, inactive tabs |
| `--text-muted` | `#9CA3AF` | Captions, table headers, helpers |

### 1.2 Typography

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Page title | 22px | Semibold | `#111827` |
| Section heading | 16px | Semibold | `#111827` |
| Card title | 14px | Semibold | `#111827` |
| Body text | 13px | Regular | `#374151` |
| Secondary text | 13px | Regular | `#6B7280` |
| Caption / helper | 12px | Regular | `#9CA3AF` |
| Table header | 12px | Regular (uppercase) | `#9CA3AF` |
| Monospace (code/keys) | 13px | Regular | `#374151` |
| Sidebar nav item | 13px | Regular | `#374151` |
| Sidebar logo text | 16px | Semibold | `#111827` |
| Credits label | 10px | Regular (uppercase) | `#9CA3AF` |

### 1.3 Spacing & Sizing

| Element | Value |
|---------|-------|
| Sidebar width | 220px |
| Header height | 56px |
| Content padding | 32px |
| Card padding | 20px |
| Card border-radius | 12px |
| Card shadow | `0 1px 2px rgba(0,0,0,0.04)` |
| Button height | 36px |
| Button border-radius | 8px |
| Input height | 36px |
| Input border-radius | 8px |
| Input horizontal padding | 12px |
| Nav item padding | 8px vertical, 12px horizontal |
| Nav item gap | 4px |
| Nav active border-radius | 6px |
| Badge border-radius | 9999px (pill) |
| Badge padding | 4px 10px |
| Table row height | 56px |
| Avatar (nav) | 32px circle |
| Avatar (card) | 40-48px circle |
| Avatar (profile) | 80px circle |
| Icon size (nav) | 16px stroke |

---

## 2. Component Patterns

### 2.1 Buttons

| Variant | Background | Border | Text | Usage |
|---------|-----------|--------|------|-------|
| Primary | `#6D28D9` | — | white | Main actions: Save, Create, Submit |
| Secondary | white | `1px #6D28D9` | `#6D28D9` | Alternative actions: Duplicate, Export |
| Danger | white | `1px #DC2626` | `#DC2626` | Destructive: Delete, Revoke |
| Ghost | transparent | — | `#6D28D9` | Links-as-buttons: Cancel, Back, Add item |

All buttons: 36px height, 8px radius, 13px semibold text.

### 2.2 Status Badges (Pill)

| Status | Background | Text | Used on |
|--------|-----------|------|---------|
| Active | `#ECFDF5` | `#059669` | Bot, Channel, Subscription |
| Draft | `#F3F4F6` | `#6B7280` | Bot |
| Processing | `#EFF6FF` | `#2563EB` | Document, KB |
| Error | `#FEF2F2` | `#DC2626` | Document, KB, Payment |
| Paused | `#FFFBEB` | `#D97706` | Bot |
| Completed | `#ECFDF5` | `#059669` | Document, Payment |
| Failed | `#FEF2F2` | `#DC2626` | Payment |
| Pending | `#FFFBEB` | `#D97706` | Payment |
| Refunded | `#FFFBEB` | `#D97706` | Payment |
| Invited | `#EFF6FF` | `#2563EB` | Team member |
| Subscription | `#EDE9FE` | `#6D28D9` | Payment type |
| Top-up | `#EFF6FF` | `#2563EB` | Payment type |
| Refund | `#FFFBEB` | `#D97706` | Payment type |

All badges: 12px text, 4px 10px padding, 9999px radius.

### 2.3 Forms

- **Label:** 13px semibold `#374151`, 6px margin-bottom
- **Input:** 36px height, `1px #E5E7EB` border, 8px radius, 12px padding, 13px text
- **Focus state:** `#6D28D9` border + 2px `#EDE9FE` ring
- **Helper text:** 12px `#9CA3AF`, 4px margin-top
- **Toggle switch:** 36px wide, 20px tall, on=`#6D28D9`, off=`#E5E7EB`
- **Validation error:** red border + 12px `#DC2626` text below

### 2.4 Tables

- **Header row:** 12px uppercase `#9CA3AF`, `1px #E5E7EB` bottom border
- **Body rows:** 13px `#374151`, 56px height, `1px #F3F4F6` bottom border
- **Hover:** `#F9FAFB` background
- **Click:** navigates to detail page (cursor pointer)
- **Actions column:** three-dot menu (⋯) with dropdown

### 2.5 Cards

- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Radius: 12px
- Padding: 20px
- Shadow: `0 1px 2px rgba(0,0,0,0.04)`
- **No** heavy shadows, **no** colored backgrounds, **no** gradients

### 2.6 Modals / Dialogs

- Overlay: dark semi-transparent backdrop
- Width: 480px typical (420px for auth cards)
- Same card styling (white, 12px radius, 20px padding)
- Title: 16px semibold
- Actions bottom-right: Cancel (ghost) + Primary action
- Used for: create forms, confirmations, uploads (see Section K of Figma spec)

---

## 3. Layout Rules

### 3.1 Sidebar (NEVER changes)

Identical on every dashboard page. Does NOT change for detail/sub-pages.

- Width: 220px, white bg, `1px solid #E5E7EB` right border
- Top: Smartbot logo icon (purple circle) + "Smartbot" text
- Exactly 7 nav items in fixed order: Dashboard, Assistants, Knowledge Bases, Conversations, Analytics, Billing, Settings
- Active item: `#EDE9FE` bg, `#6D28D9` text+icon, 6px radius
- Hover (inactive): `#F9FAFB` bg
- Bottom (pinned): Credits used indicator + progress bar + "Upgrade plan" link

### 3.2 Sub-Navigation for Detail Pages

Bot detail and KB detail use **breadcrumb + horizontal tabs** inside the content area. Sidebar stays unchanged.

- **Breadcrumb:** `← Assistants / Customer Support Bot` — 13px, "←" and parent are `#6D28D9` links
- **Bot detail tabs:** General | Personality | Widget | API & Embed | Knowledge Bases | Channels
- **Active tab:** `#6D28D9` text + 2px bottom border
- **Inactive tab:** `#6B7280` text, hover `#374151`
- KB detail: breadcrumb only, no tabs

### 3.3 Page Header

- Located right of sidebar, below top header
- Left: page title (22px semibold)
- Right: primary action button(s)
- Below (optional): filter controls row (search, dropdowns, period selector)

### 3.4 Two-Column Layouts

Used for form+preview patterns:
- **C3 Personality:** form 58% | preview 42%
- **C4 Widget:** settings 55% | preview 45%
- **E2 Conversation:** chat 68% | metadata panel 32%

---

## 4. Page State Rules

Every page **MUST** handle 4 states:

| State | Component | Trigger |
|-------|-----------|---------|
| Loading | Skeleton matching page layout | `isLoading === true` |
| Empty | Icon + message + CTA button (centered) | Data array empty |
| Error | Error icon + message + "Thử lại" button | `isError === true` |
| Success | Feature component with data | Data available |

### Empty State Pattern

```
[icon — related to the entity]
"Chưa có [entity] nào"
"[Call to action description]"
[Primary action button]
```

Example: `"Chưa có assistant nào" / "Tạo assistant đầu tiên để bắt đầu" / [+ Tạo Assistant]`

---

## 5. Vietnamese UI Copy Rules

- All user-facing labels in Vietnamese by default
- Brand name: **"Smartbot"** (never translated)
- User-facing entity name: **"Assistant"** (not "Bot", "Agent", or "Chatbot")
- Code/API can use "bot" internally
- VND currency format: `199.000₫` (dot as thousands separator, ₫ suffix)
- Date format: `DD/MM/YYYY` (Vietnamese convention)
- Relative time: "2 giờ trước", "Hôm qua", "3 ngày trước"
- Common UI labels:
  - Save → "Lưu thay đổi"
  - Create → "Tạo mới"
  - Delete → "Xóa"
  - Cancel → "Hủy"
  - Search → "Tìm kiếm..."
  - Showing X of Y → "Hiển thị X / Y"
  - Previous / Next → "Trước / Tiếp"
  - Upgrade → "Nâng cấp"
  - Confirm delete → "Bạn có chắc muốn xóa X?"

---

## 6. Chat Bubble Styles

### Dashboard chat (E2 — conversation detail)

- **Assistant bubble:** left-aligned, white bg, `1px #E5E7EB` border
- **User bubble:** right-aligned, `#EDE9FE` bg
- **Timestamp:** 12px `#9CA3AF` below bubble
- **Feedback buttons:** 👍 👎 small, muted, below assistant bubbles
- **RAG debug:** expandable "Sources & Debug" section (collapsed default)

### Widget chat (I1 — embedded)

- **Header:** `#6D28D9` bg, white text, assistant name + green dot
- **Bot bubble:** left-aligned, `#F3F4F6` bg
- **User bubble:** right-aligned, `#EDE9FE` bg
- **Suggested questions:** chip/pill buttons below greeting
- **Footer:** "Powered by Smartbot" in 11px `#9CA3AF` (if `showPoweredBy=true`)
- **Input bar:** text input + purple send button (arrow icon)
- **Collapsed state:** 56px circle, `#6D28D9` bg, white chat icon, shadow `0 4px 12px rgba(0,0,0,0.15)`
- **Expanded size:** 380px × 560px, 16px radius

---

## 7. Selectable Card Pattern

Used for plan-gated features and multi-choice options:

- **Unselected:** white bg, `1px #E5E7EB` border
- **Selected:** `#EDE9FE` bg, `2px #6D28D9` border
- Used in: theme selection (C4), color presets (C4), credit packages (G3), payment method (G3), plan cards (G1)
- "Popular" badge: green accent on Advanced plan card + `3px #6D28D9` top border

---

## 8. Plan-Gated UI

Features locked behind plan tiers show:
- 🔒 Lock icon + feature name (grayed out)
- Text: "Chức năng này có ở gói [Plan] trở lên"
- "Nâng cấp" purple text link → navigates to Plans page (G1)
- Quota exceeded: banner with "Nâng cấp gói để tiếp tục" + action button

---

## 9. Absolute Prohibitions

Per design system spec — **NEVER** use:
- Gradients on any surface
- Colored sidebar backgrounds
- Sidebar that changes per page
- Icons larger than 16px in navigation
- Decorative illustrations or heavy shadows
- Percentage change badges on KPI cards (backend doesn't support comparison data)
- Message preview content in conversation list (only timestamp shown)
