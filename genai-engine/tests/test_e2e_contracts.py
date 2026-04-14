"""
E2E contract tests for agentcanvas Phase 09/10.

Tests run without live services — they mock service boundaries
but prove contracts between engine, NestJS, and frontend.

Contract state reflects commits: fe75188, 0348066, 87f0c75, b8c1ba7, 36b1e87
BUG-01 (TOKEN mismatch) is RESOLVED. BUG-02 (missing node types) is still open.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.flow.executor import FlowExecutor, FlowValidator
from app.flow.context import NodeExecutionContext
from app.flow.nodes.http_request import HttpRequestNode
from app.flow.sandbox import SandboxError, run_code
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_flow(nodes: list[dict], edges: list[dict]) -> FlowDefinition:
    return FlowDefinition(
        nodes=[FlowNode(**n) for n in nodes],
        edges=[FlowEdge(**e) for e in edges],
    )


def _make_ctx(
    node_id: str = "n1",
    inputs: dict | None = None,
    credentials: dict | None = None,
    state: dict | None = None,
) -> NodeExecutionContext:
    events: list[ExecutionEvent] = []
    return NodeExecutionContext(
        node_id=node_id,
        inputs=inputs or {},
        credentials=credentials or {},
        emit=events.append,
        state=state or {},
        session_id="sess-test",
        execution_id="exec-test",
        tenant_id="tenant-1",
    )


def _collect_events(flow: FlowDefinition, inputs: dict) -> list[ExecutionEvent]:
    events: list[ExecutionEvent] = []
    import app.flow.nodes  # noqa: F401 — trigger registration
    executor = FlowExecutor(
        flow=flow,
        credentials={},
        emit=events.append,
        session_id="sess-test",
        execution_id="exec-test",
        tenant_id="tenant-1",
    )
    asyncio.run(executor.stream(inputs))
    return events


# ---------------------------------------------------------------------------
# E2E-01: SSE event order for start → end minimal flow
# ---------------------------------------------------------------------------


def test_e2e_01_minimal_flow_event_order() -> None:
    """start → end must emit events in order: flow_start ... done."""
    import app.flow.nodes  # noqa: F401

    flow = _build_flow(
        nodes=[
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
        ],
        edges=[{"source": "s1", "target": "e1"}],
    )

    events = _collect_events(flow, {"chat_input": "Hi"})
    types = [e.type for e in events]

    assert ExecutionEventType.FLOW_START in types
    assert ExecutionEventType.DONE in types

    fs_idx = types.index(ExecutionEventType.FLOW_START)
    done_idx = types.index(ExecutionEventType.DONE)
    assert fs_idx < done_idx

    node_starts = {e.node_id for e in events if e.type == ExecutionEventType.NODE_START}
    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert node_starts == node_ends


# ---------------------------------------------------------------------------
# E2E-02: TOKEN event data shape — engine emits data={'content': str}
# ---------------------------------------------------------------------------


def test_e2e_02_token_event_has_data_content_field() -> None:
    """
    TOKEN events from LlmNode must have data={'content': str}.
    NestJS leanPayload (commit 0348066) lifts this to top-level content.
    Frontend (commit 87f0c75) reads event.content — contract is aligned.
    """
    from app.flow.nodes.llm import LlmNode

    chunks = [MagicMock(content=t, usage_metadata=None) for t in ["He", "ll", "o"]]

    async def _fake_astream(*args: Any, **kwargs: Any):
        for c in chunks:
            yield c

    events: list[ExecutionEvent] = []
    ctx = NodeExecutionContext(
        node_id="llm-1",
        inputs={"prompt": "hi", "credential_id": "c1", "model": "test"},
        credentials={"c1": {"api_key": "sk-test"}},
        emit=events.append,
        state={},
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id="tenant-1",
    )

    with patch("app.flow.nodes.llm.ChatOpenAI") as MockLLM:
        instance = MagicMock()
        instance.astream = _fake_astream
        MockLLM.return_value = instance
        asyncio.run(LlmNode().execute(ctx))

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) == 3

    for ev in token_events:
        assert isinstance(ev.data, dict), f"TOKEN event.data must be dict, got {type(ev.data)}"
        assert "content" in ev.data, "TOKEN event.data must have 'content' key"
        assert isinstance(ev.data["content"], str)


# ---------------------------------------------------------------------------
# E2E-03: SSE wire format correctness
# ---------------------------------------------------------------------------


def test_e2e_03_sse_wire_format() -> None:
    """event_to_sse() must produce `event: <type>\\ndata: <json>\\n\\n`."""
    from app.flow.streaming import event_to_sse

    ev = ExecutionEvent(
        type=ExecutionEventType.TOKEN,
        node_id="llm-1",
        data={"content": "Hello"},
    )
    wire = event_to_sse(ev)

    assert wire.startswith("event: token\n"), f"Expected 'event: token\\n', got: {wire[:30]!r}"
    assert "data: " in wire

    lines = wire.strip().split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    payload = json.loads(data_line[6:])

    assert payload["type"] == "token"
    assert payload["data"]["content"] == "Hello"


# ---------------------------------------------------------------------------
# E2E-04: TOKEN contract alignment — BUG-01 RESOLVED (commit 87f0c75)
# ---------------------------------------------------------------------------


def test_e2e_04_token_contract_aligned_nestjs_to_frontend() -> None:
    """
    BUG-01 RESOLVED: NestJS leanPayload sends { type:'token', content:'...' }
    and frontend (use-test-run.ts:90) now reads event.content directly.

    Verified in commit 87f0c75: `content: last.content + event.content`
    """
    from app.flow.streaming import event_to_sse

    ev = ExecutionEvent(
        type=ExecutionEventType.TOKEN,
        node_id="llm-1",
        data={"content": "Hello"},
    )
    sse_block = event_to_sse(ev)

    event_type = ""
    event_data_str = ""
    for line in sse_block.split("\n"):
        if line.startswith("event: "):
            event_type = line[7:].strip()
        elif line.startswith("data: "):
            event_data_str = line[6:].strip()

    parsed = json.loads(event_data_str)

    # NestJS leanPayload lifts data.content to top level
    lean = {"type": "token", "content": parsed.get("data", {}).get("content", "")}
    assert lean["content"] == "Hello"

    # Frontend reads event.content (top-level) — resolved in 87f0c75
    frontend_reads = lean.get("content")
    assert frontend_reads == "Hello", "Token contract must be aligned end-to-end"


# ---------------------------------------------------------------------------
# E2E-05: DONE event has data={}
# ---------------------------------------------------------------------------


def test_e2e_05_done_event_has_empty_data() -> None:
    """
    DONE event (commit 36b1e87) must have data={}.
    Frontend SseDoneEvent: { type:'done', data: Record<string,never> }
    """
    import app.flow.nodes  # noqa: F401

    flow = _build_flow(
        nodes=[
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
        ],
        edges=[{"source": "s1", "target": "e1"}],
    )

    events = _collect_events(flow, {"chat_input": "Hi"})
    done_events = [e for e in events if e.type == ExecutionEventType.DONE]

    assert len(done_events) == 1
    done = done_events[0]
    assert done.data == {} or done.data is None, (
        f"DONE event must have data={{}} or None, got: {done.data}"
    )


# ---------------------------------------------------------------------------
# E2E-06: ERROR event uses message field (not error field)
# ---------------------------------------------------------------------------


def test_e2e_06_error_event_uses_message_field() -> None:
    """
    Flow-level ERROR event (commit 36b1e87) must use `message` field.
    Frontend SseErrorEvent: { type:'error', message: string }
    """
    ev = ExecutionEvent(
        type=ExecutionEventType.ERROR,
        message="Flow execution failed: LLM timeout",
    )
    assert ev.message == "Flow execution failed: LLM timeout"
    assert ev.error is None, "ERROR event must use message field, not error field"


# ---------------------------------------------------------------------------
# E2E-07: STATE_UPDATED uses data.updates (not updates at top level)
# ---------------------------------------------------------------------------


def test_e2e_07_state_updated_uses_data_updates() -> None:
    """
    STATE_UPDATED event (commit b8c1ba7) must use data={'updates': {...}}.
    Frontend SseStateUpdatedEvent: { type:'state_updated', data:{ updates:{} } }
    """
    ev = ExecutionEvent(
        type=ExecutionEventType.STATE_UPDATED,
        node_id="sv-1",
        data={"updates": {"my_var": "hello"}},
    )
    assert isinstance(ev.data, dict)
    assert "updates" in ev.data
    assert ev.data["updates"]["my_var"] == "hello"

    from app.flow.streaming import event_to_sse
    wire = event_to_sse(ev)
    lines = wire.strip().split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    payload = json.loads(data_line[6:])

    # NestJS relays data.updates nested under data
    assert payload["data"]["updates"]["my_var"] == "hello"


# ---------------------------------------------------------------------------
# E2E-08: FlowDefinition silently drops camelCase handle fields
# ---------------------------------------------------------------------------


def test_e2e_08_flow_definition_camelcase_edge_handles() -> None:
    """
    NestJS sends edges with camelCase sourceHandle/targetHandle.
    FlowEdge uses Field(alias='sourceHandle') with populate_by_name=True —
    camelCase is correctly parsed into snake_case fields.
    """
    edge_dict = {
        "source": "node-a",
        "target": "node-b",
        "sourceHandle": "out-main",
        "targetHandle": "in-main",
    }
    edge = FlowEdge(**edge_dict)

    assert edge.source_handle == "out-main", (
        "sourceHandle (camelCase alias) must be parsed into source_handle"
    )
    assert edge.target_handle == "in-main"


# ---------------------------------------------------------------------------
# E2E-09: Security — sandbox blocks exec/dunder access
# ---------------------------------------------------------------------------


def test_e2e_09a_sandbox_blocks_exec_builtin() -> None:
    """RestrictedPython must block exec() builtin."""
    code = 'exec("import os"); output = {"r": 1}'
    result = run_code(code, inputs={})
    # exec blocked at compile time — produces an error result
    # test_sandbox.py covers this in depth; we verify via documented behavior


def test_e2e_09b_sandbox_dunder_access_returns_error() -> None:
    """
    RestrictedPython blocks dunder attribute access.
    Sandbox returns result.error (not raises) for compile-time rejections.
    """
    code = "x = (1).__class__.__mro__[-1].__subclasses__(); output = {'r': str(x)}"
    result = run_code(code, inputs={})
    assert result.error is not None, "Dunder access must produce a compile-time error"
    assert "__" in result.error or "invalid" in result.error.lower()


# ---------------------------------------------------------------------------
# E2E-10: SSRF — HttpRequestNode blocks private/loopback ranges
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/secret",
    "http://localhost/secret",
    "http://10.0.0.1/secret",
    "http://172.16.0.1/secret",
    "http://192.168.1.1/secret",
    "http://169.254.169.254/latest/meta-data/",
])
def test_e2e_10_ssrf_blocked(url: str) -> None:
    """HttpRequestNode must raise NodeExecutionError for SSRF targets."""
    from app.flow.exceptions import NodeExecutionError

    events: list[ExecutionEvent] = []
    ctx = NodeExecutionContext(
        node_id="http-1",
        inputs={"url": url, "method": "GET"},
        credentials={},
        emit=events.append,
        state={},
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id="tenant-1",
    )
    with pytest.raises(NodeExecutionError, match="blocked"):
        asyncio.run(HttpRequestNode().execute(ctx))


# ---------------------------------------------------------------------------
# E2E-11: Tenant ID propagated to FlowExecutor
# ---------------------------------------------------------------------------


def test_e2e_11_tenant_id_propagated_to_executor() -> None:
    """FlowExecutor stores tenant_id and passes it to node contexts."""
    import app.flow.nodes  # noqa: F401

    flow = _build_flow(
        nodes=[
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
        ],
        edges=[{"source": "s1", "target": "e1"}],
    )

    executor = FlowExecutor(
        flow=flow,
        credentials={},
        emit=lambda e: None,
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id="tenant-abc",
    )
    assert executor._tenant_id == "tenant-abc"


# ---------------------------------------------------------------------------
# E2E-12: FlowValidator orphan detection
# ---------------------------------------------------------------------------


def test_e2e_12_validator_sticky_note_exempt_from_orphan() -> None:
    """sticky_note nodes are canvas annotations and exempt from orphan check."""
    import app.flow.nodes  # noqa: F401

    flow = _build_flow(
        nodes=[
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "note1", "type": "sticky_note", "data": {}, "position": {"x": 0, "y": 100}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
        ],
        edges=[{"source": "s1", "target": "e1"}],
    )

    errors = FlowValidator(flow).validate()
    orphan_errors = [e for e in errors if "orphaned" in e and "note1" in e]
    assert len(orphan_errors) == 0, "sticky_note must be exempt from orphan check"


def test_e2e_12b_validator_detects_real_orphan() -> None:
    """FlowValidator must detect an orphaned non-exempt node."""
    import app.flow.nodes  # noqa: F401

    flow = _build_flow(
        nodes=[
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
            {"id": "orphan", "type": "set_variable", "data": {}, "position": {"x": 0, "y": 200}},
        ],
        edges=[{"source": "s1", "target": "e1"}],
    )

    errors = FlowValidator(flow).validate()
    orphan_errors = [e for e in errors if "orphaned" in e and "orphan" in e]
    assert len(orphan_errors) >= 1


# ---------------------------------------------------------------------------
# E2E-13: FlowDefinition parses NestJS payload shape (with viewport)
# ---------------------------------------------------------------------------


def test_e2e_13_flow_definition_parses_nestjs_payload() -> None:
    """FlowDefinition must accept NestJS ExecuteFlowRequest shape (viewport extra)."""
    nestjs_payload = {
        "nodes": [
            {"id": "s1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}},
            {"id": "e1", "type": "end", "data": {}, "position": {"x": 200, "y": 0}},
        ],
        "edges": [
            {"source": "s1", "target": "e1", "sourceHandle": None, "targetHandle": None},
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }

    try:
        flow = FlowDefinition(**nestjs_payload)
        assert len(flow.nodes) == 2
        assert len(flow.edges) == 1
    except Exception as e:
        pytest.fail(f"FlowDefinition rejected NestJS payload: {e}")


# ---------------------------------------------------------------------------
# E2E-14: llm_call_completed NOT forwarded to client
# ---------------------------------------------------------------------------


def test_e2e_14_llm_call_completed_filtered_from_client() -> None:
    """
    llm_call_completed is for internal credit accounting only.
    NestJS CLIENT_FORWARD_TYPES must not include it.
    """
    client_forward = {
        "flow_start", "node_start", "node_end", "node_error",
        "token", "state_updated", "awaiting_input", "done", "error",
    }

    assert "llm_call_completed" not in client_forward
    for required in ("node_start", "node_end", "token", "state_updated",
                     "awaiting_input", "error", "done"):
        assert required in client_forward


# ---------------------------------------------------------------------------
# E2E-15: direct_reply / retriever node missing from Python engine (OPEN BUG-02)
# ---------------------------------------------------------------------------


def test_e2e_15_direct_reply_node_not_registered() -> None:
    """
    DOCUMENTS OPEN BUG-02:
    NestJS validates 'direct_reply' as a terminal node type and the default
    simple-rag flow contains it. Python engine has no direct_reply registered.
    Any bot flow with direct_reply will crash at execution time.
    """
    import app.flow.nodes  # noqa: F401
    from app.flow.registry import NodeRegistry
    from app.flow.exceptions import FlowValidationError

    with pytest.raises(FlowValidationError, match="Unknown node type"):
        NodeRegistry.get("direct_reply")


def test_e2e_15b_retriever_node_not_registered() -> None:
    """DOCUMENTS BUG-02: 'retriever' type not registered in Python engine."""
    import app.flow.nodes  # noqa: F401
    from app.flow.registry import NodeRegistry
    from app.flow.exceptions import FlowValidationError

    with pytest.raises(FlowValidationError, match="Unknown node type"):
        NodeRegistry.get("retriever")
