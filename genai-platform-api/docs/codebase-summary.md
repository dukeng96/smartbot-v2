# Codebase Summary - GenAI Platform API

## Quick Overview

**Framework:** NestJS v10 with TypeScript
**Database:** PostgreSQL 16 (Prisma ORM)
**Cache/Queues:** Redis + BullMQ
**Storage:** MinIO (VNPT internal)
**Authentication:** JWT + Passport.js
**API Docs:** Swagger/OpenAPI at `/api-docs`

## Project Structure

```
genai-platform-api/
├── src/
│   ├── common/                    # Shared infrastructure
│   │   ├── decorators/           # @CurrentUser, @CurrentTenant, @Public, @QuotaType
│   │   ├── dto/                  # PaginationDto, shared data types
│   │   ├── filters/              # AllExceptionsFilter (global error handling)
│   │   ├── guards/               # JwtAuthGuard, TenantGuard, QuotaGuard
│   │   ├── interceptors/         # TransformInterceptor (wraps responses)
│   │   ├── prisma/               # PrismaService, database connection
│   │   └── utils/                # crypto.ts (hash/verify), slug.ts (slug generation)
│   ├── config/                   # Configuration loaders
│   │   ├── app.config.ts         # APP_URL, PORT, NODE_ENV
│   │   ├── database.config.ts    # DATABASE_URL, pool settings
│   │   ├── jwt.config.ts         # JWT_SECRET, token TTLs
│   │   ├── redis.config.ts       # REDIS_URL, connection options
│   │   ├── minio.config.ts        # MinIO serviceUrl, credentials, folder
│   │   ├── ai-engine.config.ts   # AI_ENGINE_URL, INTERNAL_API_KEY
│   │   └── index.ts              # Exports all configs
│   ├── modules/                  # 11 Feature modules
│   │   ├── auth/                 # JWT auth, register, login, OAuth
│   │   ├── users/                # User profile, preferences
│   │   ├── tenants/              # Organization management, member roles
│   │   ├── bots/                 # Bot CRUD, personality, API keys
│   │   ├── knowledge-bases/      # KB CRUD, document upload, processing
│   │   ├── conversations/        # Chat threads, messages, feedback
│   │   ├── chat-proxy/           # SSE streaming endpoint, quota checks
│   │   ├── analytics/            # Usage metrics, engagement analytics
│   │   ├── billing/              # Subscriptions, plans, credits
│   │   ├── channels/             # Webhook integrations (Facebook, etc.)
│   │   └── storage/              # MinIO presigned URLs, file upload
│   ├── app.module.ts             # Root module, imports all features
│   ├── app.controller.ts         # Health check endpoint
│   └── main.ts                   # Server bootstrap, Swagger setup
├── prisma/
│   ├── schema.prisma             # Database schema (13 tables)
│   ├── migrations/               # Database migration history
│   └── seed.ts                   # Optional: seed development data
├── test/
│   └── jest-e2e.json             # E2E test configuration
├── docker-compose.yml            # Local dev environment
├── .env.example                  # Environment template
├── package.json                  # Dependencies (NestJS, Prisma, etc.)
└── README.md                     # Project setup instructions
```

## Core Modules Overview

### 1. Auth Module (`src/modules/auth/`)
**Purpose:** User authentication, JWT token management

**Key Files:**
- `auth.controller.ts` — HTTP endpoints for auth operations
- `auth.service.ts` — JWT generation, bcrypt hashing, OAuth
- `strategies/jwt.strategy.ts` — Passport JWT strategy
- `dto/` — Register, Login, RefreshToken, ResetPassword, VerifyEmail, GoogleOAuth DTOs

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/auth/register` | POST | Public | Email + password signup |
| `/api/v1/auth/login` | POST | Public | Email + password login |
| `/api/v1/auth/refresh` | POST | Public | Refresh access token |
| `/api/v1/auth/logout` | POST | JWT | Revoke refresh token |
| `/api/v1/auth/forgot-password` | POST | Public | Request password reset |
| `/api/v1/auth/reset-password` | POST | Public | Reset password with token |
| `/api/v1/auth/verify-email` | POST | Public | Confirm email |
| `/api/v1/auth/oauth/google` | POST | Public | Google OAuth callback |

**Key Logic:**
- Bcrypt password hashing (rounds=10)
- JWT tokens: access (15 min) + refresh (7 days)
- Refresh tokens stored in database, revocable on logout
- Email verification via token (no actual email sending yet)

### 2. Users Module (`src/modules/users/`)
**Purpose:** User profile management

**Key Files:**
- `users.controller.ts` — GET/PATCH endpoints
- `users.service.ts` — User CRUD operations
- `dto/update-user.dto.ts` — Profile update fields

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/users/profile` | GET | JWT | Get current user |
| `/api/v1/users/profile` | PATCH | JWT | Update profile (name, avatar, etc.) |

**Data Model:**
```
User {
  id, email, passwordHash, fullName, avatarUrl, phone,
  emailVerified, authProvider, authProviderId, lastLoginAt, status,
  createdAt, updatedAt
}
```

### 3. Tenants Module (`src/modules/tenants/`)
**Purpose:** Multi-tenant organization management

**Key Files:**
- `tenants.controller.ts` — CRUD + member management
- `tenants.service.ts` — Tenant CRUD, member invites, roles
- `dto/` — UpdateTenant, InviteMember, UpdateMemberRole DTOs

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/tenants` | GET | JWT | List user's tenants |
| `/api/v1/tenants` | POST | JWT | Create new tenant |
| `/api/v1/tenants/:id` | PATCH | JWT | Update tenant settings |
| `/api/v1/tenants/:id/members/invite` | POST | JWT | Invite member to tenant |
| `/api/v1/tenants/:id/members/:memberId/role` | PATCH | JWT | Update member role |
| `/api/v1/tenants/:id/members/:memberId` | DELETE | JWT | Remove member |

**Key Features:**
- User becomes owner when creating tenant
- Invite system with email verification
- Role-based access: admin, member
- Tenant isolation via TenantGuard on all protected routes
- Settings stored as JSON for flexibility

### 4. Bots Module (`src/modules/bots/`)
**Purpose:** AI assistant bot management

**Key Files:**
- `bots.controller.ts` — CRUD + configuration
- `bots.service.ts` — Bot operations, API key generation
- `dto/` — CreateBot, UpdateBot, UpdatePersonality, UpdateWidget, AttachKnowledgeBase

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/bots` | GET | JWT | List bots in tenant |
| `/api/v1/bots` | POST | JWT | Create bot |
| `/api/v1/bots/:id` | PATCH | JWT | Update bot config |
| `/api/v1/bots/:id` | DELETE | JWT | Delete/archive bot |
| `/api/v1/bots/:id/personality` | PATCH | JWT | Update personality settings |
| `/api/v1/bots/:id/widget` | PATCH | JWT | Update widget styling |
| `/api/v1/bots/:id/knowledge-bases` | POST | JWT | Attach KB to bot |
| `/api/v1/bots/:id/knowledge-bases/:kbId` | DELETE | JWT | Detach KB from bot |

**Key Features:**
- API key generation (hashed with bcrypt)
- Knowledge base linking with priority ordering
- Personality & widget config as JSON
- Character quota enforcement
- Status tracking: draft, published, archived
- Suggested questions and system prompts

**Data Model:**
```
Bot {
  id, tenantId, name, description, avatarUrl, status,
  systemPrompt, greetingMessage, suggestedQuestions (JSON),
  personality (JSON), fallbackMessage, topK, memoryTurns,
  widgetConfig (JSON), maxKnowledgeChars, currentKnowledgeChars,
  apiKeyHash, apiKeyPrefix, createdAt, updatedAt, deletedAt
}

BotKnowledgeBase {
  botId, knowledgeBaseId, priority, createdAt
}
```

### 5. Knowledge Bases Module (`src/modules/knowledge-bases/`)
**Purpose:** Document management and async processing

**Key Files:**
- `knowledge-bases.controller.ts` — KB CRUD
- `documents.controller.ts` — User-facing document operations
- `internal-documents.controller.ts` — AI Engine status updates
- `knowledge-bases.service.ts` — KB CRUD
- `documents.service.ts` — Document CRUD
- `document-processing.worker.ts` — BullMQ handler for async processing
- `dto/` — CreateKnowledgeBase, CreateDocument, UpdateDocument, etc.

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/knowledge-bases` | GET | JWT | List KBs in tenant |
| `/api/v1/knowledge-bases` | POST | JWT | Create KB |
| `/api/v1/knowledge-bases/:id` | PATCH | JWT | Update KB settings |
| `/api/v1/knowledge-bases/:id/documents` | POST | JWT | Upload document (file) |
| `/api/v1/knowledge-bases/:id/documents/url` | POST | JWT | Add document from URL |
| `/api/v1/knowledge-bases/:id/documents/:docId` | GET | JWT | Get document details |
| `/api/v1/knowledge-bases/:id/documents/:docId` | DELETE | JWT | Delete document |

**Internal Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/internal/knowledge-bases/:id/documents/:docId/status` | PATCH | InternalAPIKey | Update doc status (AI Engine callback) |

**Document Processing Pipeline:**
1. **Upload** — File sent to MinIO, presigned URL generated
2. **Extraction** — Document parsed to text (in AI Engine)
3. **Conversion** — Markdown conversion (in AI Engine)
4. **Chunking** — Text split into chunks with overlap
5. **Embedding** — Chunks embedded into vectors (in AI Engine)
6. **Completion** — Status marked "completed", char count updated

**Data Model:**
```
KnowledgeBase {
  id, tenantId, name, description, vectorCollection,
  embeddingModel, chunkSize, chunkOverlap, totalDocuments,
  totalChars, status, createdAt, updatedAt, deletedAt
}

Document {
  id, knowledgeBaseId, tenantId, sourceType (file/url),
  originalName, mimeType, fileSize, storagePath, sourceUrl,
  markdownStoragePath, status (pending/processing/completed/failed),
  processingStep, processingProgress (%), errorMessage,
  charCount, chunkCount, processingStartedAt, processingCompletedAt,
  metadata (JSON), enabled, createdAt, updatedAt, deletedAt
}
```

### 6. Conversations Module (`src/modules/conversations/`)
**Purpose:** Chat history and analytics

**Key Files:**
- `conversations.controller.ts` — List, get, rate conversations
- `conversations.service.ts` — Conversation CRUD
- `messages.service.ts` — Message CRUD, search
- `dto/` — RateConversation, MessageFeedback, ListConversations, SearchMessages

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/conversations` | GET | JWT | List conversations (bot/tenant) |
| `/api/v1/conversations/:id` | GET | JWT | Get conversation with messages |
| `/api/v1/conversations/:id/rate` | POST | JWT | Rate conversation (1-5) |
| `/api/v1/conversations/:id/messages/:msgId/feedback` | POST | JWT | Message thumbs up/down |
| `/api/v1/conversations/:id/messages/search` | GET | JWT | Search messages by text |

**Data Model:**
```
Conversation {
  id, botId, tenantId, endUserId, endUserName, endUserEmail,
  endUserMetadata (JSON), channel, channelConversationId,
  status (active/closed), messageCount, lastMessageAt,
  rating (1-5), feedbackText, createdAt, updatedAt
}

Message {
  id, conversationId, botId, tenantId,
  role (user/assistant/system), content,
  inputTokens, outputTokens, totalTokens, creditsUsed,
  searchQuery, retrievalContext (JSON), responseTimeMs, modelUsed,
  feedback (like/dislike/null), createdAt
}
```

### 7. Chat Proxy Module (`src/modules/chat-proxy/`)
**Purpose:** External bot API endpoint with SSE streaming

**Key Files:**
- `chat-proxy.controller.ts` — SSE endpoint
- `chat-proxy.service.ts` — Quota checks, AI Engine calls, response streaming
- `dto/chat.dto.ts` — Chat message payload

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/chat/proxy` | GET | BotApiKey | Stream chat response (SSE) |

**Authentication:** `X-Bot-Api-Key` header with bot API key hash

**Response Type:** Server-Sent Events (SSE) with async generator

**Flow:**
1. Client sends message via `?botId=X` with API key
2. Endpoint validates bot key + quotas (credits, KB chars)
3. Creates/fetches conversation
4. Calls AI Engine with bot config + conversation history
5. Streams response chunks via SSE
6. Deducts credits on completion
7. Stores message and tokens in database

### 8. Analytics Module (`src/modules/analytics/`)
**Purpose:** Usage metrics and engagement analytics

**Key Files:**
- `analytics.controller.ts` — Metrics endpoint
- `analytics.service.ts` — Aggregation queries
- `dto/analytics-query.dto.ts` — Query filters

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/analytics/metrics` | GET | JWT | Get metrics (bot, date range, etc.) |

**Metrics Computed:**
- Conversation count (by bot, date range)
- Message count (total, by role)
- Credit usage (per tenant, per month)
- Response time (p50, p95, p99)
- End-user engagement rate
- Top performing bots

### 9. Billing Module (`src/modules/billing/`)
**Purpose:** Subscriptions, plans, and credit management

**Key Files:**
- `billing.controller.ts` — Subscription operations
- `billing.service.ts` — Subscription CRUD
- `credits.service.ts` — Credit allocation and tracking
- `dto/` — Subscribe, UpdateSubscription, TopUpCredits DTOs

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/billing/plans` | GET | JWT | List subscription plans |
| `/api/v1/billing/subscribe` | POST | JWT | Create subscription |
| `/api/v1/billing/subscription` | GET | JWT | Get current subscription |
| `/api/v1/billing/subscription` | PATCH | JWT | Update subscription (plan) |
| `/api/v1/billing/credits/top-up` | POST | JWT | Add credits via payment |
| `/api/v1/billing/payment-history` | GET | JWT | View payment records |

**Plan Tiers:**
- **Free:** Limited bots, credits, no team members
- **Pro:** More bots, higher credit limit, team members
- **Enterprise:** Custom limits, dedicated support

**Credit System:**
- Monthly allocation based on plan
- Top-up via VNPay or other gateways
- Tracked per message in conversations
- Quota enforced on chat proxy endpoint

**Data Model:**
```
Plan {
  id, slug, name, description, isActive,
  maxBots, maxCreditsPerMonth, maxKnowledgeCharsPerBot, maxTeamMembers,
  features (JSON), priceMonthly, priceYearly, priceWeekly,
  sortOrder, createdAt, updatedAt
}

Subscription {
  id, tenantId, planId, status, billingCycle (monthly/yearly),
  currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
  paymentMethod, externalSubscriptionId, createdAt, updatedAt
}

CreditUsage {
  id, tenantId, periodStart, periodEnd,
  creditsAllocated, creditsUsed, topUpCredits, createdAt, updatedAt
}

PaymentHistory {
  id, tenantId, subscriptionId, type (subscription/topup),
  amount, currency, status, paymentMethod, gatewayTransactionId,
  gatewayResponse (JSON), createdAt
}
```

### 10. Channels Module (`src/modules/channels/`)
**Purpose:** Third-party platform integrations

**Key Files:**
- `channels.controller.ts` — Channel CRUD
- `channels.service.ts` — Channel management
- `webhooks.controller.ts` — Inbound webhook handlers
- `dto/` — CreateChannel, UpdateChannel, FacebookConnect

**API Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/channels` | GET | JWT | List channels for bot |
| `/api/v1/channels` | POST | JWT | Connect channel (Facebook, Telegram, etc.) |
| `/api/v1/channels/:id` | PATCH | JWT | Update channel config |
| `/api/v1/channels/:id` | DELETE | JWT | Disconnect channel |

**Webhook Endpoints:**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/webhooks/facebook` | POST | Public | Facebook Messenger inbound |
| `/api/v1/webhooks/telegram` | POST | Public | Telegram inbound |

**Supported Channels:**
- Facebook Messenger (webhook integration)
- Telegram (webhook integration)
- Web widget (via Chat Proxy)
- Extensible for Slack, Discord, WhatsApp, etc.

### 11. Storage Module (`src/modules/storage/`)
**Purpose:** MinIO (VNPT internal) integration for file uploads

**Key Files:**
- `storage.service.ts` — S3-compatible operations via MinIO
- MinIO client configuration with presigned URLs

**Key Features:**
- Presigned URL generation for temporary uploads
- Document versioning in storage path
- Configurable folder and region
- Uses VNPT internal MinIO server (https://voice-storage.vnpt.vn)

## Database Schema (13 Tables)

**Entity Relationship Diagram:**
```
User (1) ──┬─ (Many) TenantMember
           │
           └─ (Many) RefreshToken

Tenant (1) ─┬─ (Many) TenantMember
            ├─ (Many) Bot
            ├─ (Many) KnowledgeBase
            ├─ (Many) Document
            ├─ (Many) Conversation
            ├─ (Many) Message
            ├─ (Many) Channel
            ├─ (Many) Subscription
            ├─ (Many) CreditUsage
            └─ (Many) PaymentHistory

Bot (1) ────┬─ (Many) BotKnowledgeBase
            ├─ (Many) Conversation
            ├─ (Many) Message
            └─ (Many) Channel

KnowledgeBase (1) ──┬─ (Many) BotKnowledgeBase
                    └─ (Many) Document

Plan (1) ───┬─ (Many) Subscription
            └─ (Many) Tenant
```

**All Tables:**
1. `users` — User accounts
2. `refresh_tokens` — JWT refresh tokens
3. `tenants` — Organizations
4. `tenant_members` — Multi-tenant membership
5. `bots` — AI assistants
6. `bot_knowledge_bases` — Bot-to-KB relationships
7. `knowledge_bases` — Document collections
8. `documents` — Individual files/URLs
9. `conversations` — Chat threads
10. `messages` — Chat messages
11. `channels` — Channel integrations
12. `plans` — Subscription tiers
13. `subscriptions` — Active subscriptions
14. `credit_usage` — Monthly credit tracking
15. `payment_history` — Payment records

**Indexes:**
- (tenant_id) on all tenant-scoped tables
- (bot_id) on conversations, messages
- (tenant_id, bot_id) composite for performance
- (created_at DESC) for ordering
- Unique on email (users), slug (tenants), (tenant_id, user_id) (members)

## Environment Variables

**Required:**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/genai_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=min-32-chars-secret-key
MINIO_SERVICE_URL=https://voice-storage.vnpt.vn
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_FOLDER_NAME=smartbot-v2
AI_ENGINE_URL=http://localhost:8000
INTERNAL_API_KEY=secure-internal-key
```

**Optional:**
```
JWT_ACCESS_TTL=900 (15 min)
JWT_REFRESH_TTL=604800 (7 days)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3001,http://localhost:5173
```

## Global Middleware & Utilities

### Guards (src/common/guards/)
- **JwtAuthGuard** — Validates JWT tokens, respects @Public()
- **TenantGuard** — Multi-tenant isolation (verifies membership)
- **QuotaGuard** — Credit and character limit enforcement

### Decorators (src/common/decorators/)
- **@Public()** — Skip authentication
- **@CurrentUser()** — Inject authenticated user info
- **@CurrentTenant()** — Inject tenant ID
- **@QuotaType(type)** — Mark endpoints for quota checks

### Interceptors (src/common/interceptors/)
- **TransformInterceptor** — Wraps all responses in `{ data, meta }` envelope

### Filters (src/common/filters/)
- **AllExceptionsFilter** — Global error handling, consistent JSON responses

### Utilities (src/common/utils/)
- **crypto.ts** — Hash and verify functions (bcrypt wrappers)
- **slug.ts** — Slug generation for tenants/channels

## Common DTOs (src/common/dto/)
- **PaginationDto** — Pagination request (limit, skip)

## Local Development

**Docker Compose Provides:**
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379
- MinIO: VNPT internal server (no local container needed)

**Commands:**
```bash
npm install                   # Install dependencies
npm run start:dev             # Run in watch mode
npm test                      # Unit tests
npm run test:cov              # Coverage report
npm run build                 # Production build
docker-compose up -d          # Start dev environment
```

**Swagger Documentation:** http://localhost:3000/api-docs

## Test Structure

- **Unit Tests:** Each module has `{feature}.spec.ts`
- **Integration Tests:** `test/` directory with Jest configuration
- **Configuration:** NestJS testing utilities, mocked dependencies
- **Coverage Target:** 80%+ (all modules)

## Dependencies Overview

**Core:**
- `@nestjs/core` v11 — NestJS framework
- `@nestjs/common`, `@nestjs/platform-express` — HTTP support
- `@nestjs/config` — Environment configuration
- `@prisma/client` v7 — Database ORM

**Authentication:**
- `@nestjs/jwt`, `@nestjs/passport` — JWT tokens
- `passport`, `passport-jwt` — Passport strategies
- `bcrypt` — Password hashing

**Database & Cache:**
- `@nestjs/bullmq`, `bullmq` — Redis job queue
- `ioredis` — Redis client

**Storage:**
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — MinIO/S3-compatible operations

**API Documentation:**
- `@nestjs/swagger` — Swagger/OpenAPI generation

**Validation:**
- `class-validator`, `class-transformer` — DTO validation

**Utilities:**
- `slugify` — URL-safe slugs
- `uuid` — ID generation
- `reflect-metadata` — Metadata reflection

**Dev Dependencies:**
- `typescript` — TypeScript compiler
- `eslint`, `prettier` — Code formatting
- `jest`, `@nestjs/testing` — Testing framework
- `ts-jest`, `ts-node` — TypeScript Jest support

## File Size Summary

```
Controllers:      80-150 lines each
Services:         150-300 lines each (larger ones split into sub-services)
DTOs:             20-50 lines each
Guards/Filters:   30-60 lines each
Main.ts:          ~45 lines
App.module.ts:    ~80 lines
```

## API Versioning

All endpoints use `/api/v1/` prefix for future compatibility.

## Response Envelope

**Success Response:**
```json
{
  "data": { /* actual response */ },
  "meta": { /* optional pagination/metadata */ }
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequestException",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Key Architectural Patterns

1. **Modular Design** — Independent feature modules with clear boundaries
2. **Dependency Injection** — NestJS DI for testability
3. **Service Layer** — Business logic separated from HTTP layer
4. **DTO Pattern** — Type-safe request/response bodies
5. **Guard/Decorator Pattern** — Reusable cross-cutting concerns
6. **Repository Pattern (Implicit)** — Prisma service acts as repository layer
7. **Async/Await** — Promise-based concurrency throughout
8. **Transaction Support** — Prisma $transaction for atomic operations
9. **Error Handling** — Consistent exception hierarchy
10. **Configuration Management** — Environment-driven setup

## Next Phase Readiness

Phase 2 (AI Engine) requires:
- POST `/api/v1/chat/proxy` functional with SSE
- Message and conversation storage complete
- Document processing queue operational
- Internal API key validation ready
- All quota enforcement in place

✅ **All Phase 1 dependencies satisfied**
