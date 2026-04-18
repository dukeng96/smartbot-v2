# Phase 02: Create New Docs Structure

**Priority**: High
**Status**: pending

## Overview

Create minimal, actionable docs for 30-minute onboarding.

## Target Structure

```
docs/
├── README.md              ← Quick start + links (NEW)
├── architecture.md        ← System diagram + boundaries (NEW)
├── api-reference.md       ← Backend + Engine endpoints (NEW)
├── database-schema.md     ← Prisma models (NEW)
├── deployment.md          ← Renamed from deployment-guide.md
├── vnpt-llm.md            ← Renamed from API-LLM-VNPT.md
└── journals/              ← Keep as-is
```

## Files to Create

### 1. docs/README.md (~30 lines)

```markdown
# Smartbot v2 Docs

Quick links for onboarding.

## 30-Minute Onboarding

1. [CLAUDE.md](../CLAUDE.md) — Project overview, coding rules
2. [architecture.md](./architecture.md) — System design
3. [api-reference.md](./api-reference.md) — Endpoints
4. [deployment.md](./deployment.md) — Local setup

## Reference

- [database-schema.md](./database-schema.md) — Prisma models
- [vnpt-llm.md](./vnpt-llm.md) — VNPT LLM API
- [journals/](./journals/) — Lessons learned
```

### 2. docs/architecture.md (~150 lines)

Content: Extract from CLAUDE.md Architecture section + expand with:
- Service diagram (ASCII)
- Port assignments
- Data flow (FE → BE → Engine → External)
- Key modules per service

### 3. docs/api-reference.md (~200 lines)

Auto-generate from:
- Backend: `grep -r "@Controller\|@Get\|@Post\|@Put\|@Delete" genai-platform-api/src/`
- Engine: `grep -r "@router\|@app" genai-engine/app/`

Sections:
- Backend REST endpoints (grouped by module)
- Engine endpoints
- Internal API (X-Internal-Key)

### 4. docs/database-schema.md (~150 lines)

Auto-generate from `genai-platform-api/prisma/schema.prisma`:
- Table list with descriptions
- Key relationships
- Multi-tenant fields (tenantId)

## Files to Rename

- `docs/deployment-guide.md` → `docs/deployment.md`
- `docs/API-LLM-VNPT.md` → `docs/vnpt-llm.md`

## Implementation Steps

1. Rename existing files
2. Create README.md
3. Create architecture.md (extract + expand from CLAUDE.md)
4. Create api-reference.md (auto-gen from code)
5. Create database-schema.md (auto-gen from Prisma)

## Success Criteria

- [ ] 6 root files + journals/ directory
- [ ] Each file <200 lines
- [ ] README.md links all work
