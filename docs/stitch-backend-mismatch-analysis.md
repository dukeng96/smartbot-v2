# Stitch vs Backend Mismatch Analysis

> Cross-reference between `docs/STITCH-PROMPTS.md` (Google Stitch FE generation prompts) and `docs/backend-api-reference.md` (actual Prisma models + API routes). Also references `docs/figma-screen-spec.md` for screen completeness.

---

## 1. Stitch Coverage Summary

**27 of 30 screens have Stitch prompts.** 3 screens are missing.

| Round | Prompt | Screens | Status |
|-------|--------|---------|--------|
| 0 | 0.1 | B1 + B2 (App Shell + Dashboard) | Done |
| 1 | 1.1 | A1 + A2 (Register + Login) | Done |
| 1 | 1.2 | A3 + A4 + A5 (Forgot/Reset/Verify) | Done |
| 2 | 2.1 | C1 (Assistants List) | Done |
| 2 | 2.2 | C2 (Assistant Config) | Done |
| 2 | 2.3 | C3 (Personality) | Done |
| 2 | 2.4 | C4 (Widget Styling) | Done |
| 3 | 3.1 | C5 (API & Embed) | Done |
| 3 | 3.2 | C6 (Knowledge Bases tab) | Done |
| 3 | 3.3 | C7 (Channels) | Done |
| 3 | 3.4 | D1 (KB List) | Done |
| 4 | 4.1 | D2 + D3 (KB Detail + Documents) | Done |
| 4 | 4.2 | E1 (Conversations List) | Done |
| 4 | 4.3 | E2 (Conversation Detail) | Done |
| 5 | 5.1 | F1 + F2 (Analytics) | Done |
| 5 | 5.2 | G1 (Plans/Pricing) | Done |
| 5 | 5.3 | G2 (Subscription) | Done |
| 6 | 6.1 | H1 + H2 + H3 (Settings tabs) | Done |
| 7 | 7.1 | I1 (Chat Widget) | Done |
| — | — | **D4 (Document Detail)** | **MISSING** |
| — | — | **G3 (Top-up Credits)** | **MISSING** |
| — | — | **G4 (Payment History)** | **MISSING** |

---

## 2. Missing Stitch Prompts (3 Screens)

### 2.1. D4 — Document Detail

**Figma spec (lines 278-291):** Full detail page showing document metadata, processing status, timestamps, metadata JSON editor, reprocess/delete buttons.

**API:** `GET /knowledge-bases/:kbId/documents/:docId` + `PATCH .../documents/:docId`

**Why it matters:** D3 (doc list) shows summary rows only. D4 needs a dedicated page for metadata editing, processing step details, error diagnosis, and chunk preview.

**Action needed:** Write Stitch prompt for D4 with:
- Breadcrumb: "← Knowledge Bases / Product FAQs / report-2024.pdf"
- Document info card: originalName, sourceType badge, mimeType, fileSize, sourceUrl
- Processing status card: status badge, processingStep, progress bar, errorMessage (if error)
- Stats: charCount, chunkCount, processingStartedAt/completedAt timestamps
- Toggle: enabled switch
- Metadata section: JSON viewer/editor or key-value pairs
- Action buttons: "Reprocess" (secondary), "Delete" (danger)

### 2.2. G3 — Top-up Credits

**Figma spec (lines 416-426):** Credit purchase flow with package selection, payment method choice, gateway redirect.

**API:** `POST /credits/top-up` + `GET /credits/usage`

**Why it matters:** G2 has "Buy More Credits" button linking to G3 but there's no Stitch screen for the destination page.

**Action needed:** Write Stitch prompt for G3 with:
- Current credit usage display (bar: creditsUsed / creditsAllocated + topUpCredits)
- Credit package cards (e.g., 500 credits / 49K, 2000 credits / 179K, 5000 credits / 399K)
- Payment method selection: VNPay, MoMo radio cards
- "Purchase" primary button
- Redirect notice: "You will be redirected to payment gateway"

### 2.3. G4 — Payment History (full page)

**Figma spec (lines 429-445):** Dedicated paginated transaction history table.

**API:** `GET /payments` (paginated)

**Why it matters:** G2 shows a mini 3-row payment table with "View all" link. G4 is the full-page destination with pagination, filters, and invoice downloads.

**Action needed:** Write Stitch prompt for G4 with:
- Header: "Payment History"
- Filter controls: date range picker, type filter (All/Subscription/Top-up/Refund), status filter
- Table columns: Date, Description, Type (badge), Amount (VND formatted), Status (badge), Payment Method, Invoice (download icon)
- Pagination: "Showing 1-10 of 24"
- Empty state if no payments

---

## 3. Data Field Mismatches (Stitch Expects vs Backend Provides)

### 3.1. CRITICAL — Missing Endpoints or Response Fields

| # | Screen | Stitch Expects | Backend Status | Severity | Fix |
|---|--------|---------------|----------------|----------|-----|
| 1 | C6 | Drag-to-reorder priority (PATCH priority) | No PATCH endpoint for BotKnowledgeBase priority. Only POST (attach) + DELETE (detach). | **HIGH** | Add `PATCH /bots/:id/knowledge-bases/reorder` accepting `[{kbId, priority}]` array, OR add `PATCH /bots/:id/knowledge-bases/:kbId` to update priority. |
| 2 | E1 | "Last Message" column showing message content text | Conversation model has `lastMessageAt` (timestamp) but NO `lastMessageContent` field. | **HIGH** | Either add computed `lastMessageContent` to GET /conversations response (JOIN latest message), or add a virtual field in Prisma query. |
| 3 | H1 | "Change Password" section (current + new + confirm) | No dedicated change-password endpoint. `PATCH /users/me` may not accept password fields. | **HIGH** | Ensure `PATCH /users/me` accepts `{currentPassword, newPassword}` or add `POST /auth/change-password` (authenticated). |
| 4 | F1 | KPI change badges ("+12%", "+8%") showing period-over-period growth | `GET /analytics/overview` spec doesn't define comparison values. | **MEDIUM** | Return `{value, previousValue, changePercent}` for each KPI in overview response, or compute FE-side by calling 2 periods. |
| 5 | C1, B2 | Bot cards: "1,248 conversations", "2 knowledge bases" | Bot model has no `conversationCount` or `knowledgeBaseCount` fields. | **MEDIUM** | Return computed `_count.conversations` and `_count.knowledgeBases` in GET /bots list response (Prisma `include: {_count}`). |
| 6 | F1, B2 | "Documents" KPI card showing total count | `GET /analytics/overview` may not aggregate totalDocuments across all KBs. | **LOW** | Verify overview endpoint sums Document.count WHERE tenantId = current. |

### 3.2. Schema/Validation Gaps

Backend stores these as free-form JSON with no validation. Stitch prompts define specific structures the FE will render. If backend doesn't validate, inconsistent data can break the FE.

| # | Field | Model | Stitch-Defined Structure | Recommendation |
|---|-------|-------|-------------------------|----------------|
| 1 | `widgetConfig` | Bot | `{theme: "light"/"dark", primaryColor: hex, position: "bottom-right"/"bottom-left", bubbleIcon: string, showPoweredBy: bool, customCss: string, headerText: string}` | Add DTO validation in PATCH /bots/:id/widget with class-validator. |
| 2 | `personality` | Bot | `{tone: "Professional"/"Friendly"/"Casual", language: "Vietnamese"/"English"/"Auto-detect", restrictions: string}` | Add DTO validation in PATCH /bots/:id/personality. Note: personality is nested inside the bot config alongside systemPrompt, greetingMessage, etc. |
| 3 | `features` | Plan | `{analytics: bool, saveConversations: bool, voiceInput: bool, customCss: bool, removeBranding: bool, facebookIntegration: bool, humanHandover: bool, apiAccess: bool, customDomains: bool, slaGuarantee: bool, advancedModels: bool}` | Define TypeScript interface for Plan.features. Ensure seed data uses matching keys. FE will check `plan.features.customCss` to gate UI sections. |
| 4 | `suggestedQuestions` | Bot | `string[]` — array of question strings | Already typed as JSON default []. Validate as string array in DTO. |
| 5 | `endUserMetadata` | Conversation | `{ip?: string, browser?: string, os?: string}` (shown in E2 metadata panel) | Document expected shape. FE widget should send this on conversation start. |
| 6 | `retrievalContext` | Message | `[{documentName: string, relevanceScore: number, chunkText?: string}]` (shown in E2 "Sources & Debug") | AI Engine must return doc names + scores. Verify RAG chat response includes this structure. |

---

## 4. Naming/Terminology Mismatch

| Layer | Term Used | Notes |
|-------|-----------|-------|
| **Stitch / UI** | "Assistant", "Assistants" | User-facing label everywhere. Sidebar nav says "Assistants". |
| **Backend models** | "Bot", "bots" | Prisma model = `Bot`, API path = `/api/v1/bots` |
| **Figma spec** | Mixed — uses "Bot" in API sections, "Assistant" in screen names | Consistent with "internal = Bot, UI = Assistant" |
| **Stitch brand rule** | "UI label 'Assistant' not 'Agent' or 'Bot' or 'Chatbot'" | Line 885 of STITCH-PROMPTS.md |

**FE action:** Map all `Bot` API responses to "Assistant" in UI text. Never expose "Bot" to end users.

---

## 5. Screen-by-Screen Detailed Analysis

### A. Auth Screens (A1-A5) — Prompt 1.1, 1.2

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Register fields | email, password, fullName | POST /auth/register accepts same | OK |
| Password strength bar | red/yellow/green color bar | FE-only (no backend needed) | OK |
| Google OAuth button | "Continue with Google" | POST /auth/oauth/google exists | OK |
| Auto-create tenant | Not mentioned in UI | Backend auto-creates on register | OK (invisible to user) |
| Forgot password flow | Email input → send reset link | POST /auth/forgot-password | OK |
| Reset password | New password + confirm | POST /auth/reset-password | OK |
| Verify email states | Success (green ✓) + Error (red ✗ + resend) | POST /auth/verify-email | OK |

**No mismatches.**

### B. Dashboard (B1+B2) — Prompt 0.1

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| 5 KPI cards | Conversations, Messages, Credits, Active Assistants, Documents | GET /analytics/overview | Check: verify `totalDocuments` returned |
| Bot cards grid | 3 cards with name, status, description, convos count, KB count | GET /bots (list) | **GAP:** Need computed `conversationCount`, `knowledgeBaseCount` |
| Quick action buttons | "+ Create Assistant", "Upload Documents" | POST /bots (create), POST /documents/upload | OK |
| Credits sidebar | "45 / 100" + progress bar | CreditUsage model: creditsUsed/creditsAllocated | OK |

### C. Bot Management (C1-C7) — Prompts 2.1-2.4, 3.1-3.3

**C1 — Assistants List (Prompt 2.1):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Card: conversation count | "1,248 conversations" | No direct field in Bot model | **GAP:** Compute from Conversation count |
| Card: KB count | "2 knowledge bases" | No direct field | **GAP:** Compute from BotKnowledgeBase count |
| Card: char usage bar | "33K / 250K chars" | `currentKnowledgeChars` / `maxKnowledgeChars` on Bot | OK |
| Status filter dropdown | "All Statuses" | GET /bots supports status filter | OK |
| Pagination | "Showing 1-4 of 4" | GET /bots is paginated | OK |
| Bottom credits bar | "Usage: 45 / 100 credits" | GET /credits/usage | OK |

**C2 — General Config (Prompt 2.2):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Avatar upload | 80px circle with camera overlay | Bot.avatarUrl (nullable string) | OK (need file upload → URL) |
| RAG config: topK, memoryTurns | Number inputs, 1-20 range | Bot.topK, Bot.memoryTurns | OK |
| Stats: "Connected Channels: 2" | Count with mini icons | Not a Bot field | **MINOR:** FE computes from GET /bots/:id/channels |
| Duplicate button | "Duplicate Assistant" | POST /bots/:id/duplicate | OK |
| Delete button | "Delete Assistant" | DELETE /bots/:id | OK |

**C3 — Personality (Prompt 2.3):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| System Prompt | Large textarea | Bot.systemPrompt (String) | OK |
| Greeting Message | Text input | Bot.greetingMessage (String) | OK |
| Suggested Questions | Drag-reorderable list + add/delete | Bot.suggestedQuestions (JSON array) | OK |
| Fallback Message | Text input | Bot.fallbackMessage (String) | OK |
| Personality: Tone dropdown | Professional/Friendly/Casual | Bot.personality JSON — **no schema** | **GAP:** Validate structure |
| Personality: Language dropdown | Vietnamese/English/Auto-detect | Bot.personality JSON — **no schema** | **GAP:** Validate structure |
| Personality: Restrictions | Textarea | Bot.personality JSON — **no schema** | **GAP:** Validate structure |
| Live chat preview | Right column 42% | FE-only (client-side render) | OK |

**C4 — Widget Styling (Prompt 2.4):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Theme: Light/Dark cards | Two selectable | widgetConfig.theme | OK (unvalidated JSON) |
| Primary Color: 6 presets + hex | Color picker | widgetConfig.primaryColor | OK |
| Bubble Position | Bottom Right/Left | widgetConfig.position | OK |
| Bubble Icon: 4 presets + custom | Icon selection | widgetConfig.bubbleIcon | OK |
| Header Text | Text input | widgetConfig.headerText | OK |
| Show Powered By | Toggle | widgetConfig.showPoweredBy | OK |
| Custom CSS (plan-gated) | Lock icon + "Advanced plan" msg | widgetConfig.customCss + Plan.features.customCss | **GAP:** FE needs `plan.features` to gate this |
| Widget preview | Right column 45% | GET /bots/:id/widget/preview | OK |

**C5 — API & Embed (Prompt 3.1):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| API key generation | "Generate API Key" + masked display | POST /bots/:id/api-key → returns key once | OK |
| API key revoke | "Revoke Key" danger button | DELETE /bots/:id/api-key | OK |
| 3 embed code cards | Bubble, iframe, direct link | GET /bots/:id/embed-code | OK |
| Quick Share: Email, Zalo, Facebook | Share icons on direct link card | FE-only (share intent URLs) | OK |

**C6 — Knowledge Bases Tab (Prompt 3.2):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Attached KB table | Priority, Name, Docs, Chars, Status, Actions | GET /bots/:id/knowledge-bases | OK |
| Drag to reorder priority | Drag handles on each row | **No PATCH endpoint for priority reorder** | **CRITICAL GAP** |
| Attach KB modal | Dropdown + priority input + "Attach" | POST /bots/:id/knowledge-bases | OK |
| Detach button | "Detach" danger text | DELETE /bots/:id/knowledge-bases/:kbId | OK |

**C7 — Channels (Prompt 3.3):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Channel cards grid | 5 channels: Web, Facebook, Telegram, Zalo, API | Channel model + type enum | OK |
| Facebook: "Connect" button | OAuth flow | POST .../facebook/connect (stub) | OK (stub) |
| Telegram: Bot Token input | Token form | Channel.config JSON | OK |
| Zalo OA config | Config form | Channel.config JSON | OK |
| Connected state: lastActiveAt | Timestamp display | Channel.lastActiveAt | OK |

### D. Knowledge Bases (D1-D3) — Prompts 3.4, 4.1

**D1 — KB List (Prompt 3.4):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Table columns | Name, Description, Docs, Chars, Status, Created, Actions | GET /knowledge-bases (paginated) | OK |
| Create KB modal | Name, Description, Chunk Size, Chunk Overlap | POST /knowledge-bases | OK |
| Click row → detail | Navigate to D2 | FE routing | OK |

**D2+D3 — KB Detail + Documents (Prompt 4.1):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| KB info card (editable) | Name, Description, Chunk Size, Overlap | PATCH /knowledge-bases/:id | OK |
| Read-only: embedding model, collection | "vnpt-bge-m3", "kb_xxx" | KnowledgeBase.embeddingModel, vectorCollection | OK |
| Character usage bar | Per-type breakdown (URLs vs Files) | **Need FE aggregation** from documents by sourceType | **MINOR:** FE computes from document list data |
| "Reprocess All" button | Secondary button | POST /knowledge-bases/:id/reprocess-all | OK |
| Doc table: Progress column | Thin bar + step text ("embedding") | Document.processingProgress + processingStep | OK |
| Doc table: Enabled toggle | Toggle switch per row | PATCH /documents/:docId {enabled} | OK |
| 3 upload methods | Upload Files, Add URL, Add Text | POST .../upload, .../url, .../text | OK |
| Filter tabs | All / Files / URLs / Text | **Check:** Does GET /documents support sourceType filter? | **MINOR:** May need `?sourceType=` query param |

**D4 — Document Detail: NO STITCH PROMPT (see Section 2.1)**

### E. Conversations (E1-E2) — Prompts 4.2, 4.3

**E1 — Conversations List (Prompt 4.2):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| "Last Message" column | Shows message content snippet: "Xin chào, tôi muốn hỏi..." | **Conversation has `lastMessageAt` only, no content** | **CRITICAL GAP** |
| Rating column | Star display | Conversation.rating (1-5) | OK |
| Bot selector dropdown | "All Assistants" / specific | GET /bots/:botId/conversations | OK |
| Channel filter | 5 options | Filterable by channel | OK |
| Search messages | "Search messages..." | GET /bots/:botId/messages/search?q= | OK |
| Archive action | Row action | DELETE /conversations/:convId | OK |

**E2 — Conversation Detail (Prompt 4.3):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Chat bubbles | User (right, purple) + Assistant (left, white) | Messages with role "user"/"assistant" | OK |
| Timestamp per message | "[12:01 PM]" | Message.createdAt | OK |
| Response time | "1.2s response" | Message.responseTimeMs | OK |
| Sources & Debug (expandable) | searchQuery, sources [{doc name, score}], model, tokens, credits | Message: searchQuery, retrievalContext, modelUsed, inputTokens, outputTokens, creditsUsed | **CHECK:** retrievalContext must include doc names + scores |
| Feedback buttons | 👍 👎 per message | POST /messages/:msgId/feedback | OK |
| Rating | Star selector + text | POST /conversations/:convId/rating | OK |
| Metadata panel | User info, metrics, IP/browser | Conversation: endUserName, endUserMetadata | OK |

### F. Analytics (F1+F2) — Prompt 5.1

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| 5 KPI cards with values | Conversations, Messages, Credits, Active Assistants, Documents | GET /analytics/overview | OK |
| Change badges ("+12%", "+8%") | Green percentage change | **Not in defined response** | **GAP:** Need comparison data |
| Conversations over time chart | Area chart, purple fill | GET /analytics/conversations | OK |
| Channel distribution donut | Web 65%, Facebook 25%, etc. | GET /analytics/channels | OK |
| Top Questions list | Numbered, count badges | GET /analytics/bots/:botId/top-questions | OK |
| User Satisfaction bars | 5-star distribution + average | GET /analytics/bots/:botId/satisfaction | OK |
| Period selector | 7d / 30d / 90d pills | Query param `period` | OK |
| Bot filter | "All Assistants" dropdown | Query param `botId` | OK |

### G. Billing (G1-G2) — Prompts 5.2, 5.3

**G1 — Plans (Prompt 5.2):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| 4 plan cards | Free, Starter, Advanced, Pro | GET /plans (Plan model) | OK |
| Monthly/Yearly toggle | Pill toggle with crossed-out price | Plan.priceMonthly, Plan.priceYearly | OK |
| Feature checklist ✓/✗ | 10+ feature flags | Plan.features JSON | **CHECK:** Feature keys must match seed data |
| "Popular" badge | Advanced card | FE-hardcoded or Plan metadata | OK |
| "Current Plan" indicator | Disabled gray button | Compare tenant.planId with plan.id | OK |
| Limits display | maxBots, maxCreditsPerMonth, maxChars, maxMembers | Plan model fields | OK |

**G2 — Subscription (Prompt 5.3):**

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Current sub info | Plan, status, cycle, period dates, payment method | GET /subscription | OK |
| Credit usage bar | 1,247 / 3,000 + reset date | GET /credits/usage (CreditUsage model) | OK |
| Change Plan button | Links to G1 | POST /subscription | OK |
| Cancel button | "Cancels at end of period" | DELETE /subscription | OK |
| Payment history mini-table | 3 rows + "View all" | GET /payments?limit=3 | OK |
| "Buy More Credits" button | Links to G3 | **G3 has no Stitch prompt** | **See Section 2.2** |
| "View all" link | Links to G4 | **G4 has no Stitch prompt** | **See Section 2.3** |

**G3 — Top-up Credits: NO STITCH PROMPT (see Section 2.2)**
**G4 — Payment History: NO STITCH PROMPT (see Section 2.3)**

### H. Settings (H1-H3) — Prompt 6.1

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| H1: Avatar upload | 80px circle | User.avatarUrl | OK |
| H1: Fields (name, email, phone) | Standard form | GET/PATCH /users/me | OK |
| H1: Auth provider badge | "Email" or "Google" read-only | User.authProvider | OK |
| H1: Last login | Timestamp | User.lastLoginAt | OK |
| H1: Change Password | Current + New + Confirm inputs | **No dedicated endpoint** | **GAP:** See Section 3.1 #3 |
| H2: Workspace name, slug | Name editable, slug read-only | Tenant.name, Tenant.slug | OK |
| H2: Logo upload | Rectangular 160x40 | Tenant.logoUrl | OK |
| H2: Plan badge | Link to Billing | Tenant.planId → Plan | OK |
| H3: Team table | Name, Email, Role, Status, Joined | GET /tenants/:id/members | OK |
| H3: Invite modal | Email + Role dropdown | POST /tenants/:id/members | OK |
| H3: Member limit warning | "Your plan allows N members" | Plan.maxTeamMembers | OK |
| H3: Role badge colors | Owner purple, Admin blue, etc. | TenantMember.role | OK (FE styling) |

### I. Chat Widget (I1) — Prompt 7.1

| Item | Stitch | Backend | Match |
|------|--------|---------|-------|
| Collapsed: circle button 56px | Purple bg, white chat icon | widgetConfig.bubbleIcon, primaryColor | OK |
| Expanded: header with bot name | Assistant name + green dot | GET /chat/:botId/config → name, avatarUrl | OK |
| Greeting message | First bot bubble | Bot.greetingMessage | OK |
| Suggested question chips | Clickable chips below greeting | Bot.suggestedQuestions | OK |
| Typing indicator | Three animated dots | FE-only animation | OK |
| Input + send button | Text input + purple arrow | POST /chat/:botId/messages (SSE) | OK |
| Powered by footer | "Powered by Smartbot" 11px | widgetConfig.showPoweredBy | OK |
| Chat history | Returning users see history | GET /chat/:botId/conversations/:convId/messages | OK |

---

## 6. Priority Action Items

### P0 — CRITICAL (Block FE implementation)

| # | Issue | Action | Owner |
|---|-------|--------|-------|
| 1 | **3 missing Stitch prompts** (D4, G3, G4) | Write and generate Stitch screens | Design |
| 2 | **C6: No priority reorder endpoint** | Add `PATCH /bots/:id/knowledge-bases/reorder` accepting `[{knowledgeBaseId, priority}]` | Backend |
| 3 | **E1: No lastMessageContent in conversation list** | Add computed field in GET /conversations response (JOIN latest message content, truncated) | Backend |
| 4 | **H1: No change-password endpoint** | Add password change support to `PATCH /users/me` (accepts `{currentPassword, newPassword}`) or add dedicated `POST /auth/change-password` | Backend |

### P1 — HIGH (Needed before FE integration)

| # | Issue | Action | Owner |
|---|-------|--------|-------|
| 5 | **C1/B2: Bot cards need computed counts** | Return `_count.conversations` and `_count.knowledgeBases` in GET /bots response | Backend |
| 6 | **F1: KPI change percentages** | Return `changePercent` in analytics/overview response, or document that FE computes by calling two periods | Backend/FE |
| 7 | **JSON schema validation** for widgetConfig, personality, features | Add class-validator DTOs in NestJS for these JSON fields | Backend |
| 8 | **Plan.features seed data** must match Stitch feature flag keys | Verify seed script uses exact keys: analytics, saveConversations, voiceInput, customCss, removeBranding, facebookIntegration, humanHandover, apiAccess, customDomains, slaGuarantee, advancedModels | Backend |

### P2 — MEDIUM (Can work around but should fix)

| # | Issue | Action | Owner |
|---|-------|--------|-------|
| 9 | **D3: sourceType filter** on documents list | Add `?sourceType=file_upload|url_crawl|text_input` query param to GET /documents | Backend |
| 10 | **E2: retrievalContext structure** | Ensure AI Engine returns `[{documentName, relevanceScore, chunkText}]` not just raw chunk data | Backend (Engine) |
| 11 | **F1: "Documents" KPI** | Verify analytics/overview returns totalDocuments count | Backend |
| 12 | **C2: Connected channels count** | Either add to GET /bots/:id response or FE calls GET /channels separately | Backend/FE |
| 13 | **D2: Character usage per sourceType** | FE computes from document list OR add aggregation to GET /knowledge-bases/:id | FE/Backend |

### P3 — LOW (Nice to have)

| # | Issue | Action | Owner |
|---|-------|--------|-------|
| 14 | Bot → Assistant terminology mapping | FE handles all display text mapping | FE |
| 15 | Webhook stubs | Implement real Facebook/Telegram/Zalo integrations when needed | Backend (future) |
| 16 | Plan "Popular" badge | Either hardcode or add `isPopular` field to Plan model | Backend/FE |

---

## 7. Proposed Stitch Prompts for Missing Screens

### 7.1. Prompt for D4 — Document Detail

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Document detail page for Smartbot.

BREADCRUMB: "← Knowledge Bases / Product FAQs / report-2024.pdf"

Sidebar: "Knowledge Bases" active.

CONTENT:

TOP CARD — "Document Info":
- Row: File icon (based on type) + "report-2024.pdf" (18px semibold) + status badge (Completed ✓)
- Row below: Type badge "File 📄" | MIME: "application/pdf" | Size: "2.4 MB" | Uploaded: "Mar 12, 2026"
- Toggle: "Enabled" switch (on)

CARD — "Processing Status":
- Status: "Completed" green badge
- Processing steps (horizontal stepper, all completed):
  1. "Extracting" ✓ → 2. "Chunking" ✓ → 3. "Embedding" ✓
- Progress: 100% bar (green)
- Started: "Mar 12, 2026 10:30 AM" | Completed: "Mar 12, 2026 10:32 AM" | Duration: "2 min"
- If error state: red background card, show errorMessage text, "Retry" button

CARD — "Statistics" (3 mini stat cards in row):
- "Characters": "45,200" large text
- "Chunks": "92" large text
- "Processing Time": "2 min" large text

CARD — "Metadata" (collapsible):
- JSON viewer showing: {"author": "John", "pages": 24, "language": "vi"}
- Small "Edit" icon to switch to editable JSON textarea

BOTTOM ACTIONS:
- "Reprocess Document" secondary button
- "Delete Document" danger button (right side)
- Confirmation modal on delete

Show sample data for a completed PDF document.
```

### 7.2. Prompt for G3 — Top-up Credits

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Top-up Credits page for Smartbot. Sidebar: "Billing" active.

HEADER: "Buy More Credits"

BREADCRUMB: "← Billing / Buy Credits"

SECTION "Current Balance" (card):
- Large number: "1,247" credits remaining
- Muted: "of 3,000 allocated + 500 top-up"
- Horizontal progress bar: 41% filled
- "Resets Apr 15, 2026" in 12px muted

SECTION "Select Credit Package" (card):
- 4 package cards in a row (selectable, second one pre-selected with purple border):
  - "500 credits" | "49.000₫" | "98₫/credit"
  - "2,000 credits" | "179.000₫" | "90₫/credit" | "Best Value" small green badge
  - "5,000 credits" | "399.000₫" | "80₫/credit"
  - "Custom" | text input for amount | calculated price below
- Selected card: purple border 2px, #EDE9FE background

SECTION "Payment Method" (card):
- Two radio cards side by side:
  - "VNPay" with VNPay logo (selected, purple border)
  - "MoMo" with MoMo logo
- Note: "You will be redirected to complete payment" in 12px muted

BOTTOM:
- Order summary line: "2,000 credits × 90₫ = 179.000₫"
- "Purchase Credits" primary button (right-aligned)
- "Cancel" ghost link
```

### 7.3. Prompt for G4 — Payment History

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Payment History page for Smartbot. Sidebar: "Billing" active.

HEADER: "Payment History"

BREADCRUMB: "← Billing / Payment History"

CONTROLS ROW:
- Date range picker (two date inputs with calendar icon)
- Type filter dropdown: "All Types" / Subscription / Top-up / Refund
- Status filter dropdown: "All Statuses" / Completed / Pending / Failed / Refunded
- "Export CSV" secondary button (right-aligned)

TABLE:
Columns: Date, Description, Type (badge), Amount, Status (badge), Method, Invoice

Rows (8 sample rows to fill the table):
- "15/03/2026" | "Starter - Monthly" | Subscription (purple) | "199.000₫" | Completed ✓ (green) | VNPay | ↓
- "10/03/2026" | "Credit Top-up (2,000)" | Top-up (blue) | "179.000₫" | Completed ✓ (green) | MoMo | ↓
- "15/02/2026" | "Starter - Monthly" | Subscription (purple) | "199.000₫" | Completed ✓ (green) | VNPay | ↓
- "01/02/2026" | "Credit Top-up (500)" | Top-up (blue) | "49.000₫" | Completed ✓ (green) | VNPay | ↓
- "15/01/2026" | "Starter - Monthly" | Subscription (purple) | "199.000₫" | Completed ✓ (green) | VNPay | ↓
- "10/01/2026" | "Pro → Starter downgrade refund" | Refund (orange) | "-500.000₫" | Refunded ↩ (orange) | — | ↓
- "15/12/2025" | "Pro - Monthly" | Subscription (purple) | "2.099.000₫" | Completed ✓ (green) | VNPay | ↓
- "15/11/2025" | "Free → Pro upgrade" | Subscription (purple) | "2.099.000₫" | Completed ✓ (green) | MoMo | ↓

Table styling: standard (header uppercase muted, 56px rows, hover highlight).
Invoice column: download icon button (↓), opens/downloads PDF invoice.

Pagination: "Showing 1-8 of 24 transactions" + Previous/Next buttons.

Summary footer card:
- "Total Spent (2026)": "1.024.000₫" | "Subscriptions": "796.000₫" | "Top-ups": "228.000₫"
```

---

## 8. Summary

| Category | Count | Details |
|----------|-------|---------|
| Missing Stitch prompts | 3 | D4, G3, G4 |
| Critical backend gaps | 4 | KB priority reorder, lastMessageContent, change password, KPI change % |
| High-priority fixes | 4 | Bot computed counts, JSON validation, plan features seed |
| Medium-priority fixes | 5 | sourceType filter, retrievalContext structure, Documents KPI, etc. |
| Low-priority items | 3 | Naming mapping, webhook stubs, popular badge |
| Screens fully matching | 24 of 27 | Remaining 3 have minor gaps listed above |

**Overall status:** Backend covers all 30 Figma screens route-wise. Main issues are (1) 3 missing Stitch prompts preventing FE generation, (2) a few missing computed fields/endpoints that the generated FE will need at integration time.
