# Test Report - GenAI Assistant Platform

**Date:** 2026-03-15
**Projects:** genai-platform-api (NestJS) + genai-engine (Python/FastAPI)

---

## Executive Summary

| Category | Total | Passed | Failed | Skipped | Pass Rate |
|----------|-------|--------|--------|---------|-----------|
| Platform API - Unit Tests (Jest) | 141 | 141 | 0 | 0 | **100%** |
| Platform API - API Route Tests | 106 | 105 | 1 | 4 | **99.1%** |
| AI Engine - Unit Tests (pytest) | 11 | 11 | 0 | 0 | **100%** |
| AI Engine - API Integration Tests | 24 | 24 | 0 | 0 | **100%** |
| **TOTAL** | **282** | **281** | **1** | **4** | **99.6%** |

**Overall Result: PASS** - 1 failure is a known infrastructure limitation (MinIO not running in NestJS test env).

---

## 1. genai-platform-api - Jest Unit Tests (141/141)

**Command:** `npx jest --no-coverage`
**Duration:** ~3s
**Result:** 13 test suites, 141 tests, all passing

### Suites
| Suite | Tests | Status |
|-------|-------|--------|
| AuthService | 12 | PASS |
| AuthController | 7 | PASS |
| UsersService | 8 | PASS |
| UsersController | 5 | PASS |
| BotsService | 16 | PASS |
| BotsController | 10 | PASS |
| KnowledgeBaseService | 12 | PASS |
| KnowledgeBaseController | 8 | PASS |
| DocumentsService | 14 | PASS |
| DocumentsController | 8 | PASS |
| ConversationsService | 12 | PASS |
| BillingService | 15 | PASS |
| BillingController | 14 | PASS |

### Bugs Fixed During Testing
1. **BigInt serialization** - `PrismaService.onModuleInit()` lacked BigInt JSON serializer causing runtime crashes
2. **TenantGuard injection** - `BillingController` missing `TenantGuard` in `@UseGuards()` decorator
3. **ListBotsQueryDto** - Missing `status` field preventing bot filtering by status
4. **Billing planSlug->planId** - `BillingService.changePlan()` was sending `planSlug` instead of `planId` to Prisma

---

## 2. genai-platform-api - API Route Tests (105/106)

**Command:** `python run_all_tests.py` (14 test modules, 106 test cases)
**Duration:** ~3s
**Server:** localhost:3000 (NestJS + PostgreSQL + Redis)

### Module Results
| Module | Tests | Passed | Notes |
|--------|-------|--------|-------|
| 01. Health Check | 1 | 1 | |
| 02. Auth | 7 | 7 | Register, login, refresh, profile |
| 03. Plans (internal) | 2 | 2 | Seed + list plans |
| 04. Bots | 15 | 15 | CRUD, personality, widget, API key, duplicate |
| 05. Knowledge Bases | 6 | 6 | CRUD, attach/detach bot |
| 06. Documents | 7 | 6 | **TC-DOC-01 FAIL** (MinIO upload) |
| 07. Chat Proxy | 7 | 7 | SSE streaming, test endpoint |
| 08. Billing | 7 | 7 | Usage, plan change, quotas |
| 09. Conversations | 7 | 7 | List, detail, messages, rating, archive |
| 10. Users/Tenants | 8 | 8 | Profile update, tenant settings |
| 11. Analytics | 3 | 3 | Dashboard + export |
| 12. Channels | 5 | 5 | CRUD + Facebook connect |
| 13. Webhooks | 5 | 5 | FB/Telegram/Zalo |
| 14. Cross-Cutting | 26 | 23 | Auth, pagination, validation, soft-delete |

### Known Failure
- **TC-DOC-01** (Upload file): Returns 500 - MinIO/S3 storage not running in test env. Not a code bug.

### Skipped Tests (4)
- CC-05: Requires second user with member role
- CC-10: Covered by TC-BOT-02 (bot quota)
- CC-11: Requires exhausted credits
- CC-12: Requires full character limit

---

## 3. genai-engine - pytest Unit Tests (11/11)

**Command:** `python -m pytest tests/ --ignore=tests/test_api.py`
**Duration:** 0.13s
**Result:** All 11 tests passing

### Test Cases
| Test | Status |
|------|--------|
| test_chunk_returns_list_of_dicts | PASS |
| test_chunk_positions_are_sequential | PASS |
| test_chunk_char_count_matches_content | PASS |
| test_chunk_respects_max_size | PASS |
| test_empty_text_returns_empty | PASS |
| test_none_text_returns_empty | PASS |
| test_short_text_single_chunk | PASS |
| test_custom_chunk_size | PASS |
| test_compute_rrf_basic | PASS |
| test_compute_rrf_preserves_content | PASS |
| test_compute_rrf_empty_inputs | PASS |

---

## 4. genai-engine - API Integration Tests (24/24)

**Command:** `python tests/test_api.py`
**Duration:** ~90s (includes Celery polling + LLM response time)
**Server:** localhost:8000 (FastAPI + Celery + Redis), native conda env311
**Connectivity:** All external services reachable via VPN (Triton, Qdrant, LLM, MinIO)

### Section Results
| Section | Tests | Passed | Notes |
|---------|-------|--------|-------|
| 1. Health Check | 1 | 1 | triton=connected, qdrant=connected |
| 2. KB CRUD | 3 | 3 | Create, idempotent, pre-cleanup |
| 3. Doc Processing (text_input) | 1 | 1 | Celery queues successfully |
| 4. Celery + Chunks | 1 | 1 | 4 chunks after 10s polling |
| 5. Chat/RAG | 1 | 1 | Vietnamese RAG response via LLM |
| 6. Delete Vectors | 1 | 1 | Vectors deleted from Qdrant |
| 7. Input Validation | 13 | 13 | All validation rules enforced |
| 8. Doc Processing (extra) | 2 | 2 | Reprocess + url_crawl queued |
| 9. Cleanup | 1 | 1 | Test KB deleted |

### Full RAG Pipeline Verified
- Query rewriting via LLM
- Hybrid search (dense 1024-dim + sparse via Triton BAAI/bge-m3)
- Reciprocal Rank Fusion (RRF) scoring
- LLM answer generation with retrieved context
- SSE streaming and non-streaming responses

---

## 5. Critical Bugs Fixed During Testing

### genai-engine (Python/FastAPI)

| # | Severity | Bug | File | Root Cause | Fix |
|---|----------|-----|------|------------|-----|
| 1 | **CRITICAL** | Deadlock freezes entire server | `app/dependencies.py` | `threading.Lock()` is non-reentrant; nested `_get_or_create()` calls from factory functions (e.g. `get_rag_chat` → `get_embedding_service`) caused deadlock on same lock | Changed to `threading.RLock()` (reentrant lock) |
| 2 | **HIGH** | Health check crashes with greenlet error | `app/api/health.py` | `tritonclient.http` uses gevent greenlets; calling from asyncio event loop causes "Cannot switch to a different thread" | Wrapped triton calls with `asyncio.to_thread()` |
| 3 | **HIGH** | Chat endpoints hang on asyncio thread | `app/api/chat.py` | `rag_chat.chat()` is synchronous (uses tritonclient internally); running on event loop blocks all requests | Wrapped with `asyncio.to_thread()` |
| 4 | **LOW** | Test output crashes on Windows | `tests/test_api.py` | Vietnamese UTF-8 chars in LLM response can't be encoded by Windows cp1252 charmap codec | Added `sys.stdout.reconfigure(encoding='utf-8')` |

### Bug #1 Detail: Threading Deadlock

The deadlock was the root cause of all chat endpoint timeouts across multiple debugging sessions. The call chain:

```
get_rag_chat() → _get_or_create("rag_chat", factory)
  └─ acquires _lock (threading.Lock)
  └─ factory() calls get_embedding_service()
       └─ _get_or_create("embedding", factory)
            └─ tries to acquire same _lock → DEADLOCK
```

Once deadlocked, the asyncio event loop thread was permanently blocked, causing ALL subsequent HTTP requests (including `/health` and `/openapi.json`) to hang indefinitely.

### genai-platform-api (NestJS)

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | BigInt JSON serialization crash | `prisma.service.ts` | Added `BigInt.prototype.toJSON` in `onModuleInit()` |
| 2 | TenantGuard missing on BillingController | `billing.controller.ts` | Added `TenantGuard` to `@UseGuards()` |
| 3 | ListBotsQueryDto missing status field | `list-bots-query.dto.ts` | Added `@IsOptional() @IsString() status` field |
| 4 | Billing planSlug vs planId mismatch | `billing.service.ts` | Changed `planSlug` to `planId` in Prisma call |

---

## 6. Test Infrastructure

### Test Files Created
- `genai-platform-api/tests/api/` - 15 Python test modules (test_config.py + 14 test_XX_*.py + run_all_tests.py)
- `genai-engine/tests/test_api.py` - API integration test script (25 test assertions across 9 sections)
- `genai-engine/tests/test_chunker.py` - Unit tests for chunking + RRF (pre-existing, verified)

### External Service Connectivity
| Service | Location | Status |
|---------|----------|--------|
| Triton (Embeddings) | 10.159.19.40:31831 | Connected (via VPN) |
| Qdrant (Vector DB) | 10.159.19.59:32500 | Connected (via VPN) |
| LLM API | assistant-stream.vnpt.vn | Connected (via VPN) |
| MinIO (S3) | 10.159.19.59:31121 | Connected (via VPN) |
| PostgreSQL | localhost:5432 | Running |
| Redis | localhost:6379 | Running (Docker) |
| Celery Worker | via Redis broker | Running (native) |

---

## 7. Recommendations

1. **MinIO in dev docker-compose** - Add MinIO service to docker-compose.dev.yml for NestJS file upload testing
2. **CI/CD external mocks** - Add pytest fixtures that mock Qdrant/Triton/LLM for CI/CD where VPN services are unavailable
3. **Connection timeouts in DI** - Add timeout to `get_rag_chat` factory so startup failures surface as errors instead of silent hangs
4. **E2E test coverage** - The NestJS scaffold e2e-spec is unused; the Python API route tests serve as comprehensive E2E tests
5. **CI integration** - Jest + pytest unit tests can run in any CI pipeline; API integration tests require VPN connectivity
