# Backend API Reference — GenAI Assistant Platform

> Tổng hợp toàn bộ data models (Prisma) và API routes từ cả 2 service: **genai-platform-api** (NestJS) và **genai-engine** (FastAPI).

---

## 1. Data Models (Prisma — 15 models)

### 1.1. User (14 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | VARCHAR(255) | unique |
| passwordHash | VARCHAR(255) | nullable, hashed |
| fullName | VARCHAR(255) | nullable |
| avatarUrl | String | nullable |
| phone | VARCHAR(20) | nullable |
| emailVerified | Boolean | default false |
| authProvider | VARCHAR(20) | "email" / "google" |
| authProviderId | VARCHAR(255) | nullable, OAuth ID |
| lastLoginAt | DateTime | nullable |
| status | VARCHAR(20) | "active" |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |
| _Relations_ | | ownedTenants, memberships, refreshTokens |

### 1.2. RefreshToken (5 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK → User |
| token | VARCHAR(500) | unique |
| expiresAt | DateTime | |
| createdAt | DateTime | auto |

> Internal model — no UI screen needed.

### 1.3. Tenant (10 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| slug | VARCHAR(100) | unique |
| ownerId | UUID | FK → User |
| logoUrl | String | nullable |
| planId | UUID | FK → Plan, nullable |
| status | VARCHAR(20) | "active" |
| settings | JSON | default {} |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |
| deletedAt | DateTime | nullable, soft delete |
| _Relations_ | | owner, plan, members, bots, knowledgeBases, documents, conversations, messages, channels, subscriptions, creditUsages, payments |

### 1.4. TenantMember (7 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| userId | UUID | FK → User |
| role | VARCHAR(20) | "owner"/"admin"/"member"/"viewer" |
| invitedAt | DateTime | auto |
| joinedAt | DateTime | nullable |
| status | VARCHAR(20) | "active"/"invited"/"removed" |
| createdAt | DateTime | auto |

> Composite unique: (tenantId, userId)

### 1.5. Bot (21 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| name | VARCHAR(255) | |
| description | String | nullable |
| avatarUrl | String | nullable |
| status | VARCHAR(20) | "draft"/"active"/"paused"/"archived" |
| systemPrompt | String | nullable |
| greetingMessage | String | nullable |
| suggestedQuestions | JSON | default [] |
| personality | JSON | default {} |
| fallbackMessage | String | nullable |
| topK | Int | default 5 |
| memoryTurns | Int | default 5 |
| widgetConfig | JSON | default {} |
| maxKnowledgeChars | BigInt | nullable |
| currentKnowledgeChars | BigInt | default 0 |
| apiKeyHash | VARCHAR(255) | nullable, internal |
| apiKeyPrefix | VARCHAR(10) | nullable, display |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |
| deletedAt | DateTime | nullable, soft delete |
| _Relations_ | | tenant, knowledgeBases, conversations, messages, channels |

### 1.6. BotKnowledgeBase (4 fields — join table)

| Field | Type | Notes |
|-------|------|-------|
| botId | UUID | PK (composite), FK → Bot |
| knowledgeBaseId | UUID | PK (composite), FK → KnowledgeBase |
| priority | Int | default 0 |
| createdAt | DateTime | auto |

> Join table — no dedicated UI screen.

### 1.7. KnowledgeBase (12 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| name | VARCHAR(255) | |
| description | String | nullable |
| vectorCollection | VARCHAR(100) | nullable, Qdrant collection name |
| embeddingModel | VARCHAR(100) | default "vnpt-bge-m3" |
| chunkSize | Int | default 500 |
| chunkOverlap | Int | default 50 |
| totalDocuments | Int | default 0 |
| totalChars | BigInt | default 0 |
| status | VARCHAR(20) | "active"/"processing"/"error" |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |
| deletedAt | DateTime | nullable, soft delete |

### 1.8. Document (22 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| knowledgeBaseId | UUID | FK → KnowledgeBase |
| tenantId | UUID | FK → Tenant |
| sourceType | VARCHAR(20) | "file_upload"/"url_crawl"/"text_input" |
| originalName | VARCHAR(500) | nullable |
| mimeType | VARCHAR(100) | nullable |
| fileSize | BigInt | nullable |
| storagePath | String | nullable, S3 path |
| sourceUrl | String | nullable |
| markdownStoragePath | String | nullable, processed markdown path |
| status | VARCHAR(20) | "pending"/"processing"/"completed"/"error" |
| processingStep | VARCHAR(30) | nullable, "extracting"/"chunking"/"embedding" |
| processingProgress | Int | 0-100 |
| errorMessage | String | nullable |
| charCount | BigInt | default 0 |
| chunkCount | Int | default 0 |
| processingStartedAt | DateTime | nullable |
| processingCompletedAt | DateTime | nullable |
| metadata | JSON | default {} |
| enabled | Boolean | default true |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |
| deletedAt | DateTime | nullable, soft delete |

### 1.9. Conversation (15 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| botId | UUID | FK → Bot |
| tenantId | UUID | FK → Tenant |
| endUserId | VARCHAR(255) | nullable |
| endUserName | VARCHAR(255) | nullable |
| endUserEmail | VARCHAR(255) | nullable |
| endUserMetadata | JSON | default {} |
| channel | VARCHAR(20) | "web_widget"/"facebook"/"telegram"/"zalo"/"api" |
| channelConversationId | VARCHAR(255) | nullable, external platform ID |
| status | VARCHAR(20) | "active"/"closed"/"archived" |
| messageCount | Int | default 0 |
| lastMessageAt | DateTime | nullable |
| lastMessagePreview | VARCHAR(200) | nullable, preview text of last message |
| rating | SmallInt | nullable, 1-5 |
| feedbackText | String | nullable |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### 1.10. Message (13 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| conversationId | UUID | FK → Conversation |
| botId | UUID | FK → Bot |
| tenantId | UUID | FK → Tenant |
| role | VARCHAR(10) | "user"/"assistant"/"system" |
| content | String | |
| inputTokens | Int | nullable |
| outputTokens | Int | nullable |
| totalTokens | Int | nullable |
| creditsUsed | Decimal(10,4) | default 0 |
| searchQuery | String | nullable |
| retrievalContext | JSON | nullable |
| responseTimeMs | Int | nullable |
| modelUsed | VARCHAR(100) | nullable |
| feedback | VARCHAR(10) | nullable, "thumbs_up"/"thumbs_down" |
| createdAt | DateTime | auto |

### 1.11. Channel (9 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| botId | UUID | FK → Bot |
| tenantId | UUID | FK → Tenant |
| type | VARCHAR(30) | "web_widget"/"facebook_messenger"/"telegram"/"zalo"/"api" |
| status | VARCHAR(20) | "active"/"disconnected" |
| config | JSON | default {}, platform-specific config |
| connectedAt | DateTime | nullable |
| lastActiveAt | DateTime | nullable |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### 1.12. Plan (14 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | "Free"/"Starter"/"Advanced"/"Pro" |
| slug | VARCHAR(50) | unique |
| description | String | nullable |
| isActive | Boolean | default true |
| maxBots | Int | |
| maxCreditsPerMonth | Int | |
| maxKnowledgeCharsPerBot | BigInt | |
| maxTeamMembers | Int | default 1 |
| features | JSON | default {}, feature flags |
| priceMonthly | BigInt | default 0 (VND) |
| priceYearly | BigInt | default 0 (VND) |
| priceWeekly | BigInt | default 0 (VND) |
| sortOrder | Int | default 0 |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### 1.13. Subscription (11 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| planId | UUID | FK → Plan |
| status | VARCHAR(20) | "active"/"past_due"/"cancelled"/"trialing" |
| billingCycle | VARCHAR(10) | "weekly"/"monthly"/"yearly" |
| currentPeriodStart | DateTime | |
| currentPeriodEnd | DateTime | |
| cancelAtPeriodEnd | Boolean | default false |
| paymentMethod | VARCHAR(30) | nullable |
| externalSubscriptionId | VARCHAR(255) | nullable |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### 1.14. CreditUsage (8 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| periodStart | Date | |
| periodEnd | Date | |
| creditsAllocated | Int | |
| creditsUsed | Int | default 0 |
| topUpCredits | Int | default 0 |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

> Unique: (tenantId, periodStart)

### 1.15. PaymentHistory (11 fields)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant |
| subscriptionId | UUID | nullable |
| type | VARCHAR(20) | "subscription"/"top_up"/"refund" |
| amount | BigInt | VND |
| currency | VARCHAR(3) | default "VND" |
| status | VARCHAR(20) | "pending"/"completed"/"failed"/"refunded" |
| paymentMethod | VARCHAR(30) | nullable |
| gatewayTransactionId | VARCHAR(255) | nullable |
| gatewayResponse | JSON | nullable, raw gateway response |
| description | String | nullable |
| createdAt | DateTime | auto |

---

## 2. Platform API Routes (genai-platform-api — NestJS)

### 2.1. App (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Health check |

### 2.2. Auth (8 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register + auto-create tenant |
| POST | `/api/v1/auth/login` | Public | Login, return JWT |
| POST | `/api/v1/auth/logout` | JWT | Revoke refresh token |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Public | Send reset email |
| POST | `/api/v1/auth/reset-password` | Public | Reset password with token |
| POST | `/api/v1/auth/verify-email` | Public | Verify email with token |
| POST | `/api/v1/auth/oauth/google` | Public | Google OAuth login |

### 2.3. Users (2 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me` | JWT | Get current user profile |
| PATCH | `/api/v1/users/me` | JWT | Update profile |

### 2.4. Tenants (6 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/tenants/:id` | JWT | Get tenant details |
| PATCH | `/api/v1/tenants/:id` | JWT | Update tenant |
| GET | `/api/v1/tenants/:id/members` | JWT | List members |
| POST | `/api/v1/tenants/:id/members` | JWT | Invite member |
| PATCH | `/api/v1/tenants/:id/members/:userId` | JWT | Update member role |
| DELETE | `/api/v1/tenants/:id/members/:userId` | JWT | Remove member |

### 2.5. Bots (16 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/bots` | JWT + QuotaGuard | Create bot |
| GET | `/api/v1/bots` | JWT | List bots (paginated, filter by status) |
| GET | `/api/v1/bots/:id` | JWT | Get bot details |
| PATCH | `/api/v1/bots/:id` | JWT | Update bot |
| DELETE | `/api/v1/bots/:id` | JWT | Soft delete bot |
| POST | `/api/v1/bots/:id/duplicate` | JWT + QuotaGuard | Duplicate bot |
| GET | `/api/v1/bots/:id/personality` | JWT | Get personality config |
| PATCH | `/api/v1/bots/:id/personality` | JWT | Update personality |
| PATCH | `/api/v1/bots/:id/widget` | JWT | Update widget config |
| GET | `/api/v1/bots/:id/widget/preview` | JWT | Get widget preview |
| POST | `/api/v1/bots/:id/api-key` | JWT | Generate API key |
| DELETE | `/api/v1/bots/:id/api-key` | JWT | Revoke API key |
| GET | `/api/v1/bots/:id/embed-code` | JWT | Get embed snippets |
| GET | `/api/v1/bots/:id/knowledge-bases` | JWT | List attached KBs |
| POST | `/api/v1/bots/:id/knowledge-bases` | JWT | Attach KB to bot |
| DELETE | `/api/v1/bots/:id/knowledge-bases/:kbId` | JWT | Detach KB from bot |

### 2.6. Knowledge Bases (6 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/knowledge-bases` | JWT | Create KB |
| GET | `/api/v1/knowledge-bases` | JWT | List KBs (paginated) |
| GET | `/api/v1/knowledge-bases/:id` | JWT | Get KB details |
| PATCH | `/api/v1/knowledge-bases/:id` | JWT | Update KB |
| DELETE | `/api/v1/knowledge-bases/:id` | JWT | Soft delete KB |
| POST | `/api/v1/knowledge-bases/:id/reprocess-all` | JWT | Reprocess all docs in KB |

### 2.7. Documents (8 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/knowledge-bases/:kbId/documents/upload` | JWT | Upload file (multipart) |
| POST | `/api/v1/knowledge-bases/:kbId/documents/url` | JWT | Add URL source |
| POST | `/api/v1/knowledge-bases/:kbId/documents/text` | JWT | Add text content |
| GET | `/api/v1/knowledge-bases/:kbId/documents` | JWT | List docs (paginated) |
| GET | `/api/v1/knowledge-bases/:kbId/documents/:docId` | JWT | Get doc details |
| PATCH | `/api/v1/knowledge-bases/:kbId/documents/:docId` | JWT | Update doc (toggle enabled, metadata) |
| DELETE | `/api/v1/knowledge-bases/:kbId/documents/:docId` | JWT | Soft delete doc |
| POST | `/api/v1/knowledge-bases/:kbId/documents/:docId/reprocess` | JWT | Reprocess single doc |

### 2.8. Internal Documents (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/v1/internal/documents/:id/status` | X-Internal-Key | AI Engine callback for processing status |

### 2.9. Conversations (8 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/conversations` | JWT | List all tenant conversations (paginated, filterable) |
| GET | `/api/v1/bots/:botId/conversations` | JWT | List conversations for a specific bot |
| GET | `/api/v1/conversations/:convId` | JWT | Get conversation detail |
| GET | `/api/v1/conversations/:convId/messages` | JWT | Get messages (paginated) |
| DELETE | `/api/v1/conversations/:convId` | JWT | Archive conversation |
| GET | `/api/v1/bots/:botId/messages/search` | JWT | Search messages (query: q) |
| POST | `/api/v1/conversations/:convId/rating` | JWT | Rate conversation (1-5) |
| POST | `/api/v1/messages/:msgId/feedback` | JWT | Feedback on message (thumbs up/down) |

### 2.10. Analytics (7 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/overview` | JWT | Dashboard KPIs |
| GET | `/api/v1/analytics/conversations` | JWT | Conversations over time (period, botId) |
| GET | `/api/v1/analytics/messages` | JWT | Messages over time (period, botId) |
| GET | `/api/v1/analytics/credits` | JWT | Credit usage over time (period) |
| GET | `/api/v1/analytics/channels` | JWT | Channel distribution (period) |
| GET | `/api/v1/analytics/bots/:botId/top-questions` | JWT | Top questions (limit) |
| GET | `/api/v1/analytics/bots/:botId/satisfaction` | JWT | Satisfaction distribution |

### 2.11. Billing (10 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/plans` | Public | List pricing plans |
| GET | `/api/v1/subscription` | JWT | Get current subscription |
| POST | `/api/v1/subscription` | JWT | Create/upgrade subscription |
| PATCH | `/api/v1/subscription` | JWT | Modify subscription (billing cycle) |
| DELETE | `/api/v1/subscription` | JWT | Cancel subscription |
| POST | `/api/v1/credits/top-up` | JWT | Purchase extra credits |
| GET | `/api/v1/credits/usage` | JWT | Get credit usage |
| GET | `/api/v1/payments` | JWT | Payment history (paginated) |
| POST | `/api/v1/payments/vnpay/callback` | Public | VNPay payment callback |
| POST | `/api/v1/payments/momo/callback` | Public | MoMo payment callback |

### 2.12. Channels (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/bots/:botId/channels` | JWT | Create channel |
| GET | `/api/v1/bots/:botId/channels` | JWT | List channels |
| PATCH | `/api/v1/bots/:botId/channels/:chId` | JWT | Update channel |
| DELETE | `/api/v1/bots/:botId/channels/:chId` | JWT | Delete channel |
| POST | `/api/v1/bots/:botId/channels/facebook/connect` | JWT | Connect Facebook (OAuth stub) |

### 2.13. Webhooks (4 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/webhooks/facebook` | Public | Facebook verification challenge |
| POST | `/api/v1/webhooks/facebook` | Public | Facebook message webhook |
| POST | `/api/v1/webhooks/telegram` | Public | Telegram webhook |
| POST | `/api/v1/webhooks/zalo` | Public | Zalo webhook |

> All webhook handlers are currently stubs — returns 200 OK.

### 2.14. Chat Proxy (3 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/chat/:botId/config` | Public | Get bot config for widget |
| POST | `/api/v1/chat/:botId/messages` | Public | Send message, SSE streaming response |
| GET | `/api/v1/chat/:botId/conversations/:convId/messages` | Public | Get chat history for widget |

---

## 3. AI Engine Routes (genai-engine — FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (Triton + Qdrant status) |
| POST | `/engine/v1/knowledge-bases` | Create Qdrant collection |
| DELETE | `/engine/v1/knowledge-bases/{id}` | Delete Qdrant collection |
| POST | `/engine/v1/documents/process` | Queue doc processing (Celery) |
| POST | `/engine/v1/documents/{id}/reprocess` | Queue re-chunking from markdown |
| DELETE | `/engine/v1/documents/{id}/vectors` | Delete vectors by document |
| GET | `/engine/v1/documents/{id}/chunks` | Preview chunks (paginated) |
| POST | `/engine/v1/chat/completions` | RAG chat (SSE or JSON) |
| POST | `/engine/v1/chat/test` | Quick test chat (no history) |

---

## 4. Route Summary

| Service | Controller/Module | Routes |
|---------|-------------------|--------|
| Platform | App (health) | 1 |
| Platform | Auth | 8 |
| Platform | Users | 2 |
| Platform | Tenants | 6 |
| Platform | Bots | 16 |
| Platform | Knowledge Bases | 6 |
| Platform | Documents | 8 |
| Platform | Internal Documents | 1 |
| Platform | Conversations | 7 |
| Platform | Analytics | 7 |
| Platform | Billing | 10 |
| Platform | Channels | 5 |
| Platform | Webhooks | 4 |
| Platform | Chat Proxy | 3 |
| **Platform subtotal** | | **84** |
| AI Engine | Health | 1 |
| AI Engine | Knowledge Bases | 2 |
| AI Engine | Documents | 4 |
| AI Engine | Chat | 2 |
| **Engine subtotal** | | **9** |
| **Grand Total** | | **93** |

---

## 5. Cross-Reference: Backend vs Figma Screen Spec

### 5.1. Route Count Mismatches

Figma spec (Section M) claims 75 routes across 11 groups. Actual backend has **93 routes**.

| Group | Figma Count | Backend Count | Delta | Notes |
|-------|-------------|---------------|-------|-------|
| Auth | 8 | 8 | 0 | Match |
| Users | 2 | 2 | 0 | Match |
| Tenants | 6 | 6 | 0 | Match |
| Bots | **15** | **16** | **+1** | Backend has `GET /bots/:id/knowledge-bases` not counted in spec |
| Knowledge Bases | 6 | 6 | 0 | Match |
| Documents | **7** | **8** | **+1** | Backend has `POST .../documents/:docId/reprocess` not counted |
| Channels | 5 | 5 | 0 | Match |
| Conversations | 7 | 7 | 0 | Match |
| Analytics | 7 | 7 | 0 | Match |
| Billing | **9** | **10** | **+1** | Backend has `GET /credits/usage` not counted |
| Chat Proxy | 3 | 3 | 0 | Match |
| **Subtotal (Figma scope)** | **75** | **78** | **+3** | |

**Routes in backend NOT mapped in Figma spec (18 additional):**

| Route | Reason |
|-------|--------|
| `GET /` | Internal health check — no UI needed |
| `POST /api/v1/auth/refresh` | Token refresh — auto-handled by auth interceptor, no screen |
| `PATCH /api/v1/internal/documents/:id/status` | AI Engine → Platform callback — no UI |
| `GET /api/v1/webhooks/facebook` | Facebook verification — automated |
| `POST /api/v1/webhooks/facebook` | Facebook incoming — automated |
| `POST /api/v1/webhooks/telegram` | Telegram incoming — automated |
| `POST /api/v1/webhooks/zalo` | Zalo incoming — automated |
| 9 AI Engine routes | Internal service — called by Platform, not by frontend |

> All 18 extra routes are backend-only (internal/webhook/engine). No missing UI screens.

### 5.2. Data Model Mismatches

Figma spec (Section L) lists 13 models. Prisma schema has **15 models**.

| Model | Figma Fields | Prisma Fields | Delta | Missing in Figma |
|-------|-------------|---------------|-------|-----------------|
| User | 12 | 14 | +2 | status, updatedAt |
| Tenant | 10 | 11 | +1 | deletedAt |
| TenantMember | 6 | 8 | +2 | createdAt, id (spec says 6 "chính") |
| Bot | 18 | 21 | +3 | apiKeyHash, apiKeyPrefix, deletedAt (internal fields) |
| KnowledgeBase | 10 | 14 | +4 | tenantId, createdAt, updatedAt, deletedAt |
| Document | 18 | 23 | +5 | tenantId, markdownStoragePath, updatedAt, deletedAt, knowledgeBaseId |
| Conversation | 12 | 16 | +4 | tenantId, channelConversationId, createdAt, updatedAt |
| Message | 13 | 16 | +3 | conversationId, botId, tenantId (FK fields) |
| Channel | 8 | 10 | +2 | tenantId, updatedAt |
| Plan | 12 | 16 | +4 | isActive, sortOrder, createdAt, updatedAt |
| Subscription | 9 | 12 | +3 | externalSubscriptionId, createdAt, updatedAt |
| CreditUsage | 6 | 9 | +3 | id, createdAt, updatedAt |
| PaymentHistory | 9 | 12 | +3 | subscriptionId, gatewayResponse, tenantId |

**2 models in Prisma NOT in Figma spec:**

| Model | Reason |
|-------|--------|
| RefreshToken | Auth internal — token storage, no UI representation |
| BotKnowledgeBase | Join table for Bot↔KB relationship — managed via Bot API |

> All field differences are expected: Figma counts "main UI fields," Prisma includes FK fields, audit fields (createdAt/updatedAt/deletedAt), and internal fields (hashes, storage paths).

### 5.3. Screen-by-Screen Route Verification

| Screen | Routes in Figma | Exists in Backend | Issues |
|--------|-----------------|-------------------|--------|
| A1. Register | POST /auth/register | Yes | — |
| A2. Login | POST /auth/login, POST /auth/oauth/google | Yes | — |
| A3. Forgot PW | POST /auth/forgot-password | Yes | — |
| A4. Reset PW | POST /auth/reset-password | Yes | — |
| A5. Verify Email | POST /auth/verify-email | Yes | — |
| B1. App Shell | POST /auth/logout | Yes | — |
| B2. Dashboard | GET /analytics/overview | Yes | — |
| C1. Bot List | GET /bots, POST /bots, DELETE /bots/:id, POST /bots/:id/duplicate | Yes | — |
| C2. Bot Config | GET /bots/:id, PATCH /bots/:id | Yes | — |
| C3. Bot Personality | GET/PATCH /bots/:id/personality | Yes | — |
| C4. Bot Widget | PATCH /bots/:id/widget, GET /bots/:id/widget/preview | Yes | — |
| C5. Bot API/Embed | POST/DELETE /bots/:id/api-key, GET /bots/:id/embed-code | Yes | — |
| C6. Bot KBs | GET/POST/DELETE /bots/:id/knowledge-bases | Yes | — |
| C7. Bot Channels | GET/POST/PATCH/DELETE channels, POST facebook/connect | Yes | — |
| D1. KB List | GET /knowledge-bases, POST /knowledge-bases | Yes | — |
| D2. KB Detail | GET/PATCH /knowledge-bases/:id, POST reprocess-all | Yes | — |
| D3. Doc List | GET/POST(upload,url,text)/PATCH/DELETE docs, POST reprocess | Yes | — |
| D4. Doc Detail | GET/PATCH /documents/:docId | Yes | — |
| E1. Conv List | GET /bots/:botId/conversations, GET /messages/search, DELETE conv | Yes | — |
| E2. Conv Detail | GET conv, GET messages, POST rating, POST feedback | Yes | — |
| F1. Analytics | GET overview/conversations/messages/credits/channels | Yes | — |
| F2. Analytics Bot | GET top-questions, GET satisfaction | Yes | — |
| G1. Plans | GET /plans | Yes | — |
| G2. Subscription | GET/POST/PATCH/DELETE /subscription | Yes | — |
| G3. Top-up | POST /credits/top-up, GET /credits/usage | Yes | — |
| G4. Payments | GET /payments, POST vnpay/momo callbacks | Yes | — |
| H1. Profile | GET/PATCH /users/me | Yes | — |
| H2. Workspace | GET/PATCH /tenants/:id | Yes | — |
| H3. Team | GET/POST/PATCH/DELETE /tenants/:id/members | Yes | — |
| I1. Widget | GET config, POST messages, GET history | Yes | — |

> **Result: All 30 screens have complete backend route coverage. No missing routes.**

### 5.4. Mismatch Summary

| Category | Finding | Severity |
|----------|---------|----------|
| Route count | Figma says 75, actual Figma-scope is 78 (+3 undercounted) | Low — spec counting error |
| Bot routes | Figma says 15, actual 16 | Low — `GET /knowledge-bases` was used in C6 but not counted |
| Doc routes | Figma says 7, actual 8 | Low — `POST reprocess` was used in D3 but not counted |
| Billing routes | Figma says 9, actual 10 | Low — `GET /credits/usage` was used in G3 but not counted |
| Extra models | RefreshToken, BotKnowledgeBase not in Figma | None — internal/join tables |
| Extra routes | 18 routes not in Figma (health, webhooks, internal, engine) | None — backend-only |
| Field counts | Prisma has more fields than Figma lists | None — expected (FKs, audit, internal) |
| Missing screens | None | — |
| Missing routes | None — all Figma routes exist in backend | — |

### 5.5. Recommendations

1. **Update Figma spec Section M** route counts: Bots → 16, Documents → 8, Billing → 10, Total → 78
2. **No new backend work needed** — all screens fully covered
3. **Webhook stubs** (Facebook/Telegram/Zalo) need real implementation when channel integrations are built
4. **POST /auth/refresh** should be documented in Figma as "background auth mechanism" even without a screen
