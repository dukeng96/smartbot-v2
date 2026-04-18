"""E2E tests for AgentNode — mock VNPT LLM, bound custom_tool, SSE events."""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.flow.nodes  # noqa: F401 — triggers NodeRegistry.register()
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.nodes.agent import AgentNode
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CRED_ID = "cred-agent"
CRED_PAYLOAD = {"api_key": "sk-mock", "base_url": "https://mock-llm.vnpt.vn/v1/", "model": "llm-large-v4"}

MOCK_TOOL_DEF = {
    "id": "tool-calc",
    "name": "multiply",
    "description": "Multiplies two numbers",
    "schema": {
        "type": "object",
        "properties": {"a": {"type": "number"}, "b": {"type": "number"}},
        "required": ["a", "b"],
    },
    "implementation": "output = {'product': inputs['a'] * inputs['b']}",
}


def _ctx(
    tool_ids: list[str] | None = None,
    return_as: str = "flow_state",
    max_iterations: int = 3,
    memory_enabled: bool = False,
    events: list[ExecutionEvent] | None = None,
) -> NodeExecutionContext:
    ev = events if events is not None else []
    return NodeExecutionContext(
        node_id="agent-node",
        inputs={
            "credential_id": CRED_ID,
            "model": "llm-large-v4",
            "messages": [{"role": "user", "content": "What is 6 times 7?"}],
            "tools": tool_ids or [],
            "max_iterations": max_iterations,
            "memory_enabled": memory_enabled,
            "return_response_as": return_as,
        },
        credentials={CRED_ID: CRED_PAYLOAD},
        emit=ev.append,
        state={},
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id="tenant-1",
    )


def _make_graph_with_tool_call(tool_name: str = "multiply", args: dict | None = None, final_text: str = "The answer is 42") -> MagicMock:
    from langchain_core.messages import AIMessage, ToolMessage

    args = args or {"a": 6, "b": 7}
    tc_id = "tc-001"
    ai_msg = AIMessage(content="", tool_calls=[{"id": tc_id, "name": tool_name, "args": args, "type": "tool_call"}])
    tool_msg = ToolMessage(content=str(args.get("a", 0) * args.get("b", 0)), tool_call_id=tc_id, name=tool_name, status="success")
    ai_final = AIMessage(content=final_text, tool_calls=[])

    async def _astream(*a: Any, **k: Any) -> Any:
        yield {"agent": {"messages": [ai_msg]}}
        yield {"tools": {"messages": [tool_msg]}}
        yield {"agent": {"messages": [ai_final]}}

    graph = MagicMock()
    graph.astream = _astream
    return graph


# ---------------------------------------------------------------------------
# Test 1: Happy path — tool_call SSE → tool_result SSE → final response
# ---------------------------------------------------------------------------


def test_agent_happy_path_tool_loop_sse_sequence() -> None:
    """Agent emits tool_call → tool_result → response incorporates tool output."""
    events: list[ExecutionEvent] = []
    ctx = _ctx(tool_ids=["tool-calc"], events=events)
    graph = _make_graph_with_tool_call(final_text="6 * 7 = 42")

    with patch("app.flow.nodes.agent.create_react_agent", return_value=graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"), \
         patch("app.flow.nodes.agent._fetch_tool_def", new=AsyncMock(return_value=MOCK_TOOL_DEF)):
        result = asyncio.run(AgentNode().execute(ctx))

    types = [e.type for e in events]
    assert ExecutionEventType.TOOL_CALL in types
    assert ExecutionEventType.TOOL_RESULT in types

    tc = next(e for e in events if e.type == ExecutionEventType.TOOL_CALL)
    assert tc.node_id == "agent-node"
    assert tc.data["tool_name"] == "multiply"
    assert tc.data["tool_input"] == {"a": 6, "b": 7}

    tr = next(e for e in events if e.type == ExecutionEventType.TOOL_RESULT)
    assert tr.node_id == "agent-node"
    assert tr.data["error"] is None

    # tool_call strictly before tool_result
    assert types.index(ExecutionEventType.TOOL_CALL) < types.index(ExecutionEventType.TOOL_RESULT)

    assert result["response"] == "6 * 7 = 42"
    assert isinstance(result["tool_calls"], list)
    assert result["tool_calls"][0]["name"] == "multiply"


# ---------------------------------------------------------------------------
# Test 2: max_iterations hit — recursion_limit clamped to ≤ 31
# ---------------------------------------------------------------------------


def test_agent_max_iterations_capped_at_15() -> None:
    """max_iterations > 15 is hard-clamped; recursion_limit passed to agent graph ≤ 31."""
    captured: list[dict] = []

    async def _astream(*a: Any, **k: Any) -> Any:
        captured.append(k.get("config", {}))
        return
        yield  # make async generator

    graph = MagicMock()
    graph.astream = _astream

    ctx = NodeExecutionContext(
        node_id="agent-node",
        inputs={
            "credential_id": CRED_ID,
            "messages": [{"role": "user", "content": "hi"}],
            "max_iterations": 999,
            "tools": [],
        },
        credentials={CRED_ID: CRED_PAYLOAD},
        emit=lambda e: None,
        state={},
        session_id=None,
        execution_id=None,
    )

    with patch("app.flow.nodes.agent.create_react_agent", return_value=graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        asyncio.run(AgentNode().execute(ctx))

    assert captured, "astream must be called"
    assert captured[0].get("recursion_limit", 999) <= 31, (
        f"recursion_limit must be ≤ 31 (15 iterations * 2 + 1), got {captured[0]}"
    )


# ---------------------------------------------------------------------------
# Test 3: tool raises error — tool_result with error field, NodeExecutionError raised
# ---------------------------------------------------------------------------


def test_agent_tool_error_propagates_in_tool_result_event() -> None:
    """ToolMessage with status='error' → tool_result event has error field set."""
    from langchain_core.messages import AIMessage, ToolMessage

    events: list[ExecutionEvent] = []
    ctx = _ctx(tool_ids=["tool-calc"], events=events)

    tc_id = "tc-err"
    ai_msg = AIMessage(content="", tool_calls=[{"id": tc_id, "name": "multiply", "args": {"a": 1, "b": 2}, "type": "tool_call"}])
    tool_err_msg = ToolMessage(content="Division by zero", tool_call_id=tc_id, name="multiply", status="error")
    ai_final = AIMessage(content="Tool failed.", tool_calls=[])

    async def _astream(*a: Any, **k: Any) -> Any:
        yield {"agent": {"messages": [ai_msg]}}
        yield {"tools": {"messages": [tool_err_msg]}}
        yield {"agent": {"messages": [ai_final]}}

    graph = MagicMock()
    graph.astream = _astream

    with patch("app.flow.nodes.agent.create_react_agent", return_value=graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"), \
         patch("app.flow.nodes.agent._fetch_tool_def", new=AsyncMock(return_value=MOCK_TOOL_DEF)):
        result = asyncio.run(AgentNode().execute(ctx))

    tr_events = [e for e in events if e.type == ExecutionEventType.TOOL_RESULT]
    assert tr_events, "tool_result event must be emitted even when tool errors"
    tr = tr_events[0]
    assert tr.data["error"] is not None, "tool_result.data.error must be set for failed tool call"
    assert tr.data["result"] is None, "tool_result.data.result must be None for failed tool call"


# ---------------------------------------------------------------------------
# Test 4: return_response_as=flow_state — no halt, output in result dict
# ---------------------------------------------------------------------------


def test_agent_return_as_flow_state_does_not_halt() -> None:
    """return_response_as=flow_state: node returns result, ctx.should_halt is False."""
    events: list[ExecutionEvent] = []
    ctx = _ctx(return_as="flow_state", events=events)

    from langchain_core.messages import AIMessage
    ai_final = AIMessage(content="Done.", tool_calls=[])

    async def _astream(*a: Any, **k: Any) -> Any:
        yield {"agent": {"messages": [ai_final]}}

    graph = MagicMock()
    graph.astream = _astream

    with patch("app.flow.nodes.agent.create_react_agent", return_value=graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        result = asyncio.run(AgentNode().execute(ctx))

    assert ctx.should_halt is False
    assert result["response"] == "Done."
    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) == 0, "flow_state mode must not emit TOKEN events"


# ---------------------------------------------------------------------------
# Test 5: return_response_as=assistant_message — halts, TOKEN events emitted
# ---------------------------------------------------------------------------


def test_agent_return_as_assistant_message_emits_tokens_and_halts() -> None:
    """return_response_as=assistant_message: TOKEN events streamed, ctx.halt() called."""
    events: list[ExecutionEvent] = []
    ctx = _ctx(return_as="assistant_message", events=events)

    from langchain_core.messages import AIMessage
    ai_final = AIMessage(content="Hello world!", tool_calls=[])

    async def _astream(*a: Any, **k: Any) -> Any:
        yield {"agent": {"messages": [ai_final]}}

    graph = MagicMock()
    graph.astream = _astream

    with patch("app.flow.nodes.agent.create_react_agent", return_value=graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        result = asyncio.run(AgentNode().execute(ctx))

    assert ctx.should_halt is True, "assistant_message mode must halt after responding"

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) >= 1, "TOKEN events must be emitted in assistant_message mode"

    full_text = "".join(e.data["content"] for e in token_events)
    assert full_text == "Hello world!", f"Concatenated tokens must equal full response, got: {full_text!r}"
    assert result["response"] == "Hello world!"
