# Local Deployment Guide

Hybrid setup: Docker (infra) + Native (engine, requires VPN).

## Prerequisites

- Docker Desktop 4.x+
- Node.js 20+
- Anaconda/Miniconda
- VNPT VPN (for Triton, Qdrant, LLM)

## Architecture

```
┌─────────────────────────────────────┐
│         Docker Network              │
│  PostgreSQL :5432 | Redis :6379    │
│  MinIO :9000/:9001 | API :3000     │
└─────────────────────────────────────┘
                    ↕ localhost
┌─────────────────────────────────────┐
│         Native (Host + VPN)         │
│  Engine :8000 | Celery Worker      │
│  → Triton :31831 | Qdrant :32500   │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Infrastructure
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Widget (build first — API serves assets)
```bash
cd smartbot-fe-widget && npm install && npm run build
```

### 3. Backend API
```bash
cd smartbot-be
npm install
cp .env.example .env  # Edit DATABASE_URL, etc.
npx prisma migrate deploy
npm run start:dev
```

### 4. AI Engine (requires VPN)
```bash
conda activate env311
cd smartbot-ai-engine
pip install -r requirements.txt
# Edit .env: MINIO_SERVICE_URL=http://localhost:9000
uvicorn app.main:app --port 8000 --reload
```

### 5. Celery Worker (separate terminal)
```bash
conda activate env311 && cd smartbot-ai-engine
celery -A app.worker.celery_app worker --pool=solo --loglevel=info
```

### 6. Frontend
```bash
cd smartbot-fe-web
npm install
cp .env.local.example .env.local
npm run dev
```

## Verify

| Check | Command |
|-------|---------|
| API | `curl http://localhost:3000/` |
| Engine | `curl http://localhost:8000/health` |
| Swagger | http://localhost:3000/docs |
| Frontend | http://localhost:3001 |

## Common Issues

| Issue | Fix |
|-------|-----|
| Documents stuck "Pending" | Match `INTERNAL_API_KEY` (API) = `WEB_BACKEND_INTERNAL_KEY` (Engine) |
| Triton/Qdrant disconnected | Connect VNPT VPN |
| Celery crash on Windows | Use `--pool=solo` |
| MinIO upload 500 | Verify bucket `smartbot-v2` exists |

## Stop

```bash
docker compose -f docker-compose.dev.yml down
# Ctrl+C for uvicorn, celery, npm
```

See full guide: [deployment-guide.md (archived)](./archive/deployment-guide.md) — or check git history.
