"""Unit tests filling node coverage gaps — Layer 1 of testing strategy.

Run: pytest -m unit genai-engine/tests/test_node_gaps.py
"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

import app.flow.nodes  # noqa: F401 — triggers all NodeRegistry.register() calls
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.nodes.agent import AgentNode
from app.flow.nodes.code import CodeNode
from app.flow.nodes.condition import ConditionNode
from app.flow.nodes.hello import HelloNode
from app.flow.nodes.llm import LlmNode
from app.flow.nodes.set_variable import SetVariableNode
from app.flow.nodes.start import StartNode
from app.flow.nodes.text_formatter import TextFormatterNode
from app.flow.sandbox import SandboxError, SandboxResult
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


pytestmark = pytest.mark.unit


# ---------------------------------------------------------------------------
# Context factory (mirrors test_nodes.py pattern)
# ---------------------------------------------------------------------------


def _ctx(
    inputs: dict[str, Any] | None = None,
    state: dict[str, Any] | None = None,
    credentials: dict[str, dict] | None = None,
    tenant_id: str | None = "tenant-1",
    events: list[ExecutionEvent] | None = None,
) -> NodeExecutionContext:
    _events = events if events is not None else []
    return NodeExecutionContext(
        node_id="test-node",
        inputs=inputs or {},
        credentials=credentials or {},
        emit=_events.append,
        state=state or {},
        session_id="sess-1",
        execution_id="exec-1",
        tenant_id=tenant_id,
    )


def _make_chunk(text: str) -> MagicMock:
    """Build a fake LangChain AIMessageChunk with .content and no usage_metadata."""
    chunk = MagicMock()
    chunk.content = text
    chunk.usage_metadata = None
    return chunk


# ---------------------------------------------------------------------------
# HelloNode (2 tests)
# ---------------------------------------------------------------------------


def test_hello_default_name() -> None:
    result = asyncio.run(HelloNode().execute(_ctx()))
    assert result["greeting"] == "Hello, World!"


def test_hello_custom_name() -> None:
    result = asyncio.run(HelloNode().execute(_ctx(inputs={"name": "Alice"})))
    assert result["greeting"] == "Hello, Alice!"


# ---------------------------------------------------------------------------
# LlmNode — messages[] array format (2 tests)
# ---------------------------------------------------------------------------


def test_llm_messages_array_input() -> None:
    """messages[] array path builds SystemMessage + HumanMessage correctly."""
    events: list[ExecutionEvent] = []

    async def _fake_astream(*args: Any, **kwargs: Any):
        yield _make_chunk("Hi there")

    ctx = _ctx(
        inputs={
            "messages": [
                {"role": "system", "content": "You are helpful"},
                {"role": "user", "content": "Hello"},
            ],
            "credential_id": "cred1",
            "model": "test-model",
        },
        credentials={"cred1": {"api_key": "test-key"}},
        events=events,
    )

    with patch("app.flow.nodes.llm.ChatOpenAI") as MockLLM:
        instance = MagicMock()
        instance.astream = _fake_astream
        MockLLM.return_value = instance
        result = asyncio.run(LlmNode().execute(ctx))

    assert result["text"] == "Hi there"

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) == 1
    assert token_events[0].data["content"] == "Hi there"

    llm_done = [e for e in events if e.type == ExecutionEventType.LLM_CALL_COMPLETED]
    assert len(llm_done) == 1


def test_llm_token_counting_via_usage_metadata() -> None:
    """usage_metadata on final chunk populates input_tokens / output_tokens."""
    events: list[ExecutionEvent] = []

    final_chunk = MagicMock()
    final_chunk.content = ""
    meta = MagicMock()
    meta.input_tokens = 10
    meta.output_tokens = 25
    final_chunk.usage_metadata = meta

    async def _fake_astream(*args: Any, **kwargs: Any):
        yield _make_chunk("text")
        yield final_chunk

    ctx = _ctx(
        inputs={
            "prompt": "count tokens",
            "credential_id": "cred1",
            "model": "test-model",
        },
        credentials={"cred1": {"api_key": "test-key"}},
        events=events,
    )

    with patch("app.flow.nodes.llm.ChatOpenAI") as MockLLM:
        instance = MagicMock()
        instance.astream = _fake_astream
        MockLLM.return_value = instance
        result = asyncio.run(LlmNode().execute(ctx))

    assert result["input_tokens"] == 10
    assert result["output_tokens"] == 25


# ---------------------------------------------------------------------------
# AgentNode — memory_enabled + no-tools (2 tests)
# ---------------------------------------------------------------------------


def test_agent_memory_enabled_injects_history() -> None:
    """When memory_enabled=True, history from state is prepended to messages."""
    from langchain_core.messages import AIMessage

    captured_messages: list[Any] = []

    async def _fake_astream(input_dict: dict, **kwargs: Any):
        captured_messages.extend(input_dict.get("messages", []))
        final_msg = AIMessage(content="response", tool_calls=[])
        yield {"agent": {"messages": [final_msg]}}

    mock_graph = MagicMock()
    mock_graph.astream = _fake_astream

    ctx = _ctx(
        inputs={
            "credential_id": "cred1",
            "messages": [{"role": "user", "content": "new question"}],
            "memory_enabled": True,
            "memory_window": 5,
            "tools": [],
        },
        state={
            "history": [
                {"role": "user", "content": "prev question"},
                {"role": "assistant", "content": "prev answer"},
            ],
        },
        credentials={"cred1": {"api_key": "test-key"}},
    )

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"):
        asyncio.run(AgentNode().execute(ctx))

    # 2 history msgs + 1 new msg = 3 non-system messages, history first
    assert len(captured_messages) >= 3
    assert captured_messages[0].content == "prev question"
    assert captured_messages[1].content == "prev answer"
    assert captured_messages[2].content == "new question"


def test_agent_no_tools_no_fetch_called() -> None:
    """When tools=[], _fetch_tool_def should never be called."""
    from langchain_core.messages import AIMessage

    async def _fake_astream(input_dict: dict, **kwargs: Any):
        yield {"agent": {"messages": [AIMessage(content="ok", tool_calls=[])]}}

    mock_graph = MagicMock()
    mock_graph.astream = _fake_astream

    ctx = _ctx(
        inputs={
            "credential_id": "cred1",
            "messages": [{"role": "user", "content": "Hello"}],
            "tools": [],
        },
        credentials={"cred1": {"api_key": "test-key"}},
    )

    with patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph), \
         patch("app.flow.nodes.agent.ChatOpenAI"), \
         patch("app.flow.nodes.agent._fetch_tool_def") as mock_fetch:
        asyncio.run(AgentNode().execute(ctx))

    mock_fetch.assert_not_called()


# ---------------------------------------------------------------------------
# ConditionNode — sandbox error path (1 test)
# ---------------------------------------------------------------------------


def test_condition_sandbox_error_raises_node_error() -> None:
    with patch("app.flow.nodes.condition.run_code", side_effect=SandboxError("dangerous")):
        with pytest.raises(NodeExecutionError, match="sandbox error"):
            asyncio.run(ConditionNode().execute(
                _ctx(inputs={"condition_expr": "x == 1"})
            ))


# ---------------------------------------------------------------------------
# StartNode — dual-key output (1 test)
# ---------------------------------------------------------------------------


def test_start_returns_both_message_keys() -> None:
    result = asyncio.run(StartNode().execute(_ctx(inputs={"user_message": "hi"})))
    assert result["message"] == "hi"
    assert result["user_message"] == "hi"


# ---------------------------------------------------------------------------
# SetVariableNode — cross-node template resolution (1 test)
# ---------------------------------------------------------------------------


def test_set_variable_cross_node_ref() -> None:
    """{{nodeId.outputName}} syntax resolves via nested state dict."""
    result = asyncio.run(
        SetVariableNode().execute(_ctx(
            inputs={"key": "summary", "value": "{{llm_node.text}}"},
            state={"llm_node": {"text": "response text"}},
        ))
    )
    assert result["value"] == "response text"


# ---------------------------------------------------------------------------
# TextFormatterNode — multi-var and missing var (2 tests)
# ---------------------------------------------------------------------------


def test_text_formatter_multi_var_template() -> None:
    result = asyncio.run(
        TextFormatterNode().execute(_ctx(
            inputs={"template": "{{greeting}}, {{name}}!"},
            state={"greeting": "Hello", "name": "Bob"},
        ))
    )
    assert result["text"] == "Hello, Bob!"


def test_text_formatter_missing_var_returns_empty_string() -> None:
    """Missing state key resolves to empty string, no exception."""
    result = asyncio.run(
        TextFormatterNode().execute(_ctx(
            inputs={"template": "Value: {{missing_key}}"},
            state={},
        ))
    )
    assert result["text"] == "Value: "


# ---------------------------------------------------------------------------
# CodeNode — result.error field path (1 test)
# ---------------------------------------------------------------------------


def test_code_result_error_field_raises_node_error() -> None:
    """When run_code returns SandboxResult with .error set, node raises NodeExecutionError."""
    mock_result = SandboxResult(output={}, stdout="", error="ZeroDivisionError: division by zero")
    with patch("app.flow.nodes.code.run_code", return_value=mock_result):
        with pytest.raises(NodeExecutionError, match="execution error"):
            asyncio.run(CodeNode().execute(_ctx(inputs={"code": "x = 1/0"})))
