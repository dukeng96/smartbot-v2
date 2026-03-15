# GenAI Platform API - Project Overview & PDR

## Product Overview

The GenAI Platform API is a multi-tenant backend service for building and managing AI assistant chatbots. It provides a complete suite of features for user management, bot configuration, knowledge base management, conversations, billing, and channel integrations.

**Core Purpose:** Enable users to create intelligent chatbots powered by custom knowledge bases, monetize through flexible billing, and integrate with external communication channels (web widget, Facebook, Telegram, etc.).

## Phase 1 Completion Status

Phase 1 Web Backend is COMPLETE with production-ready NestJS v10 implementation.

| Component | Status | Details |
|-----------|--------|---------|
| Authentication | Complete | JWT + refresh tokens, email, Google OAuth |
| User Management | Complete | Profile, preferences, multi-tenant membership |
| Tenant Management | Complete | Organizations, member invites, role-based access |
| Bot Management | Complete | CRUD, personality, system prompts, API keys |
| Knowledge Bases | Complete | Document management, versioning, upload from files/URLs |
| Document Processing | Complete | BullMQ async queue, MinIO storage, Markdown conversion |
| Conversations | Complete | Thread-based chat history, message tracking, feedback |
| Analytics | Complete | Usage metrics, conversation analytics, token tracking |
| Billing | Complete | Plans, subscriptions, credit system, payment history |
| Chat Proxy | Complete | SSE streaming chat endpoint, async generator pattern |
| Channels | Complete | Facebook integration, webhook support, extensible |
| Storage | Complete | MinIO (VNPT internal), presigned URLs |

## Functional Requirements

### Authentication & Authorization (COMPLETE)
- Email/password registration and login
- Google OAuth 2.0 integration
- JWT access tokens (15 min TTL) + refresh tokens (7 days TTL)
- Password reset via email tokens
- Email verification tokens
- Multi-tenant isolation via TenantGuard

### User Management (COMPLETE)
- User profile CRUD
- Email verification status
- Avatar upload and URL storage
- Last login tracking
- User status (active/suspended)

### Tenant Management (COMPLETE)
- Tenant creation (auto-member as owner)
- Member invitations with email verification
- Role-based access control (admin/member)
- Member removal and status tracking
- Tenant settings (JSON flexible schema)

### Bot Management (COMPLETE)
- Bot CRUD within tenants
- System prompt customization
- Greeting messages and suggested questions
- Widget configuration (styling, behavior)
- Personality JSON settings
- API key generation and hashing
- Knowledge base attachment (many-to-many with priority)
- Bot status tracking (draft/published/archived)
- Knowledge character quota enforcement

### Knowledge Base Management (COMPLETE)
- Knowledge base CRUD
- Document upload (files and URLs)
- Async document processing via BullMQ
- Status tracking (pending/processing/completed/failed)
- Character count aggregation
- Chunk configuration (size, overlap)
- Vector collection naming
- Embedding model selection

### Document Processing (COMPLETE)
- File upload to MinIO with presigned URLs
- URL-based document ingestion
- Async processing with progress tracking
- Markdown conversion for extracted content
- Error handling and retry logic
- Processing step transitions (uploaded→extracting→converting→chunking→embedding)
- Metadata storage

### Conversations & Messages (COMPLETE)
- Thread-based conversation storage
- End-user metadata (ID, name, email, custom fields)
- Message role tracking (user/assistant/system)
- Token counting (input, output, total)
- Credit usage tracking per message
- Retrieval context storage (search query + results)
- Response time metrics
- Message feedback (thumbs up/down)
- Conversation rating and feedback text
- Full-text search on messages

### Analytics (COMPLETE)
- Conversation count by bot
- Message count aggregation
- Credit usage tracking
- Conversation duration metrics
- End-user engagement metrics
- Filterable queries (bot, tenant, date range)
- Queryable message history

### Billing & Credits (COMPLETE)
- Subscription plans with configurable limits
- Plan features (max bots, credits/month, knowledge chars/bot, team members)
- Subscription management (active/cancelled)
- Billing cycle tracking (monthly/yearly/weekly)
- Credit allocation and usage tracking
- Top-up credits system
- Payment history with gateway integration
- VNPay and external gateway support

### Chat Proxy (COMPLETE)
- Server-Sent Events (SSE) streaming
- Async generator pattern for response streaming
- Bot API key authentication (X-Bot-Api-Key header)
- User metadata injection
- Credit deduction before response
- Quota enforcement (monthly credits, knowledge chars)

### Channel Integration (COMPLETE)
- Facebook Messenger integration
- Webhook support for inbound messages
- Channel status tracking
- Connection metadata storage
- Extensible for additional platforms

### Storage (COMPLETE)
- MinIO integration (VNPT internal server)
- Presigned URL generation
- Document versioning in storage
- Configurable folder and region

## Non-Functional Requirements (COMPLETE)

| Requirement | Implementation |
|-------------|-----------------|
| Performance | Database indexing on tenant/bot/user lookups, BullMQ for async processing |
| Scalability | Horizontal scaling via stateless design, async queues, multi-tenant isolation |
| Security | JWT authentication, TenantGuard isolation, bcrypt password hashing, API key hashing |
| Reliability | Error handling at all layers, retry logic for document processing, Prisma transactions |
| Availability | Docker Compose for local dev, PostgreSQL 16 persistence, Redis for queues |
| Maintainability | Modular architecture, clear DTOs, service layer pattern, comprehensive error handling |
| Monitoring | Swagger API docs, structured logging, error tracking via filters |

## Technical Architecture

**Framework:** NestJS v10 (TypeScript)
**Database:** PostgreSQL 16 (Prisma ORM)
**Cache/Queues:** Redis 7 (BullMQ for document processing)
**Storage:** MinIO (VNPT internal, S3-compatible)
**Authentication:** Passport.js + JWT
**API Documentation:** Swagger/OpenAPI

## Deployment Architecture

- **Web Backend:** Node.js process, stateless, horizontally scalable
- **AI Engine:** Separate Python service (Phase 2), communicates via HTTP + internal API key
- **Database:** PostgreSQL container, persistent volume
- **Cache:** Redis container, ephemeral (queues only)
- **Storage:** MinIO container, persistent volume
- **Integration:** ChatProxy routes requests to AI Engine, handles SSE response streaming

## Critical Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API response time | < 500ms (p95) | Ready for measurement |
| Document processing speed | < 5 min per 100 KB | Depends on AI Engine |
| Concurrent users per bot | > 1000 | Scalable architecture |
| Uptime | 99.9% | Docker Compose ready |
| Test coverage | > 80% | In progress |

## Next Phase Dependencies

Phase 2 (AI Engine) requires:
- POST /api/v1/chat/proxy endpoint with SSE
- Message storage in database
- Internal API key validation
- Document processing queue integration
- Conversation thread context

All Phase 1 dependencies are satisfied.

## Key Files & Modules

- **src/app.module.ts** — Application bootstrap, module imports
- **src/main.ts** — Server entry point, Swagger setup
- **prisma/schema.prisma** — Data model (13 tables)
- **src/common/** — Shared guards, decorators, filters, DTOs
- **src/modules/** — 11 feature modules (auth, users, bots, etc.)
- **src/config/** — Environment configuration loaders
- **docker-compose.yml** — Local development environment

## Known Limitations

- OAuth currently Google-only (Facebook/GitHub require additional setup)
- Payment integration requires VNPay credentials
- Document extraction quality depends on AI Engine implementation
- Webhook signature verification requires channel-specific secrets

## Success Criteria

- All 11 modules functional with 80%+ test coverage
- Database properly indexed for multi-tenant queries
- Swagger docs at `/api-docs` with all endpoints documented
- Docker Compose environment starts cleanly
- Zero hardcoded secrets in codebase
