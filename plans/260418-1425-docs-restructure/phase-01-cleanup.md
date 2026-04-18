# Phase 01: Cleanup Archive + Implementation Logs

**Priority**: High
**Status**: pending

## Overview

Delete outdated docs that bloat context without adding value.

## Files to Delete

### archive/ (23 files) — all
```
docs/archive/PHASE1-WEB-BACKEND-PLAN.md
docs/archive/PHASE2-AI-ENGINE-PLAN.md
docs/archive/PHASE3-FRONTEND-PLAN.md
docs/archive/PHASE4A-WIDGET-PLAN.md
docs/archive/PHASE4B-WIDGET-PLAN.md
docs/archive/PROJECT-STATUS.md
docs/archive/backend-api-reference.md
docs/archive/backend-codebase-summary.md
docs/archive/code-standards.md
docs/archive/codebase-summary.md
docs/archive/figma-screen-spec.md
docs/archive/frontend-architecture.md
docs/archive/frontend-build-order.md
docs/archive/frontend-design-system.md
docs/archive/frontend-ui-rules.md
docs/archive/phase4-widget-session-workflow.md
docs/archive/project-changelog.md
docs/archive/qa-platform-foundation.md
docs/archive/stitch-backend-mismatch-analysis.md
docs/archive/STITCH-PROMPTS.md
docs/archive/system-architecture.md
docs/archive/TEST_REPORT.md
docs/archive/widget-architecture.md
```

### frontend-implemetation-logs/ (5 files) — all
```
docs/frontend-implemetation-logs/auth.md
docs/frontend-implemetation-logs/bots.md
docs/frontend-implemetation-logs/conversations-billing.md
docs/frontend-implemetation-logs/dashboard-analytics.md
docs/frontend-implemetation-logs/knowledge-base.md
```

## Rationale

- Git history preserves everything if needed
- PHASE plans are completed, not actionable
- Implementation logs are session-specific, not reference docs
- journals/ captures lessons learned — sufficient historical context

## Implementation Steps

1. `rm -rf docs/archive/`
2. `rm -rf docs/frontend-implemetation-logs/`
3. Verify: `ls docs/` shows only root files + journals/

## Success Criteria

- [ ] archive/ deleted
- [ ] frontend-implemetation-logs/ deleted
- [ ] docs/ contains only: API-LLM-VNPT.md, deployment-guide.md, journals/
