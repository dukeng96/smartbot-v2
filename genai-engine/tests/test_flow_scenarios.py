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
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode


pytestmark = pytest.mark.integration

_VNPT_BASE_URL = "https://assistant-stream.vnpt.vn/v1/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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
    """Every successful flow must start with FLOW_START and end with DONE, no ERROR."""
    assert len(events) >= 2, f"Expected at least FLOW_START + DONE, got {len(events)} events"
    types = [e.type for e in events]
    assert types[0] == ExecutionEventType.FLOW_START
    assert types[-1] == ExecutionEventType.DONE
    assert not any(t == ExecutionEventType.ERROR for t in types)


@pytest.fixture(autouse=True)
def _ensure_nodes_registered():
    """Re-register real nodes that test_executor.py's cleanup may have popped.

    test_executor.py pops 'start' and 'condition' from NodeRegistry._nodes
    after each of its tests. If those tests run before ours in the same
    session, the real node classes are still loaded in sys.modules but
    absent from the registry. Re-registering them is idempotent.
    """
    from app.flow.nodes.start import StartNode
    from app.flow.nodes.condition import ConditionNode
    from app.flow.registry import NodeRegistry

    NodeRegistry.register(StartNode)
    NodeRegistry.register(ConditionNode)


@pytest.fixture(autouse=True)
def _clear_suspended_graphs():
    """Clean up test-created suspended graphs after each test.

    Memory store cleanup is handled by conftest._clear_memory_store (autouse).
    """
    yield
    for k in list(_SUSPENDED_GRAPHS.keys()):
        if k.startswith("test-"):
            _SUSPENDED_GRAPHS.pop(k, None)


# ---------------------------------------------------------------------------
# Flow 1: Simple Chat — start → llm
# ---------------------------------------------------------------------------


def test_flow_simple_chat(vnpt_api_key: str) -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("llm1", "llm", {
                "credential_id": "cred-vnpt",
                "model": "llm-large-v4",
                "prompt": "{{start.message}}",
                "system_prompt": "Reply in one sentence.",
                "max_tokens": 100,
            }),
        ],
        edges=[_edge("s1", "llm1")],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "What is 2+2?"},
        credentials=_make_cred(vnpt_api_key),
    ))

    _assert_clean_flow(events)

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) > 0
    full_text = "".join(e.data["content"] for e in token_events)
    assert len(full_text) > 0

    llm_done = [e for e in events if e.type == ExecutionEventType.LLM_CALL_COMPLETED]
    assert len(llm_done) == 1

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert node_ends == {"s1", "llm1"}


# ---------------------------------------------------------------------------
# Flow 2: Simple RAG — start → knowledge_base → llm
# ---------------------------------------------------------------------------


def test_flow_simple_rag(vnpt_api_key: str, test_kb_id: str) -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("kb1", "knowledge_base", {
                "kb_id": test_kb_id,
                "query": "{{start.message}}",
                "top_k": 3,
            }),
            _node("llm1", "llm", {
                "credential_id": "cred-vnpt",
                "prompt": "Context:\n{{knowledge_base.context}}\n\nQuestion: {{start.message}}",
                "max_tokens": 150,
            }),
        ],
        edges=[_edge("s1", "kb1"), _edge("kb1", "llm1")],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "What is this document about?"},
        credentials=_make_cred(vnpt_api_key),
    ))

    _assert_clean_flow(events)

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert {"s1", "kb1", "llm1"} == node_ends

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) > 0


# ---------------------------------------------------------------------------
# Flow 3: Agent + Tools — start → agent(custom_tool)
# ---------------------------------------------------------------------------


def test_flow_agent_with_tools(
    vnpt_api_key: str, internal_api_key: str, test_custom_tool_id: str,
) -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("agent1", "agent", {
                "credential_id": "cred-vnpt",
                "messages": [{"role": "user", "content": "{{start.message}}"}],
                "tools": [test_custom_tool_id],
                "max_iterations": 3,
                "memory_enabled": False,
                "return_response_as": "flow_state",
            }),
        ],
        edges=[_edge("s1", "agent1")],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "Use the tool to calculate something"},
        credentials=_make_cred(vnpt_api_key),
    ))

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert "agent1" in node_ends
    assert not any(e.type == ExecutionEventType.ERROR for e in events)

    agent_starts = [
        e for e in events
        if e.type == ExecutionEventType.NODE_START and e.node_id == "agent1"
    ]
    assert len(agent_starts) == 1


# ---------------------------------------------------------------------------
# Flow 4a: Condition — true branch taken
# ---------------------------------------------------------------------------


def test_flow_condition_true_branch(vnpt_api_key: str) -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("cond1", "condition", {
                "condition_expr": "x > 5",
                "true_output": "true",
                "false_output": "false",
            }),
            _node("llm_true", "llm", {
                "credential_id": "cred-vnpt",
                "prompt": "Say 'high' in one word.",
                "max_tokens": 10,
            }),
            _node("fmt_false", "text_formatter", {"template": "low value"}),
        ],
        edges=[
            _edge("s1", "cond1"),
            _edge("cond1", "llm_true", source_handle="true"),
            _edge("cond1", "fmt_false", source_handle="false"),
        ],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "test", "x": 10},
        credentials=_make_cred(vnpt_api_key),
    ))

    _assert_clean_flow(events)

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert "llm_true" in node_ends
    assert "fmt_false" not in node_ends


# ---------------------------------------------------------------------------
# Flow 4b: Condition — false branch taken (no LLM needed)
# ---------------------------------------------------------------------------


def test_flow_condition_false_branch() -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("cond1", "condition", {
                "condition_expr": "x > 5",
                "true_output": "true",
                "false_output": "false",
            }),
            _node("llm_true", "llm", {
                "credential_id": "cred-vnpt",
                "prompt": "Say 'high'.",
                "max_tokens": 10,
            }),
            _node("fmt_false", "text_formatter", {"template": "low value"}),
        ],
        edges=[
            _edge("s1", "cond1"),
            _edge("cond1", "llm_true", source_handle="true"),
            _edge("cond1", "fmt_false", source_handle="false"),
        ],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "test", "x": 2},
        credentials={},
    ))

    _assert_clean_flow(events)

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert "fmt_false" in node_ends
    assert "llm_true" not in node_ends


# ---------------------------------------------------------------------------
# Flow 5: Code + State Chain — start → code → set_variable → text_formatter
# ---------------------------------------------------------------------------


def test_flow_code_state_chain() -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("code1", "code", {
                "code": "output = {'doubled': inputs.get('x', 0) * 2}",
            }),
            _node("sv1", "set_variable", {
                "key": "result_val",
                "value": "{{code1.doubled}}",
            }),
            _node("fmt1", "text_formatter", {
                "template": "Result is: {{result_val}}",
            }),
        ],
        edges=[
            _edge("s1", "code1"),
            _edge("code1", "sv1"),
            _edge("sv1", "fmt1"),
        ],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "test", "x": 7},
        credentials={},
    ))

    _assert_clean_flow(events)

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert {"s1", "code1", "sv1", "fmt1"} == node_ends


# ---------------------------------------------------------------------------
# Flow 6: Human Input Lifecycle — start → human_input → llm
# ---------------------------------------------------------------------------


def test_flow_human_input_lifecycle(vnpt_api_key: str) -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("hi1", "human_input", {"prompt": "Do you approve?", "timeout_seconds": 60}),
            _node("llm1", "llm", {
                "credential_id": "cred-vnpt",
                "prompt": "Say 'approved' in one word.",
                "max_tokens": 10,
            }),
        ],
        edges=[_edge("s1", "hi1"), _edge("hi1", "llm1")],
    )

    exec_id = "test-human-1"

    # Phase A: stream — expect suspension at human_input
    phase_a_events: list[ExecutionEvent] = []
    executor = FlowExecutor(
        flow=flow,
        credentials=_make_cred(vnpt_api_key),
        emit=phase_a_events.append,
        session_id="sess-human",
        tenant_id="test-tenant",
        execution_id=exec_id,
    )
    asyncio.run(executor.stream({"user_message": "test"}))

    # Should have emitted HUMAN_INPUT_REQUIRED
    required_events = [
        e for e in phase_a_events
        if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED
    ]
    assert len(required_events) == 1
    assert exec_id in _SUSPENDED_GRAPHS

    # Phase B: resume with approval
    resume_events: list[ExecutionEvent] = []
    resume_executor = FlowExecutor(
        flow=flow,
        credentials=_make_cred(vnpt_api_key),
        emit=resume_events.append,
        session_id="sess-human",
        tenant_id="test-tenant",
        execution_id=exec_id,
    )
    asyncio.run(resume_executor.resume("approved"))

    # LLM should have run after resume
    token_events = [e for e in resume_events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) > 0
    assert ExecutionEventType.DONE in {e.type for e in resume_events}


# ---------------------------------------------------------------------------
# Flow 7: Memory Round-trip — start → memory(set) → memory(get)
# ---------------------------------------------------------------------------


def test_flow_memory_round_trip() -> None:
    flow = FlowDefinition(
        nodes=[
            _node("s1", "start"),
            _node("mem_set", "memory", {
                "action": "set",
                "key": "color",
                "value": "blue",
            }),
            _node("mem_get", "memory", {
                "action": "get",
                "key": "color",
            }),
        ],
        edges=[_edge("s1", "mem_set"), _edge("mem_set", "mem_get")],
    )

    events = asyncio.run(_run_flow(
        flow,
        inputs={"user_message": "test"},
        credentials={},
        tenant_id="test-tenant-mem",
    ))

    _assert_clean_flow(events)

    node_ends = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
    assert {"s1", "mem_set", "mem_get"} == node_ends
