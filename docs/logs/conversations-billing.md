# Implementation Log — Conversations + Billing Scope

**Date:** 2026-03-17
**Branch:** feat/p3-ops
**Status:** Complete — 0 TypeScript errors

---

## Deliverables

### Files Created (22 new files)

**Type Definitions** (`src/lib/types/`):
- `conversation.ts` — Conversation, ConversationChannel, ConversationStatus
- `message.ts` — Message, RetrievalChunk
- `plan.ts` — Plan, PlanFeatures
- `subscription.ts` — Subscription, SubscriptionStatus, BillingCycle, BILLING_CYCLE_LABELS
- `credit-usage.ts` — CreditUsage
- `payment-history.ts` — PaymentRecord

**API Modules** (`src/lib/api/`):
- `conversations-api.ts` — 6 functions (list, getById, getMessages, archive, rate, messageFeedback)
- `billing-api.ts` — 8 functions (getPlans, subscription CRUD, creditUsage, topUp, getPayments)

**TanStack Query Hooks** (`src/lib/hooks/`):
- `use-conversations.ts` — 6 hooks with query invalidation
- `use-billing.ts` — 8 hooks with query invalidation

**Feature Components — Conversations** (`src/components/features/conversations/`):
- `conversation-list-table.tsx` — table with user, channel, messages, activity, status, rating columns
- `conversation-bot-selector.tsx` — dropdown filter by bot
- `chat-thread.tsx` — scrollable message list with header (operational view)
- `chat-message-bubble.tsx` — assistant (white bg) / user (#EDE9FE bg) bubbles
- `chat-message-feedback.tsx` — thumbs up/down buttons with mutation
- `chat-rag-debug-panel.tsx` — expandable Sources & Debug section
- `conversation-detail-metadata.tsx` — user info, metrics, feedback cards

**Feature Components — Billing** (`src/components/features/billing/`):
- `plans-pricing-table.tsx` — 4 plan cards with monthly/yearly toggle + feature checklist
- `subscription-detail-card.tsx` — current plan info + actions
- `top-up-form.tsx` — credit package selector + payment method + submit
- `payment-history-table.tsx` — DataTable with type/status badges + VND amounts
- `plan-select-dialog.tsx` — confirm upgrade/downgrade dialog

### Pages Updated (6 files)
- `conversations/page.tsx` — E1: bot selector + channel/status filters + search + DataTable + pagination
- `conversations/[convId]/page.tsx` — E2: 68/32 split, chat thread + metadata panel
- `billing/page.tsx` — G1: plans pricing with monthly/yearly toggle + upgrade dialog
- `billing/subscription/page.tsx` — G2: subscription card + credit usage + recent payments
- `billing/top-up/page.tsx` — G3: balance + package selector + payment method + order summary
- `billing/payments/page.tsx` — G4: type/status filters + DataTable + pagination + summary footer

---

## Architecture Compliance

- All pages handle 4 states: loading (skeleton), empty (icon + message), error (retry), success
- Vietnamese UI copy everywhere user-facing
- Files under 200 lines each
- Layer dependency rules followed (pages → features → shared → ui)
- Query key convention: `['conversations', params]`, `['plans']`, `['subscription']`, etc.
- Reuses existing shared components: DataTable, DataTableToolbar, DataTablePagination, StatusBadge, PageHeader, EmptyState, ErrorState, LoadingSkeleton, CreditUsageBar, KpiCard, ConfirmDialog
- No modifications to existing shared components or unrelated modules

## Design Compliance

- Selectable card pattern (packages, plans): unselected white/1px, selected #EDE9FE/2px purple
- "Popular" plan: 3px purple top border + floating badge
- Chat bubbles: assistant = white bg + 1px border, user = #EDE9FE bg
- Conversation list = operational admin view, NOT consumer chat
- VND format: `199.000₫` via formatVnd
- Date format: DD/MM/YYYY + relative time (Vietnamese locale)
- No message preview content in conversation list (timestamp only)
- No gradients, heavy shadows, or decorative illustrations

## Unresolved Questions

- `GET /api/v1/conversations` (global endpoint without botId) — assumed available but needs backend confirmation
- `ConversationBotSelector` currently receives empty bots array — needs wiring to `useBots()` hook when bots module is implemented
- Payment CSV export button is UI-only — no backend endpoint for CSV export yet
- `icon-sm` Button size variant used in pagination — may need confirmation it exists in the current shadcn/ui config
