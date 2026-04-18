# Smartbot v2 — Project Instructions

Multi-tenant AI assistant SaaS platform. Three services in one monorepo.

## Architecture

```
smartbot-web (Next.js 16, port 3001)
  → REST API (JWT auth)
genai-platform-api (NestJS 11, port 3000)
  → BullMQ queue → Redis 7
  → HTTP + X-Internal-Key header
genai-engine (FastAPI, port 8000)
  → Triton (bge-m3 embeddings) + Qdrant (vector DB) + MinIO (files) + VNPT LLM
Database: PostgreSQL 16 (Prisma ORM)
```

- Backend: 12 modules, 84 routes, 15 Prisma models, multi-tenant via TenantGuard
- Engine: 7 services, 9 endpoints, full RAG pipeline (extract → chunk → embed → chat)
- Frontend: 24 pages, 57 components, shadcn/ui v4, TanStack Query v5, Zustand


## Key Docs

| Topic | File |
|-------|------|
| Overview | [docs/README.md](docs/README.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| API Endpoints | [docs/api-reference.md](docs/api-reference.md) |
| Database | [docs/database-schema.md](docs/database-schema.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| VNPT LLM | [docs/vnpt-llm.md](docs/vnpt-llm.md) |

## Coding Rules

### General
- Preserve existing architecture and shared patterns
- Always read relevant docs before coding
- Vietnamese UI copy by default
- Every page/endpoint must handle loading, empty, error, and success states
- Prefer reusable components/modules over one-off implementations
- API responses: `{ data: T, statusCode, message }` envelope
- Pagination: `{ data: T[], meta: { total, page, limit, totalPages } }`

### Backend (NestJS)
- Module pattern: controller + service + DTOs + spec tests
- Multi-tenant: all queries must include `tenantId` filter
- Guards: JwtAuthGuard (default), TenantGuard, QuotaGuard, InternalApiKeyGuard
- Decorators: `@CurrentUser()`, `@CurrentTenant()`, `@Public()`, `@QuotaType()`
- Validation: class-validator DTOs with whitelist + forbidNonWhitelisted
- Prisma schema: `genai-platform-api/prisma/schema.prisma`

### AI Engine (FastAPI)
- Services: lazy singleton via `dependencies.py`
- Async: use `asyncio.to_thread()` for sync libs (Triton, gevent)
- Celery tasks: max_retries=3, retry_delay=30s, late ack
- Document pipeline callbacks: non-blocking with exponential backoff retry

### Frontend (Next.js)
- App Router with `(public)` and `(dashboard)` route groups
- State: Zustand (auth/UI) + TanStack Query (server state)
- API client: ky with auth interceptors in `src/lib/api/client.ts`
- Components: shadcn/ui primitives → shared → feature-specific
- Desktop-first SaaS layout (AppShell + Sidebar + TopHeader)
- Figma is visual source of truth

### Widget
- smartbot-widget is independent from smartbot-web
- Optimize for embeddability, isolation, small bundle
- Shadow DOM or equivalent isolation
- Do not share large dashboard components with widget

## Known Gotchas

- **Windows Celery**: must use `--pool=solo` + `nest_asyncio` for nested event loops
- **Triton greenlet conflict**: wrap calls with `asyncio.to_thread()` in FastAPI
- **Document callback 400s**: engine → backend status callback payload may mismatch DTO validation
- **PaginatedResult naming**: frontend expects `meta` field (fixed in commit `01c9c9d`)
- **Auth session race**: Zustand rehydration may race with token refresh on page load

## Workflow

- Work in phases. Track progress in plan files under `plans/`.
- Commit messages: conventional format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`)
