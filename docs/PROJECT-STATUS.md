# Smartbot v2 - Project Status Tracker

> **Last updated:** 2026-03-22
> **Branch:** main
> **Latest commit:** `1a9d5ba` docs: add Phase 3 frontend implementation plan

---

## Executive Summary

Smartbot v2 is a multi-tenant AI assistant SaaS platform with 3 main services:
1. **genai-platform-api** (NestJS) - Web backend with 84 REST API routes
2. **genai-engine** (FastAPI) - AI engine with RAG chat, document processing, 9 API routes
3. **smartbot-web** (Next.js 16) - Admin SaaS frontend with 24 implemented pages

4. **smartbot-widget** (TBD) - Embeddable chat widget for third-party websites

**Overall Progress: ~70% complete** (backend 95%, AI engine 90%, frontend platform 80%, widget 0%)

---

## Phase 1: Web Backend (NestJS) - COMPLETE

**Status:** COMPLETE | **Start:** 2026-03-15 | **Latest:** 2026-03-18

### Modules (12 total)

| Module | Status | Tests | Notes |
|--------|--------|-------|-------|
| auth | COMPLETE | 292 lines | JWT auth, register/login/refresh, password reset |
| users | COMPLETE | 91 lines | User CRUD, email/password management |
| tenants | COMPLETE | 225 lines | Multi-tenant CRUD, membership, soft-delete |
| bots | COMPLETE | 331 lines | Bot CRUD, API key gen, personality, widget config |
| knowledge-bases | COMPLETE | 445 lines | KB CRUD, document upload/processing pipeline |
| conversations | COMPLETE | 402 lines | Conversation list/filter, messages, rating/feedback |
| billing | COMPLETE | 374 lines | Plans, subscriptions, credits, payment history |
| analytics | COMPLETE | No tests | Dashboard metrics, raw SQL aggregations |
| channels | COMPLETE | No tests | Telegram/Zalo webhook skeleton |
| chat-proxy | COMPLETE | 177 lines | HTTP proxy to AI Engine chat completion |
| storage | COMPLETE | No tests | S3/MinIO file upload/download |
| internal | COMPLETE | - | Internal API key guard, shared modules |

### Key Architecture
- **15 Prisma models**, PostgreSQL 16, Redis 7 + BullMQ
- **JWT auth** (access 15min + refresh 7d), multi-tenant with TenantGuard/QuotaGuard
- **84 REST API routes** across 14 controllers
- **Test coverage:** 15 spec files, 2,530 lines (core modules covered; analytics/channels/storage untested)
- **Code review:** APPROVED WITH CONDITIONS (0 critical, 5 high fixed)

### Remaining Items
- Analytics module has no tests (uses raw SQL)
- Channels webhooks are skeleton only
- Storage module untested

---

## Phase 2: AI Engine (FastAPI) - COMPLETE

**Status:** COMPLETE | **Start:** 2026-03-15 | **Latest:** 2026-03-18

### Services (7 total)

| Service | Status | Lines | Notes |
|---------|--------|-------|-------|
| TextExtractor | COMPLETE | 129 | Marker Cloud OCR + trafilatura + passthrough |
| Chunker | COMPLETE | 56 | Markdown-aware RecursiveCharacterTextSplitter |
| EmbeddingService | COMPLETE | 114 | Triton bge-m3 + Qdrant hybrid search + RRF |
| QueryRewriter | COMPLETE | 79 | Fixed 3-turn context, Vietnamese, temp=0.1 |
| RAGChat | COMPLETE | 126 | Full RAG flow, streaming + non-streaming |
| DocumentProcessor | COMPLETE | 252 | Full pipeline with callbacks & retries |
| StorageService | COMPLETE | 53 | MinIO/S3 for markdown storage |

### API Endpoints (9 total)
- `GET /health` - Triton + Qdrant connectivity check
- `POST /engine/v1/knowledge-bases` - Create Qdrant collection
- `DELETE /engine/v1/knowledge-bases/{id}` - Delete collection
- `POST /engine/v1/documents/process` - Queue async document processing
- `POST /engine/v1/documents/{id}/reprocess` - Re-chunk from saved markdown
- `DELETE /engine/v1/documents/{id}/vectors` - Delete document vectors
- `GET /engine/v1/documents/{id}/chunks` - Preview chunks (paginated)
- `POST /engine/v1/chat/completions` - RAG chat (SSE streaming or JSON)
- `POST /engine/v1/chat/test` - Quick test without history

### Infrastructure Dependencies
- **Triton Inference Server** (BAAI/bge-m3) - external
- **Qdrant Vector DB** (hybrid dense+sparse) - external
- **MinIO/S3** (document + markdown storage) - external
- **Redis** (Celery broker) - docker-compose
- **VNPT LLM** (OpenAI-compatible) - external

### Known Issues
1. **Callback HTTP 400** - Status callbacks to backend return 400 (payload format mismatch). Non-blocking but needs alignment.
2. **MinIO bucket config** - "Bucket not found" when .env misconfigured. Infrastructure issue, not code defect.
3. **Greenlet/thread mismatch** - RESOLVED with `asyncio.to_thread()` workaround.

---

## Phase 3: Admin Platform Frontend (Next.js 16) - Track A - IN PROGRESS

**Status:** ~80% COMPLETE | **Start:** 2026-03-17 | **Latest:** 2026-03-18

### Tech Stack
- Next.js 16 (App Router), React 19, TypeScript 5.9 strict
- shadcn/ui v4 (base-nova) + Tailwind CSS v4
- TanStack Query v5 (server state) + Zustand (auth/UI state)
- React Hook Form + Zod, Recharts, ky HTTP client

### Page Implementation (24/25 screens)

| Module | Screens | Status | Notes |
|--------|---------|--------|-------|
| Auth (A1-A5) | 5/5 | COMPLETE | Login, register, forgot/reset password, verify email |
| Dashboard (B2) | 1/1 | COMPLETE | KPIs, quick actions, recent bots |
| Bots (C1-C7) | 7/7 | COMPLETE | List, config, personality, widget, API/embed, KBs, channels |
| Knowledge Bases (D1-D4) | 4/4 | COMPLETE | List, detail, documents, document detail |
| Conversations (E1-E2) | 2/2 | COMPLETE | List with filters, detail with chat thread |
| Analytics (F1-F2) | 2/2 | COMPLETE | Overview dashboard, bot-specific analytics |
| Billing (G1-G4) | 4/4 | COMPLETE | Plans, subscription, top-up, payment history |
| Settings (H1-H3) | 3/3 | COMPLETE | Profile, workspace, team members |

### Component Stats
- **57 feature/UI components** organized by domain
- **17 shadcn primitives**, 8 layout, 14 shared, 18+ feature components
- **10 API modules** + **10 TanStack Query hooks** + **14 type definitions**
- **2 Zustand stores** (auth, UI)

### Remaining Items
1. **No tests** - Zero test infrastructure (no Jest/Vitest/Playwright)
2. **Empty `/assistants` directory** - Status unclear (duplicate of `/bots`?)
3. **Hardcoded Vietnamese strings** - No i18n system
4. **No error tracking** - No Sentry or monitoring

---

## Phase 4: Embeddable Chat Widget - Track B - NOT STARTED

**Status:** NOT STARTED | **Spec:** `docs/PHASE3-FRONTEND-PLAN.md` sections W1-W3

### Overview
Standalone embeddable chat widget (`smartbot-widget/`) for third-party websites. Independent from admin platform — separate app/package in same monorepo.

### Key Requirements
- CSS/JS isolation (Shadow DOM or equivalent)
- Lightweight bundle, no host framework assumptions
- Public token auth (not JWT), domain validation
- SSE streaming chat via AI Engine
- Theming support configurable from admin platform
- Session persistence

### Widget Components
- Launcher bubble (floating button)
- Chat panel (open/close)
- Header with branding
- Message thread (user + bot messages)
- Composer (text input + send)
- Suggestion chips
- Loading/streaming/error states

### Phases (from spec)

| Phase | Description | Status |
|-------|-------------|--------|
| W1 — Architecture docs | UX Architect + UI Designer: widget-architecture.md, widget-design-system.md | NOT STARTED |
| W2 — Scaffold & MVP | Scaffold app, implement shell/launcher/chat panel, mock chat flow | NOT STARTED |
| W3 — Production hardening | Real backend integration, streaming, theming, session persistence, embed API | NOT STARTED |

### Planned Tech Stack (TBD during W1)
- Standalone build (Vite or similar)
- Shadow DOM for CSS isolation
- Minimal dependencies for small bundle
- Public initialization API: `SmartbotWidget.init({ botId, token, theme })`

### Shared Packages (planned)
```
packages/
  api-types/       # shared API/generated types
  ui-core/         # tiny shared tokens/icons only
  widget-sdk/      # embed loader/init contract
```

---

## Phase 5: Platform + Widget Integration - NOT STARTED

**Status:** NOT STARTED | **Spec:** `docs/PHASE3-FRONTEND-PLAN.md` section I1

### Goals
- Platform widget config pages map correctly to widget runtime behavior
- Preview in platform reflects actual widget capabilities
- Embed code generator flow works end-to-end
- Theming fields in platform are compatible with widget runtime
- Public config API contract is stable

### Phases

| Phase | Description | Status |
|-------|-------------|--------|
| I1.1 — Integration pass | Align platform config ↔ widget runtime | NOT STARTED |
| I1.2 — Integration QA | Evidence Collector review | NOT STARTED |
| I1.3 — Final release gate | Reality Checker: platform + widget + integration verdict | NOT STARTED |

---

## Recent Git History (March 2026)

### 2026-03-18 (Bug fixes & integration)
| Commit | Type | Description |
|--------|------|-------------|
| `8319084` | fix | Connect document processing pipeline between backend and AI Engine |
| `01c9c9d` | fix | Align PaginatedResult field name with frontend expectation |
| `cf9ca22` | fix | Resolve login error feedback and auth session restoration |
| `4e0693b` | fix | Resolve navigation issues, add mobile sidebar, conversations endpoint |
| `ff76ae1` | test | Add test PDF and API test notebook |
| `622b216` | docs | Update deployment guide and figma screen spec |

### 2026-03-17 (Frontend implementation sprint)
| Commit | Type | Description |
|--------|------|-------------|
| `1e10d38` | feat | Implement conversations and billing module |
| `756c405` | feat | Implement knowledge base and documents module |
| `c8ae3b8` | feat | Implement bots management module |
| `3cdbfda` | feat | Implement dashboard analytics module |
| `3a701a5` | feat | Implement auth settings and user management pages |
| `79b8b7a` | fix | Resolve platform foundation QA issues |
| `a0a7cca` | feat | Add smartbot-web frontend foundation (Next.js 16 + shadcn/ui v4) |

### 2026-03-16 (AI Engine fixes + deployment docs)
| Commit | Type | Description |
|--------|------|-------------|
| `ac8c9c2` | feat | Add lastMessagePreview to Conversation model |
| `f7235ec` | fix | Resolve nested event loop issue in Celery tasks on Windows |
| `cedc13f` | docs | Add local deployment guide with hybrid Docker/native setup |
| `66ec837` | fix | Resolve critical deadlock and threading issues in genai-engine |

### 2026-03-15 (Initial implementation)
| Commit | Type | Description |
|--------|------|-------------|
| `1e1bf19` | test | Comprehensive test suites for platform-api and ai-engine |
| `9f78d2e` | feat | Initial implementation of GenAI Assistant Platform |

---

## Recurring Issues & Patterns

### Integration Issues (Backend <> AI Engine)
- **Document processing callback 400s** - Payload format mismatch between services
- **PaginatedResult field naming** - `meta` vs `pagination` field name inconsistency
- **Internal API key** - Must be aligned between `.env` of both services

### Frontend <> Backend Issues
- **Auth session restoration** - Token refresh + Zustand rehydration timing
- **Navigation** - Sidebar active state + mobile overlay needed fixes
- **Conversations endpoint** - Missing endpoint required backend addition

### Windows Development Issues
- **Celery nested event loop** - Required `nest_asyncio` for `--pool=solo`
- **Greenlet/thread conflicts** - Required `asyncio.to_thread()` for Triton client

---

## Remaining Work (Priority Order)

### P0 - Critical
- [ ] Fix document processing callback payload alignment (backend <> engine)
- [ ] Add frontend test infrastructure (Vitest + Playwright)
- [ ] **Phase 4: Widget** — W1: architecture docs (widget-architecture.md, widget-design-system.md)
- [ ] **Phase 4: Widget** — W2: scaffold & MVP (launcher, chat panel, mock chat)
- [ ] **Phase 4: Widget** — W3: production hardening (streaming, theming, session, embed API)
- [ ] **Phase 5: Integration** — align platform config ↔ widget runtime + final release gate

### P1 - High
- [ ] Resolve empty `/assistants` directory (implement or remove)
- [ ] Add tests for analytics, channels, storage backend modules
- [ ] Add error tracking (Sentry) to frontend
- [ ] Implement channel webhook features (Telegram, Zalo)
- [ ] Create shared packages: `packages/api-types`, `packages/ui-core`, `packages/widget-sdk`

### P2 - Medium
- [ ] Centralize Zod validation schemas
- [ ] Externalize Vietnamese strings (i18n)
- [ ] Performance audit (Core Web Vitals)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] E2E tests for critical user journeys
- [ ] Monitoring/alerting for Celery tasks

---

## Architecture Overview

```
  +------------------+                    +-------------------+
  |   smartbot-web   |                    | smartbot-widget   |
  |   (Next.js 16)   |                    | (embeddable chat) |
  |  Admin Platform   |                    | 3rd-party sites   |
  +--------+---------+                    +--------+----------+
           |                                       |
           | REST API (JWT auth)                   | REST API (public token)
           v                                       v
                    +----------------------------+
                    |   genai-platform-api        |
                    |   (NestJS, 84 routes)       |
                    +---+--------------------+---+
                        |                    |
            BullMQ queue|                    | HTTP + X-Internal-Key
                        v                    v
                  +----------+    +-------------------+
                  | Redis 7  |    |   genai-engine    |
                  | (queue)  |    |   (FastAPI, 9 ep) |
                  +----------+    +----+---------+----+
                                       |         |
                              +--------+    +----+-----+
                              v             v          v
                         +--------+  +--------+  +---------+
                         | Triton |  | Qdrant |  |  MinIO  |
                         | (embed)|  | (vDB)  |  | (files) |
                         +--------+  +--------+  +---------+

                         +--------+
                         |  VNPT  | (LLM, OpenAI-compatible)
                         +--------+

Database: PostgreSQL 16 (Prisma ORM)

Shared packages: packages/api-types, packages/ui-core, packages/widget-sdk
```

---

## Documentation Index

| File | Purpose |
|------|---------|
| `docs/PHASE1-WEB-BACKEND-PLAN.md` | Phase 1 spec (COMPLETE) |
| `docs/PHASE2-AI-ENGINE-PLAN.md` | Phase 2 spec (COMPLETE) |
| `docs/PHASE3-FRONTEND-PLAN.md` | Phase 3-5 spec: platform + widget + integration |
| `docs/backend-api-reference.md` | All 93 API routes reference |
| `docs/backend-codebase-summary.md` | Backend services summary |
| `docs/frontend-architecture.md` | Frontend tech stack & routes |
| `docs/frontend-design-system.md` | Design tokens, colors, spacing |
| `docs/frontend-ui-rules.md` | UI implementation rules |
| `docs/figma-screen-spec.md` | Figma screen specifications |
| `docs/system-architecture.md` | System architecture overview |
| `docs/code-standards.md` | Code standards & conventions |
| `docs/deployment-guide.md` | Local + Docker deployment |
| `docs/API-LLM-VNPT.md` | VNPT LLM API reference |
| `docs/STITCH-PROMPTS.md` | Prompt templates for dev workflow |

---

## Unresolved Questions

1. What is the purpose of the empty `/assistants` directory — planned feature or deprecated duplicate of `/bots`?
2. Widget tech stack decision — finalize during W1 (Vite? Preact? vanilla TS?)
3. Widget auth model — public token vs API key vs bot-scoped token?
4. When is the target date for production deployment?
