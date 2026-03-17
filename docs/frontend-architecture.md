# Frontend Architecture — Smartbot v2 Platform (`smartbot-web`)

**Last Updated:** 2026-03-17

---

## 1. Recommended Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | **Next.js 15 (App Router)** | SSR for public/auth pages, RSC for dashboard, file-based routing |
| Language | **TypeScript (strict)** | Matches backend TS, catches type errors at compile time |
| UI Library | **shadcn/ui + Tailwind CSS v4** | Composable primitives, full control, no heavy runtime |
| Server State | **TanStack Query v5** | Cache, refetch, optimistic updates, SSE integration |
| Client State | **Zustand** | Lightweight, minimal boilerplate for auth/sidebar/modal state |
| Forms | **React Hook Form + Zod** | Mirrors backend DTO validation, performant uncontrolled forms |
| Charts | **Recharts** | Lightweight, composable, sufficient for 5 chart types in Analytics |
| HTTP Client | **ky** | Tiny fetch wrapper with interceptors, retry, JSON shorthand |
| SSE | **Native EventSource + custom hook** | Chat streaming; no heavy lib needed |
| Icons | **Lucide React** | Tree-shakeable, matches shadcn/ui defaults |
| Date/Time | **date-fns** | Lightweight, tree-shakeable, Vietnamese locale support |
| File Upload | **react-dropzone** | Drag-and-drop for document upload (D3) |
| Toast/Notification | **sonner** | shadcn/ui recommended, minimal API |

---

## 2. Route Architecture

Derived from 30 Figma screens (groups A-I). Two route groups: `(public)` and `(dashboard)`.

### 2.1. Public Routes (no auth)

| Route | Screen | Page |
|-------|--------|------|
| `/login` | A2 | Login form + Google OAuth |
| `/register` | A1 | Registration form |
| `/forgot-password` | A3 | Email input for reset link |
| `/reset-password` | A4 | New password form (token from URL) |
| `/verify-email` | A5 | Email verification result |

### 2.2. Dashboard Routes (auth required, AppShell layout)

| Route | Screen | Page |
|-------|--------|------|
| `/` | B2 | Dashboard KPIs + quick actions |
| `/bots` | C1 | Bot list (paginated, filterable) |
| `/bots/[botId]` | C2 | Bot detail — redirects to first tab |
| `/bots/[botId]/config` | C2 | General config tab |
| `/bots/[botId]/personality` | C3 | Personality tab |
| `/bots/[botId]/widget` | C4 | Widget config + preview tab |
| `/bots/[botId]/api-embed` | C5 | API key + embed code tab |
| `/bots/[botId]/knowledge-bases` | C6 | Attached KBs tab |
| `/bots/[botId]/channels` | C7 | Channel connections tab |
| `/knowledge-bases` | D1 | KB list |
| `/knowledge-bases/[kbId]` | D2 | KB detail + settings |
| `/knowledge-bases/[kbId]/documents` | D3 | Document list in KB |
| `/knowledge-bases/[kbId]/documents/[docId]` | D4 | Document detail |
| `/conversations` | E1 | Conversation list (bot selector + filters) |
| `/conversations/[convId]` | E2 | Chat thread + RAG debug panel |
| `/analytics` | F1 | Analytics overview (KPIs + charts) |
| `/analytics/bots/[botId]` | F2 | Bot-specific analytics |
| `/billing` | G1 | Plans pricing table |
| `/billing/subscription` | G2 | Current subscription + credit usage |
| `/billing/top-up` | G3 | Buy extra credits |
| `/billing/payments` | G4 | Payment history |
| `/settings` | H1 | Profile settings |
| `/settings/workspace` | H2 | Workspace/tenant settings |
| `/settings/team` | H3 | Team member management |

### 2.3. Widget Route (separate app, not in smartbot-web)

| Route | Screen | Notes |
|-------|--------|-------|
| `/widget/[botId]` | I1 | Embed chat widget — separate `smartbot-widget` package |

---

## 3. Folder Structure

Feature-based organization, kebab-case files, <200 lines per file.

```
smartbot-web/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (public)/                     # Public route group (no shell)
│   │   │   ├── layout.tsx                # Centered card layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── verify-email/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/                  # Auth route group (AppShell)
│   │   │   ├── layout.tsx                # AppShell: sidebar + header + main
│   │   │   ├── page.tsx                  # Dashboard (B2)
│   │   │   ├── bots/
│   │   │   │   ├── page.tsx              # Bot list (C1)
│   │   │   │   └── [botId]/
│   │   │   │       ├── layout.tsx        # Bot detail shell (tabs)
│   │   │   │       ├── page.tsx          # Redirect to /config
│   │   │   │       ├── config/
│   │   │   │       │   └── page.tsx      # C2
│   │   │   │       ├── personality/
│   │   │   │       │   └── page.tsx      # C3
│   │   │   │       ├── widget/
│   │   │   │       │   └── page.tsx      # C4
│   │   │   │       ├── api-embed/
│   │   │   │       │   └── page.tsx      # C5
│   │   │   │       ├── knowledge-bases/
│   │   │   │       │   └── page.tsx      # C6
│   │   │   │       └── channels/
│   │   │   │           └── page.tsx      # C7
│   │   │   ├── knowledge-bases/
│   │   │   │   ├── page.tsx              # KB list (D1)
│   │   │   │   └── [kbId]/
│   │   │   │       ├── page.tsx          # KB detail (D2)
│   │   │   │       └── documents/
│   │   │   │           ├── page.tsx      # Doc list (D3)
│   │   │   │           └── [docId]/
│   │   │   │               └── page.tsx  # Doc detail (D4)
│   │   │   ├── conversations/
│   │   │   │   ├── page.tsx              # Conv list (E1)
│   │   │   │   └── [convId]/
│   │   │   │       └── page.tsx          # Conv detail (E2)
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx              # Overview (F1)
│   │   │   │   └── bots/
│   │   │   │       └── [botId]/
│   │   │   │           └── page.tsx      # Bot analytics (F2)
│   │   │   ├── billing/
│   │   │   │   ├── page.tsx              # Plans (G1)
│   │   │   │   ├── subscription/
│   │   │   │   │   └── page.tsx          # G2
│   │   │   │   ├── top-up/
│   │   │   │   │   └── page.tsx          # G3
│   │   │   │   └── payments/
│   │   │   │       └── page.tsx          # G4
│   │   │   └── settings/
│   │   │       ├── page.tsx              # Profile (H1)
│   │   │       ├── workspace/
│   │   │       │   └── page.tsx          # H2
│   │   │       └── team/
│   │   │           └── page.tsx          # H3
│   │   │
│   │   ├── layout.tsx                    # Root layout (providers)
│   │   ├── not-found.tsx                 # 404
│   │   └── error.tsx                     # Global error boundary
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   └── ... (add via `npx shadcn@latest add`)
│   │   │
│   │   ├── layout/                       # App shell components
│   │   │   ├── app-shell.tsx             # Sidebar + header + content wrapper
│   │   │   ├── sidebar-navigation.tsx    # Nav items + icons + active state
│   │   │   ├── sidebar-nav-item.tsx      # Single nav link
│   │   │   ├── top-header.tsx            # User avatar + workspace name + logout
│   │   │   ├── page-header.tsx           # Page title + breadcrumb + actions slot
│   │   │   └── public-layout.tsx         # Centered card for auth pages
│   │   │
│   │   ├── shared/                       # Reusable compound components
│   │   │   ├── data-table.tsx            # Generic paginated table (used in C1, D1, D3, E1, G4, H3)
│   │   │   ├── data-table-pagination.tsx # Pagination controls
│   │   │   ├── data-table-toolbar.tsx    # Search + filters + actions
│   │   │   ├── confirm-dialog.tsx        # "Ban co chac muon xoa X?" pattern (K)
│   │   │   ├── status-badge.tsx          # Colored badge for entity statuses
│   │   │   ├── empty-state.tsx           # Illustration + message + CTA
│   │   │   ├── loading-skeleton.tsx      # Skeleton loader per layout pattern
│   │   │   ├── error-state.tsx           # Error illustration + retry button
│   │   │   ├── file-upload-zone.tsx      # Drag-and-drop upload area (D3)
│   │   │   ├── copy-button.tsx           # Click-to-copy with toast feedback
│   │   │   ├── kpi-card.tsx              # Metric card (B2, F1, G2)
│   │   │   ├── period-filter.tsx         # 7d/30d/90d toggle (F1)
│   │   │   └── quota-warning.tsx         # "Upgrade plan" banner
│   │   │
│   │   └── features/                     # Feature-specific (not reusable)
│   │       ├── auth/
│   │       │   ├── login-form.tsx
│   │       │   ├── register-form.tsx
│   │       │   ├── forgot-password-form.tsx
│   │       │   ├── reset-password-form.tsx
│   │       │   └── google-oauth-button.tsx
│   │       ├── bots/
│   │       │   ├── bot-list-table.tsx
│   │       │   ├── bot-create-dialog.tsx
│   │       │   ├── bot-config-form.tsx
│   │       │   ├── bot-personality-form.tsx
│   │       │   ├── bot-widget-config.tsx
│   │       │   ├── bot-widget-preview.tsx
│   │       │   ├── bot-api-key-section.tsx
│   │       │   ├── bot-embed-code-section.tsx
│   │       │   ├── bot-kb-list.tsx
│   │       │   ├── bot-kb-attach-dialog.tsx
│   │       │   └── bot-channel-list.tsx
│   │       ├── knowledge-bases/
│   │       │   ├── kb-list-table.tsx
│   │       │   ├── kb-create-dialog.tsx
│   │       │   ├── kb-detail-form.tsx
│   │       │   ├── document-list-table.tsx
│   │       │   ├── document-upload-dialog.tsx
│   │       │   ├── document-url-dialog.tsx
│   │       │   ├── document-text-dialog.tsx
│   │       │   ├── document-detail-view.tsx
│   │       │   └── document-processing-badge.tsx
│   │       ├── conversations/
│   │       │   ├── conversation-list-table.tsx
│   │       │   ├── conversation-bot-selector.tsx
│   │       │   ├── chat-thread.tsx
│   │       │   ├── chat-message-bubble.tsx
│   │       │   ├── chat-rag-debug-panel.tsx
│   │       │   ├── chat-message-feedback.tsx
│   │       │   └── conversation-rating-dialog.tsx
│   │       ├── analytics/
│   │       │   ├── analytics-kpi-grid.tsx
│   │       │   ├── conversations-chart.tsx
│   │       │   ├── messages-chart.tsx
│   │       │   ├── credits-chart.tsx
│   │       │   ├── channels-pie-chart.tsx
│   │       │   ├── top-questions-table.tsx
│   │       │   └── satisfaction-chart.tsx
│   │       ├── billing/
│   │       │   ├── plans-pricing-table.tsx
│   │       │   ├── subscription-detail-card.tsx
│   │       │   ├── credit-usage-bar.tsx
│   │       │   ├── top-up-form.tsx
│   │       │   ├── payment-history-table.tsx
│   │       │   └── plan-select-dialog.tsx
│   │       └── settings/
│   │           ├── profile-form.tsx
│   │           ├── workspace-form.tsx
│   │           ├── team-members-table.tsx
│   │           └── invite-member-dialog.tsx
│   │
│   ├── lib/
│   │   ├── api/                          # API client layer
│   │   │   ├── client.ts                 # ky instance with interceptors
│   │   │   ├── auth-api.ts               # Auth endpoints
│   │   │   ├── bots-api.ts               # Bot endpoints
│   │   │   ├── knowledge-bases-api.ts     # KB endpoints
│   │   │   ├── documents-api.ts           # Document endpoints
│   │   │   ├── conversations-api.ts       # Conversation endpoints
│   │   │   ├── analytics-api.ts           # Analytics endpoints
│   │   │   ├── billing-api.ts             # Billing endpoints
│   │   │   ├── channels-api.ts            # Channel endpoints
│   │   │   ├── users-api.ts               # User endpoints
│   │   │   └── tenants-api.ts             # Tenant endpoints
│   │   │
│   │   ├── hooks/                        # Custom React hooks
│   │   │   ├── use-bots.ts               # TanStack Query: bot CRUD
│   │   │   ├── use-knowledge-bases.ts     # TanStack Query: KB CRUD
│   │   │   ├── use-documents.ts           # TanStack Query: document ops
│   │   │   ├── use-conversations.ts       # TanStack Query: conversations
│   │   │   ├── use-analytics.ts           # TanStack Query: analytics
│   │   │   ├── use-billing.ts             # TanStack Query: billing
│   │   │   ├── use-auth.ts                # Auth actions (login, register, etc.)
│   │   │   ├── use-user.ts                # Current user + tenant
│   │   │   ├── use-team.ts                # TanStack Query: team members
│   │   │   ├── use-channels.ts            # TanStack Query: channels
│   │   │   ├── use-sse-chat.ts            # SSE streaming hook for chat
│   │   │   └── use-debounce.ts            # Input debounce utility
│   │   │
│   │   ├── stores/                       # Zustand client state
│   │   │   ├── auth-store.ts             # Tokens, user, tenant
│   │   │   └── ui-store.ts               # Sidebar collapsed, active modal
│   │   │
│   │   ├── types/                        # TypeScript interfaces
│   │   │   ├── api-responses.ts          # Envelope: {statusCode, message, data}
│   │   │   ├── user.ts
│   │   │   ├── tenant.ts
│   │   │   ├── bot.ts
│   │   │   ├── knowledge-base.ts
│   │   │   ├── document.ts
│   │   │   ├── conversation.ts
│   │   │   ├── message.ts
│   │   │   ├── channel.ts
│   │   │   ├── plan.ts
│   │   │   ├── subscription.ts
│   │   │   ├── credit-usage.ts
│   │   │   └── payment-history.ts
│   │   │
│   │   ├── validations/                  # Zod schemas (mirrors backend DTOs)
│   │   │   ├── auth-schemas.ts
│   │   │   ├── bot-schemas.ts
│   │   │   ├── kb-schemas.ts
│   │   │   ├── document-schemas.ts
│   │   │   └── settings-schemas.ts
│   │   │
│   │   └── utils/
│   │       ├── format-date.ts            # Vietnamese date formatting
│   │       ├── format-currency.ts        # VND formatting
│   │       ├── format-number.ts          # Number abbreviation (1.2K, 3.5M)
│   │       └── cn.ts                     # clsx + twMerge helper
│   │
│   └── styles/
│       └── globals.css                   # Tailwind base + CSS variables
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── components.json                       # shadcn/ui config
├── package.json
└── .env.local.example
```

---

## 4. Shared Layout (AppShell)

From Figma B1. Every dashboard page lives inside this shell.

```
┌──────────────────────────────────────────────────────────────┐
│ ┌────────────┐ ┌───────────────────────────────────────────┐ │
│ │            │ │ TOP HEADER                                │ │
│ │  SIDEBAR   │ │ ┌─────────────────┐   ┌─────┐ ┌───────┐ │ │
│ │            │ │ │ Page Breadcrumb  │   │Avatar│ │Logout │ │ │
│ │  Logo      │ │ └─────────────────┘   └─────┘ └───────┘ │ │
│ │            │ ├───────────────────────────────────────────┤ │
│ │  ────────  │ │                                           │ │
│ │  Dashboard │ │ PAGE HEADER                               │ │
│ │  Bots      │ │ ┌──────────────────────────┐ ┌─────────┐ │ │
│ │  KBs       │ │ │ Title + Description      │ │ Actions │ │ │
│ │  Convos    │ │ └──────────────────────────┘ └─────────┘ │ │
│ │  Analytics │ │                                           │ │
│ │  Billing   │ │ MAIN CONTENT AREA                        │ │
│ │  Settings  │ │                                           │ │
│ │            │ │  (page-specific content renders here)     │ │
│ │            │ │                                           │ │
│ │            │ │                                           │ │
│ │  ────────  │ │                                           │ │
│ │  Workspace │ │                                           │ │
│ │  name      │ │                                           │ │
│ └────────────┘ └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation Items

| Label | Icon (Lucide) | Route | Badge |
|-------|---------------|-------|-------|
| Dashboard | LayoutGrid | `/` | — |
| Assistants | MessageSquare | `/bots` | Active count |
| Knowledge Bases | BookOpen | `/knowledge-bases` | — |
| Conversations | MessageCircle | `/conversations` | — |
| Analytics | BarChart | `/analytics` | — |
| Billing | CreditCard | `/billing` | — |
| Settings | Settings | `/settings` | — |

**Sidebar bottom (pinned):** Credits used indicator — "45 / 100" with 4px progress bar + "Upgrade plan" link.

### Layout Behavior

- **Desktop (>=1024px):** Sidebar fixed 220px wide, always visible
- **Tablet (768-1023px):** Sidebar collapsible, toggle button in header
- **Mobile (<768px):** Sidebar hidden, hamburger menu opens overlay drawer
- Sidebar collapse state persisted in `ui-store` (Zustand)

---

## 5. Component Layering

4 layers, strict dependency direction (top depends on bottom):

```
Layer 4: PAGES
  └─ Route-level components (src/app/...)
  └─ Data fetching (TanStack Query hooks)
  └─ Compose feature + shared components
  └─ Handle loading/empty/error/success states

Layer 3: FEATURE COMPONENTS
  └─ Screen-specific UI (src/components/features/...)
  └─ Receive data as props from pages
  └─ May use shared components internally
  └─ May use hooks for mutations (create, update, delete)

Layer 2: SHARED COMPONENTS
  └─ Reusable across features (src/components/shared/...)
  └─ DataTable, ConfirmDialog, StatusBadge, KpiCard, etc.
  └─ Built on top of UI primitives
  └─ Accept generic props (columns, data, onAction)

Layer 1: UI PRIMITIVES
  └─ shadcn/ui components (src/components/ui/...)
  └─ Button, Input, Dialog, Table, Select, Badge, etc.
  └─ Styled via Tailwind, configured in components.json
  └─ Zero business logic
```

### Dependency Rules

- Pages import from all layers
- Feature components import from Layers 1-2 only
- Shared components import from Layer 1 only
- UI primitives import nothing from above

---

## 6. Data Fetching & API Client Strategy

### 6.1. API Client (`lib/api/client.ts`)

Single `ky` instance with interceptors:

```typescript
// Conceptual structure — not implementation code
const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL, // http://localhost:3000
  hooks: {
    beforeRequest: [attachAccessToken],       // JWT from auth store
    afterResponse: [handleTokenRefresh],      // 401 → refresh → retry
  },
});
```

**Interceptor chain:**
1. `beforeRequest` — Attach `Authorization: Bearer {accessToken}` header
2. `afterResponse` — On 401, call `/auth/refresh`, store new token, retry original request
3. `afterResponse` — Unwrap API envelope: `{statusCode, message, data}` → return `data`
4. Error transform — Map backend error format to consistent `ApiError` type

### 6.2. API Module Pattern

One file per backend controller. Each exports typed functions:

```typescript
// lib/api/bots-api.ts — conceptual
export const botsApi = {
  list: (params: BotListParams) => apiClient.get('api/v1/bots', { searchParams }),
  getById: (id: string) => apiClient.get(`api/v1/bots/${id}`),
  create: (data: CreateBotDto) => apiClient.post('api/v1/bots', { json: data }),
  update: (id: string, data: UpdateBotDto) => apiClient.patch(`api/v1/bots/${id}`, { json: data }),
  delete: (id: string) => apiClient.delete(`api/v1/bots/${id}`),
  // ...personality, widget, api-key, embed, kb attach/detach
};
```

### 6.3. TanStack Query Hooks

One custom hook file per domain. Wraps API calls with caching + mutation:

```typescript
// lib/hooks/use-bots.ts — conceptual
export function useBots(params) {
  return useQuery({ queryKey: ['bots', params], queryFn: () => botsApi.list(params) });
}
export function useBot(id: string) {
  return useQuery({ queryKey: ['bots', id], queryFn: () => botsApi.getById(id) });
}
export function useCreateBot() {
  return useMutation({ mutationFn: botsApi.create, onSuccess: () => invalidate(['bots']) });
}
```

**Query Key Convention:**
- List: `['entity', filterParams]` — e.g., `['bots', { status: 'active', page: 1 }]`
- Detail: `['entity', id]` — e.g., `['bots', 'uuid-123']`
- Sub-resource: `['parent', parentId, 'child', childParams]` — e.g., `['bots', botId, 'conversations', { page: 1 }]`

### 6.4. SSE Chat Streaming (`lib/hooks/use-sse-chat.ts`)

For conversation detail (E2) and widget chat:

```typescript
// Conceptual — SSE hook structure
function useSseChat(botId: string) {
  // POST /api/v1/chat/{botId}/messages
  // Read SSE stream: event: message, data: { chunk, index }
  // Accumulate chunks into full response
  // Handle event: done
  // Return: { sendMessage, messages, isStreaming }
}
```

### 6.5. Pagination Convention

All list endpoints return paginated data. Frontend uses consistent pattern:

- Query params: `?page=1&limit=50&sortBy=createdAt&sortOrder=desc`
- Response: `{ data: T[], meta: { total, page, limit, totalPages } }`
- UI: `DataTable` + `DataTablePagination` components handle display

---

## 7. Auth & Session Handling Strategy

### 7.1. Token Storage

| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| Access Token | Zustand (memory) | 15 min | API requests |
| Refresh Token | httpOnly cookie | 7 days | Silent refresh |

**Why not localStorage for access token:** XSS vulnerability. Memory is safer for short-lived tokens.
**Why httpOnly cookie for refresh:** Not accessible via JS, survives page reload.

### 7.2. Auth Flow

```
1. LOGIN / REGISTER
   └─ POST /auth/login → receive { accessToken, refreshToken }
   └─ Store accessToken in Zustand (auth-store)
   └─ refreshToken set as httpOnly cookie by backend (Set-Cookie header)
   └─ Redirect to /

2. AUTHENTICATED REQUEST
   └─ ky beforeRequest hook reads accessToken from auth-store
   └─ Attach Authorization: Bearer {token}

3. TOKEN EXPIRED (401)
   └─ ky afterResponse hook catches 401
   └─ POST /auth/refresh (cookie sent automatically)
   └─ Store new accessToken in auth-store
   └─ Retry original request

4. REFRESH EXPIRED
   └─ /auth/refresh returns 401
   └─ Clear auth-store
   └─ Redirect to /login

5. LOGOUT
   └─ POST /auth/logout (revoke refresh token)
   └─ Clear auth-store
   └─ Clear cookie
   └─ Redirect to /login
```

### 7.3. Route Protection

**Next.js Middleware (`middleware.ts`):**
- Runs on edge for every request
- Check for valid access token (or refresh token cookie)
- Public routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- Protected routes: everything else
- Redirect unauthenticated users to `/login`
- Redirect authenticated users away from `/login`, `/register`

### 7.4. Auth Context

`AuthProvider` wraps the root layout:
- Provides: `user`, `tenant`, `isAuthenticated`, `role`
- Sources from: `/api/v1/users/me` on initial load (TanStack Query, staleTime: 5min)
- Updates on: login, register, profile edit
- Used by: sidebar (workspace name), header (avatar), role-based UI gating

### 7.5. Role-Based UI

| Feature | Owner | Admin | Member | Viewer |
|---------|-------|-------|--------|--------|
| Bot CRUD | Yes | Yes | Read | Read |
| KB management | Yes | Yes | Read | Read |
| Team management | Yes | Yes | No | No |
| Billing/Subscription | Yes | No | No | No |
| Analytics | Yes | Yes | Yes | Read |
| Settings/Workspace | Yes | Yes | No | No |

**Implementation:** `useUser()` hook returns `role`. Components conditionally render actions:
```tsx
{(role === 'owner' || role === 'admin') && <Button>Create Bot</Button>}
```

---

## 8. Error Handling Strategy

### 8.1. API Error Format

Backend returns:
```json
{ "statusCode": 400, "message": "Validation failed", "error": "Bad Request" }
```

Frontend `ApiError` type:
```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
```

### 8.2. Page-Level States

Every page MUST handle 4 states (per CLAUDE.md rule):

| State | Component | Trigger |
|-------|-----------|---------|
| Loading | `<LoadingSkeleton />` | TanStack Query `isLoading` |
| Empty | `<EmptyState />` | Data array is empty |
| Error | `<ErrorState />` | TanStack Query `isError` |
| Success | Feature component | Data available |

### 8.3. Mutation Error Handling

- Form validation errors → inline field errors (Zod + React Hook Form)
- Server errors → toast notification (sonner)
- 403 Forbidden → "Khong co quyen truy cap" toast
- 429 Rate Limit → "Vui long thu lai sau" toast
- Network error → "Khong the ket noi server" toast

---

## 9. Environment Configuration

```bash
# .env.local.example
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Smartbot
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx
```

**Convention:** Only `NEXT_PUBLIC_` vars for client-side code. No secrets in frontend.

---

## 10. Key Architecture Decisions

| Decision | Choice | Alternatives Considered | Reason |
|----------|--------|-------------------------|--------|
| Framework | Next.js App Router | Vite + React Router, Remix | SSR for auth pages, RSC for performance, industry standard |
| UI | shadcn/ui + Tailwind | MUI, Ant Design, Chakra | Full control, no runtime CSS, copy-paste composable |
| State | TanStack Query + Zustand | Redux Toolkit, SWR + Context | TQ handles server cache; Zustand minimal for UI state |
| Forms | RHF + Zod | Formik + Yup | Better perf (uncontrolled), Zod type inference |
| HTTP | ky | axios, fetch wrapper | Smaller bundle, native fetch-based, good interceptor API |
| Charts | Recharts | Chart.js, Nivo, ECharts | Lightweight, React-native, sufficient for 5 chart types |
| Auth | Memory + httpOnly cookie | localStorage, next-auth | Secure, simple, matches custom JWT backend |

---

## 11. Performance Considerations

- **Code splitting:** Next.js automatic per-route splitting
- **Lazy loading:** `dynamic()` for heavy components (charts, code editors, widget preview)
- **Image optimization:** Next.js `<Image>` for avatars, logos
- **Bundle monitoring:** `@next/bundle-analyzer` to track size
- **TanStack Query caching:** `staleTime: 30s` for lists, `staleTime: 5min` for details
- **Prefetching:** Hover prefetch on sidebar links + bot list rows
