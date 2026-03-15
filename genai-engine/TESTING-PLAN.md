# GenAI Engine — Comprehensive Testing Plan

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Environment Setup](#2-local-environment-setup)
3. [Service Deployment](#3-service-deployment)
4. [API Routes Test Cases](#4-api-routes-test-cases)
5. [Integration Test Scenarios](#5-integration-test-scenarios)
6. [E2E Workflow Tests](#6-e2e-workflow-tests)
7. [Error & Edge Case Tests](#7-error--edge-case-tests)
8. [Performance Checklist](#8-performance-checklist)

---

## 1. Prerequisites

### Required Infrastructure (already deployed)

| Service | Endpoint | Notes |
|---------|----------|-------|
| Triton Inference Server | `10.159.19.40:31831` | Model: `my_onnx_model` (BAAI/bge-m3) |
| Qdrant Vector DB | `http://10.159.19.59:32500` | API key required |
| LLM (OpenAI-compatible) | `https://assistant-stream.vnpt.vn/v1/` | Models: `llm-small-v4`, `llm-medium-v4` |
| MinIO/S3 | `https://voice-storage.vnpt.vn` | For document storage |

### Local Requirements

- Python 3.12+
- Docker & Docker Compose
- Redis (via Docker or local install)
- `curl` or Postman/Insomnia for API testing
- Network access to internal infrastructure (VPN if remote)

---

## 2. Local Environment Setup

### 2.1. Clone and Install

```bash
cd genai-engine
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

### 2.2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with real credentials:

```env
# Triton Inference Server
TRITON_HOST=10.159.19.40
TRITON_PORT=31831
TRITON_BATCH_SIZE=32
TRITON_MODEL_NAME=my_onnx_model
TOKENIZER_NAME=BAAI/bge-m3

# Qdrant Vector DB
QDRANT_URL=http://10.159.19.59:32500
QDRANT_API_KEY=trungTamIcVnpt
QDRANT_ON_DISK=true

# LLM (OpenAI-compatible)
LLM_BASE_URL=https://assistant-stream.vnpt.vn/v1/
LLM_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cmFuc2FjdGlvbl9pZCI6ImFkZmU0Nzk3LTRlMjktNDE2ZS1iZGViLWEwMWQyZTIwYmY5NSIsInN1YiI6IjNjYWY4NDhmLWY5MjMtMTFlYy1hOGQzLWQxYzkxZWY5YjBiYyIsImF1ZCI6WyJyZXN0c2VydmljZSJdLCJ1c2VyX25hbWUiOiJzbWFydGJvdGFpdGVhbUBnbWFpbC5jb20iLCJzY29wZSI6WyJyZWFkIl0sImlzcyI6Imh0dHBzOi8vbG9jYWxob3N0IiwibmFtZSI6InNtYXJ0Ym90YWl0ZWFtQGdtYWlsLmNvbSIsInV1aWRfYWNjb3VudCI6IjNjYWY4NDhmLWY5MjMtMTFlYy1hOGQzLWQxYzkxZWY5YjBiYyIsImF1dGhvcml0aWVzIjpbIlVTRVIiXSwianRpIjoiYzM3M2I0YmItODFiOC00MjFlLTk2MDEtNTJmMDRhODI0NGIyIiwiY2xpZW50X2lkIjoiYWRtaW5hcHAifQ.F0ayt77lAgCEQIUyDdoVJTLnn5z--k3_pEnXDzHgaN9uy7bPMIslRMRAwV1uDXpgwL-og_MQ8N-MXJrxW2kmpeRY_qRo4wuIuQajK1MeNbESKy7_iAhpSAedyisVKVXzT8czxHe54jLYRYxDUMCxik63DW_lSX_5I1cjSlGFkUQpS6IWDsahHB6Yh3enAe4IfWXGjDwUpDxkHuhzgyW7H8p1ofyiyDSPcktTdik_kKtaRngW8FbSiY3QBYCTVpSmFkCLz9B0I9r6-JkGqurLFNkdW971u2pNsDFJUBtABU5YQZBuTHt3eGkdivjv8ndZmsRdW0PWsKtwcm8FfHx2-Q
LLM_MODEL_SMALL=llm-small-v4
LLM_MODEL_MEDIUM=llm-medium-v4

# Marker Cloud API (OCR)
DATALAB_API_KEY=qkMieOEoEklpF47IG5cb4jeb-shlQYBR21PUqp5oa7k

# MinIO / S3
MINIO_SERVICE_URL=https://voice-storage.vnpt.vn
MINIO_ACCESS_KEY=texttospeech
MINIO_SECRET_KEY=Text2speechVnptAI@2024
MINIO_FOLDER_NAME=smartbot-v2
MINIO_PUBLIC_HOST=https://voice-storage.vnpt.vn
MINIO_EXPIRE_TIME=168

# Redis (Celery broker)
REDIS_URL=redis://localhost:6379/1

# Web Backend (callbacks — may not be running)
WEB_BACKEND_URL=http://localhost:3000
WEB_BACKEND_INTERNAL_KEY=shared-secret-key

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### 2.3. Verify Infrastructure Connectivity

Before starting the service, verify each dependency:

```bash
# 1. Triton — should return server metadata JSON
curl http://10.159.19.40:31831/v2/health/ready

# 2. Qdrant — should return collections list
curl -H "api-key: trungTamIcVnpt" http://10.159.19.59:32500/collections

# 3. LLM — should return model list
curl https://assistant-stream.vnpt.vn/v1/models \
  -H "Authorization: Bearer <your-api-key>"

# 4. Redis — should respond PONG
redis-cli -u redis://localhost:6379/1 ping
```

---

## 3. Service Deployment

### Option A: Docker Compose (recommended)

```bash
cd genai-engine
docker compose up --build
```

This starts 3 services:

| Service | Port | Command |
|---------|------|---------|
| `engine` | 8000 | `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` |
| `worker` | — | `celery -A app.worker.celery_app worker --loglevel=info --concurrency=2` |
| `redis` | 6379 | Redis 7 Alpine |

Verify startup:

```bash
# Check all 3 containers are running
docker compose ps

# Check engine logs for structlog output
docker compose logs engine

# Check worker logs — should show "celery@... ready"
docker compose logs worker
```

### Option B: Manual (development)

Terminal 1 — Redis:
```bash
docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
```

Terminal 2 — FastAPI engine:
```bash
cd genai-engine
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 3 — Celery worker:
```bash
cd genai-engine
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

### Startup Verification

```bash
# Should return JSON with status, triton, qdrant fields
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "triton": "connected",
  "qdrant": "connected"
}
```

---

## 4. API Routes Test Cases

### 4.1. Health Check

**Route:** `GET /health`

#### TC-HEALTH-01: All services connected
```bash
curl -s http://localhost:8000/health | python -m json.tool
```
**Expected:** `status=ok`, `triton=connected`, `qdrant=connected`

#### TC-HEALTH-02: Degraded state (Triton down)
Stop Triton or use wrong host, restart engine. Health should still respond but show triton error.

**Expected:** `status=ok`, `triton="error: ..."`, `qdrant=connected`

---

### 4.2. Knowledge Base Management

**Route:** `POST /engine/v1/knowledge-bases`

#### TC-KB-01: Create new knowledge base
```bash
curl -X POST http://localhost:8000/engine/v1/knowledge-bases \
  -H "Content-Type: application/json" \
  -d '{"knowledge_base_id": "test-kb-001"}'
```
**Expected:**
```json
{
  "collection_name": "kb_test-kb-001",
  "created": true
}
```

#### TC-KB-02: Create already existing knowledge base
Run TC-KB-01 twice.

**Expected:** Second call returns `"created": false`

#### TC-KB-03: Empty knowledge_base_id (validation)
```bash
curl -X POST http://localhost:8000/engine/v1/knowledge-bases \
  -H "Content-Type: application/json" \
  -d '{"knowledge_base_id": ""}'
```
**Expected:** `422 Unprocessable Entity` — min_length=1 validation

---

**Route:** `DELETE /engine/v1/knowledge-bases/{knowledge_base_id}`

#### TC-KB-04: Delete existing knowledge base
```bash
curl -X DELETE http://localhost:8000/engine/v1/knowledge-bases/test-kb-001
```
**Expected:**
```json
{"deleted": true}
```

#### TC-KB-05: Delete non-existent knowledge base
```bash
curl -X DELETE http://localhost:8000/engine/v1/knowledge-bases/non-existent-kb
```
**Expected:** `{"deleted": false}` (graceful failure, no crash)

---

### 4.3. Document Processing

**Route:** `POST /engine/v1/documents/process`

#### TC-DOC-01: Process text_input document
```bash
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-test-001",
    "knowledge_base_id": "test-kb-001",
    "tenant_id": "tenant-001",
    "source_type": "text_input",
    "raw_text": "# Test Document\n\nThis is a test document with some content about artificial intelligence and machine learning. AI systems use neural networks to process data and learn patterns. Machine learning is a subset of AI that focuses on algorithms that improve through experience.\n\n## Section 2\n\nDeep learning uses multiple layers of neural networks to extract features from data. Transformers are a type of deep learning architecture used in NLP tasks like text generation and translation.",
    "chunk_size": 200,
    "chunk_overlap": 20
  }'
```
**Expected:**
```json
{
  "job_id": "<celery-task-uuid>",
  "status": "queued"
}
```

**Verify processing:**
```bash
# Check worker logs for pipeline steps
docker compose logs worker --tail=50
# Should see: celery_process_start → extracting → chunking → embedding → celery_process_done
```

#### TC-DOC-02: Process file_upload document (requires MinIO file)
```bash
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-test-002",
    "knowledge_base_id": "test-kb-001",
    "tenant_id": "tenant-001",
    "source_type": "file_upload",
    "storage_path": "smartbot-v2/documents/test.pdf",
    "mime_type": "application/pdf"
  }'
```
**Expected:** `job_id` returned, worker processes via Marker Cloud API

#### TC-DOC-03: Process url_crawl document
```bash
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-test-003",
    "knowledge_base_id": "test-kb-001",
    "tenant_id": "tenant-001",
    "source_type": "url_crawl",
    "source_url": "https://vi.wikipedia.org/wiki/Trí_tuệ_nhân_tạo"
  }'
```
**Expected:** `job_id` returned, worker extracts via trafilatura

#### TC-DOC-04: Missing required fields
```bash
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{"source_type": "text_input"}'
```
**Expected:** `422` — missing document_id, knowledge_base_id, tenant_id

#### TC-DOC-05: Invalid chunk_size
```bash
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-test-005",
    "knowledge_base_id": "test-kb-001",
    "tenant_id": "tenant-001",
    "source_type": "text_input",
    "raw_text": "Test",
    "chunk_size": 50
  }'
```
**Expected:** `422` — chunk_size must be >= 100

---

**Route:** `POST /engine/v1/documents/{document_id}/reprocess`

#### TC-DOC-06: Reprocess from saved markdown
First run TC-DOC-01 and wait for completion. Check worker logs for `markdown_storage_path`.

```bash
curl -X POST http://localhost:8000/engine/v1/documents/doc-test-001/reprocess \
  -H "Content-Type: application/json" \
  -d '{
    "knowledge_base_id": "test-kb-001",
    "markdown_storage_path": "<path-from-worker-logs>",
    "chunk_size": 300,
    "chunk_overlap": 30
  }'
```
**Expected:** `job_id` returned. Worker deletes old vectors → re-chunks → re-embeds.

---

**Route:** `DELETE /engine/v1/documents/{document_id}/vectors`

#### TC-DOC-07: Delete document vectors
```bash
curl -X DELETE http://localhost:8000/engine/v1/documents/doc-test-001/vectors \
  -H "Content-Type: application/json" \
  -d '{"knowledge_base_id": "test-kb-001"}'
```
**Expected:**
```json
{"deleted_chunks": <operation_id>}
```

---

**Route:** `GET /engine/v1/documents/{document_id}/chunks`

#### TC-DOC-08: Get document chunks (after processing)
```bash
curl "http://localhost:8000/engine/v1/documents/doc-test-001/chunks?knowledge_base_id=test-kb-001&page=1&limit=10"
```
**Expected:**
```json
{
  "chunks": [
    {
      "content": "...",
      "position": 0,
      "char_count": 123
    }
  ],
  "total": 3,
  "page": 1
}
```

#### TC-DOC-09: Get chunks with pagination
```bash
curl "http://localhost:8000/engine/v1/documents/doc-test-001/chunks?knowledge_base_id=test-kb-001&page=2&limit=2"
```
**Expected:** Page 2 results, different chunks from page 1

#### TC-DOC-10: Get chunks — non-existent document
```bash
curl "http://localhost:8000/engine/v1/documents/non-existent/chunks?knowledge_base_id=test-kb-001"
```
**Expected:** `{"chunks": [], "total": 0, "page": 1}`

#### TC-DOC-11: Get chunks — missing knowledge_base_id query param
```bash
curl "http://localhost:8000/engine/v1/documents/doc-test-001/chunks"
```
**Expected:** `422` — knowledge_base_id is required query param

---

### 4.4. Chat (RAG)

**Route:** `POST /engine/v1/chat/completions`

> **Pre-requisite:** Run TC-KB-01 + TC-DOC-01 first and wait for worker to finish processing.

#### TC-CHAT-01: Streaming chat (SSE)
```bash
curl -N -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "AI là gì?",
    "knowledge_base_ids": ["test-kb-001"],
    "stream": true,
    "top_k": 5,
    "memory_turns": 5
  }'
```
**Expected SSE events (in order):**
```
event: message_start
data: {"message_id": "<uuid>"}

event: retrieval
data: {"search_query": "...", "chunks": [...]}

event: delta
data: {"content": "Trí"}

event: delta
data: {"content": " tuệ"}

... (more delta events)

event: message_end
data: {"input_tokens": 500, "output_tokens": 150}
```

#### TC-CHAT-02: Non-streaming chat (JSON)
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "Machine learning khác gì deep learning?",
    "knowledge_base_ids": ["test-kb-001"],
    "stream": false,
    "top_k": 3
  }'
```
**Expected:**
```json
{
  "answer": "Machine learning là...",
  "search_query": "Machine learning khác deep learning",
  "retrieval_context": [
    {
      "document_id": "doc-test-001",
      "score": 0.0312,
      "text_preview": "..."
    }
  ],
  "input_tokens": 400,
  "output_tokens": 120
}
```

#### TC-CHAT-03: Chat with conversation history
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "Nó được ứng dụng như thế nào?",
    "knowledge_base_ids": ["test-kb-001"],
    "conversation_history": [
      {"role": "user", "content": "AI là gì?"},
      {"role": "assistant", "content": "AI (Artificial Intelligence) là trí tuệ nhân tạo..."},
      {"role": "user", "content": "Có những loại nào?"},
      {"role": "assistant", "content": "Có nhiều loại AI: machine learning, deep learning..."}
    ],
    "stream": false,
    "memory_turns": 3
  }'
```
**Expected:** Query rewriter resolves "Nó" → "AI/Trí tuệ nhân tạo". `search_query` should be a standalone query.

#### TC-CHAT-04: Chat with custom system prompt
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "Explain transformers",
    "knowledge_base_ids": ["test-kb-001"],
    "system_prompt": "You are a technical AI expert. Answer in English only.",
    "stream": false,
    "top_k": 5
  }'
```
**Expected:** Answer in English (following custom system prompt)

#### TC-CHAT-05: Chat with no knowledge bases (empty retrieval)
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "Hello",
    "knowledge_base_ids": [],
    "stream": false
  }'
```
**Expected:** LLM responds with fallback "Không tìm thấy thông tin liên quan" since no KB searched

#### TC-CHAT-06: Chat with multiple knowledge bases
```bash
# First create a second KB and add a document to it
curl -X POST http://localhost:8000/engine/v1/knowledge-bases \
  -H "Content-Type: application/json" \
  -d '{"knowledge_base_id": "test-kb-002"}'

curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc-test-004",
    "knowledge_base_id": "test-kb-002",
    "tenant_id": "tenant-001",
    "source_type": "text_input",
    "raw_text": "Python is a programming language widely used in data science and AI development."
  }'

# Wait for processing, then search across both KBs
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "What programming languages are used in AI?",
    "knowledge_base_ids": ["test-kb-001", "test-kb-002"],
    "stream": false,
    "top_k": 5
  }'
```
**Expected:** `retrieval_context` includes chunks from both collections

#### TC-CHAT-07: Validation — empty message
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "",
    "knowledge_base_ids": []
  }'
```
**Expected:** `422` — message min_length=1

#### TC-CHAT-08: Validation — top_k out of range
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "test",
    "top_k": 25
  }'
```
**Expected:** `422` — top_k max is 20

#### TC-CHAT-09: Validation — empty string in knowledge_base_ids
```bash
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot-001",
    "tenant_id": "tenant-001",
    "message": "test",
    "knowledge_base_ids": ["kb1", ""]
  }'
```
**Expected:** `422` — knowledge_base_ids must not contain empty strings

---

**Route:** `POST /engine/v1/chat/test`

#### TC-CHAT-10: Quick test chat
```bash
curl -X POST http://localhost:8000/engine/v1/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Transformer là gì?",
    "knowledge_base_ids": ["test-kb-001"],
    "top_k": 3
  }'
```
**Expected:**
```json
{
  "answer": "...",
  "search_query": "...",
  "retrieval_context": [...]
}
```
No streaming. No conversation_history. No input/output token counts.

---

## 5. Integration Test Scenarios

### 5.1. Full Document Lifecycle

```
1. POST /engine/v1/knowledge-bases           → create KB
2. POST /engine/v1/documents/process          → ingest document (wait for worker)
3. GET  /engine/v1/documents/{id}/chunks      → verify chunks stored in Qdrant
4. POST /engine/v1/chat/completions           → RAG chat with ingested content
5. POST /engine/v1/documents/{id}/reprocess   → re-chunk with different size
6. GET  /engine/v1/documents/{id}/chunks      → verify new chunk count
7. DELETE /engine/v1/documents/{id}/vectors   → remove vectors
8. GET  /engine/v1/documents/{id}/chunks      → verify empty
9. DELETE /engine/v1/knowledge-bases/{id}     → cleanup collection
```

### 5.2. Multi-Document KB

```
1. Create KB "test-multi"
2. Process 3 documents into the same KB (different document_ids)
3. Chat — retrieval should return chunks from multiple documents
4. Delete 1 document's vectors
5. Chat again — retrieval should only include remaining 2 documents
6. Cleanup
```

### 5.3. Query Rewriter Verification

```
1. Process a document about "VNPT company"
2. Chat: "VNPT là gì?" — note the search_query
3. Chat with history: "Nó được thành lập năm nào?" — search_query should resolve "Nó" → "VNPT"
4. Verify search_query in response is standalone (not containing pronouns)
```

### 5.4. Concurrent Processing

```
1. Create a KB
2. Send 5 document processing requests simultaneously
3. Monitor worker logs — all 5 should process (concurrency=2, others queued)
4. Verify all 5 documents have chunks in Qdrant
```

---

## 6. E2E Workflow Tests

### 6.1. SaaS Bot Simulation

Simulates what the Web Backend would do for a typical bot setup:

```bash
# Step 1: Create a knowledge base for the bot
KB_ID="bot-demo-kb"
curl -X POST http://localhost:8000/engine/v1/knowledge-bases \
  -H "Content-Type: application/json" \
  -d "{\"knowledge_base_id\": \"$KB_ID\"}"

# Step 2: Upload a company FAQ document
curl -X POST http://localhost:8000/engine/v1/documents/process \
  -H "Content-Type: application/json" \
  -d "{
    \"document_id\": \"faq-001\",
    \"knowledge_base_id\": \"$KB_ID\",
    \"tenant_id\": \"tenant-demo\",
    \"source_type\": \"text_input\",
    \"raw_text\": \"# FAQ\\n\\n## Giờ làm việc\\nCông ty làm việc từ 8h-17h, thứ 2 đến thứ 6.\\n\\n## Địa chỉ\\nTrụ sở chính tại 57 Huỳnh Thúc Kháng, Hà Nội.\\n\\n## Liên hệ\\nHotline: 1800-1234. Email: support@company.vn\"
  }"

# Step 3: Wait for processing (check worker logs)
sleep 15

# Step 4: User asks a question
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"bot-demo\",
    \"tenant_id\": \"tenant-demo\",
    \"message\": \"Công ty mở cửa lúc mấy giờ?\",
    \"knowledge_base_ids\": [\"$KB_ID\"],
    \"system_prompt\": \"Bạn là trợ lý FAQ của công ty. Trả lời ngắn gọn.\",
    \"stream\": false,
    \"top_k\": 3
  }"

# Expected: answer mentions "8h-17h, thứ 2 đến thứ 6"

# Step 5: Follow-up question with history
curl -X POST http://localhost:8000/engine/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"bot-demo\",
    \"tenant_id\": \"tenant-demo\",
    \"message\": \"Còn địa chỉ thì sao?\",
    \"knowledge_base_ids\": [\"$KB_ID\"],
    \"conversation_history\": [
      {\"role\": \"user\", \"content\": \"Công ty mở cửa lúc mấy giờ?\"},
      {\"role\": \"assistant\", \"content\": \"Công ty làm việc từ 8h-17h, thứ 2 đến thứ 6.\"}
    ],
    \"stream\": false,
    \"top_k\": 3
  }"

# Expected: answer mentions "57 Huỳnh Thúc Kháng, Hà Nội"

# Cleanup
curl -X DELETE http://localhost:8000/engine/v1/documents/faq-001/vectors \
  -H "Content-Type: application/json" \
  -d "{\"knowledge_base_id\": \"$KB_ID\"}"

curl -X DELETE "http://localhost:8000/engine/v1/knowledge-bases/$KB_ID"
```

---

## 7. Error & Edge Case Tests

### 7.1. Service Resilience

| Test | Action | Expected |
|------|--------|----------|
| App starts without Triton | Set wrong `TRITON_HOST` | App starts. `/health` shows triton error. Chat fails gracefully. |
| App starts without Qdrant | Set wrong `QDRANT_URL` | App starts. `/health` shows qdrant error. KB/doc ops fail. |
| App starts without Redis | Stop Redis container | App starts but Celery tasks fail to enqueue (`ConnectionError`). |
| Callback to Web Backend fails | Web Backend not running | Worker continues pipeline. Logs `callback_exhausted` warning. Document still processed. |

### 7.2. Input Validation

| Test | Input | Expected |
|------|-------|----------|
| Empty document_id | `{"document_id": ""}` | `422` |
| Chunk size too small | `{"chunk_size": 50}` | `422` — min 100 |
| Chunk size too large | `{"chunk_size": 6000}` | `422` — max 5000 |
| Chunk overlap too large | `{"chunk_overlap": 600}` | `422` — max 500 |
| memory_turns = 0 | `{"memory_turns": 0}` | `422` — min 1 |
| memory_turns = 21 | `{"memory_turns": 21}` | `422` — max 20 |
| top_k = 0 | `{"top_k": 0}` | `422` — min 1 |
| 11 knowledge_base_ids | 11 items in array | `422` — max_length 10 |
| Missing Content-Type | No header | `422` or `415` |

### 7.3. Celery Worker

| Test | Action | Expected |
|------|--------|----------|
| Worker crash mid-process | Kill worker during processing | Task stays in Redis queue. Restart worker → task retries. |
| Max retries exceeded | Force 4 consecutive failures | Task enters FAILURE state after 3 retries. Error logged. |
| Large document | Process a 10MB+ text | Worker handles batching correctly via `TRITON_BATCH_SIZE=32`. |
- [ ] Qdrant hybrid search (1 collection, 10K vectors): < 500ms
- [ ] Health check: < 1s response time

---

## Appendix: Unit Tests (already passing)

```bash
cd genai-engine
pytest tests/ -v
```

Current test suite (11 tests):
- `TestChunker` (8 tests): chunk output format, positions, char_count, size limits, empty/None input, single chunk, custom sizes
- `TestRRF` (3 tests): basic RRF scoring, content preservation, empty inputs

---

## Cleanup After Testing

```bash
# Delete test collections from Qdrant
curl -X DELETE http://localhost:8000/engine/v1/knowledge-bases/test-kb-001
curl -X DELETE http://localhost:8000/engine/v1/knowledge-bases/test-kb-002
curl -X DELETE http://localhost:8000/engine/v1/knowledge-bases/bot-demo-kb

# Stop Docker services
docker compose down -v
```
