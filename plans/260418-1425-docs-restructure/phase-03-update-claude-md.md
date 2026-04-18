# Phase 03: Update CLAUDE.md References

**Priority**: High
**Status**: pending

## Overview

Fix Key Docs table to point to new structure.

## Current (Broken)

```markdown
## Key Docs

| Service | Required reading |
|---------|-----------------|
| Backend | @docs/backend-api-reference.md, @docs/backend-codebase-summary.md |
| Engine | @docs/PHASE2-AI-ENGINE-PLAN.md, @docs/API-LLM-VNPT.md |
| Frontend | @docs/frontend-architecture.md, @docs/frontend-ui-rules.md, @docs/frontend-design-system.md |
| Widget | @docs/widget-architecture.md, @docs/widget-design-system.md |
| Cross-cutting | @docs/system-architecture.md, @docs/figma-screen-spec.md |
```

All these files are in archive/ (deleted) or renamed.

## New (Fixed)

```markdown
## Key Docs

| Topic | File |
|-------|------|
| Architecture | [docs/architecture.md](docs/architecture.md) |
| API Endpoints | [docs/api-reference.md](docs/api-reference.md) |
| Database | [docs/database-schema.md](docs/database-schema.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| VNPT LLM | [docs/vnpt-llm.md](docs/vnpt-llm.md) |
```

## Additional Cleanup

- Remove `Track progress in PROJECT-STATUS.md` (file deleted)
- Simplify Workflow section

## Implementation Steps

1. Replace Key Docs table
2. Remove PROJECT-STATUS.md reference
3. Verify all links resolve

## Success Criteria

- [ ] All Key Docs links point to existing files
- [ ] No references to deleted files
