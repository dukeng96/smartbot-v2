# System Architecture

Multi-tenant AI assistant SaaS. Three services + external dependencies.

## Service Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│  Browser → smartbot-fe-web (Next.js 16, :3001)                 │
│  Widget  → iframe embed served by backend                       │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API (JWT)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        smartbot-be                              │
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
│                    smartbot-ai-engine                           │
│  FastAPI | :8000 | Python 3.11                                 │
│                                                                 │
│  Services: chat, knowledge_base, document_processor,           │
│            embedding, storage, flow_executor                    │
│                                                                 │
│  Flow nodes: start, end, llm, condition, condition_agent,      │
│              set_variable, http_request, knowledge_base, code,  │
│              text_formatter, sticky_note, memory, agent,        │
│              custom_tool, human_input                           │
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
| smartbot-fe-web | 3001 | HTTP |
| smartbot-be | 3000 | HTTP |
| smartbot-ai-engine | 8000 | HTTP |
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
├── smartbot-fe-web/       # Next.js frontend
│   └── src/app/           # App Router pages
├── smartbot-be/           # NestJS backend
│   ├── src/modules/       # Feature modules
│   └── prisma/            # Schema + migrations
├── smartbot-ai-engine/    # FastAPI + Celery
│   └── app/
│       ├── flow/          # Flow executor + nodes
│       └── services/      # Chat, KB, embedding
└── smartbot-fe-widget/    # Embeddable widget
```
