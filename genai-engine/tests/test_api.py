"""
Phase 2 AI Engine - API Integration Tests
Runs against the locally running Docker Compose stack (localhost:8000).
"""

import time
import sys
import json
import requests

BASE_URL = "http://localhost:8000"
API_PREFIX = f"{BASE_URL}/engine/v1"
KB_ID = "techcrunch-test-001"
DOC_ID = "doc-tc-text-001"
TENANT_ID = "tenant-test-01"

GREEN = "\033[92m"
RED   = "\033[91m"
YELLOW= "\033[93m"
BOLD  = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0


def ok(label, detail=""):
    global passed
    passed += 1
    print(f"  {GREEN}✅ PASS{RESET}  {label}")
    if detail:
        print(f"         {detail}")


def fail(label, detail=""):
    global failed
    failed += 1
    print(f"  {RED}❌ FAIL{RESET}  {label}")
    if detail:
        print(f"         {detail}")


def section(title):
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD} {title}{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")


# ──────────────────────────────────────────────────────────────
# 1. Health Check
# ──────────────────────────────────────────────────────────────
section("1. Health Check")

try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("status") == "ok":
        ok("/health", f"triton={data.get('triton')}  qdrant={data.get('qdrant')}")
    else:
        fail("/health", json.dumps(data))
except Exception as e:
    fail("/health", str(e))


# ──────────────────────────────────────────────────────────────
# 2. Knowledge Base CRUD
# ──────────────────────────────────────────────────────────────
section("2. Knowledge Base CRUD")

# 2a. Delete first to make sure collection is fresh
try:
    r = requests.delete(f"{API_PREFIX}/knowledge-bases/{KB_ID}", timeout=10)
    if r.status_code == 200:
        ok(f"DELETE /knowledge-bases/{KB_ID} (pre-cleanup)", json.dumps(r.json()))
    else:
        print(f"  {YELLOW}⚠ Pre-cleanup delete returned {r.status_code} (may not exist){RESET}")
except Exception as e:
    print(f"  {YELLOW}⚠ Pre-cleanup error: {e}{RESET}")

# 2b. Create KB
try:
    r = requests.post(
        f"{API_PREFIX}/knowledge-bases",
        json={"knowledge_base_id": KB_ID},
        timeout=10,
    )
    data = r.json()
    if r.status_code == 200 and data.get("created") is True:
        ok(f"POST /knowledge-bases -> created", json.dumps(data))
    else:
        fail(f"POST /knowledge-bases", f"status={r.status_code}  body={json.dumps(data)}")
except Exception as e:
    fail("POST /knowledge-bases", str(e))

# 2c. Create same KB again (idempotent – created=false expected)
try:
    r = requests.post(
        f"{API_PREFIX}/knowledge-bases",
        json={"knowledge_base_id": KB_ID},
        timeout=10,
    )
    data = r.json()
    if r.status_code == 200 and data.get("created") is False:
        ok(f"POST /knowledge-bases (idempotent)", json.dumps(data))
    else:
        fail(f"POST /knowledge-bases (idempotent)", f"status={r.status_code}  body={json.dumps(data)}")
except Exception as e:
    fail("POST /knowledge-bases (idempotent)", str(e))


# ──────────────────────────────────────────────────────────────
# 3. Document Processing (text_input)
# ──────────────────────────────────────────────────────────────
section("3. Document Processing – text_input")

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

# ──────────────────────────────────────────────────────────────
# 4. Wait for Celery + Check Chunks
# ──────────────────────────────────────────────────────────────
section("4. Wait for Celery Processing → Check Chunks")

print(f"  Waiting 8s for Celery to process...")
time.sleep(8)

try:
    r = requests.get(
        f"{API_PREFIX}/documents/{DOC_ID}/chunks",
        params={"knowledge_base_id": KB_ID},
        timeout=15,
    )
    data = r.json()
    total = data.get("total", 0)
    if r.status_code == 200 and total > 0:
        ok(f"GET /documents/{DOC_ID}/chunks", f"total_chunks={total}")
        print(f"\n  --- Sample chunk (first) ---")
        if data.get("chunks"):
            print(f"  {data['chunks'][0]['content'][:200]}...")
    else:
        fail(f"GET /documents/{DOC_ID}/chunks", f"status={r.status_code}  total={total}  body={json.dumps(data)[:300]}")
except Exception as e:
    fail(f"GET /documents/{DOC_ID}/chunks", str(e))


# ──────────────────────────────────────────────────────────────
# 5. Chat / RAG
# ──────────────────────────────────────────────────────────────
section("5. Chat – RAG via /chat/test (non-streaming)")

try:
    payload = {
        "message": "What happened in AI in 2024?",
        "knowledge_base_ids": [KB_ID],
        "top_k": 5,
    }
    r = requests.post(f"{API_PREFIX}/chat/test", json=payload, timeout=30)
    if r.status_code == 200:
        # Response may be SSE text or JSON
        content = r.text[:500]
        ok("POST /chat/test", f"response preview: {content}")
    else:
        fail("POST /chat/test", f"status={r.status_code}  body={r.text[:300]}")
except Exception as e:
    fail("POST /chat/test", str(e))


# ──────────────────────────────────────────────────────────────
# 6. Delete vectors
# ──────────────────────────────────────────────────────────────
section("6. Delete Document Vectors")

try:
    payload = {"knowledge_base_id": KB_ID}
    r = requests.delete(
        f"{API_PREFIX}/documents/{DOC_ID}/vectors",
        json=payload,
        timeout=10,
    )
    data = r.json()
    if r.status_code == 200:
        ok(f"DELETE /documents/{DOC_ID}/vectors", json.dumps(data))
    else:
        fail(f"DELETE /documents/{DOC_ID}/vectors", f"status={r.status_code}  body={json.dumps(data)}")
except Exception as e:
    fail(f"DELETE /documents/{DOC_ID}/vectors", str(e))


# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────
section("Summary")
total = passed + failed
print(f"  {GREEN if failed == 0 else RED}{BOLD}Passed: {passed}/{total}{RESET}")
if failed > 0:
    print(f"  {RED}Failed: {failed}/{total}{RESET}")

sys.exit(0 if failed == 0 else 1)
