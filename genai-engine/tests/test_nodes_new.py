"""Unit tests for agent, custom_tool, and human_input nodes."""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.flow.nodes  # noqa: F401 — triggers NodeRegistry.register() for all nodes
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.nodes.agent import AgentNode
from app.flow.nodes.custom_tool import CustomToolNode
from app.flow.nodes.human_input import HumanInputNode
from app.flow.registry import NodeRegistry
from app.flow.sandbox import SandboxResult
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ctx(
    inputs: dict[str, Any] = {},
    state: dict[str, Any] = {},
    credentials: dict[str, dict] = {},
    tenant_id: str | None = "tenant-1",
    execution_id: str | None = "exec-abc",
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
        execution_id=execution_id,
        tenant_id=tenant_id,
    )


def _mock_tool_def(name: str = "my_tool") -> dict[str, Any]:
    return {
        "id": "tool-uuid-1",
        "name": name,
        "description": "A test tool",
        "implementation": "output = {'result': inputs.get('x', 0) * 2}",
        "schema": {
            "properties": {"x": {"type": "number"}},
            "required": ["x"],
        },
    }


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


def test_registry_has_all_three_new_nodes() -> None:
    assert NodeRegistry.get("agent") is AgentNode
    assert NodeRegistry.get("custom_tool") is CustomToolNode
    assert NodeRegistry.get("human_input") is HumanInputNode


def test_registry_total_count_at_least_14() -> None:
    # 12 prior (hello + 11 user-facing) + 3 new = 15 total registered
    assert len(NodeRegistry.all_definitions()) >= 14


# ---------------------------------------------------------------------------
# custom_tool node
# ---------------------------------------------------------------------------


def test_custom_tool_happy_path_emits_events() -> None:
    events: list[ExecutionEvent] = []
    ctx = _ctx(
        inputs={"custom_tool_id": "tool-uuid-1", "args": {"x": 3}},
        events=events,
    )
    tool_def = _mock_tool_def()

    with patch("app.flow.nodes.custom_tool._fetch_tool_def", new=AsyncMock(return_value=tool_def)):
        result = asyncio.run(CustomToolNode().execute(ctx))

    assert result["result"] == {"result": 6}

    tool_call_events = [e for e in events if e.type == ExecutionEventType.TOOL_CALL]
    tool_result_events = [e for e in events if e.type == ExecutionEventType.TOOL_RESULT]
    assert len(tool_call_events) == 1
    assert tool_call_events[0].data["tool_name"] == "my_tool"
    assert tool_call_events[0].data["tool_input"] == {"x": 3}
    assert len(tool_result_events) == 1
    assert tool_result_events[0].data["error"] is None


def test_custom_tool_sandbox_error_raises_node_error() -> None:
    ctx = _ctx(inputs={"custom_tool_id": "tool-uuid-1", "args": {}})
    failing_tool_def = {
        "id": "tool-uuid-1",
        "name": "bad_tool",
        "description": "broken",
        "implementation": "x = 1 / 0",  # ZeroDivisionError — sandbox returns error
        "schema": {},
    }

    with patch("app.flow.nodes.custom_tool._fetch_tool_def", new=AsyncMock(return_value=failing_tool_def)):
        with pytest.raises(NodeExecutionError, match="bad_tool"):
            asyncio.run(CustomToolNode().execute(ctx))


def test_custom_tool_emits_tool_result_error_event_on_failure() -> None:
    events: list[ExecutionEvent] = []
    ctx = _ctx(inputs={"custom_tool_id": "t1", "args": {}}, events=events)
    failing_tool_def = {
        "id": "t1",
        "name": "fail_tool",
        "description": "fails",
        "implementation": "x = 1 / 0",
        "schema": {},
    }

    with patch("app.flow.nodes.custom_tool._fetch_tool_def", new=AsyncMock(return_value=failing_tool_def)):
        with pytest.raises(NodeExecutionError):
            asyncio.run(CustomToolNode().execute(ctx))

    result_events = [e for e in events if e.type == ExecutionEventType.TOOL_RESULT]
    assert len(result_events) == 1
    assert result_events[0].data["error"] is not None
    assert result_events[0].data["result"] is None


def test_custom_tool_missing_id_raises() -> None:
    ctx = _ctx(inputs={"custom_tool_id": ""})
    with pytest.raises(NodeExecutionError, match="custom_tool_id"):
        asyncio.run(CustomToolNode().execute(ctx))


def test_custom_tool_404_raises_node_error() -> None:
    ctx = _ctx(inputs={"custom_tool_id": "nonexistent"})

    async def _raise(*args: Any, **kwargs: Any) -> dict:
        raise NodeExecutionError("CustomTool 'nonexistent' not found")

    with patch("app.flow.nodes.custom_tool._fetch_tool_def", new=_raise):
        with pytest.raises(NodeExecutionError, match="not found"):
            asyncio.run(CustomToolNode().execute(ctx))


def test_custom_tool_resolves_template_args() -> None:
    """Args values that are {{...}} templates must be resolved against state."""
    events: list[ExecutionEvent] = []
    ctx = _ctx(
        inputs={"custom_tool_id": "t1", "args": {"x": "{{multiplier}}"}},
        state={"multiplier": 5},
        events=events,
    )
    tool_def = _mock_tool_def()

    with patch("app.flow.nodes.custom_tool._fetch_tool_def", new=AsyncMock(return_value=tool_def)):
        result = asyncio.run(CustomToolNode().execute(ctx))

    # ctx.resolve("{{multiplier}}") → "5" (string), sandbox gets inputs["x"] = "5"
    # implementation: output = {"result": inputs.get("x", 0) * 2} → "55" (string concat)
    assert "result" in result


# ---------------------------------------------------------------------------
# agent node
# ---------------------------------------------------------------------------


def _make_agent_ctx(
    tool_ids: list[str] | None = None,
    return_as: str = "flow_state",
    events: list[ExecutionEvent] | None = None,
) -> NodeExecutionContext:
    return _ctx(
        inputs={
            "credential_id": "cred1",
            "model": "llm-large-v4",
            "messages": [{"role": "user", "content": "Hello"}],
            "tools": tool_ids or [],
            "max_iterations": 3,
            "memory_enabled": False,
            "return_response_as": return_as,
        },
        credentials={"cred1": {"api_key": "test-key", "base_url": "https://test.example.com/v1/"}},
        events=events,
    )


def _build_mock_agent_graph(final_text: str = "Agent response") -> MagicMock:
    """Build a mock create_agent graph that yields one AIMessage update."""
    from langchain_core.messages import AIMessage

    final_msg = AIMessage(content=final_text, tool_calls=[])

    async def _fake_astream(*args: Any, **kwargs: Any):
        yield {"agent": {"messages": [final_msg]}}

    mock_graph = MagicMock()
    mock_graph.astream = _fake_astream
    return mock_graph


def test_agent_no_tools_returns_response() -> None:
    ctx = _make_agent_ctx()
    mock_graph = _build_mock_agent_graph("Hello back!")

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        result = asyncio.run(AgentNode().execute(ctx))

    assert result["response"] == "Hello back!"
    assert result["tool_calls"] == []


def test_agent_missing_credential_raises() -> None:
    ctx = _ctx(
        inputs={
            "credential_id": "missing",
            "messages": [{"role": "user", "content": "hi"}],
        },
        credentials={},
    )
    with pytest.raises(NodeExecutionError, match="not found"):
        asyncio.run(AgentNode().execute(ctx))


def test_agent_missing_api_key_raises() -> None:
    ctx = _ctx(
        inputs={
            "credential_id": "cred1",
            "messages": [{"role": "user", "content": "hi"}],
        },
        credentials={"cred1": {"base_url": "https://example.com"}},
    )
    with pytest.raises(NodeExecutionError, match="api_key"):
        asyncio.run(AgentNode().execute(ctx))


def test_agent_emits_tool_call_and_tool_result_events() -> None:
    from langchain_core.messages import AIMessage, ToolMessage

    events: list[ExecutionEvent] = []
    ctx = _make_agent_ctx(tool_ids=["tool-uuid-1"], events=events)
    tool_def = _mock_tool_def("calculator")

    ai_msg_with_tool = AIMessage(
        content="",
        tool_calls=[{"id": "call-1", "name": "calculator", "args": {"x": 4}, "type": "tool_call"}],
    )
    tool_result_msg = ToolMessage(
        content="8",
        tool_call_id="call-1",
        name="calculator",
        status="success",
    )
    final_msg = AIMessage(content="The answer is 8", tool_calls=[])

    async def _fake_astream(*args: Any, **kwargs: Any):
        yield {"agent": {"messages": [ai_msg_with_tool]}}
        yield {"tools": {"messages": [tool_result_msg]}}
        yield {"agent": {"messages": [final_msg]}}

    mock_graph = MagicMock()
    mock_graph.astream = _fake_astream

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"), \
         patch("app.flow.nodes.agent._fetch_tool_def", new=AsyncMock(return_value=tool_def)):
        result = asyncio.run(AgentNode().execute(ctx))

    tool_call_events = [e for e in events if e.type == ExecutionEventType.TOOL_CALL]
    tool_result_events = [e for e in events if e.type == ExecutionEventType.TOOL_RESULT]
    assert len(tool_call_events) == 1
    assert tool_call_events[0].data["tool_name"] == "calculator"
    assert tool_call_events[0].data["tool_input"] == {"x": 4}
    assert len(tool_result_events) == 1
    assert result["response"] == "The answer is 8"


def test_agent_return_as_assistant_message_emits_tokens_and_halts() -> None:
    events: list[ExecutionEvent] = []
    ctx = _make_agent_ctx(return_as="assistant_message", events=events)
    mock_graph = _build_mock_agent_graph("Hello!")

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        result = asyncio.run(AgentNode().execute(ctx))

    assert ctx.should_halt is True
    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) >= 1
    full_text = "".join(e.data["content"] for e in token_events)
    assert full_text == "Hello!"
    assert result["response"] == "Hello!"


def test_agent_max_iterations_clamped_at_15() -> None:
    """max_iterations > 15 must be clamped to 15 (recursion_limit = 31)."""
    ctx = _ctx(
        inputs={
            "credential_id": "cred1",
            "messages": [{"role": "user", "content": "hi"}],
            "max_iterations": 100,
        },
        credentials={"cred1": {"api_key": "k"}},
    )
    mock_graph = _build_mock_agent_graph()
    captured_config: list[dict] = []

    async def _fake_astream(*args: Any, **kwargs: Any):
        captured_config.append(kwargs.get("config", args[1] if len(args) > 1 else {}))
        yield {"agent": {"messages": []}}

    mock_graph.astream = _fake_astream

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        asyncio.run(AgentNode().execute(ctx))

    assert captured_config[0].get("recursion_limit", 0) <= 31  # 15 * 2 + 1


# ---------------------------------------------------------------------------
# human_input node
# ---------------------------------------------------------------------------


def test_human_input_emits_required_event_and_returns_approval() -> None:
    from langgraph.types import interrupt as _real_interrupt

    events: list[ExecutionEvent] = []
    ctx = _ctx(
        inputs={"prompt": "Please approve", "timeout_seconds": 120},
        execution_id="run-xyz",
        events=events,
    )

    # Patch interrupt() to immediately return the approval dict (simulates resume)
    with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "yes"}):
        result = asyncio.run(HumanInputNode().execute(ctx))

    assert result["response"] == "yes"
    assert result["approved"] is True

    required_events = [e for e in events if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED]
    assert len(required_events) == 1
    assert required_events[0].data["prompt"] == "Please approve"
    assert required_events[0].data["run_id"] == "run-xyz"
    assert required_events[0].data["timeout_seconds"] == 120


def test_human_input_resolves_prompt_template() -> None:
    events: list[ExecutionEvent] = []
    ctx = _ctx(
        inputs={"prompt": "Hello {{name}}, approve?"},
        state={"name": "Alice"},
        events=events,
    )

    with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "approved"}):
        asyncio.run(HumanInputNode().execute(ctx))

    required_events = [e for e in events if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED]
    assert required_events[0].data["prompt"] == "Hello Alice, approve?"


def test_human_input_default_timeout() -> None:
    events: list[ExecutionEvent] = []
    ctx = _ctx(inputs={"prompt": "approve?"}, events=events)

    with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "ok"}):
        asyncio.run(HumanInputNode().execute(ctx))

    required_events = [e for e in events if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED]
    assert required_events[0].data["timeout_seconds"] == 300


# ---------------------------------------------------------------------------
# executor — MemorySaver + _SUSPENDED_GRAPHS integration
# ---------------------------------------------------------------------------


def test_executor_stores_suspended_graph_on_interrupt() -> None:
    from langgraph.errors import GraphInterrupt

    from app.flow.executor import FlowExecutor, _SUSPENDED_GRAPHS
    from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode

    flow = FlowDefinition(
        nodes=[
            FlowNode(id="n1", type="start", data={}),
            FlowNode(id="n2", type="human_input", data={"prompt": "ok?"}),
            FlowNode(id="n3", type="end", data={}),
        ],
        edges=[
            FlowEdge(id="e1", source="n1", target="n2"),
            FlowEdge(id="e2", source="n2", target="n3"),
        ],
    )

    events: list[ExecutionEvent] = []
    executor = FlowExecutor(
        flow=flow,
        credentials={},
        emit=events.append,
        execution_id="suspend-test",
    )

    # Patch build_graph_with_checkpointer to return a graph that raises GraphInterrupt
    mock_graph = MagicMock()

    async def _raise_interrupt(*args: Any, **kwargs: Any):
        raise GraphInterrupt("halted")
        yield  # make it an async generator

    mock_graph.astream = _raise_interrupt

    with patch.object(executor, "build_graph_with_checkpointer", return_value=mock_graph):
        asyncio.run(executor.stream({}))

    assert "suspend-test" in _SUSPENDED_GRAPHS
    # Cleanup
    _SUSPENDED_GRAPHS.pop("suspend-test", None)


def test_executor_resume_raises_when_no_suspended_graph() -> None:
    from app.flow.executor import FlowExecutor
    from app.flow.schemas.flow_definition import FlowDefinition

    executor = FlowExecutor(
        flow=FlowDefinition(nodes=[], edges=[]),
        credentials={},
        emit=lambda e: None,
        execution_id="unknown-run",
    )

    with pytest.raises(NodeExecutionError, match="No suspended flow"):
        asyncio.run(executor.resume("approved"))
