# System Architecture

Multi-tenant AI assistant SaaS. Three services + external dependencies.

## Service Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│  Browser → smartbot-web (Next.js 16, :3001)                    │
│  Widget  → iframe embed served by backend                       │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API (JWT)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    genai-platform-api                           │
│  NestJS 11 | :3000 | Prisma 7 ORM                              │
│                                                                 │
│  Modules: auth, users, tenants, bots, knowledge-bases,         │
│           documents, conversations, messages, channels,         │
│           billing, flows, credentials, custom-tools, flow-exec │
│                                                                 │
│  Guards: JwtAuthGuard, TenantGuard, QuotaGuard                 │
│  Queue: BullMQ → Redis                                         │
└─────────────────────────────────────────────────────────────────┘
           │ HTTP + X-Internal-Key          │ SSE relay
           ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      genai-engine                               │
│  FastAPI | :8000 | Python 3.11                                 │
│                                                                 │
│  Services: chat, knowledge_base, document_processor,           │
│            embedding, storage, flow_executor                    │
│                                                                 │
│  Flow nodes: start, end, llm, condition, set_variable,         │
│              http_request, knowledge_base, code, text_formatter,│
│              sticky_note, memory, agent, custom_tool, human_input│
│                                                                 │
│  Workers: Celery (document processing)                          │
└─────────────────────────────────────────────────────────────────┘
                              │ VPN required
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VNPT Infrastructure                          │
│  Triton (:31831)  — bge-m3 embeddings                          │
│  Qdrant (:32500)  — vector search                              │
│  LLM API          — assistant-stream.vnpt.vn                   │
└─────────────────────────────────────────────────────────────────┘
```

## Port Summary

| Service | Port | Protocol |
|---------|------|----------|
| smartbot-web | 3001 | HTTP |
| genai-platform-api | 3000 | HTTP |
| genai-engine | 8000 | HTTP |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
| MinIO | 9000/9001 | HTTP |
| Triton | 31831 | gRPC (VPN) |
| Qdrant | 32500 | HTTP (VPN) |

## Data Flow: Chat Request

```
1. User sends message via widget/web
2. Frontend → POST /api/chat
3. Backend resolves bot → flow → credentials
4. Backend → POST /engine/v1/flows/:flowId/execute (SSE)
5. Engine runs LangGraph flow, emits events
6. Backend relays SSE to frontend
7. Frontend renders streaming response
```

## Data Flow: Document Upload

```
1. User uploads file via dashboard
2. Frontend → POST /api/documents/upload
3. Backend stores file in MinIO, creates Document record
4. Backend enqueues BullMQ job
5. Engine Celery worker picks job:
   - Extract text (PDF/DOCX/etc)
   - Chunk text
   - Embed chunks via Triton
   - Store vectors in Qdrant
6. Engine → PATCH /internal/documents/:id/status (callback)
7. Backend updates Document status
```

## Multi-tenancy

- Every model has `tenantId` foreign key
- `TenantGuard` validates request tenant matches resource
- Tenant determined from JWT claims via `@CurrentTenant()` decorator
- Cross-tenant access = 403 Forbidden

## Key Directories

```
smartbot-v2/
├── smartbot-web/          # Next.js frontend
│   └── src/app/           # App Router pages
├── genai-platform-api/    # NestJS backend
│   ├── src/modules/       # Feature modules
│   └── prisma/            # Schema + migrations
├── genai-engine/          # FastAPI + Celery
│   └── app/
│       ├── flow/          # Flow executor + nodes
│       └── services/      # Chat, KB, embedding
└── smartbot-widget/       # Embeddable widget
```
