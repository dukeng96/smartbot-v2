# GenAI Assistant Platform — System Architecture

**Last Updated:** 2026-03-14

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Applications                       │
│  (Web Dashboard, Mobile, Embed Widget, External Channels)   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Load Balancer / API Gateway (Optional)             │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼ REST (Port 3000)               ▼ REST (Port 8001)
┌──────────────────────────────────┐  ┌──────────────────────────┐
│   Phase 1: Web Backend (NestJS)  │  │ Phase 2: AI Engine       │
│   - Authentication               │  │ (FastAPI)                │
│   - Bot Management               │  │ - Document Processing    │
│   - Knowledge Bases              │  │ - RAG Chat               │
│   - Conversations                │  │ - Embeddings             │
│   - Analytics                    │  │ - Vector Search          │
│   - Billing                      │  │ - Streaming Chat         │
│   - Channels                     │  └──────────────────────────┘
│   - Chat Proxy                   │           ▲  ▲  ▲
└────┬────────┬─────────┬──────────┘           │  │  │
     │        │         │                      │  │  │
     │        │         └──────┬───────────────┘  │  │
     │        │                │                  │  │
     ▼        ▼                ▼                  │  │
┌─────────┐┌──────────┐   ┌────────────────┐    │  │
│Postgres ││  Redis   │   │  BullMQ Queue  │────┘  │
│         │└──────────┘   │  (background)  │       │
│ 13 data │               └────────────────┘       │
│ models  │                                        │
└─────────┘                                 ┌──────┴─────┐
                                             │            │
                                      ┌──────▼──┐  ┌─────▼─────┐
                                      │Celery   │  │  Triton   │
                                      │Worker   │  │  Inference│
                                      │(Async)  │  │  Server   │
                                      └──────┬──┘  │(Embeddings)
                                             │     └───────────┘
                                             │
                                             │
   ┌─────────────┐ ┌────────────┐ ┌────────────────┐
   │   Qdrant    │ │  Storage   │ │  LLM APIs      │
   │  (Vectors)  │ │ (S3/MinIO) │ │(Gemini/Claude) │
   └─────────────┘ └────────────┘ └────────────────┘
```

---

## Component Architecture

### 1. Web Backend Layer (Phase 1)

**Purpose:** Core API for bot/KB/conversation management

**Components:**
- **Controllers:** HTTP request handlers for 11 modules
- **Services:** Business logic (auth, bot CRUD, conversation tracking)
- **Guards:** JWT auth, tenant isolation, quota enforcement
- **Interceptors:** Response transformation, error handling
- **ORM:** Prisma for database abstraction
- **Async Queue:** BullMQ for document processing jobs

**Technologies:**
- NestJS framework
- TypeScript strict mode
- PostgreSQL database
- Redis cache/queue
- Swagger/OpenAPI docs

**Key Patterns:**
- Dependency injection (NestJS native)
- Service layer for business logic
- Guard pipeline for authorization
- Exception filters for error handling
- Interceptor pipeline for response transformation

---

### 2. AI Engine Layer (Phase 2)

**Purpose:** Specialized service for embeddings, vector search, and RAG

**Components:**
- **API Routers:** HTTP endpoints for documents, chat, knowledge bases
- **Services:** Document processing, RAG orchestration, query rewriting
- **Core Logic:** Vector DB client, embedding service, RRF ranking
- **Celery Worker:** Async document processing tasks
- **Dependency Injection:** FastAPI dependencies for service wiring

**Technologies:**
- FastAPI framework
- Pydantic for validation
- Qdrant vector database
- Triton inference server
- Celery async worker
- Redis message broker
- Structlog for structured logging

**Key Patterns:**
- Async/await throughout
- Service orchestration (RAGChat calling Retrieval + LLM)
- Background task processing (Celery)
- Streaming responses (SSE)
- Modular service composition

---

### 3. Data Storage Layer

#### PostgreSQL (Primary Relational DB)

**Hosted:** Container in docker-compose

**Tables:**
1. **Auth:** User, RefreshToken
2. **Tenancy:** Tenant, TenantMember
3. **Bots:** Bot, BotKnowledgeBase, Channel
4. **Knowledge:** KnowledgeBase, Document
5. **Conversations:** Conversation, Message
6. **Billing:** Plan, Subscription, CreditUsage, PaymentHistory

**Indexes:**
- tenantId (multi-tenant filtering)
- botId (bot-level queries)
- conversationId (message grouping)
- createdAt (time-series analytics)
- Email (user lookup)

**Constraints:**
- Foreign keys for referential integrity
- Unique constraints on email, API keys
- Check constraints on status enums

#### Redis (Cache & Message Broker)

**Hosted:** Container in docker-compose

**Uses:**
1. **BullMQ Queue:** Document processing jobs (backend → engine)
2. **Celery Broker:** Task queue for AI Engine workers
3. **Session Cache:** Conversation history (optional)
4. **Rate Limiting:** Token bucket (future)

**Key-Value Patterns:**
- `bull:documents:*` - Job metadata
- `celery-task-meta-*` - Celery task results
- `conversations:*` - Cached conversation data

#### Qdrant (Vector Database)

**Hosted:** Container in docker-compose

**Purpose:** Dense vector storage and similarity search

**Collections (per knowledge base):**
- Collection name = `kb_{knowledge_base_id}`
- Vector size = 768 (bge-m3 embeddings)
- Distance metric = Cosine similarity

**Point Structure:**
```json
{
  "id": "vector_point_id",
  "vector": [0.1, 0.2, ..., 0.768],
  "payload": {
    "document_id": "doc-123",
    "knowledge_base_id": "kb-456",
    "chunk_text": "...",
    "source": "filename.pdf",
    "chunk_index": 0,
    "created_at": "2026-03-14T10:30:00Z"
  }
}
```

**Operations:**
- `upsert_points()` - Insert/update vectors after embedding
- `search()` - Dense similarity search
- `delete()` - Remove vectors on document deletion
- `delete_collection()` - Clean up KB vectors

#### MinIO / S3 (File Storage)

**Hosted:** MinIO container in docker-compose

**Purpose:** Store original documents before processing

**Bucket:** `documents`

**Paths:**
- `documents/{tenant_id}/{knowledge_base_id}/{document_id}`

**Lifecycle:**
1. File uploaded → stored in S3
2. Celery worker retrieves file
3. TextExtractor processes file
4. File can be deleted after chunks stored in Qdrant

---

### 4. Processing Pipeline

#### Document Ingestion Pipeline (Async via Celery)

**Trigger:** POST /api/v1/knowledge-bases/{id}/documents

**Flow:**
```
1. Frontend uploads file to Backend
   └─> Backend stores in S3
   └─> Backend creates Document entity (status=pending)
   └─> Backend queues BullMQ job

2. Backend worker picks up job
   └─> Calls Celery: process_document(doc_id, kb_id)

3. Celery Worker (AI Engine) processes
   ├─> TextExtractor: S3 → OCR (Marker Cloud) → markdown
   ├─> Chunker: text → chunks (512 tokens, 100 overlap)
   ├─> EmbeddingService: chunks → embeddings (Triton)
   ├─> QdrantHandler: store vectors with metadata
   └─> Update Document.status = completed

4. Backend polls/webhook: Document ready
   └─> Update Analytics
   └─> Notify frontend
```

**Error Handling:**
- TextExtractor fails → Document.status = error
- Embedding fails → Retry 3x with backoff
- Qdrant upsert fails → Retry 3x with backoff
- Max retries exceeded → Document.status = error with message

**Estimated Duration:** 5-30 seconds per document (depends on file size)

---

#### RAG Chat Pipeline (Synchronous Streaming)

**Trigger:** POST /api/v1/chat/{botId}/messages

**Flow:**
```
1. Frontend sends message to Backend
   └─> Backend validates bot exists
   └─> Backend loads conversation history

2. Backend calls Engine
   └─> POST /engine/v1/chat/completions
   └─> Body: {kb_id, query, conversation_history}

3. Engine processes (async generator)
   ├─> QueryRewriter: "question" → "refined question"
   ├─> HybridRetrieval:
   │   ├─> BM25 sparse search on chunks
   │   ├─> Dense search: query embedding → Qdrant top-10
   │   └─> RRF ranking: merge both results
   ├─> Context building: top-5 chunks + source metadata
   ├─> LLMStream: Gemini/Claude with context
   └─> SSE stream chunks as they arrive

4. Backend streams chunks to Frontend
   └─> JavaScript receives SSE events
   └─> Display streaming response in chat UI

5. On completion
   └─> Backend creates Message entity
   └─> Update CreditUsage
   └─> Create Conversation if new
```

**Latency:**
- Query rewriting: ~100ms
- Vector search: ~50-100ms (top-10)
- LLM streaming: ~2-5 seconds (first token ~500ms)
- Total E2E: ~3-5 seconds (GOAL)

---

### 5. Service Integration Points

#### Backend → Engine (Synchronous)

**Document Embedding Query:**
```
GET /engine/v1/documents/{id}/chunks
Response: {chunks: [{text, index}]}
Use: Pre-flight check before UI rendering
```

**Chat Completion:**
```
POST /engine/v1/chat/completions (SSE)
Request: {
  "knowledge_base_id": "kb-123",
  "query": "How do I return?",
  "conversation_history": [{role, content}, ...]
}
Response: Server-Sent Events stream
```

#### Backend → Engine (Asynchronous via Queue)

**Document Processing Job:**
```
BullMQ Job → Celery Task
{
  "documentId": "doc-456",
  "knowledgeBaseId": "kb-123",
  "filePath": "documents/tenant/kb/doc-456"
}
Celery processes → updates Document.status → (future) webhook back
```

#### Backend ↔ Backend (Internal)

**Multi-module communication:**
- BotService → KnowledgeBaseService (get KB for bot)
- ConversationService → Document Service (check KB document count)
- AnalyticsService → message/conversation queries (aggregation)
- BillingService → CreditUsageService (consume credits on chat)

**Pattern:** Direct service injection (NestJS DI)

---

## Data Flow Diagrams

### Document Processing Data Flow

```
Tenant
  │
  └─► Bot
       │
       └─► KnowledgeBase
            │
            ├─► Document (file_upload)
            │    │
            │    ├─ Upload to S3: file.pdf
            │    │
            │    └─► BullMQ Job
            │         │
            │         └─► Celery Worker
            │              ├─ TextExtractor: pdf → text
            │              │
            │              ├─ Chunker: text → chunks
            │              │   └─ 512 tokens, 100 overlap
            │              │
            │              ├─ EmbeddingService: chunks → vectors
            │              │   └─ Triton (bge-m3) → 768D
            │              │
            │              └─► Qdrant (store)
            │                   └─ Collection: kb_123
            │                   └─ Points: chunk vectors
            │
            └─► Document (indexed)
                 ├─ chunks_count: N
                 ├─ status: completed
                 └─ ready for RAG search
```

### Chat Data Flow

```
End User (chat bubble)
  │
  └─► POST /api/v1/chat/{botId}/messages
       │
       ├─ Backend: validate
       ├─ Backend: get bot + KBs
       │
       └─► POST /engine/v1/chat/completions (SSE)
            │
            ├─ QueryRewriter: expand query
            │
            ├─ Sparse Search (BM25):
            │  └─ match chunks against query terms
            │
            ├─ Dense Search:
            │  ├─ Embed query: Triton → 768D vector
            │  └─ Qdrant: cosine similarity → top-10
            │
            ├─ RRF Ranking:
            │  └─ Merge sparse + dense results
            │
            ├─ Context Building:
            │  └─ Top-5 results + metadata
            │
            ├─ LLM Streaming:
            │  ├─ Prompt: context + query
            │  └─ Stream response tokens
            │
            └─► SSE Stream Back
                 │
                 └─► Frontend JavaScript
                      └─ Display in chat UI
                      └─ Create Message entity
                      └─ Update conversation
```

---

## Integration Contracts

### Backend ↔ Engine Chat API

**Request:**
```json
{
  "knowledge_base_id": "string (UUID)",
  "query": "string",
  "conversation_history": [
    {
      "role": "user|assistant|system",
      "content": "string"
    }
  ],
  "include_sources": "boolean (optional)"
}
```

**Response (SSE):**
```
event: message
data: {"chunk": "The return...", "index": 0}

event: message
data: {"chunk": " policy is...", "index": 1}

event: done
data: {}
```

**Status Codes:**
- 200: Streaming started
- 400: Invalid KB ID or query
- 404: Knowledge base not found
- 500: LLM or retrieval error

---

### Engine Document API

**POST /engine/v1/documents/process**
```json
Request: {
  "knowledge_base_id": "kb-123",
  "file": "<binary>",
  "source_type": "file_upload|url_crawl|text_input"
}

Response: {
  "id": "doc-456",
  "knowledge_base_id": "kb-123",
  "status": "pending",
  "created_at": "2026-03-14T10:30:00Z"
}
```

**Status Codes:**
- 202: Processing started (async)
- 400: Invalid KB ID
- 413: File too large
- 500: Storage error

---

### Data Model Relationships

```
User
├─ RefreshToken (1:N)
└─ TenantMember (1:N)
    └─ Tenant (N:1)
        ├─ Bot (1:N)
        │  ├─ BotKnowledgeBase (1:N)
        │  │  └─ KnowledgeBase (N:1)
        │  │     ├─ Document (1:N)
        │  │     │  └─ Chunks (Qdrant vectors)
        │  │     └─ Collection (Qdrant)
        │  ├─ Channel (1:N)
        │  └─ Conversation (1:N)
        │     └─ Message (1:N)
        │
        ├─ Subscription (1:1)
        │  └─ Plan (N:1)
        ├─ CreditUsage (1:N)
        └─ PaymentHistory (1:N)
```

---

## Deployment Architecture

### Development Environment

```
docker-compose up -d

Containers:
├─ postgres:16 (port 5432)
├─ redis:7 (port 6379)
├─ minio:latest (port 9000)
├─ qdrant:latest (port 6333)
├─ triton-inference-server (port 8000)
├─ backend (NestJS, port 3000)
├─ engine (FastAPI, port 8001)
└─ celery-worker (background tasks)
```

### Production Architecture (Recommended)

```
┌─────────────────────┐
│  CloudFlare / CDN   │
│  (Static Assets)    │
└──────────┬──────────┘
           │
┌──────────▼──────────────────────────┐
│  Kubernetes Cluster (Horizontal)    │
│  ├─ NestJS Backend (3+ replicas)   │
│  ├─ FastAPI Engine (2+ replicas)   │
│  └─ Celery Workers (2+ replicas)   │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  Managed Services                   │
│  ├─ RDS PostgreSQL (Multi-AZ)      │
│  ├─ ElastiCache Redis               │
│  ├─ S3 (document storage)           │
│  ├─ Qdrant Cloud (vector DB)        │
│  └─ SageMaker (Triton embeddings)   │
└─────────────────────────────────────┘
```

---

## Security Architecture

### Authentication Flow

```
User Registration
  ├─ POST /api/v1/auth/register
  ├─ Validate email + password
  ├─ Hash password (bcrypt)
  ├─ Create User + Tenant
  └─ Return JWT (access + refresh)

User Login
  ├─ POST /api/v1/auth/login
  ├─ Verify password (bcrypt compare)
  ├─ Generate JWT (15min TTL)
  ├─ Store refresh token (Redis, 7d TTL)
  └─ Return tokens

Token Refresh
  ├─ POST /api/v1/auth/refresh
  ├─ Validate refresh token
  ├─ Clear expired tokens (>30d)
  └─ Return new access token

Protected Routes
  ├─ All requests include: Authorization: Bearer {token}
  ├─ JwtAuthGuard validates signature
  ├─ TenantGuard enforces tenant isolation
  └─ Proceed or return 401/403
```

### Multi-Tenant Isolation

```
Every Request
  ├─ Extract tenantId from JWT
  ├─ TenantGuard middleware
  ├─ Validates: JWT.tenantId == Request.tenantId
  └─ Filters database queries by tenantId

Results:
  ├─ User A cannot access User B's bots
  ├─ User A cannot access User B's conversations
  ├─ User A cannot access User B's analytics
  └─ Cross-tenant hijacking prevented
```

### Authorization Hierarchy

```
Tenant Owner
  ├─ Full access (CRUD everything)
  ├─ Team management
  └─ Billing settings

Admin (Team Member)
  ├─ Bot CRUD
  ├─ KB management
  ├─ Team member management
  └─ View analytics

Member (Team Member)
  ├─ Read bots
  ├─ Create conversations
  ├─ View own analytics
  └─ Cannot modify bot config

Viewer (Team Member)
  ├─ Read-only access
  ├─ View analytics
  └─ Cannot modify anything

Public (API Key)
  ├─ Chat API only
  ├─ No admin access
  └─ Conversation creation only
```

---

## Performance Considerations

### Caching Strategy

**PostgreSQL Caching:**
- Connection pooling: 20-100 connections
- Query result caching (Redis) for:
  - Popular bots (expire: 1 hour)
  - Bot settings (expire: 24 hours)
  - Plan/subscription lookup (expire: 24 hours)

**Redis Caching:**
- Conversation history (expire: 7 days)
- BullMQ job metadata (auto-cleanup)
- Session tokens (auto-cleanup on expiry)

**Qdrant Caching:**
- Built-in vector cache (LRU)
- Collection metadata cached locally

### Query Optimization

**PostgreSQL Indexes:**
- Primary: id (automatic)
- Foreign: tenantId, botId, conversationId, kbId
- Time-series: createdAt (for analytics)
- Search: email (for auth)

**Pagination Enforced:**
- Limit: default 50, max 1000
- Offset/cursor patterns for large datasets

**Vector Search Optimization:**
- Qdrant vector size: 768D (bge-m3 optimal)
- Top-K search: default 10, configurable
- Distance metric: cosine (fast)

### Rate Limiting (Recommended)

**Public Chat API:**
- 60 requests/minute per bot API key
- 1000 requests/hour per IP

**Authenticated Endpoints:**
- 1000 requests/minute per user
- Per-tenant burst allowance

**Implementation:** NestJS throttler guard with Redis backend

---

## Monitoring & Observability

### Logging

**Backend (NestJS):**
- Winston logger (JSON format)
- Log levels: debug, info, warn, error
- Structured context: userId, tenantId, requestId

**Engine (FastAPI):**
- Structlog (JSON in production, console in dev)
- Request tracing via X-Request-ID header
- Task monitoring for Celery jobs

### Metrics

**Application Metrics:**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Queue depth (BullMQ, Celery)
- Vector search latency
- Embedding generation time

**Business Metrics:**
- Conversations created per day
- Messages per conversation
- KB documents processed
- Credit usage
- Subscription churn

### Health Checks

**Backend:**
- GET /api/v1/health → {status: "ok", db: "ok", redis: "ok"}

**Engine:**
- GET /engine/v1/health → {status: "ok", qdrant: "ok", triton: "ok"}

**Probes:**
- Kubernetes liveness: /health (restart if down)
- Kubernetes readiness: /ready (traffic if ready)

---

## Disaster Recovery

### Data Backup

**PostgreSQL:**
- Daily automated backups (AWS RDS)
- Point-in-time recovery (7 days)
- Cross-region replicas (optional)

**Qdrant:**
- Snapshot export before major migrations
- Collection backups (manual)

**S3:**
- Versioning enabled
- Lifecycle policies (archive old files)

### Failover

**Database Failover:**
- Multi-AZ PostgreSQL (automatic failover)
- Read replicas for analytics queries

**Service Failover:**
- Multiple replicas of backend/engine
- Load balancer (automatic routing)
- Service mesh (Istio optional)

**Job Queue Failover:**
- Redis persistence (AOF + RDB)
- Celery task retry (3x with backoff)

---

## Technology Stack Summary

| Layer | Service | Tech | Version |
|-------|---------|------|---------|
| **Frontend** | Web Dashboard | React/Next.js | TBD |
| | Embed Widget | Vanilla JS | TBD |
| **API** | Web Backend | NestJS | v10 |
| | AI Engine | FastAPI | v0.100+ |
| **Database** | RDBMS | PostgreSQL | 16 |
| | Vector DB | Qdrant | v1.7+ |
| | Cache | Redis | 7 |
| **Processing** | Async Queue (Backend) | BullMQ | v3+ |
| | Async Queue (Engine) | Celery | v5.3+ |
| | Embeddings | Triton | v2.30+ |
| | OCR | Marker Cloud | API v1 |
| **Storage** | Object Storage | MinIO/S3 | Latest |
| **Logging** | Backend | Winston | v3+ |
| | Engine | Structlog | v21+ |
| **Inference** | LLM | Gemini/Claude | API v1 |

---

## Next Steps (Phase 3+)

1. **Frontend Dashboard**
   - React/Next.js SPA
   - Connects to NestJS backend
   - Bot builder, KB uploader, analytics

2. **Embed Widget**
   - Vanilla JS chat bubble
   - Loads bot config from API
   - Streaming chat integration

3. **Channel Integrations**
   - Facebook Messenger webhook
   - Telegram Bot API
   - Zalo Official Account

4. **DevOps**
   - CI/CD pipelines (GitHub Actions)
   - Container registry (Docker Hub/ECR)
   - Kubernetes manifests
   - Terraform infrastructure as code
