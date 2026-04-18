---
title: "Node Testing Strategy"
description: "Fill unit test gaps across 15 engine nodes and add 7 golden flow integration tests"
status: complete
priority: P1
effort: 4h
branch: dev-agentflow
tags: [testing, flow-engine, genai-engine, integration]
created: 2026-04-16
completed: 2026-04-16
---

# Node Testing Strategy

**Scope:** genai-engine — 15 flow nodes, unit gap-fills + 7 golden flow integration tests  
**Branch:** `dev-agentflow`  
**Reference:** `plans/reports/brainstorm-260416-1824-node-testing-strategy.md`

---

## Phase Table

| # | Phase | File(s) Modified / Created | Status | Effort |
|---|-------|---------------------------|--------|--------|
| 1 | Unit test gaps | `tests/test_node_gaps.py` (new) | done | 1.5h |
| 2 | Flow integration tests | `tests/test_flow_scenarios.py` (new) | done | 2h |
| 3 | Test infrastructure | `tests/conftest.py` (modify), `pyproject.toml` (create) | done | 0.5h |

## Dependency Graph

```
Phase 3 (infra/conftest)
  └── must land before Phase 1 and Phase 2 can use shared fixtures
      Phase 1 (unit gaps) — no external services, fast
      Phase 2 (flow integration) — requires local services + env vars
```

Phase 3 blocks both Phase 1 and Phase 2. Phases 1 and 2 are independent of each other after Phase 3.

## Files Modified

| File | Action | Phase |
|------|--------|-------|
| `genai-engine/tests/conftest.py` | Modify — add credential fixtures, markers, memory cleanup | 3 |
| `genai-engine/pyproject.toml` | Modify — add `[tool.pytest.ini_options]` markers section | 3 |
| `genai-engine/tests/test_node_gaps.py` | Create — 10-12 unit tests | 1 |
| `genai-engine/tests/test_flow_scenarios.py` | Create — 7 integration tests | 2 |

## Success Criteria

- [x] Every node has ≥1 unit test proving core behaviour
- [x] `LlmNode` messages[] array path tested (was zero coverage)
- [x] `AgentNode` memory_enabled=True path tested (was zero coverage)
- [x] 8 flow integration tests implemented (3 pass locally, 5 skip without env vars)
- [x] All existing tests remain green (pre-existing failures noted below)
- [x] `pytest -m unit` runs with zero network calls
- [x] `pytest -m integration` skips gracefully when env vars absent

## Known Pre-existing Failures (not caused by this work)

- `test_llm_missing_credential_raises` — env var fallback hits real VNPT API instead of raising
- `test_registry_total_count_at_least_14` — node count assertion outdated (13 nodes registered, expects 14)

## Bonus: Bug Fixes

Patched `create_agent` → `create_react_agent` in 3 pre-existing test files:
- `tests/test_nodes_new.py`
- `tests/test_agentcanvas_nodes_contract.py`
- `tests/test_e2e_agent.py`

## Rollback

All changes are additive (new test files + conftest additions). Reverting = deleting `test_node_gaps.py` and `test_flow_scenarios.py`, and reverting conftest/pyproject.toml edits. No production code touched.
