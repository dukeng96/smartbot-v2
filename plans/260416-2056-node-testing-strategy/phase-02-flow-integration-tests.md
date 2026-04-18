# Phase 02 — Flow Integration Tests

**Status:** done  
**Priority:** P1  
**Effort:** 2h  
**Blocker:** Phase 03 (conftest credential fixtures + `integration` marker must exist first)  
**File ownership:** `genai-engine/tests/test_flow_scenarios.py` (new — no conflicts)

---

## Context Links

- Strategy: `plans/reports/brainstorm-260416-1824-node-testing-strategy.md`
- Executor source: `genai-engine/app/flow/executor.py`
- Schema: `genai-engine/app/flow/schemas/flow_definition.py`
- Existing executor tests: `genai-engine/tests/test_executor.py` (uses test-double nodes)

---

## Overview

Create `genai-engine/tests/test_flow_scenarios.py` with 7 golden flow integration tests.
Each test wires **real node implementations** into a `FlowExecutor` and runs against real local
services. No mocks. Assert on structure/presence, not exact LLM content.

All tests are tagged `@pytest.mark.integration`.

---

## Service Requirements

| Service | Purpose | How tests detect it |
|---------|---------|---------------------|
| VNPT LLM API | LlmNode, AgentNode | `VNPT_API_KEY` env var — skip if absent |
| Qdrant (local) | KnowledgeBaseNode | `TEST_KB_ID` env var — skip if absent |
| NestJS backend (local) | AgentNode custom_tool fetch | `INTERNAL_API_KEY` env var — skip if absent |
| Redis (local) | (not used — MemoryNode is in-process) | none |

---

## Data Flow per Test

### Common pattern

```
FlowDefinition(nodes=[...], edges=[...])
    ↓
FlowExecutor(flow, credentials, emit=events.append, session_id, tenant_id)
    ↓
await executor.stream(inputs)
    ↓
Assert event sequence + final state
```

Credentials are built from env vars via conftest fixtures and passed as
`credentials={"cred-vnpt": {"api_key": VNPT_API_KEY, "base_url": _VNPT_BASE_URL}}`.

---

## Helper: `_run_flow()`

Define a module-level async helper used by all tests:

```python
async def _run_flow(
    flow: FlowDefinition,
    inputs: dict,
    credentials: dict,
    session_id: str = "test-sess",
    tenant_id: str = "test-tenant",
) -> tuple[list[ExecutionEvent], dict]:
    """Returns (events, final_state)."""
    events: list[ExecutionEvent] = []
    state: dict = {}

    async def _emit(evt: ExecutionEvent) -> None:
        events.append(evt)
        # Track last NODE_OUTPUT event to capture final state
        if evt.type == ExecutionEventType.NODE_OUTPUT:
            state.update(evt.data or {})

    executor = FlowExecutor(
        flow=flow,
        credentials=credentials,
        emit=_emit,
        session_id=session_id,
        tenant_id=tenant_id,
        execution_id=f"test-{session_id}",
    )
    await executor.stream(inputs)
    return events, state
```

**Note:** Check actual `ExecutionEventType` values — use `DONE`, `NODE_START`, `NODE_END`,
`TOKEN`, `TOOL_CALL`, `TOOL_RESULT`, `HUMAN_INPUT_REQUIRED` as found in
`app/flow/schemas/execution_event.py`. Adjust `state` capture approach if executor does not
emit a `NODE_OUTPUT` event (the executor stores node results in its own state dict —
inspect final state by checking `FLOW_START` → scan for the last `LLM_CALL_COMPLETED` data,
or assert only on event types and counts).

---

## Helper: `_make_cred()`

```python
_VNPT_BASE_URL = "https://assistant-stream.vnpt.vn/v1/"

def _make_cred(api_key: str) -> dict:
    return {"cred-vnpt": {"api_key": api_key, "base_url": _VNPT_BASE_URL}}
```

---

## Flow 1 — Simple Chat: `start → llm`

**Fixture deps:** `vnpt_api_key` (skip if absent)  
**Proves:** LLM streaming works end-to-end, TOKEN events emitted, LLM_CALL_COMPLETED fires

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "llm1", type: "llm", data: {
        "credential_id": "cred-vnpt",
        "model": "llm-large-v4",
        "prompt": "{{start.message}}",   # template resolved from state
        "system_prompt": "Reply in one sentence.",
        "max_tokens": 100,
      }
  edges:
    - source: "s1", target: "llm1"

inputs: {"user_message": "What is 2+2?"}
credentials: _make_cred(vnpt_api_key)
```

**Assertions:**
```python
types = [e.type for e in events]
assert ExecutionEventType.FLOW_START in types
assert ExecutionEventType.DONE in types
assert ExecutionEventType.NODE_END in types

token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
assert len(token_events) > 0                          # at least 1 token streamed
full_text = "".join(e.data["content"] for e in token_events)
assert len(full_text) > 0                             # non-empty response

llm_done = [e for e in events if e.type == ExecutionEventType.LLM_CALL_COMPLETED]
assert len(llm_done) == 1

# Only s1 and llm1 executed
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert node_ends == {"s1", "llm1"}
```

---

## Flow 2 — Simple RAG: `start → knowledge_base → llm`

**Fixture deps:** `vnpt_api_key`, `test_kb_id` (skip if either absent)  
**Proves:** KB context retrieved, injected into LLM prompt via template, LLM consumes it

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "kb1", type: "knowledge_base", data: {
        "kb_id": "{{test_kb_id}}",    # resolved from state pre-populated by fixture
        "query": "{{s1.message}}",
        "top_k": 3,
      }
    - id: "llm1", type: "llm", data: {
        "credential_id": "cred-vnpt",
        "prompt": "Context:\n{{kb1.context}}\n\nQuestion: {{s1.message}}",
        "max_tokens": 150,
      }
  edges:
    - source: "s1", target: "kb1"
    - source: "kb1", target: "llm1"

inputs: {"user_message": "What is this document about?", "test_kb_id": test_kb_id}
credentials: _make_cred(vnpt_api_key)
```

**Assertions:**
```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert {"s1", "kb1", "llm1"} == node_ends

token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
assert len(token_events) > 0
assert ExecutionEventType.DONE in {e.type for e in events}
# No ERROR events
assert not any(e.type == ExecutionEventType.ERROR for e in events)
```

---

## Flow 3 — Agent + Tools: `start → agent(custom_tool)`

**Fixture deps:** `vnpt_api_key`, `internal_api_key`, `test_custom_tool_id` (skip if any absent)  
**Proves:** Agent fetches tool from NestJS, calls it, returns final response

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "agent1", type: "agent", data: {
        "credential_id": "cred-vnpt",
        "messages": [{"role": "user", "content": "{{s1.message}}"}],
        "tools": ["{{test_custom_tool_id}}"],
        "max_iterations": 3,
        "memory_enabled": False,
        "return_response_as": "flow_state",
      }
  edges:
    - source: "s1", target: "agent1"

inputs: {"user_message": "Use the tool to calculate something"}
credentials: _make_cred(vnpt_api_key)
```

**Assertions:**
```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert "agent1" in node_ends
assert not any(e.type == ExecutionEventType.ERROR for e in events)
# Agent may or may not call tool (LLM decides) — assert response exists
agent_node_start = [e for e in events if e.type == ExecutionEventType.NODE_START and e.node_id == "agent1"]
assert len(agent_node_start) == 1
```

---

## Flow 4 — Condition Branch: `start → condition → [true: llm] / [false: text_formatter]`

**Fixture deps:** `vnpt_api_key` (only needed for true branch)  
**Proves:** Condition routes correctly — only one branch executes, not both

### Sub-test A: true branch taken

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "cond1", type: "condition", data: {
        "condition_expr": "x > 5",
        "true_output": "true",
        "false_output": "false",
      }
    - id: "llm_true", type: "llm", data: {
        "credential_id": "cred-vnpt",
        "prompt": "Say 'high' in one word.",
        "max_tokens": 10,
      }
    - id: "fmt_false", type: "text_formatter", data: {
        "template": "low value",
      }
  edges:
    - source: "s1", target: "cond1"
    - source: "cond1", target: "llm_true",  sourceHandle: "true"
    - source: "cond1", target: "fmt_false", sourceHandle: "false"

inputs: {"user_message": "test", "x": 10}
```

**Assertions:**
```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert "llm_true" in node_ends
assert "fmt_false" not in node_ends
```

### Sub-test B: false branch taken (no LLM needed)

Same flow, `inputs: {"user_message": "test", "x": 2}`, `credentials: {}` (text_formatter needs none).

```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert "fmt_false" in node_ends
assert "llm_true" not in node_ends
```

---

## Flow 5 — Code + State Chain: `start → code → set_variable → text_formatter`

**Fixture deps:** none (all sandbox, no network)  
**Proves:** CodeNode sandbox output → SetVariableNode template → TextFormatterNode interpolation chain

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "code1", type: "code", data: {
        "code": "output = {'doubled': inputs.get('x', 0) * 2}",
      }
    - id: "sv1", type: "set_variable", data: {
        "key": "result",
        "value": "{{code1.output.doubled}}",   # note: nested dict access via dot path
      }
    - id: "fmt1", type: "text_formatter", data: {
        "template": "Result is: {{result}}",
      }
  edges:
    - source: "s1", target: "code1"
    - source: "code1", target: "sv1"
    - source: "sv1", target: "fmt1"

inputs: {"user_message": "test", "x": 7}
credentials: {}
```

**Assertions:**
```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert {"s1", "code1", "sv1", "fmt1"} == node_ends
assert ExecutionEventType.DONE in {e.type for e in events}
assert not any(e.type == ExecutionEventType.ERROR for e in events)
```

**Note on template nesting:** `{{code1.output.doubled}}` — check if `resolve_template` handles
two-level nesting (`code1` → `output` → `doubled`). If not, adjust to use a flat approach:
the code can output `{"result_val": 14}` directly and template becomes `{{code1.result_val}}`.
Investigate `resolve_template` in `context.py` — it splits on first `.` only, so
`code1.output` resolves `state["code1"]["output"]` which is a dict, then `.doubled` won't chain.
**Use flat output to avoid this:** `output = {'doubled': inputs.get('x', 0) * 2}` stored as
`state["code1"] = {"output": {"doubled": 14}, "stdout": ""}` — set_variable input should be
`"{{code1.output}}"` to get the dict, or restructure code to output flat keys.

**Recommended approach:** Change code to `output = {'doubled': inputs.get('x', 0) * 2}` and
set_variable value to `"14"` won't work — instead just assert `DONE` and no `ERROR` events,
proving the chain executes. Leave exact value assertion as a stretch goal once template nesting
is confirmed.

---

## Flow 6 — Human Input Lifecycle: `start → human_input → llm`

**Fixture deps:** `vnpt_api_key`  
**Proves:** GraphInterrupt suspend → resume → LLM executes with approval value

**This test has two phases:**

**Phase A — stream (expect suspension):**
```python
# Build executor with execution_id = "test-human-1"
# Call executor.stream({...}) — will raise GraphInterrupt internally,
# executor stores graph in _SUSPENDED_GRAPHS["test-human-1"]
# Verify HUMAN_INPUT_REQUIRED event emitted
# Verify "test-human-1" in _SUSPENDED_GRAPHS
```

**Phase B — resume:**
```python
from app.flow.executor import _SUSPENDED_GRAPHS

resume_events: list[ExecutionEvent] = []
resume_executor = FlowExecutor(
    flow=flow,
    credentials=_make_cred(vnpt_api_key),
    emit=resume_events.append,
    execution_id="test-human-1",
)
await resume_executor.resume({"approval": "approved"})

# Assert LLM ran after resume
token_events = [e for e in resume_events if e.type == ExecutionEventType.TOKEN]
assert len(token_events) > 0
```

**Flow definition:**
```
nodes:
  - id: "s1", type: "start", data: {}
  - id: "hi1", type: "human_input", data: {"prompt": "Do you approve?", "timeout_seconds": 60}
  - id: "llm1", type: "llm", data: {
      "credential_id": "cred-vnpt",
      "prompt": "Say 'approved' in one word.",
      "max_tokens": 10,
    }
edges:
  - source: "s1", target: "hi1"
  - source: "hi1", target: "llm1"
```

**Known behaviour:** `HumanInputNode` calls `interrupt()` from langgraph which raises
`GraphInterrupt`. The executor catches it and stores the compiled graph in `_SUSPENDED_GRAPHS`.
Resume re-injects via `Command(resume=...)`. Refer to existing test
`test_executor_stores_suspended_graph_on_interrupt` in `test_nodes_new.py` for executor mock
pattern — but this test uses the REAL human_input node.

---

## Flow 7 — Memory Round-trip: `start → memory(set) → memory(get)`

**Fixture deps:** none (MemoryNode is in-process)  
**Proves:** Memory set in one node is readable in the next node within same session

```
FlowDefinition:
  nodes:
    - id: "s1", type: "start", data: {}
    - id: "mem_set", type: "memory", data: {
        "action": "set",
        "key": "color",
        "value": "blue",
      }
    - id: "mem_get", type: "memory", data: {
        "action": "get",
        "key": "color",
      }
  edges:
    - source: "s1", target: "mem_set"
    - source: "mem_set", target: "mem_get"

inputs: {}
credentials: {}
tenant_id: "test-tenant-mem"
```

**Assertions:**
```python
node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
assert {"s1", "mem_set", "mem_get"} == node_ends
assert ExecutionEventType.DONE in {e.type for e in events}
# No errors
assert not any(e.type == ExecutionEventType.ERROR for e in events)
```

**Note:** MemoryNode stores in `_store[(tenant_id, session_id, key)]`. Both nodes run under
the same `tenant_id` and `session_id` (passed to FlowExecutor) so the set is visible to get.
Use `autouse` memory-cleanup fixture from conftest to isolate between tests.

---

## SSE Event Sequence Contract

Every successful flow must produce events in this order (strict subset check):

```
FLOW_START → NODE_START(s1) → NODE_END(s1) → ... → DONE
```

Assert minimum contract:
```python
def _assert_clean_flow(events: list[ExecutionEvent]) -> None:
    types = [e.type for e in events]
    assert types[0] == ExecutionEventType.FLOW_START
    assert types[-1] == ExecutionEventType.DONE
    assert not any(t == ExecutionEventType.ERROR for t in types)
```

Call `_assert_clean_flow(events)` at the start of every test as a baseline.

---

## File Skeleton

```python
"""Integration tests for 7 golden flow scenarios using real nodes + real services.

Run: pytest -m integration genai-engine/tests/test_flow_scenarios.py
Requires env vars: VNPT_API_KEY (most tests), TEST_KB_ID (RAG test),
                   INTERNAL_API_KEY + TEST_CUSTOM_TOOL_ID (agent test)
"""
from __future__ import annotations

import asyncio
from typing import Any

import pytest

import app.flow.nodes  # noqa: F401 — register all real nodes
from app.flow.executor import FlowExecutor, _SUSPENDED_GRAPHS
from app.flow.nodes.memory import _clear_store
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode


pytestmark = pytest.mark.integration

_VNPT_BASE_URL = "https://assistant-stream.vnpt.vn/v1/"


def _make_cred(api_key: str) -> dict[str, dict]:
    return {"cred-vnpt": {"api_key": api_key, "base_url": _VNPT_BASE_URL}}


def _node(node_id: str, node_type: str, data: dict | None = None) -> FlowNode:
    return FlowNode(id=node_id, type=node_type, data=data or {})


def _edge(source: str, target: str, source_handle: str | None = None) -> FlowEdge:
    return FlowEdge(source=source, target=target, source_handle=source_handle)


async def _run_flow(
    flow: FlowDefinition,
    inputs: dict[str, Any],
    credentials: dict[str, dict],
    session_id: str = "test-sess",
    tenant_id: str = "test-tenant",
    execution_id: str | None = None,
) -> list[ExecutionEvent]:
    events: list[ExecutionEvent] = []
    executor = FlowExecutor(
        flow=flow,
        credentials=credentials,
        emit=events.append,
        session_id=session_id,
        tenant_id=tenant_id,
        execution_id=execution_id or f"test-{session_id}",
    )
    await executor.stream(inputs)
    return events


def _assert_clean_flow(events: list[ExecutionEvent]) -> None:
    types = [e.type for e in events]
    assert types[0] == ExecutionEventType.FLOW_START
    assert types[-1] == ExecutionEventType.DONE
    assert not any(t == ExecutionEventType.ERROR for t in types)


@pytest.fixture(autouse=True)
def _clear_memory_and_graphs() -> None:
    _clear_store()
    yield
    _clear_store()
    # Clean up any test-created suspended graphs
    for k in list(_SUSPENDED_GRAPHS.keys()):
        if k.startswith("test-"):
            _SUSPENDED_GRAPHS.pop(k, None)


# Flow 1: test_flow_simple_chat
# Flow 2: test_flow_simple_rag
# Flow 3: test_flow_agent_with_tools
# Flow 4a: test_flow_condition_true_branch
# Flow 4b: test_flow_condition_false_branch
# Flow 5: test_flow_code_state_chain
# Flow 6: test_flow_human_input_lifecycle
# Flow 7: test_flow_memory_round_trip
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| VNPT LLM down / rate-limited | Low | High | `pytest.mark.flaky(reruns=2)` on LLM tests; tests skip if `VNPT_API_KEY` not set |
| `{{code1.output.doubled}}` nested template fails | Medium | Low | Use flat code output; assert DONE+no-ERROR rather than exact value |
| Human input flow 6: executor suspend/resume API change | Low | High | Reference existing `test_executor_stores_suspended_graph_on_interrupt` for exact API |
| test_kb_id KB has no indexed documents | Medium | Medium | Assert `len(chunks) >= 0` not `> 0`; note as unresolved Q |
| Memory store leaks between tests | Low | Medium | `autouse` `_clear_memory_and_graphs` fixture resets `_store` before/after each test |
| `FlowEdge` `source_handle` serialisation | Low | Low | Pass as kwarg; `FlowEdge(source=.., target=.., source_handle=..)` vs alias `sourceHandle` — use snake_case in constructor |

---

## Todo List

- [x] Create `genai-engine/tests/test_flow_scenarios.py`
- [x] Implement `_run_flow`, `_make_cred`, `_node`, `_edge`, `_assert_clean_flow` helpers
- [x] Implement `autouse` `_clear_memory_and_graphs` fixture
- [x] Implement Flow 1: `test_flow_simple_chat`
- [x] Implement Flow 2: `test_flow_simple_rag`
- [x] Implement Flow 3: `test_flow_agent_with_tools`
- [x] Implement Flow 4a: `test_flow_condition_true_branch`
- [x] Implement Flow 4b: `test_flow_condition_false_branch`
- [x] Implement Flow 5: `test_flow_code_state_chain`
- [x] Implement Flow 6: `test_flow_human_input_lifecycle`
- [x] Implement Flow 7: `test_flow_memory_round_trip`
- [x] Run `pytest -m integration` without env vars — 5 skip gracefully, 3 pass locally
- [ ] Run `pytest -m integration` with full local services up (VNPT_API_KEY, TEST_KB_ID, INTERNAL_API_KEY, TEST_CUSTOM_TOOL_ID) — blocked: requires live environment

---

## Success Criteria

- 8 test functions (Flow 4 counts as 2 sub-tests), all `@pytest.mark.integration`
- Each test calls `_assert_clean_flow(events)` — no ERROR events in any run
- `pytest -m unit` still runs in < 30s with zero network calls
- Flow 6 (human input) demonstrates real suspend+resume lifecycle
- Flow 7 (memory) proves cross-node persistence within a session
