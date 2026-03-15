# GenAI Assistant Platform — Development Roadmap

**Last Updated:** 2026-03-14

---

## Overview

Roadmap for multi-phase development of the GenAI Assistant Platform. Phase 1 (Web Backend) complete; Phase 2 (AI Engine) in planning.

---

## Phase 1: Web Backend Platform — COMPLETE ✓

**Status:** COMPLETE (2026-03-14)

**Objective:** Build comprehensive NestJS backend with auth, bot/KB management, conversations, analytics, billing, channels.

**Deliverables:**
- NestJS v10 API with JWT auth
- Prisma ORM with 13 models
- Multi-tenant architecture with TenantGuard
- 65+ REST endpoints across 11 modules
- BullMQ async job queue
- Docker Compose stack (Postgres, Redis, MinIO)
- Code review approved with all HIGH issues fixed

**Code Review Status:** APPROVED WITH CONDITIONS
- 0 CRITICAL, 5 HIGH (FIXED), 5 MEDIUM, 5 LOW issues
- Detailed report at: `genai-platform-api/plans/reports/code-review-report.md`

**Start Date:** Not logged
**End Date:** 2026-03-14

---

## Phase 2: AI Engine Service — IN PROGRESS

**Status:** IMPLEMENTATION (started 2026-03-14)

**Objective:** Standalone FastAPI service for document ingestion, embedding, and RAG chat with streaming responses.

**Key Responsibilities:**
- Document ingestion: OCR (Marker Cloud) → chunking → embedding (Triton/bge-m3)
- Semantic chunking with configurable size/overlap
- Embedding generation via Triton inference server (bge-m3 model)
- Vector store management (Qdrant collections)
- RAG retrieval: hybrid search (dense+sparse embeddings) with RRF ranking
- Query rewriting for improved retrieval
- LLM chat completion with Server-Sent Events (SSE) streaming
- Celery async worker for document processing

**Estimated Duration:** 3-4 weeks

**Dependencies:** Phase 1 complete (✓)

**Completed Deliverables:**
- FastAPI microservice with full documentation
- 10 REST endpoints (documents, chat, knowledge-bases, health)
- Celery async worker for background document processing
- Qdrant vector database client with collection management
- Triton inference client for embeddings (bge-m3)
- Hybrid retrieval: BM25 sparse + dense embedding search with RRF
- Query rewriter service for intent clarification
- Marker Cloud OCR integration stub
- RAG chat with streaming responses (SSE)
- Docker & Docker Compose setup
- `.env.example` with all required configuration
- Unit tests for core services (chunker, embedding, etc.)

---

## Phase 3: Frontend Dashboard — PLANNED

**Status:** PENDING (depends on Phase 1 completion)

**Objective:** React/Next.js SPA for bot creation, KB management, analytics, billing, team collaboration.

**Key Features:**
- Authentication (login/register via Phase 1 API)
- Bot builder (config, personality, widget appearance)
- Knowledge base uploader (drag-drop, batch upload)
- Conversation viewer (search, ratings, export)
- Analytics dashboard (KPIs, charts, trends)
- Billing portal (subscriptions, credit top-up, payment history)
- Team management (invite, roles, permissions)

**Estimated Duration:** 4-5 weeks

**Dependencies:** Phase 1 stable + API documentation complete

---

## Phase 4: Embed Widget — PLANNED

**Status:** PENDING (depends on Phase 1 chat API)

**Objective:** Lightweight web widget for embedding in customer websites.

**Key Features:**
- Chat bubble with configurable appearance
- Message history for returning users
- Typing indicators, message feedback
- Mobile-responsive design
- Analytics events (impressions, conversations, ratings)

**Estimated Duration:** 2 weeks

**Dependencies:** Phase 1 public chat API + bot widget config

---

## Phase 5: Channel Integrations — PLANNED

**Status:** PENDING

**Objective:** Connect bots to Facebook, Telegram, Zalo messaging platforms.

**Channels to Integrate:**
- Facebook Messenger (webhook-based)
- Telegram Bot API
- Zalo Official Account
- WhatsApp Business API (optional)

**Estimated Duration:** 3-4 weeks per channel (parallel work possible)

**Dependencies:** Phase 1 channel CRUD + webhook infrastructure + Phase 2 AI Engine

---

## Phase 6: Advanced Features — PLANNED

**Status:** PENDING

**Objective:** Premium features for enterprise customers.

**Features:**
- Human handover (route to live agent)
- Lead generation forms
- Voice input/output
- Custom domain hosting
- Audit logging & compliance
- Custom roles & permissions
- API key scoping

**Estimated Duration:** 2-3 weeks

**Dependencies:** Core phases stable

---

## Milestones & Key Dates

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Phase 1 Complete | 2026-03-14 | ✓ DONE |
| Phase 1 Code Review Approved | 2026-03-14 | ✓ DONE |
| Phase 2 AI Engine Complete | 2026-04-10 | IN PROGRESS |
| Phase 3 Dashboard MVP | 2026-05-15 | PLANNED |
| Phase 4 Widget Complete | 2026-06-01 | PLANNED |
| Phase 5 Channel 1 (Facebook) | 2026-06-15 | PLANNED |
| Public Beta Launch | 2026-07-01 | PLANNED |

---

## Success Metrics

**Phase 1:**
- ✓ All 65 endpoints implemented and tested
- ✓ Code review passed with <5 high-priority issues
- ✓ 0 CRITICAL security issues
- ✓ Multi-tenant isolation verified

**Phase 2:**
- Document processing success rate >98%
- Embedding quality validated
- E2E latency <5s for chat responses

**Phase 3:**
- Lighthouse score >90 (performance, accessibility)
- <5s first contentful paint
- Support for 10k+ concurrent users (infrastructure)

---

## Known Blockers & Risks

**Phase 1:**
- ~~Conversation tenant isolation bug~~ FIXED
- ~~Password validation weak~~ FIXED
- ~~Document quota not enforced~~ FIXED
- ~~Widget XSS vulnerability~~ FIXED
- ~~Refresh token cleanup missing~~ FIXED

**Phase 2:**
- Vector DB selection (Qdrant vs Weaviate vs Pinecone)
- LLM provider selection (Gemini vs Claude vs open-source)
- Embedding model choice (VNPT BGE-M3 vs OpenAI vs Hugging Face)

**Phase 3:**
- Browser compatibility (IE11 not supported)
- Mobile UX for forms

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Phase 3: Frontend (React)       │
│      (Dashboard + Team Management)      │
└────────────┬────────────────────────────┘
             │
        HTTP API (REST/GraphQL)
             │
┌────────────▼────────────────────────────┐
│   Phase 1: Web Backend (NestJS)         │
│  (Auth, Bots, KBs, Analytics, Billing)  │
└────┬───────────────────┬────────────────┘
     │ BullMQ Jobs       │
     │                   │
┌────▼───────────────────▼────────────────┐
│   Phase 2: AI Engine (FastAPI/Node)     │
│  (OCR, Chunking, Embedding, RAG, LLM)   │
└────┬────────────────────────────────────┘
     │
     ├─► Qdrant (Vector DB)
     ├─► Gemini/Claude (LLM)
     └─► Redis (Cache)
```

---

## Next Steps

1. **Phase 2 Planning:** Finalize AI Engine service contracts
2. **Phase 3 Design:** UI/UX mockups for dashboard
3. **DevOps:** CI/CD pipelines for all services
4. **Documentation:** API docs, architecture guide, deployment guide
