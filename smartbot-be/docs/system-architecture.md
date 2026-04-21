# System Architecture - GenAI Platform

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Frontend (Phase 3)                       │
│                 React/Vue Dashboard + Bot Builder               │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GenAI Platform API                            │
│                    (Phase 1 - COMPLETE)                          │
│  Auth │ Users │ Bots │ KnowBase │ Conversations │ Billing │     │
└──────┬──────┬──────┬──────────┬────────────────┬────────┬──────┘
       │      │      │          │                │        │
       ▼      ▼      ▼          ▼                ▼        ▼
  PostgreSQL  MinIO     Redis    BullMQ      Swagger   JWT Auth

       │
       ├─→ Chat Proxy (SSE)
       │   GET /api/v1/chat/proxy?botId=X
       │   (Response streaming)
       │
       └─→ AI Engine (Phase 2)
           HTTP POST for completions
           Calls back via internal API key
```

## Module Architecture (11 Feature Modules)

### Tier 1: Infrastructure
```
Common Layer (src/common/)
├── guards/
│   ├── JwtAuthGuard — Validates JWT tokens, skips @Public()
│   ├── TenantGuard — Isolates requests to tenant context
│   └── QuotaGuard — Enforces credit & storage limits
├── decorators/
│   ├── @CurrentUser() — Injects authenticated user
│   ├── @CurrentTenant() — Injects tenant context
│   ├── @Public() — Marks endpoint public
│   └── @QuotaType() — Marks quota-checked endpoints
├── filters/
│   └── AllExceptionsFilter — Global error handling + logging
├── interceptors/
│   └── TransformInterceptor — Wraps all responses: { data, meta }
└── prisma/
    └── PrismaService — Database connection pool

Config Layer (src/config/)
├── app.config — APP_URL, NODE_ENV, CORS
├── database.config — DATABASE_URL + connection options
├── redis.config — REDIS_URL for BullMQ
├── jwt.config — JWT_SECRET, token TTLs
├── minio.config — MINIO_SERVICE_URL, credentials, folder
└── ai-engine.config — AI_ENGINE_URL, INTERNAL_API_KEY
```

### Tier 2: Auth & User Management
```
AuthModule (src/modules/auth/)
├── AuthController (POST routes only)
│   ├── /register — Email + password signup
│   ├── /login — Email + password login
│   ├── /refresh — Refresh access token
│   ├── /logout — Revoke refresh token
│   ├── /forgot-password — Email reset link
│   ├── /reset-password — Reset with token
│   ├── /verify-email — Email confirmation
│   └── /oauth/google — Google OAuth callback
├── AuthService
│   ├── JWT generation (access + refresh)
│   ├── Bcrypt password hashing
│   ├── Refresh token storage in DB
│   └── Email validation DTOs
└── JwtStrategy (Passport) — Token extraction & validation

UsersModule (src/modules/users/)
├── UsersController
│   ├── GET /profile — Current user profile
│   ├── PATCH /profile — Update user details
│   └── POST /avatar — Avatar upload
├── UsersService
│   └── User CRUD & preferences
└── DTOs: UpdateUserDto
```

### Tier 3: Tenant & Bot Management
```
TenantsModule (src/modules/tenants/)
├── TenantsController
│   ├── POST / — Create tenant
│   ├── GET / — List user's tenants
│   ├── PATCH /:id — Update settings
│   ├── POST /:id/members/invite — Invite member
│   ├── PATCH /:id/members/:memberId/role — Update role
│   └── DELETE /:id/members/:memberId — Remove member
├── TenantsService
│   ├── Tenant CRUD
│   ├── Member management (invites, roles)
│   └── Slug generation
└── DTOs: UpdateTenantDto, InviteMemberDto, UpdateMemberRoleDto

BotsModule (src/modules/bots/)
├── BotsController
│   ├── POST / — Create bot in tenant
│   ├── GET / — List bots in tenant
│   ├── PATCH /:id — Update bot config
│   ├── DELETE /:id — Archive bot
│   ├── PATCH /:id/personality — Update personality JSON
│   ├── PATCH /:id/widget — Update widget config
│   ├── POST /:id/knowledge-bases — Attach knowledge base
│   └── DELETE /:id/knowledge-bases/:kbId — Detach KB
├── BotsService
│   ├── API key generation & hashing
│   ├── Knowledge base linking with priority
│   ├── Quota enforcement (max bots per plan)
│   └── Character limit tracking
└── DTOs: CreateBotDto, UpdateBotDto, UpdatePersonalityDto, etc.
```

### Tier 4: Knowledge Base & Document Management
```
KnowledgeBasesModule (src/modules/knowledge-bases/)
├── Controllers
│   ├── KnowledgeBasesController (CRUD)
│   │   ├── POST / — Create KB
│   │   ├── GET / — List KBs in tenant
│   │   └── PATCH /:id — Update settings
│   ├── DocumentsController (User-facing)
│   │   ├── POST /documents/upload — File upload
│   │   ├── POST /documents/url — Add from URL
│   │   ├── GET /documents/:id — Get document
│   │   └── DELETE /documents/:id — Delete document
│   └── InternalDocumentsController
│       └── PATCH /documents/:id/status — Update processing status
├── Services
│   ├── KnowledgeBasesService — KB CRUD
│   ├── DocumentsService — Document CRUD
│   └── DocumentProcessingWorker — BullMQ handler
└── DTOs: CreateDocumentUrlDto, CreateDocumentTextDto, etc.

Document Processing Pipeline
  1. Upload → MinIO presigned URL (temporary)
  2. Extraction → Parse file to text
  3. Conversion → Convert to Markdown
  4. Chunking → Split by chunk_size/overlap
  5. Embedding → Call AI Engine API
  6. Completion → Update document status
  Errors → Retry or mark failed
```

### Tier 5: Conversations & Chat
```
ConversationsModule (src/modules/conversations/)
├── ConversationsController
│   ├── GET / — List conversations (bot/tenant)
│   ├── GET /:id — Get conversation thread
│   ├── POST /:id/rate — Rate conversation
│   ├── POST /:id/messages/:msgId/feedback — Message feedback
│   └── GET /:id/messages/search — Full-text search
├── ConversationsService
│   ├── Conversation CRUD
│   ├── Message creation & storage
│   ├── Rating & feedback
│   └── Search across messages
└── MessagesService
    ├── Message CRUD
    ├── Token counting
    ├── Credit deduction
    └── Retrieval context storage

Message Model (Schema)
{
  conversationId, botId, tenantId
  role: "user" | "assistant" | "system"
  content: string
  inputTokens, outputTokens, totalTokens
  creditsUsed: decimal
  searchQuery, retrievalContext (JSON)
  responseTimeMs, modelUsed
  feedback: "like" | "dislike" | null
  createdAt
}
```

### Tier 6: Chat Proxy (External Integration)
```
ChatProxyModule (src/modules/chat-proxy/)
├── ChatProxyController
│   └── GET /api/v1/chat/proxy?botId=X — SSE streaming
├── ChatProxyService
│   ├── Bot API key validation
│   ├── Quota checks (credits, knowledge chars)
│   ├── Message creation
│   ├── AI Engine HTTP call
│   ├── Async generator for SSE
│   └── Credit deduction
└── DTOs: ChatDto (user message, metadata)

API Flow
  1. External client: POST /chat/proxy?botId=X&token=apikey
  2. ChatProxy validates bot API key + quotas
  3. Creates Conversation if needed
  4. Calls AI Engine with bot prompt + context
  5. Streams response via SSE async generator
  6. Deducts credits on completion
  7. Stores message in DB with tokens/credits
```

### Tier 7: Billing & Subscriptions
```
BillingModule (src/modules/billing/)
├── BillingController
│   ├── POST /subscribe — Create subscription
│   ├── PATCH /subscription — Update plan
│   ├── POST /credits/top-up — Add credits
│   └── GET /payment-history — Payment records
├── BillingService
│   ├── Subscription CRUD
│   ├── Plan validation
│   └── Billing cycle management
└── CreditsService
    ├── Credit allocation (plan + top-up)
    ├── Usage tracking per tenant per month
    ├── Quota enforcement
    └── Reset on billing cycle

Plan Model
{
  slug: "free" | "pro" | "enterprise"
  maxBots, maxCreditsPerMonth, maxKnowledgeCharsPerBot
  maxTeamMembers
  priceMonthly, priceYearly, priceWeekly
  features: { canUseCustomDomain, ... }
}
```

### Tier 8: Analytics
```
AnalyticsModule (src/modules/analytics/)
├── AnalyticsController
│   └── GET /metrics?bot=X&from=date&to=date — Metrics
├── AnalyticsService
│   ├── Conversation count by bot
│   ├── Message count aggregation
│   ├── Credit usage totals
│   ├── Engagement metrics
│   └── Response time analytics
└── DTOs: AnalyticsQueryDto (filters)

Computed Metrics
  - Total conversations per bot
  - Total messages per bot
  - Average messages per conversation
  - Credit usage per month
  - Response time percentiles (p50, p95, p99)
  - End-user engagement rate
```

### Tier 9: Channels & Webhooks
```
ChannelsModule (src/modules/channels/)
├── ChannelsController
│   ├── POST / — Connect channel
│   ├── GET / — List channels
│   ├── DELETE /:id — Disconnect
│   └── PATCH /:id — Update config
├── ChannelsService
│   └── Channel CRUD + connection tracking
└── WebhooksController
    ├── POST /webhooks/facebook — Facebook Messenger webhook
    ├── POST /webhooks/telegram — Telegram webhook
    └── Additional platforms as needed

Channel Types Supported
  - web_widget (via ChatProxy)
  - facebook_messenger (webhook inbound)
  - telegram (webhook inbound)
  - slack (extensible)
```

### Tier 10: Storage (MinIO Integration)
```
StorageModule (src/modules/storage/)
└── StorageService
    ├── Presigned URL generation
    ├── File upload with multipart
    ├── Bucket/folder operations
    └── S3-compatible client (VNPT MinIO)
```

## Request Flow Example: User Sends Message

```
1. External Bot (ChatProxy Endpoint)
   GET /api/v1/chat/proxy?botId=abc&token=key

2. ChatProxyController
   │
   ├─ @Guard(JwtAuthGuard) → Skip (uses X-Bot-Api-Key header)
   ├─ Validate bot API key hash matches token
   ├─ Check QuotaGuard (credits available? KB chars OK?)
   │
3. ChatProxyService.chat()
   │
   ├─ Find Bot (verify exists, not deleted)
   ├─ Load Bot's KnowledgeBases (ordered by priority)
   ├─ Create/fetch Conversation
   ├─ Create Message (role: "user")
   │
4. AI Engine Call (HTTP)
   POST http://localhost:8000/complete
   {
     botId, systemPrompt, userMessage,
     history: [... last N messages],
     knowledgeContext: [... retrieved chunks],
     internalApiKey: "..."
   }

5. AI Engine Response
   {
     content: "...",
     tokens: { input, output },
     searchQuery, retrievalContext
   }

6. Create Assistant Message
   Message { role: "assistant", content, tokens, credits }

7. Deduct Credits
   CreditUsage.creditsUsed += message.credits

8. Stream Response (SSE)
   async function* generator() {
     yield "data: { chunk: '...' }\n\n"
     yield "data: { tokens: {...} }\n\n"
     yield "data: [DONE]\n\n"
   }
```

## Data Isolation & Security

### Multi-Tenant Isolation
- **Request Level:** TenantGuard validates user belongs to tenant
- **Query Level:** All queries filtered by `tenantId`
- **Database Level:** Foreign key constraints ensure data integrity
- **Index Level:** Composite indexes on (tenantId, field) for performance

### API Key Security
- Bot API keys hashed with bcrypt before storage
- Prefix stored separately (e.g., "bot_abc123...")
- ChatProxy compares incoming token hash against stored hash
- Keys never logged or exposed in responses

### JWT Token Management
- Access tokens (15 min) — for web dashboard
- Refresh tokens (7 days) — stored in DB, revocable
- Token invalidation on logout deletes refresh token from DB
- No token rotation complexity (simple refresh model)

## Database Design

**13 Tables:**
1. users — Authentication + profile
2. refresh_tokens — JWT refresh token storage
3. tenants — Organizations with ownership
4. tenant_members — Multi-tenant membership + roles
5. bots — Assistant configurations
6. bot_knowledge_bases — Many-to-many with priority
7. knowledge_bases — Knowledge base metadata
8. documents — Individual documents with processing status
9. conversations — Chat threads
10. messages — Individual messages + token/credit tracking
11. channels — External integrations (Facebook, Telegram)
12. plans — Subscription pricing tiers
13. subscriptions — Tenant subscriptions
14. credit_usage — Monthly credit allocation + usage
15. payment_history — Payment records

**Key Indexes:**
- (tenant_id) on all tenant-scoped tables
- (bot_id) on conversations, messages
- (tenant_id, bot_id) composite for performance
- (created_at DESC) for ordering
- (conversation_id, created_at) for message retrieval

## Deployment Context

### Production Separation

**Web Backend (This repo)**
- Stateless NestJS processes
- Multiple replicas behind load balancer
- PostgreSQL connection pooling
- Redis queue isolation per environment

**AI Engine (Separate repo, Phase 2)**
- Python FastAPI service
- Models served via llama-cpp or Ollama
- Calls Web Backend at `/api/v1/internal/completions`
- Internal API key validation required

**Integration Flow**
```
ChatProxy → AI Engine → Internal Callback
   ↓          ↓              ↓
POST chat    /complete    /internal/
   ↓                           ↓
Response streaming        Update message
   ↓                      tokens/credits
SSE to client
```

## Error Handling Strategy

**Layer 1: DTO Validation**
- ValidationPipe rejects invalid requests before reaching service
- Custom decorators for business logic validation

**Layer 2: Service Layer**
- Business logic exceptions (quota exceeded, not found)
- Prisma exceptions wrapped with context

**Layer 3: Global Filter**
- AllExceptionsFilter catches all exceptions
- Converts to proper HTTP status + error message
- Never exposes stack traces in production

**Response Format (Error)**
```json
{
  "statusCode": 400,
  "message": "Credit quota exceeded",
  "error": "BadRequestException"
}
```

## Performance Characteristics

| Operation | Target | Implementation |
|-----------|--------|-----------------|
| User login | <100ms | Single DB query + JWT signing |
| List bots | <200ms | Indexed query on tenant_id |
| Create message | <300ms | Single INSERT + quota check |
| Retrieve conversation | <150ms | Indexed query, limit=50 |
| Search messages | <500ms | PostgreSQL full-text search |
| Document processing | Async | BullMQ handles retries |

## Scalability Patterns

1. **Horizontal Scaling:** Stateless API processes, no session state
2. **Database Scaling:** PostgreSQL replication ready, Prisma connection pooling
3. **Async Processing:** BullMQ decouples document processing from API
4. **Caching:** Redis for tokens + queues (not yet implemented: conversation cache)
5. **Rate Limiting:** Throttler guard available but not yet applied to routes

## Security Practices

- ✅ No hardcoded secrets (all env vars)
- ✅ Bcrypt password hashing (rounds=10)
- ✅ API key hashing before storage
- ✅ JWT with secure TTLs
- ✅ CORS configured for frontend origins
- ✅ Request validation at boundary
- ✅ SQL injection prevention (Prisma parameterized)
- ✅ XSS prevention (no HTML rendering, JSON only)
- ⏳ CSRF token (not implemented, frontend handles)
- ⏳ Rate limiting (module available, not deployed)
