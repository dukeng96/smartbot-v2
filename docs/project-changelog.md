# GenAI Assistant Platform — Project Changelog

**Last Updated:** 2026-03-14

---

## [Phase 2] — 2026-03-14 (IN PROGRESS)

### Release: AI Engine Service — Foundation Complete

**Status:** IMPLEMENTATION IN PROGRESS

#### Added

**Core FastAPI Service:**
- FastAPI application with Swagger/OpenAPI documentation
- Structlog structured logging (JSON in production, console in dev)
- Environment-based configuration (config.py with pydantic Settings)
- Uvicorn server with auto-reload support

**Document Processing Pipeline:**
- Document ingestion with OCR (Marker Cloud integration stub)
- Text extraction and markdown conversion via TextExtractor service
- Semantic chunking with configurable chunk size (512 tokens default) and overlap
- Document metadata tracking and versioning
- Async document processing via Celery workers
- Status tracking: pending → processing → completed/error

**Embedding & Vector Search:**
- Triton inference client for bge-m3 embeddings (VNPT BGE-M3 model)
- Embedding service with batch processing support
- Qdrant vector database client
- Collection management (create, delete, list)
- Hybrid search: BM25 sparse + dense embeddings
- Reciprocal Rank Fusion (RRF) for combining sparse/dense results
- Top-K similarity search with configurable thresholds

**RAG Chat & LLM Integration:**
- Query rewriter service for query intent clarification
- Hybrid retrieval with RRF ranking
- RAG chat service orchestrating retrieval + generation
- Server-Sent Events (SSE) streaming responses
- Context limiting for LLM window management
- LLM provider stubs (Gemini, Claude, local models)

**Celery Async Workers:**
- Celery app configuration with Redis broker
- Document processing task queue
- Background job monitoring
- Task retry logic

**Knowledge Base Management:**
- Knowledge base CRUD operations
- Collection-to-KB mapping
- Document retrieval per knowledge base
- Deletion with vector cleanup

**API Endpoints:**
- `POST /engine/v1/documents/process` - Ingest and process documents
- `POST /engine/v1/documents/{id}/reprocess` - Reprocess existing document
- `DELETE /engine/v1/documents/{id}/vectors` - Remove document vectors
- `GET /engine/v1/documents/{id}/chunks` - Retrieve document chunks
- `POST /engine/v1/chat/completions` - RAG chat with SSE streaming
- `POST /engine/v1/chat/test` - Test chat without persistence
- `POST /engine/v1/knowledge-bases` - Create knowledge base
- `DELETE /engine/v1/knowledge-bases/{id}` - Delete knowledge base
- `GET /engine/v1/health` - Health check endpoint

**Data Models:**
- DocumentRequest/Response DTOs
- ChatRequest/Response with streaming support
- KnowledgeBaseRequest/Response
- ChunkInfo with metadata (text, embedding, source)
- EmbeddingResult with similarity scores
- RetrievalResult with ranking information

**Infrastructure:**
- Docker & Docker Compose for Qdrant, Redis, Triton
- `.env.example` with all required variables (Qdrant, Triton, API keys)
- Requirements.txt with FastAPI, Celery, Qdrant client dependencies
- Dockerfile for containerization

**Testing:**
- Unit tests for core services (chunker, embedding, query rewriter)
- Conftest.py with shared fixtures
- Test database/vector DB configuration

#### In Progress

- Full E2E test coverage for API endpoints
- Marker Cloud OCR integration (currently stubbed)
- LLM integration tests (Gemini/Claude/local)
- Performance benchmarking (embedding latency, search accuracy)
- Production deployment configuration

#### Security Considerations

- API endpoint rate limiting (recommended)
- Document access control per knowledge base
- Qdrant authentication (API key required in production)
- Embedding model access control
- Query injection prevention

---

## [Phase 1] — 2026-03-14

### Release: Web Backend Platform Complete

**Status:** RELEASED & APPROVED

#### Added

**Core Infrastructure:**
- NestJS v10 backend with TypeScript strict mode
- Prisma v6+ ORM with 13 models
- Docker Compose stack (Postgres 16, Redis 7, MinIO)
- Environment-based configuration management

**Authentication & Authorization:**
- JWT access/refresh token mechanism (15min/7day TTL)
- Email-based registration with auto-tenant creation
- Password-based login with bcrypt hashing
- Token refresh endpoint with cleanup
- Google OAuth stub (ready for integration)
- JwtAuthGuard, TenantGuard, QuotaGuard, InternalApiKeyGuard

**Multi-Tenant Architecture:**
- TenantGuard with tenant isolation validation
- Tenant CRUD operations
- Team member management (roles: owner, admin, member, viewer)
- Tenant settings & configuration

**Bot Management:**
- Bot CRUD with draft/active/paused/archived states
- Personality configuration (system prompt, greeting, suggested questions)
- Widget appearance customization
- API key generation with SHA-256 hashing
- Bot duplication (copy with new KB links)
- Embed code generation (iframe, bubble, direct link)

**Knowledge Base System:**
- Knowledge base CRUD
- Document upload to S3/MinIO
- Document source types: file_upload, url_crawl, text_input
- Chunk size/overlap configuration
- Document status tracking (pending, processing, completed, error)
- Async job queue integration (BullMQ)
- Soft-delete pattern with metadata preservation

**Conversation Management:**
- Conversation listing with filters (channel, status, date range)
- Pagination support
- Message CRUD with role-based content
- Conversation search via full-text PostgreSQL tsvector
- Message feedback (thumbs up/down)
- Conversation rating (1-5 stars with feedback text)

**Analytics Dashboard:**
- Overview KPIs (conversations, messages, credits, active bots, documents)
- Time-series aggregation (conversations, messages, credits by date)
- Channel breakdown analytics
- Bot-level top questions (grouped by similarity)
- Satisfaction distribution (rating histogram)
- RAW SQL queries with PostgreSQL DATE_TRUNC aggregation

**Billing & Payment:**
- 4 predefined plans (Free, Starter, Advanced, Pro) with VND pricing
- Subscription management (weekly, monthly, yearly billing cycles)
- Credit usage tracking per billing period
- Top-up credits purchase flow
- Payment history with transaction tracking
- VNPay payment gateway stub (signature validation ready)
- MoMo payment gateway stub

**Chat Proxy & SSE:**
- Public chat API (`/api/v1/chat/:botId/messages`)
- Server-Sent Events (SSE) streaming
- Async generator pattern for response buffering
- Conversation history loading for returning users
- End-user metadata tracking
- Credit increment on message completion

**Channel Management:**
- Channel CRUD (web_widget, facebook_messenger, telegram, zalo, api)
- Channel configuration storage
- Connection status tracking
- Webhook infrastructure stub (Facebook, Telegram, Zalo receivers)

**Data Models (Prisma Schema):**
- User, RefreshToken (auth)
- Tenant, TenantMember (multi-tenancy)
- Bot, BotKnowledgeBase (bot management)
- KnowledgeBase, Document (knowledge base system)
- Conversation, Message (conversations)
- Channel (channel management)
- Plan, Subscription, CreditUsage, PaymentHistory (billing)

**API & Documentation:**
- Swagger/OpenAPI documentation for all endpoints
- 65+ REST endpoints across 11 modules
- Request/response DTOs with validation decorators
- Global exception filter with user-friendly error messages
- Pagination DTO for list endpoints
- Transform interceptor for consistent response envelope

#### Fixed (Code Review Issues)

**High Priority Fixes:**
1. **Conversation Tenant Isolation:** Added `tenantId` check to `getOrCreate()` method to prevent cross-tenant conversation hijacking (Issue #1)
2. **Password Strength:** Updated password validation to require 12+ chars with uppercase, lowercase, digit, special char (Issue #2)
3. **Document Upload Quota:** Implemented knowledge base character limit validation in QuotaGuard (Issue #3)
4. **Widget XSS Protection:** HTML-escaped bot name and config in widget preview HTML generation (Issue #4)
5. **Refresh Token Cleanup:** Added token expiration cleanup (>30 days) during token refresh to prevent DB bloat (Issue #5)

**Medium Priority Fixes:**
1. **Timing-Safe Comparison:** Changed InternalApiKeyGuard to use `crypto.timingSafeEqual()` instead of string equality (Issue #6)

#### Testing

- E2E test suite for auth flow (register, login, refresh, logout)
- Bot CRUD test cases
- Document upload test cases
- Chat flow test cases
- All tests passing (validation report: `genai-platform-api/plans/reports/tester-20260314-test-validation.md`)

#### Security Review

**Code Review Status:** ✓ APPROVED WITH CONDITIONS

- 0 CRITICAL issues
- 5 HIGH priority issues (all FIXED)
- 5 MEDIUM priority issues (1 FIXED, others acceptable for MVP)
- 5 LOW priority issues
- Full review report: `genai-platform-api/plans/reports/code-review-report.md`

**Key Security Controls:**
- JWT token validation on protected routes
- TenantGuard enforcing multi-tenant isolation
- Input validation via class-validator DTOs
- Password hashing with bcrypt
- API key hashing with SHA-256
- SQL injection prevention (Prisma parameterized queries)
- CORS configuration
- Global exception filter preventing info leaks

#### Build Status

- 0 non-Prisma TypeScript compilation errors
- Remaining errors are expected (Prisma client generation requires live DB)
- Docker build successful
- All dependencies installed and verified

#### Documentation

- Implementation plan: `PHASE1-WEB-BACKEND-PLAN.md`
- Code review report: `genai-platform-api/plans/reports/code-review-report.md`
- Test validation report: `genai-platform-api/plans/reports/tester-20260314-test-validation.md`
- API specification: Swagger UI at `/api/docs`

---

## Known Limitations

**Acceptable for MVP:**
- Password reset email sending stubbed (logs token, doesn't send email)
- Email verification flow not implemented
- OAuth integration stubbed (Google login not fully integrated)
- Payment gateway integration stubbed (signature validation ready, no actual payment processing)
- Rate limiting not enforced on public chat endpoint (recommended for Phase 1.1)
- Soft-delete inconsistency (some entities hard-delete, recommendation to standardize)

**Phase 2 Dependencies:**
- AI Engine HTTP APIs not integrated (stubs in place)
- Document processing queue expects external AI service
- LLM endpoints not yet implemented

---

## Breaking Changes

None — this is the initial version.

---

## Migration Guide

N/A for Phase 1 (first release).

---

## Performance Notes

- PostgreSQL indexes on tenantId, botId, conversationId, createdAt for query optimization
- BullMQ async processing prevents blocking chat requests
- Redis caching ready (not yet configured)
- Pagination enforced on all list endpoints (default limit: 50, max: 1000)

---

## Deployment Notes

**Container Requirements:**
- Node.js 20 LTS
- Postgres 16+
- Redis 7+
- MinIO or S3-compatible storage

**Environment Setup:**
- `.env.example` provided with all required variables
- Seed script creates default plans on database initialization
- Docker Compose for local development included

**Next Release (Phase 2):**
- AI Engine microservice
- Vector database (Qdrant/Weaviate)
- Document processing integration

---

## Contributors

- GenAI Platform Team

## License

TBD
