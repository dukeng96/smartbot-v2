# Phase 01 — Unit Test Gaps

**Status:** done  
**Priority:** P1  
**Effort:** 1.5h  
**Blocker:** Phase 03 (conftest markers must exist first)  
**File ownership:** `genai-engine/tests/test_node_gaps.py` (new — no conflicts)

---

## Context Links

- Strategy: `plans/reports/brainstorm-260416-1824-node-testing-strategy.md`
- Existing unit tests: `genai-engine/tests/test_nodes.py`, `genai-engine/tests/test_nodes_new.py`
- Node sources: `genai-engine/app/flow/nodes/`

---

## Overview

Create `genai-engine/tests/test_node_gaps.py` with 12 targeted unit tests that fill
the coverage gaps identified in the brainstorm report. All tests use mocked external
dependencies — zero real network calls, tagged `@pytest.mark.unit`.

---

## Requirements

- No external service dependencies (mock everything external)
- Each test uses the `_ctx()` pattern from `test_nodes.py` (or import from conftest)
- Import `app.flow.nodes` at module top to trigger all `NodeRegistry.register()` calls
- Use `asyncio.run()` pattern consistent with existing tests
- Test names must be descriptive: `test_<node>_<scenario>`

---

## Test Matrix (12 tests)

### HelloNode (0 existing → 2 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_hello_default_name` | `greeting == "Hello, World!"` when no `name` input | none |
| `test_hello_custom_name` | `greeting == "Hello, Alice!"` when `name="Alice"` | none |

**Implementation notes:**
- `HelloNode` resolves `ctx.inputs.get("name", "World")` then formats `f"Hello, {name}!"`
- Default path: `_ctx(inputs={})` → `result["greeting"] == "Hello, World!"`
- Custom path: `_ctx(inputs={"name": "Alice"})` → `result["greeting"] == "Hello, Alice!"`

---

### LlmNode — messages[] array format (0 existing → 2 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_llm_messages_array_input` | Constructs SystemMessage+HumanMessage from `messages[]`, returns assembled text | `ChatOpenAI` astream yields chunks |
| `test_llm_token_counting_via_usage_metadata` | `input_tokens` and `output_tokens` populated from `usage_metadata` on final chunk | `ChatOpenAI` astream, last chunk has `usage_metadata` |

**Implementation notes for `test_llm_messages_array_input`:**
```python
inputs = {
    "messages": [
        {"role": "system", "content": "You are helpful"},
        {"role": "user", "content": "Hello"},
    ],
    "credential_id": "cred1",
    "model": "test-model",
}
credentials = {"cred1": {"api_key": "test-key"}}
```
Patch `ChatOpenAI` so `astream` yields `[_make_chunk("Hi there")]`.  
Assert `result["text"] == "Hi there"` and one `TOKEN` event emitted.  
Assert `LLM_CALL_COMPLETED` event fired.

**Implementation notes for `test_llm_token_counting_via_usage_metadata`:**
```python
# Build a chunk where usage_metadata is a MagicMock with input_tokens / output_tokens
final_chunk = MagicMock()
final_chunk.content = ""
meta = MagicMock()
meta.input_tokens = 10
meta.output_tokens = 25
final_chunk.usage_metadata = meta
```
Yield two chunks: `[_make_chunk("text"), final_chunk]`.  
Assert `result["input_tokens"] == 10` and `result["output_tokens"] == 25`.

---

### AgentNode — memory_enabled=True (0 existing → 2 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_agent_memory_enabled_injects_history` | History from `ctx.state["history"]` prepended to LangChain messages before graph call | `create_react_agent`, `ChatOpenAI` |
| `test_agent_no_tools_no_fetch_called` | When `tools=[]`, `_fetch_tool_def` never called | `create_react_agent`, `ChatOpenAI`, `_fetch_tool_def` |

**Implementation notes for `test_agent_memory_enabled_injects_history`:**
```python
state = {
    "history": [
        {"role": "user", "content": "prev question"},
        {"role": "assistant", "content": "prev answer"},
    ]
}
inputs = {
    "credential_id": "cred1",
    "messages": [{"role": "user", "content": "new question"}],
    "memory_enabled": True,
    "memory_window": 5,
    "tools": [],
}
```
Capture the `messages` passed to `agent_graph.astream({"messages": ...})`.  
Assert captured messages list has ≥3 items (2 history + 1 new).  
Mock `create_react_agent` to return a graph that records its call args and yields one `AIMessage`.

**Implementation notes for `test_agent_no_tools_no_fetch_called`:**
```python
# Use _make_agent_ctx(tool_ids=[]) from test_nodes_new.py pattern
# patch _fetch_tool_def and assert call_count == 0
```

---

### ConditionNode — sandbox error path (0 existing → 1 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_condition_sandbox_error_raises_node_error` | `SandboxError` from `run_code` wrapped as `NodeExecutionError` | `run_code` raises `SandboxError` |

**Implementation notes:**
```python
from app.flow.sandbox import SandboxError

with patch("app.flow.nodes.condition.run_code", side_effect=SandboxError("dangerous")):
    with pytest.raises(NodeExecutionError, match="sandbox error"):
        asyncio.run(ConditionNode().execute(_ctx(inputs={"condition_expr": "x == 1"})))
```

---

### StartNode — flow_state_init config parsing (0 gap; executor tests cover it → 1 direct node test)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_start_returns_both_message_keys` | Output has both `message` and `user_message` keys with same value | none |

**Implementation notes:**  
`StartNode.execute()` returns `{"message": user_message, "user_message": user_message}`.  
Existing tests only assert `user_message` key. This test asserts both keys present and equal:
```python
result = asyncio.run(StartNode().execute(_ctx(inputs={"user_message": "hi"})))
assert result["message"] == "hi"
assert result["user_message"] == "hi"
```

---

### SetVariableNode — cross-node template resolution (0 existing → 1 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_set_variable_cross_node_ref` | `{{nodeId.output}}` syntax resolves via nested state dict | none |

**Implementation notes:**
```python
# State contains a node's output dict (how executor stores results)
state = {"llm_node": {"text": "response text"}}
result = asyncio.run(
    SetVariableNode().execute(_ctx(
        inputs={"key": "summary", "value": "{{llm_node.text}}"},
        state=state,
    ))
)
assert result["value"] == "response text"
```

---

### TextFormatterNode — multi-var and missing var (0 existing → 2 new)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_text_formatter_multi_var_template` | Multiple `{{var}}` placeholders all resolved | none |
| `test_text_formatter_missing_var_returns_empty_string` | Missing state key resolves to `""` (no exception) | none |

**Implementation notes:**
```python
# Multi-var
result = asyncio.run(
    TextFormatterNode().execute(_ctx(
        inputs={"template": "{{greeting}}, {{name}}!"},
        state={"greeting": "Hello", "name": "Bob"},
    ))
)
assert result["text"] == "Hello, Bob!"

# Missing var — resolve_template returns "" for missing keys
result = asyncio.run(
    TextFormatterNode().execute(_ctx(
        inputs={"template": "Value: {{missing_key}}"},
        state={},
    ))
)
assert result["text"] == "Value: "
```

---

### CodeNode — sandbox error propagation (already 1 passing test, add 1 complement)

| Test name | Asserts | Mocks needed |
|-----------|---------|--------------|
| `test_code_result_error_field_raises_node_error` | When `run_code` returns `SandboxResult(error="ZeroDivision...")`, node raises `NodeExecutionError` | `run_code` returns result with `.error` set |

**Implementation notes:**  
Existing `test_code_propagates_sandbox_error` tests `SandboxError` exception path.  
This new test covers the `result.error` non-empty string path:
```python
from app.flow.sandbox import SandboxResult

mock_result = SandboxResult(output={}, stdout="", error="ZeroDivisionError: division by zero")
with patch("app.flow.nodes.code.run_code", return_value=mock_result):
    with pytest.raises(NodeExecutionError, match="execution error"):
        asyncio.run(CodeNode().execute(_ctx(inputs={"code": "x = 1/0"})))
```

---

## Full File Skeleton

```python
"""Unit tests filling node coverage gaps — Layer 1 of testing strategy.

Run: pytest -m unit genai-engine/tests/test_node_gaps.py
"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.flow.nodes  # noqa: F401 — triggers all NodeRegistry.register() calls
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.nodes.agent import AgentNode
from app.flow.nodes.code import CodeNode
from app.flow.nodes.condition import ConditionNode
from app.flow.nodes.hello import HelloNode
from app.flow.nodes.llm import LlmNode
from app.flow.nodes.memory import _clear_store
from app.flow.nodes.set_variable import SetVariableNode
from app.flow.nodes.start import StartNode
from app.flow.nodes.text_formatter import TextFormatterNode
from app.flow.sandbox import SandboxError, SandboxResult
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


pytestmark = pytest.mark.unit


def _ctx(
    inputs: dict[str, Any] = {},
    state: dict[str, Any] = {},
    credentials: dict[str, dict] = {},
    tenant_id: str | None = "tenant-1",
    events: list[ExecutionEvent] | None = None,
) -> NodeExecutionContext:
    _events = events if events is not None else []
    return NodeExecutionContext(
        node_id="test-node",
        inputs=inputs,
        credentials=credentials,
        emit=_events.append,
        state=state,
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id=tenant_id,
    )


@pytest.fixture(autouse=True)
def _clear_memory() -> None:
    _clear_store()


# HelloNode tests (x2)
# LlmNode messages[] tests (x2)
# AgentNode memory_enabled tests (x2)
# ConditionNode sandbox error test (x1)
# StartNode dual-key output test (x1)
# SetVariableNode cross-node ref test (x1)
# TextFormatterNode multi-var + missing-var tests (x2)
# CodeNode result.error path test (x1)
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `create_react_agent` import path changes | Low | Medium | Import from `app.flow.nodes.agent` directly; patch the symbol there |
| `SandboxResult` constructor signature changes | Low | Low | Check `app/flow/sandbox.py` dataclass fields before writing mock |
| Agent memory test — `non_system` message list ordering | Medium | Low | Assert list length ≥ N, not exact order |

---

## Todo List

- [x] Create `genai-engine/tests/test_node_gaps.py`
- [x] Implement HelloNode tests (2)
- [x] Implement LlmNode messages[] tests (2)
- [x] Implement AgentNode memory_enabled + no-tools tests (2)
- [x] Implement ConditionNode sandbox error test (1)
- [x] Implement StartNode dual-key output test (1)
- [x] Implement SetVariableNode cross-node ref test (1)
- [x] Implement TextFormatterNode tests (2)
- [x] Implement CodeNode result.error test (1)
- [x] Run `pytest -m unit genai-engine/tests/test_node_gaps.py` — all 12 pass
- [x] Run full `pytest genai-engine/tests/` — confirm existing tests still green

---

## Success Criteria

- 12 new tests, all tagged `@pytest.mark.unit`, all pass
- Zero calls to external network (no VNPT, no Qdrant, no NestJS)
- `pytest -m unit` exits 0 in CI without any env vars set
- Existing test count unchanged (no deletions)

---

## Next Steps

After Phase 01 passes: run Phase 02 (flow integration tests) against real local services.
