# Local Deployment Guide

Deploy the GenAI Assistant Platform locally with a **hybrid approach**:
- **genai-platform-api** (NestJS) — Docker (docker-compose)
- **genai-engine** (Python/FastAPI) — Native (conda), because Docker containers cannot reach VNPT internal services (Triton, Qdrant, LLM) that require VPN on the host machine
- **MinIO** — Local Docker on `localhost:9000`, accessible from both Docker network and native processes

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | 4.x+ | https://docs.docker.com/desktop/install/windows-install/ |
| Node.js | 20+ | https://nodejs.org/ |
| Anaconda/Miniconda | latest | https://docs.anaconda.com/anaconda/install/ |
| Git | 2.x+ | https://git-scm.com/ |
| VPN | VNPT internal | Required for Triton, Qdrant, LLM access |

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Docker Network              │
│  ┌───────────┐  ┌───────────────┐   │
│  │ PostgreSQL │  │ Redis         │   │
│  │ :5432      │  │ :6379         │   │
│  └───────────┘  └───────────────┘   │
│  ┌───────────┐  ┌───────────────┐   │
│  │ MinIO      │  │ Platform API  │   │
│  │ :9000/:9001│  │ :3000         │   │
│  └───────────┘  └───────────────┘   │
└─────────────────────────────────────┘
        ▲                ▲
        │ localhost       │ localhost:8000
        ▼                ▼
┌─────────────────────────────────────┐
│         Native (Host)               │
│  ┌───────────────────────────────┐  │
│  │ AI Engine (uvicorn :8000)     │  │
│  │ Celery Worker                 │  │
│  └───────────────────────────────┘  │
│           │  VPN tunnel             │
│           ▼                         │
│  Triton :31831 | Qdrant :32500     │
│  LLM (assistant-stream.vnpt.vn)    │
└─────────────────────────────────────┘
```

---

## Step 1: Clone & Prepare

```bash
git clone <repo-url> smartbot-v2
cd smartbot-v2
```

---

## Step 2: Start Infrastructure (Docker)

Create `docker-compose.dev.yml` at project root (or use inline):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: genai_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  minio_data:
```

Start all infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Verify:

```bash
docker compose -f docker-compose.dev.yml ps
# All 3 services should show "running" / "healthy"
```

---

## Step 3: Configure MinIO Bucket

Open MinIO Console at http://localhost:9001 (login: `minioadmin` / `minioadmin123`).

1. Create bucket: **`smartbot-v2`**
2. Set bucket access policy to **public** (or configure as needed)

Or via CLI:

```bash
docker run --rm --net=host --entrypoint sh minio/mc:latest -c "
  mc alias set local http://localhost:9000 minioadmin minioadmin123 &&
  mc mb local/smartbot-v2 --ignore-existing &&
  mc anonymous set download local/smartbot-v2
"
```

---

## Step 4: Build smartbot-widget

The widget must be built **before** starting the Platform API, because the API serves widget assets from `smartbot-widget/dist/` via `ServeStaticModule` at `/widget/`.

```bash
cd smartbot-widget
npm install
npm run build
```

Verify output:

```bash
ls dist/
# smartbot-widget.iife.js       (~25KB, main bundle)
# smartbot-widget-loader.iife.js (~1KB, async loader)
# iframe.html                    (iframe embed page)
```

---

## Step 5: Deploy genai-platform-api (NestJS)

### 5.1 Install Dependencies

```bash
cd genai-platform-api
npm install
```

### 5.2 Configure Environment

```bash
copy .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/genai_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars-change-me
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

# MinIO — LOCAL (not external VNPT)
MINIO_SERVICE_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_FOLDER_NAME=smartbot-v2

# AI Engine
AI_ENGINE_URL=http://localhost:8000

# Internal API Key (shared secret with AI Engine)
# ⚠ MUST match WEB_BACKEND_INTERNAL_KEY in genai-engine/.env
INTERNAL_API_KEY=internal-secret-key-change-in-production

# App
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
PORT=3000
NODE_ENV=development
```

### 5.3 Run Database Migrations

```bash
npx prisma migrate deploy
```

If this is a fresh database, generate the Prisma client first:

```bash
npx prisma generate
```

### 5.4 Seed Plans (Optional)

The API has internal endpoints to seed billing plans. After starting the server (step 4.5), call:

```bash
curl -X POST http://localhost:3000/api/internal/plans/seed
# On Windows PowerShell, use:
# cmd /c "curl -X POST http://localhost:3000/api/internal/plans/seed"
```

### 5.5 Start the API

Development mode (hot-reload):

```bash
npm run start:dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

Verify:

```bash
curl http://localhost:3000/
# {"status":"ok","service":"genai-platform-api","timestamp":"..."}
```

Swagger docs: http://localhost:3000/docs

---

## Step 6: Deploy genai-engine (Python/FastAPI)

### 6.1 Create/Activate Conda Environment

```bash
# Check if env exists first; if yes, activate it. Otherwise, create it.
conda activate env311 || conda create -n env311 python=3.11 -y
conda activate env311
```

### 6.2 Install Dependencies

```bash
cd genai-engine
# On Windows PowerShell, avoid chaining with &&. Run separately:
conda activate env311
pip install -r requirements.txt
```

> **Troubleshooting Pip:** If you encounter a dependency conflict between `datalab-python-sdk` and `pydantic-settings`, relax the version requirements in `requirements.txt`. Change `pydantic==2.10.4` and `pydantic-settings>=2.10.1` to just `pydantic` and `pydantic-settings`.

### 6.3 Configure Environment
Use the existing `.env` file in the `genai-engine` folder. You must update the following sections:

> **Important:** By default, the `.env` might point to production VNPT storage. `MINIO_SERVICE_URL` and `MINIO_PUBLIC_HOST` MUST point to `http://localhost:9000` (local MinIO). Also, update `MINIO_ACCESS_KEY` to `minioadmin` and `MINIO_SECRET_KEY` to `minioadmin123`.

> **CRITICAL — Internal API Key:** `WEB_BACKEND_INTERNAL_KEY` in `genai-engine/.env` **MUST be identical** to `INTERNAL_API_KEY` in `genai-platform-api/.env`. If these values differ, the AI Engine callback to update document status will receive `401 Unauthorized` and documents will stay stuck in "Pending" forever. Example:
>
> ```env
> # In genai-engine/.env — must match INTERNAL_API_KEY in platform-api
> WEB_BACKEND_INTERNAL_KEY=internal-secret-key-change-in-production
> ```

### 6.4 Start FastAPI Server

```bash
conda activate env311
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

```bash
curl http://localhost:8000/engine/v1/health
# {"status":"ok","triton":"connected","qdrant":"connected"}
```

### 6.5 Start Celery Worker

Open a **second terminal**:

```bash
conda activate env311
cd genai-engine
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2 --pool=solo
```

> On Windows, use `--pool=solo` to avoid multiprocessing issues. On Linux, omit it.

Verify Celery is running by checking the worker logs for:
```
[INFO] celery@<hostname> ready.
```

---

## Step 7: Deploy smartbot-web (Frontend)

### 7.1 Install Dependencies

```bash
cd smartbot-web
npm install
```

### 7.2 Configure Environment

Create `.env.local` by copying the example:

```bash
copy .env.local.example .env.local
```

Ensure `NEXT_PUBLIC_API_URL` points to your Platform API (e.g., `http://localhost:3000`).

### 7.3 Start Development Server

```bash
npm run dev
```

Verify the frontend is running:
- Open http://localhost:3001/ in your browser.

---

## Step 8: Verify Full Stack

### Health Checks

```bash
# Platform API
curl http://localhost:3000/

# AI Engine
curl http://localhost:8000/health
```

### Widget Verification

After starting the Platform API, verify widget assets are served:

```bash
curl -I http://localhost:3000/widget/smartbot-widget.iife.js
# Should return 200 with Content-Type: application/javascript

curl -I http://localhost:3000/widget/smartbot-widget-loader.iife.js
# Should return 200

curl -I http://localhost:3000/widget/iframe.html
# Should return 200 with Content-Type: text/html
```

### Quick Smoke Test

1. **Register a user** via Platform API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","fullName":"Test User"}'
```

2. **Create a Knowledge Base** via AI Engine:
```bash
curl -X POST http://localhost:8000/engine/v1/knowledge-bases \
  -H "Content-Type: application/json" \
  -d '{"knowledge_base_id":"test-kb-001"}'
```

3. **Chat test** (requires VPN for LLM):
```bash
curl -X POST http://localhost:8000/engine/v1/chat/test \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào","knowledge_base_ids":[]}'
```

---

## Service Ports Summary

| Service | Port | Protocol | Location |
|---------|------|----------|----------|
| Platform API | 3000 | HTTP | Docker or native |
| Widget Assets | 3000/widget/ | HTTP | Served by Platform API |
| Platform Web | 3001 | HTTP | Native |
| AI Engine | 8000 | HTTP | Native (host) |
| PostgreSQL | 5432 | TCP | Docker |
| Redis | 6379 | TCP | Docker |
| MinIO API | 9000 | HTTP | Docker |
| MinIO Console | 9001 | HTTP | Docker |
| Triton | 31831 | HTTP/gRPC | VNPT internal (VPN) |
| Qdrant | 32500 | HTTP | VNPT internal (VPN) |
| LLM API | 443 | HTTPS | VNPT internal (VPN) |

---

## Troubleshooting

### Platform API cannot connect to database
- Verify PostgreSQL is running: `docker compose -f docker-compose.dev.yml ps`
- Check `DATABASE_URL` in `.env` points to `localhost:5432`
- Run `npx prisma migrate deploy` again

### AI Engine health check shows triton/qdrant disconnected
- Ensure VPN is connected
- Test connectivity: `curl http://10.159.19.40:31831/v2/health/ready`
- The engine will still start but RAG features won't work without VPN

### Celery tasks stuck in PENDING
- Check Redis is running: `docker compose -f docker-compose.dev.yml ps`
- Verify `REDIS_URL` in engine `.env` uses `/1` (db 1)
- Restart celery worker

### Documents stuck in "Pending" after upload (401 callback)
- Celery log shows `401 Unauthorized` on `PATCH .../internal/documents/.../status`
- Root cause: `WEB_BACKEND_INTERNAL_KEY` in `genai-engine/.env` does not match `INTERNAL_API_KEY` in `genai-platform-api/.env`
- Fix: copy the exact value from `genai-platform-api/.env` `INTERNAL_API_KEY` into `genai-engine/.env` `WEB_BACKEND_INTERNAL_KEY`, then restart Celery worker

### MinIO upload fails (500 error)
- Verify MinIO is running: `curl http://localhost:9000/minio/health/live`
- Check bucket `smartbot-v2` exists: http://localhost:9001
- Verify `MINIO_SERVICE_URL=http://localhost:9000` (not HTTPS, not external)

### Windows-specific: Celery worker crashes
- Use `--pool=solo` flag (Windows doesn't support `prefork` pool)
- Use `--concurrency=1` if memory is limited

### Windows-specific: Unicode/encoding errors
- Set environment variable: `PYTHONIOENCODING=utf-8`
- Or run: `chcp 65001` in terminal before starting services

### Windows-specific: PowerShell curl parameter errors
- PowerShell maps `curl` to `Invoke-WebRequest`, which doesn't support the `-X` flag out of the box.
- Prepend your commands with `cmd /c` (e.g., `cmd /c "curl -X POST ..."`).

---

## Stopping Services

```bash
# Stop infrastructure (Postgres, Redis, MinIO)
docker compose -f docker-compose.dev.yml down

# Stop AI Engine — Ctrl+C in the uvicorn terminal
# Stop Celery — Ctrl+C in the celery terminal

# To also remove data volumes:
docker compose -f docker-compose.dev.yml down -v
```
