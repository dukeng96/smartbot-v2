# Phase 03 — Test Infrastructure

**Status:** done  
**Priority:** P1  
**Effort:** 0.5h  
**Blocker:** none — must land FIRST (Phases 01 and 02 depend on it)  
**File ownership:** `genai-engine/tests/conftest.py` (modify), `genai-engine/pyproject.toml` (create)

---

## Context Links

- Strategy: `plans/reports/brainstorm-260416-1824-node-testing-strategy.md`
- Current conftest: `genai-engine/tests/conftest.py` (only has `sample_markdown` and `short_text` fixtures)
- Config reference: `genai-engine/app/config.py` (env var names: `LLM_API_KEY`, `WEB_BACKEND_INTERNAL_KEY`)

---

## Overview

Two changes needed before Phases 01 and 02 can be written:

1. **`conftest.py`** — add credential fixtures, node auto-registration, memory cleanup, pytest markers
2. **`pyproject.toml`** — create with `[tool.pytest.ini_options]` markers declaration

Neither change touches any production code. Both are pure test infrastructure.

---

## Requirements

- `pytest -m unit` must run with zero env vars set (all unit tests use mocks)
- `pytest -m integration` must skip gracefully (not fail) when env vars absent
- `import app.flow.nodes` must run once at session scope to register all nodes
- Memory store must be cleared between every test that touches `MemoryNode`
- No new third-party dependencies required (pytest, pytest-flaky available or add to requirements)

---

## Change 1: `genai-engine/tests/conftest.py`

### What to add (append to existing file — preserve `sample_markdown` and `short_text`):

```python
"""
Test configuration and shared fixtures.
"""
from __future__ import annotations

import os

import pytest

# ── existing fixtures (keep) ──────────────────────────────────────────────────

@pytest.fixture
def sample_markdown():
    # ... (unchanged)

@pytest.fixture
def short_text():
    # ... (unchanged)


# ── Node auto-registration (session scope) ────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def _register_all_nodes() -> None:
    """Import app.flow.nodes once per session to trigger all NodeRegistry.register() calls.
    
    Without this, integration tests that use real node types would get
    FlowValidationError: "unknown type" when FlowExecutor tries to resolve them.
    Unit tests in test_nodes.py and test_nodes_new.py already do this per-module,
    but a session-scoped autouse fixture avoids the import in every new test file.
    """
    import app.flow.nodes  # noqa: F401


# ── Memory store cleanup ──────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _clear_memory_store() -> None:
    """Wipe MemoryNode's in-process _store before each test.
    
    Prevents state leakage between tests that call MemoryNode.
    autouse=True so every test gets a clean slate without opting in.
    """
    from app.flow.nodes.memory import _clear_store
    _clear_store()
    yield
    _clear_store()


# ── Credential fixtures (integration tests only) ──────────────────────────────

@pytest.fixture(scope="session")
def vnpt_api_key() -> str:
    """VNPT LLM API key. Tests that need LLM calls must request this fixture.
    
    Skips the test (not fails) when VNPT_API_KEY env var is not set.
    Set via: export VNPT_API_KEY=<token>
    """
    key = os.environ.get("VNPT_API_KEY") or os.environ.get("LLM_API_KEY")
    if not key:
        pytest.skip("VNPT_API_KEY not set — skipping LLM integration test")
    return key


@pytest.fixture(scope="session")
def test_kb_id() -> str:
    """ID of a test knowledge base with documents indexed in local Qdrant.
    
    Skips when TEST_KB_ID env var is not set.
    Set via: export TEST_KB_ID=<uuid>
    """
    kb_id = os.environ.get("TEST_KB_ID")
    if not kb_id:
        pytest.skip("TEST_KB_ID not set — skipping KB integration test")
    return kb_id


@pytest.fixture(scope="session")
def internal_api_key() -> str:
    """NestJS X-Internal-Key for custom tool fetching.
    
    Skips when INTERNAL_API_KEY env var is not set.
    Set via: export INTERNAL_API_KEY=<key>
    Falls back to WEB_BACKEND_INTERNAL_KEY for parity with app/config.py.
    """
    key = os.environ.get("INTERNAL_API_KEY") or os.environ.get("WEB_BACKEND_INTERNAL_KEY")
    if not key:
        pytest.skip("INTERNAL_API_KEY not set — skipping agent+tool integration test")
    return key


@pytest.fixture(scope="session")
def test_custom_tool_id() -> str:
    """ID of a custom tool registered in the NestJS backend for integration testing.
    
    Skips when TEST_CUSTOM_TOOL_ID env var is not set.
    Set via: export TEST_CUSTOM_TOOL_ID=<uuid>
    """
    tool_id = os.environ.get("TEST_CUSTOM_TOOL_ID")
    if not tool_id:
        pytest.skip("TEST_CUSTOM_TOOL_ID not set — skipping agent+tool integration test")
    return tool_id
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| `_register_all_nodes` at `scope="session"` | NodeRegistry is a module-level dict — registering once per session is idempotent and avoids 14× repeated imports |
| `_clear_memory_store` at function scope, `autouse=True` | Each test gets a clean MemoryNode state; session-scope would leak across tests |
| Credential fixtures at `scope="session"` | Env vars don't change mid-run; session scope avoids repeated `os.environ.get` |
| `pytest.skip()` not `pytest.xfail()` | Skip = "not applicable here"; xfail = "expected to fail" — integration tests are not expected failures |
| `LLM_API_KEY` fallback in `vnpt_api_key` | Matches `app/config.py` env var name so dev `.env` files work without renaming |

---

## Change 2: `genai-engine/pyproject.toml` (create)

No `pyproject.toml` exists in `genai-engine/`. Create one with minimal pytest config:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.pytest.ini_options.markers]
# Declare markers to avoid PytestUnknownMarkWarning
# Run unit tests only:        pytest -m unit
# Run integration tests only: pytest -m integration
# Run all tests:               pytest
markers = [
    "unit: Node unit tests — no external dependencies, fast",
    "integration: Flow tests hitting real local services (VNPT, Qdrant, NestJS)",
]
```

**Note:** `asyncio_mode = "auto"` requires `pytest-asyncio`. Check if it's in `requirements.txt`:
- If present: include `asyncio_mode = "auto"` (enables `async def test_*` without decorator)
- If absent: omit it — current tests use `asyncio.run()` wrapper which works without it

The markers block is the critical addition. Without it, `@pytest.mark.unit` and
`@pytest.mark.integration` produce `PytestUnknownMarkWarning` and `--strict-markers` fails.

**Actual pyproject.toml content (minimal, safe without pytest-asyncio assumption):**

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
markers = [
    "unit: Node unit tests — no external dependencies, fast",
    "integration: Flow tests hitting real local services (VNPT, Qdrant, NestJS)",
]
```

---

## Data Flow: Env Vars → Test Fixtures → Tests

```
Environment Variables
  VNPT_API_KEY  ──────────────┐
  LLM_API_KEY   ──────────────┤→  vnpt_api_key fixture  →  test_flow_simple_chat
                               │                           test_flow_simple_rag
  TEST_KB_ID  ────────────────┼→  test_kb_id fixture     →  test_flow_simple_rag
                               │
  INTERNAL_API_KEY ───────────┼→  internal_api_key       →  test_flow_agent_with_tools
  WEB_BACKEND_INTERNAL_KEY ───┘
  TEST_CUSTOM_TOOL_ID ────────→  test_custom_tool_id     →  test_flow_agent_with_tools

  (no env var needed)          →  _register_all_nodes (autouse, session)
  (no env var needed)          →  _clear_memory_store  (autouse, function)
```

---

## Backwards Compatibility

`conftest.py` additions are purely additive — existing `sample_markdown` and `short_text`
fixtures are preserved verbatim. The `autouse=True` fixtures are benign for existing tests:

- `_register_all_nodes`: existing test files already `import app.flow.nodes` at module level,
  so double-registration is a no-op (NodeRegistry silently overwrites with same class)
- `_clear_memory_store`: existing `test_nodes.py` has its own `autouse` `clear_memory_store`
  fixture that calls `_clear_store()`. Running both is idempotent — second clear on an empty
  store is a no-op. **No conflict.**

---

## Checking pytest-flaky availability

Integration tests hitting VNPT LLM benefit from `@pytest.mark.flaky(reruns=2)` for network
flakiness. Check requirements.txt:

```bash
grep "flaky\|pytest-rerunfailures" genai-engine/requirements.txt
```

If absent, either:
- Add `pytest-rerunfailures` to `requirements.txt` (preferred for CI)
- Or omit flaky markers for now and note as tech debt

Do NOT use `pytest-flaky` (different package) — use `pytest-rerunfailures` which provides
`@pytest.mark.flaky(reruns=N)`.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `_register_all_nodes` autouse conflicts with `test_executor.py` which registers test-double nodes then cleans up | Medium | Low | `test_executor.py` fixture runs at function scope; session-scope registration runs earlier; cleanup only removes `start`/`echo`/`condition` keys, real nodes remain |
| `pyproject.toml` `asyncio_mode = "auto"` breaks tests without `pytest-asyncio` | Medium | High | Omit it — all current tests use `asyncio.run()` explicitly |
| Double `_clear_store` call (conftest autouse + test_nodes.py autouse) | Low | None | Idempotent — clearing empty dict is a no-op |
| `scope="session"` for credential fixtures means first skip cancels all downstream tests in session | Low | Low | Each fixture is requested individually per test; pytest skips only the test requesting the missing fixture |

---

## Todo List

- [x] Modify `genai-engine/tests/conftest.py` — add 6 new fixtures (preserve existing 2)
- [x] Create `genai-engine/pyproject.toml` — markers config
- [x] Verify `grep "flaky\|rerunfailures" genai-engine/requirements.txt`
- [x] Run `pytest genai-engine/tests/ --collect-only` — no collection errors, no unknown mark warnings
- [x] Run `pytest -m unit genai-engine/tests/` — tests pass, no env vars needed
- [x] Run `pytest -m integration genai-engine/tests/` without env vars — all skip (not fail)

---

## Success Criteria

- `pytest --collect-only` exits 0 with no `PytestUnknownMarkWarning`
- `pytest -m unit` passes in CI without any env vars
- `pytest -m integration` without env vars: all skip, exit code 0 (or 5 = "no tests ran", both acceptable)
- Existing 40+ tests unbroken
- `conftest.py` diff: only additions, no line modified in existing fixtures

---

## Next Steps

After Phase 03 lands:
- Phase 01 can be implemented (imports shared `_ctx` pattern; uses `_clear_memory_store` autouse)
- Phase 02 can be implemented (uses `vnpt_api_key`, `test_kb_id`, `internal_api_key` fixtures)
