# GenAI Assistant Platform — Codebase Summary

**Last Updated:** 2026-03-14

---

## Overview

The GenAI Assistant Platform is a multi-service application for building and managing conversational AI bots with knowledge base support, analytics, and billing. The architecture consists of:

1. **Phase 1: Web Backend (NestJS)** - Bot/KB/conversation management, auth, billing
2. **Phase 2: AI Engine (FastAPI)** - Document processing, embeddings, RAG chat

Both services integrate via HTTP APIs and async job queues (BullMQ in backend, Celery in engine).

---

## Directory Structure

```
smartbot-v2/
├── genai-platform-api/                 # Phase 1: Web Backend (NestJS)
│   ├── src/
│   │   ├── common/                     # Guards, filters, interceptors
│   │   ├── modules/                    # Feature modules
│   │   │   ├── auth/                   # JWT, registration, login
│   │   │   ├── tenants/                # Multi-tenancy & team management
│   │   │   ├── bots/                   # Bot CRUD & configuration
│   │   │   ├── knowledge-bases/        # KB management & document upload
│   │   │   ├── conversations/          # Chat history & messages
│   │   │   ├── analytics/              # Dashboard KPIs & trends
│   │   │   ├── billing/                # Plans, subscriptions, payments
│   │   │   ├── channels/               # Channel integration stubs
│   │   │   └── chat/                   # Public chat API (SSE)
│   │   └── main.ts                     # Entry point
│   ├── prisma/
│   │   └── schema.prisma               # 13 data models
│   ├── docker-compose.yml              # Postgres, Redis, MinIO
│   └── package.json
│
├── genai-engine/                       # Phase 2: AI Engine (FastAPI)
│   ├── app/
│   │   ├── api/                        # API endpoints
│   │   │   ├── router.py               # API router
│   │   │   ├── health.py               # Health check
│   │   │   ├── documents.py            # Document endpoints
│   │   │   ├── knowledge_bases.py      # KB endpoints
│   │   │   └── chat.py                 # Chat endpoints (SSE)
│   │   ├── core/                       # Core logic
│   │   │   ├── triton_client.py        # Embedding via Triton
│   │   │   ├── qdrant_handler.py       # Vector DB client
│   │   │   └── rrf.py                  # Reciprocal Rank Fusion
│   │   ├── services/                   # Business logic
│   │   │   ├── chunker.py              # Text chunking
│   │   │   ├── embedding_service.py    # Embedding orchestration
│   │   │   ├── text_extractor.py       # OCR & text extraction
│   │   │   ├── rag_chat.py             # RAG retrieval + generation
│   │   │   ├── query_rewriter.py       # Query clarification
│   │   │   ├── document_processor.py   # Document pipeline
│   │   │   └── storage.py              # S3/file storage
│   │   ├── worker/                     # Async workers
│   │   │   ├── celery_app.py           # Celery config
│   │   │   └── tasks.py                # Background tasks
│   │   ├── models/                     # DTOs & Pydantic models
│   │   │   ├── requests.py             # Request schemas
│   │   │   └── responses.py            # Response schemas
│   │   ├── dependencies.py             # Dependency injection
│   │   ├── config.py                   # Environment config
│   │   └── main.py                     # FastAPI entry point
│   ├── tests/
│   │   ├── conftest.py                 # Shared fixtures
│   │   └── test_chunker.py             # Service tests
│   ├── Dockerfile
│   ├── docker-compose.yml              # Qdrant, Redis, Triton
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                               # Project documentation
│   ├── codebase-summary.md             # This file
│   ├── development-roadmap.md          # Project phases & milestones
│   ├── project-changelog.md            # Release notes & changes
│   └── ...
│
└── README.md
```

---

## Phase 1: Web Backend (NestJS)

### Purpose
REST API for bot creation, knowledge base management, conversation tracking, analytics, and billing. Multi-tenant with JWT auth.

### Key Technologies
- **Framework:** NestJS v10 with TypeScript
- **Database:** PostgreSQL 16 (Prisma ORM)
- **Cache:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Job Queue:** BullMQ
- **Auth:** JWT (access: 15min, refresh: 7days)
- **API Docs:** Swagger/OpenAPI

### Core Modules

#### 1. Auth Module (`src/modules/auth/`)
- User registration with auto-tenant creation
- Email/password login with bcrypt hashing
- JWT token generation (access + refresh)
- Token refresh with cleanup (>30 days old)
- Google OAuth stub (ready for integration)
- Password strength validation (12+ chars, mixed case, digits, special)

**DTOs:**
- RegisterDto: email, password, fullName
- LoginDto: email, password
- RefreshTokenDto: refreshToken
- UserResponseDto: id, email, fullName, tenantId

#### 2. Tenants Module (`src/modules/tenants/`)
- Tenant CRUD operations
- Team member management (invite, remove, role assignment)
- Tenant settings storage
- Roles: owner, admin, member, viewer
- TenantGuard for request isolation

**Entities:**
- Tenant: id, name, settings, createdAt
- TenantMember: userId, tenantId, role, joinedAt

#### 3. Bots Module (`src/modules/bots/`)
- Bot CRUD with status (draft, active, paused, archived)
- Personality config: system prompt, greeting, suggested questions
- Widget appearance customization: color, font, position
- API key generation with SHA-256 hashing
- Bot duplication (copy with new KB links)
- Embed code generation (iframe, bubble, direct link)

**Entities:**
- Bot: id, tenantId, name, status, personality, widgetConfig, apiKeyHash
- BotKnowledgeBase: botId, knowledgeBaseId (junction table)

**Key Endpoints:**
- POST /api/v1/bots (create)
- GET /api/v1/bots (list with pagination)
- GET /api/v1/bots/{id} (detail)
- PATCH /api/v1/bots/{id} (update)
- DELETE /api/v1/bots/{id} (soft-delete)
- POST /api/v1/bots/{id}/duplicate (clone)
- POST /api/v1/bots/{id}/generate-embed-code (widget code)

#### 4. Knowledge Bases Module (`src/modules/knowledge-bases/`)
- KB CRUD with chunk configuration
- Document upload (file, URL crawl, text input)
- S3/MinIO storage integration
- Document status tracking: pending → processing → completed/error
- Async job queue integration (BullMQ)
- Document deletion with soft-delete pattern

**Entities:**
- KnowledgeBase: id, tenantId, name, chunkSize, chunkOverlap, config
- Document: id, kbId, name, source, status, metadata, fileUrl

**Key Endpoints:**
- POST /api/v1/knowledge-bases (create)
- GET /api/v1/knowledge-bases (list)
- PATCH /api/v1/knowledge-bases/{id} (update config)
- DELETE /api/v1/knowledge-bases/{id} (soft-delete)
- POST /api/v1/knowledge-bases/{id}/documents (upload)
- GET /api/v1/knowledge-bases/{id}/documents (list)
- DELETE /api/v1/documents/{id} (remove document)

#### 5. Conversations Module (`src/modules/conversations/`)
- Conversation listing with filters (channel, status, date range)
- Pagination (default: 50, max: 1000)
- Message CRUD with role-based content (user, assistant, system)
- Full-text search via PostgreSQL tsvector
- Message feedback (thumbs up/down)
- Conversation rating (1-5 stars with feedback text)
- Conversation status: active, closed, archived

**Entities:**
- Conversation: id, botId, channelId, endUserId, status, rating, feedback
- Message: id, conversationId, role, content, feedback

**Key Endpoints:**
- GET /api/v1/conversations (list with filters & pagination)
- GET /api/v1/conversations/{id} (detail)
- GET /api/v1/conversations/{id}/messages (messages)
- POST /api/v1/messages/{id}/feedback (rate message)
- POST /api/v1/conversations/{id}/rating (rate conversation)
- DELETE /api/v1/conversations/{id} (soft-delete)

#### 6. Analytics Module (`src/modules/analytics/`)
- Overview KPIs: conversations, messages, credits used, active bots, documents
- Time-series aggregation (conversations, messages, credits by date)
- Channel breakdown analytics
- Bot-level analytics (top questions by similarity)
- Satisfaction distribution (rating histogram)
- Raw SQL queries with PostgreSQL DATE_TRUNC aggregation

**Key Endpoints:**
- GET /api/v1/analytics/overview (KPIs)
- GET /api/v1/analytics/conversations (time-series)
- GET /api/v1/analytics/messages (time-series)
- GET /api/v1/analytics/channels (breakdown)
- GET /api/v1/analytics/bots/{botId}/top-questions (top questions)
- GET /api/v1/analytics/satisfaction (rating histogram)

#### 7. Billing Module (`src/modules/billing/`)
- 4 predefined plans: Free, Starter, Advanced, Pro (VND pricing)
- Subscription management (weekly, monthly, yearly cycles)
- Credit usage tracking per billing period
- Top-up credits purchase flow
- Payment history with transaction tracking
- VNPay payment gateway stub (signature validation ready)
- MoMo payment gateway stub

**Entities:**
- Plan: id, name, credits, price, billingCycle
- Subscription: id, tenantId, planId, startDate, endDate, status
- CreditUsage: id, tenantId, conversationId, amount, date
- PaymentHistory: id, tenantId, amount, gateway, transactionId, status

**Key Endpoints:**
- GET /api/v1/plans (list plans)
- GET /api/v1/subscriptions (user's subscription)
- POST /api/v1/subscriptions (subscribe to plan)
- POST /api/v1/credits/topup (purchase credits)
- GET /api/v1/payments (payment history)

#### 8. Channels Module (`src/modules/channels/`)
- Channel CRUD (web_widget, facebook_messenger, telegram, zalo, api)
- Channel configuration storage
- Connection status tracking
- Webhook infrastructure stub (Facebook, Telegram, Zalo receivers)

**Entities:**
- Channel: id, botId, type, config, isConnected, connectedAt

**Key Endpoints:**
- POST /api/v1/channels (create)
- GET /api/v1/channels/{botId} (list by bot)
- PATCH /api/v1/channels/{id} (update config)
- DELETE /api/v1/channels/{id} (disconnect)

#### 9. Chat Module (`src/modules/chat/`)
- Public chat API for end users
- Server-Sent Events (SSE) streaming responses
- Async generator pattern for response buffering
- Conversation history loading (returning users)
- End-user metadata tracking
- Credit increment on message completion
- No authentication required (via bot API key)

**DTOs:**
- CreateMessageDto: conversationId, content, endUserMetadata
- ChatStreamResponseDto: id, content, role, timestamp, conversationId

**Key Endpoints:**
- POST /api/v1/chat/:botId/messages (create message, returns SSE stream)
- GET /api/v1/chat/:botId/conversations/:conversationId (get history)

### Prisma Data Models (13 total)

1. **User** - Registered users (email, password hash, profile)
2. **RefreshToken** - JWT refresh tokens (expires after 30 days)
3. **Tenant** - Workspace/organization (billing unit)
4. **TenantMember** - User-Tenant relationship with roles
5. **Bot** - Chatbot instance (config, personality, widget)
6. **BotKnowledgeBase** - Bot-KB junction (many-to-many)
7. **KnowledgeBase** - Document collection (chunking config)
8. **Document** - File/URL/text input (status, metadata)
9. **Conversation** - Chat session (user, bot, feedback)
10. **Message** - Individual chat message (content, role, feedback)
11. **Channel** - Integration (Messenger, Telegram, etc.)
12. **Plan** - Billing plan (credits, price, cycle)
13. **Subscription** - User subscription to plan
14. **CreditUsage** - Credit consumption tracking
15. **PaymentHistory** - Payment records (gateway, transaction)

### Security Controls

- **JWT validation** on protected routes (JwtAuthGuard)
- **TenantGuard** enforcing multi-tenant isolation
- **QuotaGuard** checking document upload limits
- **InternalApiKeyGuard** for inter-service calls (timing-safe comparison)
- **Input validation** via class-validator DTOs
- **Password hashing** with bcrypt (10 rounds)
- **API key hashing** with SHA-256
- **SQL injection prevention** via Prisma parameterized queries
- **CORS configuration** per environment
- **Global exception filter** preventing info leaks
- **Rate limiting** recommended for Phase 1.1

### API Response Envelope

All endpoints use consistent response format:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { /* response body */ }
}
```

Error responses include user-friendly messages without sensitive details.

### Testing

- E2E test suite for auth flow
- Bot CRUD test cases
- Document upload test cases
- Chat flow test cases
- All tests passing with validation report

---

## Phase 2: AI Engine (FastAPI)

### Purpose
Standalone service for document ingestion with OCR, chunking, embedding, and RAG chat with streaming responses.

### Key Technologies
- **Framework:** FastAPI with Uvicorn
- **Vector DB:** Qdrant
- **Embeddings:** Triton inference server (bge-m3)
- **Search:** BM25 + dense embeddings with Reciprocal Rank Fusion (RRF)
- **Job Queue:** Celery with Redis broker
- **Logging:** Structlog (JSON in production)
- **API Docs:** Swagger/OpenAPI

### Architecture Pattern

**Request flow for document processing:**
1. Client uploads document via POST /engine/v1/documents/process
2. FastAPI stores metadata and queues Celery task
3. Celery worker extracts text (Marker Cloud OCR)
4. Worker chunks text (semantic chunking)
5. Worker generates embeddings (Triton → bge-m3)
6. Worker stores embeddings in Qdrant collection
7. Document status updated to `completed`

**Request flow for RAG chat:**
1. Client sends query via POST /engine/v1/chat/completions
2. Query rewriter clarifies intent
3. Hybrid retrieval: BM25 sparse + dense embedding search
4. RRF ranking combines sparse/dense results
5. Top-K results sent to LLM with context
6. LLM streaming response via SSE
7. Client receives chunks as they arrive

### Core Services

#### 1. Chunker Service (`app/services/chunker.py`)
**Purpose:** Semantic text chunking with size/overlap control

**Key Methods:**
- `chunk_text(text, chunk_size=512, overlap=100)` → List[str]
- Splits by sentences/paragraphs to preserve context
- Configurable overlap for continuity
- Default: 512 token chunks, 100 token overlap

**Used By:** DocumentProcessor (during document ingestion)

#### 2. TextExtractor Service (`app/services/text_extractor.py`)
**Purpose:** OCR and text extraction from documents

**Key Methods:**
- `extract_from_file(file_path)` → Tuple[str, metadata]
- `extract_from_url(url)` → Tuple[str, metadata]
- Marker Cloud integration stub (ready for API call)
- Supports: PDF, DOCX, images, HTML
- Returns: markdown text + source metadata

**Used By:** DocumentProcessor

#### 3. Embedding Service (`app/services/embedding_service.py`)
**Purpose:** Generate embeddings via Triton inference server

**Key Methods:**
- `embed_texts(texts: List[str])` → List[List[float]]
- Batch processing for efficiency
- Uses bge-m3 model (VNPT BGE-M3) via Triton
- Returns: 768-dimensional vectors

**Configuration:**
- Triton host: `TRITON_HOST` (default: localhost:8000)
- Model name: bge-m3
- Batch size: 32 (configurable)

**Used By:** DocumentProcessor, RAGChat

#### 4. Qdrant Handler (`app/core/qdrant_handler.py`)
**Purpose:** Vector database client for collection management and search

**Key Methods:**
- `create_collection(collection_name, vector_size=768)`
- `delete_collection(collection_name)`
- `upsert_vectors(collection_name, points)` → upserted IDs
- `dense_search(collection_name, vector, top_k=10)` → List[SearchResult]
- `delete_vectors(collection_name, ids)`

**Vector Point Structure:**
```json
{
  "id": "doc-chunk-001",
  "vector": [0.1, 0.2, ..., 0.768],
  "payload": {
    "document_id": "doc-123",
    "knowledge_base_id": "kb-456",
    "chunk_text": "...",
    "source": "filename.pdf",
    "chunk_index": 0
  }
}
```

**Used By:** DocumentProcessor (upsert), RAGChat (search)

#### 5. RRF Ranking (`app/core/rrf.py`)
**Purpose:** Combine sparse (BM25) and dense (embedding) search results

**Key Methods:**
- `reciprocal_rank_fusion(sparse_results, dense_results, k=60)` → List[Result]
- Formula: RRF(d) = Σ(1 / (k + rank))
- Produces merged ranked list with combined scores

**Configuration:**
- k parameter: 60 (constant in formula)
- Tunable: weights for sparse vs dense

**Used By:** RAGChat (hybrid retrieval)

#### 6. Query Rewriter Service (`app/services/query_rewriter.py`)
**Purpose:** Clarify and expand user queries for better retrieval

**Key Methods:**
- `rewrite_query(original_query)` → str
- Detects intent, fills gaps, expands synonyms
- LLM stub (Gemini/Claude ready)

**Example:**
```
Input:  "What's the return policy?"
Output: "What is the company's product return policy and timeline?"
```

**Used By:** RAGChat (before retrieval)

#### 7. RAG Chat Service (`app/services/rag_chat.py`)
**Purpose:** Orchestrate retrieval-augmented generation with streaming

**Key Methods:**
- `async chat_stream(knowledge_base_id, query, stream_callback)` → AsyncGenerator[str]
- Calls: QueryRewriter → HybridRetrieval → LLMStream
- Streams chunks as they arrive
- Context limiting (4K token window)

**Flow:**
1. Rewrite query for clarity
2. Hybrid search: BM25 + embeddings + RRF
3. Select top-K results (default: 5)
4. Build context: "Retrieved from: {sources}\n\n{documents}"
5. Stream LLM response via callback

**Used By:** ChatRouter (HTTP endpoint)

#### 8. Document Processor (`app/services/document_processor.py`)
**Purpose:** Orchestrate document ingestion pipeline (Celery task)

**Key Methods:**
- `process_document(document_id, knowledge_base_id)` → None
- Async Celery task with error handling

**Pipeline:**
1. Extract text from source (TextExtractor)
2. Chunk text (Chunker)
3. Generate embeddings (EmbeddingService)
4. Store vectors (QdrantHandler)
5. Update Document status to `completed`
6. On error: status → `error` with message

**Used By:** Celery worker (background tasks)

#### 9. Storage Service (`app/services/storage.py`)
**Purpose:** File storage abstraction (S3/MinIO)

**Key Methods:**
- `upload_file(file, key)` → url
- `download_file(key)` → bytes
- `delete_file(key)` → None

**Configuration:**
- S3_ENDPOINT_URL (MinIO or AWS S3)
- S3_ACCESS_KEY, S3_SECRET_KEY
- S3_BUCKET_NAME

**Used By:** DocumentRouter (upload handling)

### API Endpoints

#### Health Check
- `GET /engine/v1/health` → `{"status": "ok"}`

#### Documents
- **POST /engine/v1/documents/process**
  - Body: `{file, knowledge_base_id, metadata}`
  - Creates Document with status `pending`
  - Queues Celery task for processing
  - Returns: DocumentResponse (id, status, metadata)

- **POST /engine/v1/documents/{id}/reprocess**
  - Queues new processing task
  - Clears old embeddings from Qdrant
  - Returns: DocumentResponse (updated status)

- **DELETE /engine/v1/documents/{id}/vectors**
  - Removes document's vectors from Qdrant
  - Document status → `indexed_cleared`
  - Returns: `{success: true}`

- **GET /engine/v1/documents/{id}/chunks**
  - Retrieves document's chunks from Qdrant
  - Returns: `{chunks: [{text, index, embedding_size}]}`

#### Knowledge Bases
- **POST /engine/v1/knowledge-bases**
  - Body: `{name, description}`
  - Creates Qdrant collection
  - Returns: KBResponse (id, collection_name, created_at)

- **DELETE /engine/v1/knowledge-bases/{id}**
  - Deletes Qdrant collection
  - Cascades document deletion
  - Returns: `{deleted: true}`

#### Chat
- **POST /engine/v1/chat/completions** (SSE)
  - Body: `{knowledge_base_id, query, conversation_history}`
  - Streams response chunks via Server-Sent Events
  - Returns: `event: message\ndata: {chunk}\n\n`
  - Final event: `event: done\ndata: {}\n\n`

- **POST /engine/v1/chat/test**
  - No persistence (for testing)
  - Body: `{query}`
  - Returns: single ChatResponse (non-streaming)

### Data Models (Pydantic)

#### Requests
- **DocumentRequest:** file, knowledge_base_id, metadata, source_type
- **ChatRequest:** knowledge_base_id, query, conversation_history[], include_sources
- **KnowledgeBaseRequest:** name, description, config{}

#### Responses
- **DocumentResponse:** id, knowledge_base_id, name, status, created_at, chunks_count
- **ChatResponse:** id, response, sources[], tokens_used, latency_ms
- **KBResponse:** id, name, collection_name, document_count, created_at
- **ChunkInfo:** text, index, embedding_size, source
- **EmbeddingResult:** id, similarity_score, metadata
- **RetrievalResult:** documents[], total_count, retrieval_time_ms

### Celery Workers

**Configuration:**
- Broker: Redis (configurable URL)
- Result backend: Redis
- Task serialization: JSON
- Retry policy: 3 attempts, exponential backoff

**Tasks:**
- `process_document(document_id, knowledge_base_id)` - Ingestion pipeline
- `delete_document_vectors(document_id)` - Vector cleanup
- Monitoring: task status via Redis

**Usage:**
```python
# Enqueue task
document_processor_task.delay(doc_id, kb_id)

# Check status
task_result = AsyncResult(task_id)
```

### Environment Configuration (`config.py`)

**FastAPI:**
- `HOST` (default: 0.0.0.0)
- `PORT` (default: 8000)
- `DEBUG` (development mode)
- `API_PREFIX` (default: /engine/v1)

**Qdrant:**
- `QDRANT_URL` (default: http://localhost:6333)
- `QDRANT_API_KEY` (production only)

**Triton:**
- `TRITON_HOST` (default: localhost:8000)
- `TRITON_MODEL_NAME` (default: bge-m3)
- `EMBEDDING_DIM` (default: 768)

**Celery/Redis:**
- `REDIS_URL` (default: redis://localhost:6379)
- `CELERY_BROKER_URL` (derived from REDIS_URL)

**Storage:**
- `S3_ENDPOINT_URL` (MinIO or AWS)
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET_NAME`

**LLM Providers (stubs):**
- `GEMINI_API_KEY`
- `CLAUDE_API_KEY`
- `LLM_PROVIDER` (gemini|claude|local)

**Marker Cloud:**
- `MARKER_CLOUD_API_KEY`
- `MARKER_CLOUD_URL`

### Docker Compose Services

**genai-engine/docker-compose.yml:**
1. **Qdrant** - Vector database (port 6333)
2. **Redis** - Message broker & cache (port 6379)
3. **Triton** - Inference server (port 8000)
4. **FastAPI** - Application (port 8001)
5. **Celery Worker** - Async task processor

### Testing

**Unit Tests:**
- Chunker: semantic chunking, overlap handling
- EmbeddingService: batch processing, dimension validation
- QueryRewriter: query rewriting logic
- RRF: ranking combination, score normalization

**Integration Tests (in progress):**
- Document ingestion end-to-end
- RAG chat retrieval + generation
- Qdrant collection operations
- Celery task execution

**Test Fixtures:**
- Mock Triton client
- In-memory Qdrant (for testing)
- Mock LLM responses

---

## Integration Points

### Phase 1 ↔ Phase 2 Communication

**Synchronous Calls:**
- Web backend → Engine: POST /engine/v1/chat/completions (chat proxy)
- Web backend → Engine: GET /engine/v1/documents/{id}/chunks (retrieve document info)

**Asynchronous via BullMQ:**
- Web backend queues: Document upload → Engine processes
- Engine notifies backend: Webhook to POST /api/v1/documents/{id}/complete

**Shared Entities:**
- Knowledge Base ID (KBId in backend = collection name in engine)
- Document ID (DocumentId in backend = point IDs in Qdrant)
- Bot ID (cross-reference for analytics)
- Tenant ID (for multi-tenancy)

---

## Development Workflow

### Adding a New Feature

1. **Backend:** Add model to Prisma → generate migration → implement controller → test
2. **Engine:** Add Pydantic model → implement service → add endpoint → test
3. **Integration:** Update chat flow or webhook handler
4. **Documentation:** Update changelog, API docs, roadmap

### Debugging Tips

**Backend:**
- Check PostgreSQL logs: `docker compose logs postgres`
- Test endpoints: Swagger UI at http://localhost:3000/api/docs
- BullMQ jobs: Check Redis dashboard or admin UI

**Engine:**
- Check Qdrant: UI at http://localhost:6333/dashboard
- Test embeddings: Triton logs and health endpoint
- Check Celery: Monitor tasks in Redis

### Code Quality

- **Linting:** ESLint (backend), Ruff/Black (engine)
- **Testing:** Jest (backend), Pytest (engine)
- **Type Safety:** TypeScript strict mode, Pydantic validation
- **Documentation:** Swagger/OpenAPI auto-generated from code

---

## Known Limitations & Future Work

**Phase 1:**
- Password reset email sending stubbed
- OAuth integration stubbed
- Payment gateway integration stubbed
- Rate limiting not enforced (recommended)

**Phase 2:**
- Marker Cloud OCR integration (stub)
- LLM provider integration (stubs)
- Sparse search (BM25) not yet implemented
- Performance benchmarking in progress
- Production Qdrant configuration pending

**Phase 3+:**
- Frontend dashboard not started
- Embed widget not started
- Channel integrations not started

---

## Performance Considerations

- **Embeddings:** Batch processing (32 vectors/batch) for throughput
- **Search:** Hybrid retrieval with RRF balances precision/recall
- **Chunking:** 512 tokens default; tunable per KB
- **Context Window:** 4K tokens for LLM context (prevents truncation)
- **Pagination:** 50 items default, 1000 max (backend)
- **Database Indexes:** PostgreSQL on tenantId, botId, createdAt, etc.

---

## Security Summary

**Authentication:**
- JWT access/refresh tokens (15min/7day TTL)
- Password hashing (bcrypt 10 rounds)
- API key hashing (SHA-256)

**Authorization:**
- TenantGuard (multi-tenant isolation)
- QuotaGuard (resource limits)
- Role-based access (owner/admin/member/viewer)

**Data Protection:**
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML escaping in widget)
- Timing-safe comparison for API keys
- Qdrant API key required in production

**Recommended Additions:**
- Rate limiting on public endpoints
- Request signing for inter-service calls
- Audit logging for sensitive operations
- Regular security scanning (dependency updates)

---

## Dependencies

**Backend:** NestJS, Prisma, TypeORM, BullMQ, JWT, bcrypt, Swagger, Docker
**Engine:** FastAPI, Pydantic, Qdrant client, Celery, Redis, Structlog, Triton client

All dependencies locked in package.json and requirements.txt with exact versions.

---

## Quick Start Links

- **Backend:** `genai-platform-api/README.md`
- **Engine:** `genai-engine/README.md`
- **Docker:** Run `docker compose up` from each service directory
- **API Docs:** http://localhost:3000/api/docs (backend), http://localhost:8001/docs (engine)
- **Database:** psql with `docker exec -it postgres psql -U postgres`
