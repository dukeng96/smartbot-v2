# Phase 04: Validate + Commit

**Priority**: Medium
**Status**: pending

## Overview

Verify structure and commit changes.

## Validation Checklist

- [ ] `ls docs/` shows exactly: README.md, architecture.md, api-reference.md, database-schema.md, deployment.md, vnpt-llm.md, journals/
- [ ] Each .md file <200 lines: `wc -l docs/*.md`
- [ ] All links in README.md resolve
- [ ] All links in CLAUDE.md resolve
- [ ] No broken references in codebase: `grep -r "docs/archive\|docs/frontend-implemetation" .`

## Commit

```bash
git add -A
git commit -m "docs: restructure for 30-min onboarding

- Delete archive/ (23 files) + frontend-implemetation-logs/ (5 files)
- Create minimal structure: README, architecture, api-reference, database-schema
- Rename deployment-guide.md → deployment.md, API-LLM-VNPT.md → vnpt-llm.md
- Update CLAUDE.md Key Docs table
- Keep journals/ for lessons learned"
```

## Success Criteria

- [ ] Validation checklist passes
- [ ] Clean commit on dev-agentflow
- [ ] docs/ total: 6 files + 1 directory
