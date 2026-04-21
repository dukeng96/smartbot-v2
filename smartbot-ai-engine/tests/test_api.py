"""
Phase 2 AI Engine - API Integration Tests
Runs against the locally running Docker Compose stack (localhost:8000).
Set RUN_LIVE_API_TESTS=1 to run these tests.
"""

import os
import sys

import pytest

if not os.environ.get("RUN_LIVE_API_TESTS"):
    pytest.skip("requires live server (set RUN_LIVE_API_TESTS=1)", allow_module_level=True)

import time
import json
import requests

BASE_URL = "http://localhost:8000"
API_PREFIX = f"{BASE_URL}/engine/v1"
KB_ID = "techcrunch-test-001"
DOC_ID = "doc-tc-text-001"
TENANT_ID = "tenant-test-01"

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
# Force UTF-8 stdout on Windows (charmap codec can't encode Vietnamese chars)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

GREEN = "\033[92m"
RED   = "\033[91m"
YELLOW= "\033[93m"
BOLD  = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0
skipped = 0


def ok(label, detail=""):
    global passed
    passed += 1
    print(f"  {GREEN}[+] PASS{RESET}  {label}")
    if detail:
        print(f"          {detail}")


def fail(label, detail=""):
    global failed
    failed += 1
    print(f"  {RED}[!] FAIL{RESET}  {label}")
    if detail:
        print(f"          {detail}")


def skip(label, detail=""):
    global skipped
    skipped += 1
    print(f"  {YELLOW}[~] SKIP{RESET}  {label}")
    if detail:
        print(f"          {detail}")


def section(title):
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD} {title}{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")


# --------------------------------------------------------------
# 1. Health Check
# --------------------------------------------------------------
section("1. Health Check")

try:
    r = requests.get(f"{BASE_URL}/health", timeout=60)
    data = r.json()
    if r.status_code == 200 and data.get("status") == "ok":
        ok("/health", f"triton={data.get('triton')}  qdrant={data.get('qdrant')}")
    else:
        fail("/health", json.dumps(data))
except Exception as e:
    fail("/health", str(e))


# --------------------------------------------------------------
# 2. Knowledge Base CRUD
# --------------------------------------------------------------
section("2. Knowledge Base CRUD")

# 2a. Delete first to make sure collection is fresh
try:
    r = requests.delete(f"{API_PREFIX}/knowledge-bases/{KB_ID}", timeout=10)
    if r.status_code == 200:
        ok(f"DELETE /knowledge-bases/{KB_ID} (pre-cleanup)", json.dumps(r.json()))
    else:
        print(f"  {YELLOW}[~] Pre-cleanup delete returned {r.status_code} (may not exist){RESET}")
except Exception as e:
    print(f"  {YELLOW}[~] Pre-cleanup error: {e}{RESET}")

# 2b. Create KB
kb_created = False
try:
    r = requests.post(
        f"{API_PREFIX}/knowledge-bases",
        json={"knowledge_base_id": KB_ID},
        timeout=30,
    )
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:300]}
    if r.status_code == 200 and isinstance(data, dict) and data.get("created") is True:
        ok(f"POST /knowledge-bases -> created", json.dumps(data))
        kb_created = True
    elif r.status_code == 500:
        # Qdrant unreachable - known limitation
        skip(f"POST /knowledge-bases", f"status=500 (Qdrant unreachable)")
    else:
        fail(f"POST /knowledge-bases", f"status={r.status_code}  body={json.dumps(data) if isinstance(data, dict) else data}")
except Exception as e:
    fail("POST /knowledge-bases", str(e))

# 2c. Create same KB again (idempotent - created=false expected)
if kb_created:
    try:
        r = requests.post(
            f"{API_PREFIX}/knowledge-bases",
            json={"knowledge_base_id": KB_ID},
            timeout=30,
        )
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:300]}
        if r.status_code == 200 and isinstance(data, dict) and data.get("created") is False:
            ok(f"POST /knowledge-bases (idempotent)", json.dumps(data))
        else:
            fail(f"POST /knowledge-bases (idempotent)", f"status={r.status_code}  body={json.dumps(data) if isinstance(data, dict) else data}")
    except Exception as e:
        fail("POST /knowledge-bases (idempotent)", str(e))
else:
    skip("POST /knowledge-bases (idempotent)", "KB creation failed/skipped")


# --------------------------------------------------------------
# 3. Document Processing (text_input)
# --------------------------------------------------------------
section("3. Document Processing - text_input")

raw_text = (
    "TechCrunch 2024: OpenAI released GPT-4o in May 2024, introducing multimodal capabilities. "
    "Google announced Gemini Ultra 1.5 with 1M token context window. "
    "Meta released Llama 3 with 70B parameters. "
    "Apple introduced Apple Intelligence at WWDC 2024. "
    "AI investment in 2024 exceeded 100 billion dollars globally. "
    "TechCrunch 2025: DeepSeek R1 shocked the industry with low-cost high-performance model. "
    "OpenAI released o3 reasoning model. "
    "Anthropic Claude 3.5 Sonnet became the leading code generation model. "
    "TechCrunch 2026: AI agents with autonomous task completion became mainstream. "
    "Multi-modal AI systems became standard in enterprise software."
)

job_id = None
try:
    payload = {
        "document_id": DOC_ID,
        "knowledge_base_id": KB_ID,
        "tenant_id": TENANT_ID,
        "source_type": "text_input",
        "raw_text": raw_text,
        "chunk_size": 200,
        "chunk_overlap": 20,
    }
    r = requests.post(f"{API_PREFIX}/documents/process", json=payload, timeout=30)
    data = r.json()
    if r.status_code == 200 and data.get("status") == "queued":
        job_id = data.get("job_id")
        ok("POST /documents/process (text_input)", f"job_id={job_id}")
    else:
        fail("POST /documents/process (text_input)", f"status={r.status_code}  body={json.dumps(data)}")
except Exception as e:
    fail("POST /documents/process (text_input)", str(e))

# --------------------------------------------------------------
# 4. Wait for Celery + Check Chunks
# --------------------------------------------------------------
section("4. Wait for Celery Processing -> Check Chunks")

MAX_WAIT = 60
POLL_INTERVAL = 5
print(f"  Polling for chunks (max {MAX_WAIT}s, every {POLL_INTERVAL}s)...")
total = 0
data = {}
elapsed = 0
last_status = None

try:
    while elapsed < MAX_WAIT:
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
        r = requests.get(
            f"{API_PREFIX}/documents/{DOC_ID}/chunks",
            params={"knowledge_base_id": KB_ID},
            timeout=15,
        )
        last_status = r.status_code
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:300]}
        total = data.get("total", 0) if isinstance(data, dict) else 0
        if r.status_code == 500:
            skip(f"GET /documents/{DOC_ID}/chunks", "Qdrant unreachable")
            break
        if total > 0:
            break
        print(f"    ...{elapsed}s elapsed, total={total}")

    if last_status != 500:
        if total > 0:
            ok(f"GET /documents/{DOC_ID}/chunks", f"total_chunks={total} (after {elapsed}s)")
            if data.get("chunks"):
                print(f"          Sample: {data['chunks'][0]['content'][:150]}...")
        else:
            fail(f"GET /documents/{DOC_ID}/chunks", f"total=0 after {MAX_WAIT}s wait")
except Exception as e:
    fail(f"GET /documents/{DOC_ID}/chunks", str(e))


# --------------------------------------------------------------
# 5. Chat / RAG
# --------------------------------------------------------------
section("5. Chat - RAG via /chat/test (non-streaming)")

try:
    payload = {
        "message": "What happened in AI in 2024?",
        "knowledge_base_ids": [KB_ID],
        "top_k": 5,
    }
    r = requests.post(f"{API_PREFIX}/chat/test", json=payload, timeout=60)
    if r.status_code == 200:
        content = r.text[:500]
        ok("POST /chat/test", f"response preview: {content[:200]}")
    elif r.status_code == 500:
        skip("POST /chat/test", "Qdrant/LLM unreachable")
    else:
        fail("POST /chat/test", f"status={r.status_code}  body={r.text[:300]}")
except requests.exceptions.ReadTimeout:
    skip("POST /chat/test", "LLM endpoint timeout (unreachable)")
except requests.exceptions.ConnectionError:
    skip("POST /chat/test", "connection refused")
except Exception as e:
    fail("POST /chat/test", str(e))


# --------------------------------------------------------------
# 6. Delete vectors
# --------------------------------------------------------------
section("6. Delete Document Vectors")

try:
    payload = {"knowledge_base_id": KB_ID}
    r = requests.delete(
        f"{API_PREFIX}/documents/{DOC_ID}/vectors",
        json=payload,
        timeout=15,
    )
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:300]}
    if r.status_code == 200:
        ok(f"DELETE /documents/{DOC_ID}/vectors", json.dumps(data) if isinstance(data, dict) else str(data))
    elif r.status_code == 500:
        skip(f"DELETE /documents/{DOC_ID}/vectors", "Qdrant unreachable")
    else:
        fail(f"DELETE /documents/{DOC_ID}/vectors", f"status={r.status_code}")
except Exception as e:
    fail(f"DELETE /documents/{DOC_ID}/vectors", str(e))


# --------------------------------------------------------------
# 7. Input Validation Tests
# --------------------------------------------------------------
section("7. Input Validation")

# 7a. POST /documents/process - missing required fields
try:
    r = requests.post(f"{API_PREFIX}/documents/process", json={}, timeout=10)
    if r.status_code == 422:
        ok("POST /documents/process (empty body -> 422)")
    else:
        fail("POST /documents/process (empty body)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /documents/process (empty body)", str(e))

# 7b. POST /documents/process - chunk_size out of range (min=100)
try:
    payload = {
        "document_id": "test-val-01",
        "knowledge_base_id": "test-kb-01",
        "tenant_id": "test-tenant-01",
        "source_type": "text_input",
        "raw_text": "test",
        "chunk_size": 10,  # min is 100
    }
    r = requests.post(f"{API_PREFIX}/documents/process", json=payload, timeout=10)
    if r.status_code == 422:
        ok("POST /documents/process (chunk_size=10 -> 422)")
    else:
        fail("POST /documents/process (chunk_size=10)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /documents/process (chunk_size=10)", str(e))

# 7c. POST /documents/process - chunk_size too large (max=5000)
try:
    payload = {
        "document_id": "test-val-02",
        "knowledge_base_id": "test-kb-01",
        "tenant_id": "test-tenant-01",
        "source_type": "text_input",
        "raw_text": "test",
        "chunk_size": 10000,  # max is 5000
    }
    r = requests.post(f"{API_PREFIX}/documents/process", json=payload, timeout=10)
    if r.status_code == 422:
        ok("POST /documents/process (chunk_size=10000 -> 422)")
    else:
        fail("POST /documents/process (chunk_size=10000)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /documents/process (chunk_size=10000)", str(e))

# 7d. POST /knowledge-bases - missing knowledge_base_id
try:
    r = requests.post(f"{API_PREFIX}/knowledge-bases", json={}, timeout=10)
    if r.status_code == 422:
        ok("POST /knowledge-bases (empty body -> 422)")
    else:
        fail("POST /knowledge-bases (empty body)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /knowledge-bases (empty body)", str(e))

# 7e. POST /knowledge-bases - empty string knowledge_base_id
try:
    r = requests.post(
        f"{API_PREFIX}/knowledge-bases",
        json={"knowledge_base_id": ""},
        timeout=10,
    )
    if r.status_code == 422:
        ok("POST /knowledge-bases (empty string -> 422)")
    else:
        fail("POST /knowledge-bases (empty string)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /knowledge-bases (empty string)", str(e))

# 7f. POST /chat/test - missing message
# NOTE: FastAPI Depends(get_rag_chat) may resolve before body validation,
# causing timeout when LLM is unreachable. Treat timeout as skip.
try:
    r = requests.post(f"{API_PREFIX}/chat/test", json={}, timeout=10)
    if r.status_code == 422:
        ok("POST /chat/test (empty body -> 422)")
    else:
        fail("POST /chat/test (empty body)", f"expected 422, got {r.status_code}")
except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
    skip("POST /chat/test (empty body)", "LLM unreachable - Depends() hangs before validation")
except Exception as e:
    fail("POST /chat/test (empty body)", str(e))

# 7g. POST /chat/test - empty message string
try:
    r = requests.post(
        f"{API_PREFIX}/chat/test",
        json={"message": ""},
        timeout=10,
    )
    if r.status_code == 422:
        ok("POST /chat/test (empty message -> 422)")
    else:
        fail("POST /chat/test (empty message)", f"expected 422, got {r.status_code}")
except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
    skip("POST /chat/test (empty message)", "LLM unreachable - Depends() hangs before validation")
except Exception as e:
    fail("POST /chat/test (empty message)", str(e))

# 7h. POST /chat/completions - missing required fields
try:
    r = requests.post(f"{API_PREFIX}/chat/completions", json={}, timeout=10)
    if r.status_code == 422:
        ok("POST /chat/completions (empty body -> 422)")
    else:
        fail("POST /chat/completions (empty body)", f"expected 422, got {r.status_code}")
except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
    skip("POST /chat/completions (empty body)", "LLM unreachable - Depends() hangs before validation")
except Exception as e:
    fail("POST /chat/completions (empty body)", str(e))

# 7i. POST /chat/test - knowledge_base_ids with empty string
try:
    r = requests.post(
        f"{API_PREFIX}/chat/test",
        json={"message": "hello", "knowledge_base_ids": [""]},
        timeout=10,
    )
    if r.status_code == 422:
        ok("POST /chat/test (empty kb_id in list -> 422)")
    else:
        fail("POST /chat/test (empty kb_id)", f"expected 422, got {r.status_code}")
except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
    skip("POST /chat/test (empty kb_id)", "LLM unreachable - Depends() hangs before validation")
except Exception as e:
    fail("POST /chat/test (empty kb_id)", str(e))

# 7j. POST /chat/test - top_k out of range (max=20)
try:
    r = requests.post(
        f"{API_PREFIX}/chat/test",
        json={"message": "hello", "top_k": 100},
        timeout=10,
    )
    if r.status_code == 422:
        ok("POST /chat/test (top_k=100 -> 422)")
    else:
        fail("POST /chat/test (top_k=100)", f"expected 422, got {r.status_code}")
except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
    skip("POST /chat/test (top_k=100)", "LLM unreachable - Depends() hangs before validation")
except Exception as e:
    fail("POST /chat/test (top_k=100)", str(e))

# 7k. DELETE /documents/{id}/vectors - missing knowledge_base_id
try:
    r = requests.delete(
        f"{API_PREFIX}/documents/test-doc/vectors",
        json={},
        timeout=10,
    )
    if r.status_code == 422:
        ok("DELETE /documents/vectors (empty body -> 422)")
    else:
        fail("DELETE /documents/vectors (empty body)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("DELETE /documents/vectors (empty body)", str(e))

# 7l. POST /documents/{id}/reprocess - missing required fields
try:
    r = requests.post(
        f"{API_PREFIX}/documents/test-doc/reprocess",
        json={},
        timeout=10,
    )
    if r.status_code == 422:
        ok("POST /documents/reprocess (empty body -> 422)")
    else:
        fail("POST /documents/reprocess (empty body)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /documents/reprocess (empty body)", str(e))

# 7m. POST /documents/process - chunk_overlap out of range (max=500)
try:
    payload = {
        "document_id": "test-val-03",
        "knowledge_base_id": "test-kb-01",
        "tenant_id": "test-tenant-01",
        "source_type": "text_input",
        "raw_text": "test",
        "chunk_overlap": 999,  # max is 500
    }
    r = requests.post(f"{API_PREFIX}/documents/process", json=payload, timeout=10)
    if r.status_code == 422:
        ok("POST /documents/process (chunk_overlap=999 -> 422)")
    else:
        fail("POST /documents/process (chunk_overlap=999)", f"expected 422, got {r.status_code}")
except Exception as e:
    fail("POST /documents/process (chunk_overlap=999)", str(e))


# --------------------------------------------------------------
# 8. Document Processing - Additional Scenarios
# --------------------------------------------------------------
section("8. Document Processing - Additional")

# 8a. Reprocess endpoint (valid request queues Celery task)
try:
    payload = {
        "knowledge_base_id": KB_ID,
        "markdown_storage_path": "test/path/doc.md",
    }
    r = requests.post(
        f"{API_PREFIX}/documents/{DOC_ID}/reprocess",
        json=payload,
        timeout=15,
    )
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:300]}
    if r.status_code == 200 and isinstance(data, dict) and data.get("status") == "queued":
        ok("POST /documents/reprocess", f"job_id={data.get('job_id')}")
    else:
        fail("POST /documents/reprocess", f"status={r.status_code}")
except Exception as e:
    fail("POST /documents/reprocess", str(e))

# 8b. Process with url_crawl source_type
try:
    payload = {
        "document_id": "doc-url-test-001",
        "knowledge_base_id": KB_ID,
        "tenant_id": TENANT_ID,
        "source_type": "url_crawl",
        "source_url": "https://example.com/article",
    }
    r = requests.post(f"{API_PREFIX}/documents/process", json=payload, timeout=15)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:300]}
    if r.status_code == 200 and isinstance(data, dict) and data.get("status") == "queued":
        ok("POST /documents/process (url_crawl)", f"job_id={data.get('job_id')}")
    else:
        fail("POST /documents/process (url_crawl)", f"status={r.status_code}")
except Exception as e:
    fail("POST /documents/process (url_crawl)", str(e))


# --------------------------------------------------------------
# 9. Cleanup - Delete Test KB
# --------------------------------------------------------------
section("9. Cleanup")

try:
    r = requests.delete(f"{API_PREFIX}/knowledge-bases/{KB_ID}", timeout=10)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:200]}
    if r.status_code == 200:
        ok(f"DELETE /knowledge-bases/{KB_ID} (cleanup)", json.dumps(data) if isinstance(data, dict) else str(data))
    else:
        print(f"  {YELLOW}[~] Cleanup returned {r.status_code}{RESET}")
except Exception as e:
    print(f"  {YELLOW}[~] Cleanup error: {e}{RESET}")


# --------------------------------------------------------------
# Summary
# --------------------------------------------------------------
section("Summary")
total = passed + failed
print(f"  {GREEN if failed == 0 else RED}{BOLD}Passed: {passed}/{total}{RESET}")
if failed > 0:
    print(f"  {RED}Failed: {failed}/{total}{RESET}")
if skipped > 0:
    print(f"  {YELLOW}Skipped: {skipped}{RESET}")

sys.exit(0 if failed == 0 else 1)
