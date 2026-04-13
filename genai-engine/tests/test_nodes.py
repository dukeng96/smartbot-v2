"""Unit tests for all 11 node types."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.flow.nodes  # noqa: F401 — triggers all NodeRegistry.register() calls
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.nodes.condition import ConditionNode, _MAX_EXPR_LEN
from app.flow.nodes.code import CodeNode
from app.flow.nodes.end import EndNode
from app.flow.nodes.http_request import HttpRequestNode, _check_ssrf
from app.flow.nodes.knowledge_base import KnowledgeBaseNode
from app.flow.nodes.llm import LlmNode
from app.flow.nodes.memory import MemoryNode, _clear_store
from app.flow.nodes.set_variable import SetVariableNode
from app.flow.nodes.start import StartNode
from app.flow.nodes.sticky_note import StickyNoteNode
from app.flow.nodes.text_formatter import TextFormatterNode
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


# ---------------------------------------------------------------------------
# Test context factory
# ---------------------------------------------------------------------------


def _ctx(
    inputs: dict[str, Any] = {},
    state: dict[str, Any] = {},
    credentials: dict[str, dict] = {},
    session_id: str | None = "sess-1",
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
        session_id=session_id,
        execution_id="exec-1",
        tenant_id=tenant_id,
    )


# ---------------------------------------------------------------------------
# StartNode
# ---------------------------------------------------------------------------


def test_start_passes_user_message() -> None:
    result = asyncio.run(StartNode().execute(_ctx(inputs={"user_message": "hello"})))
    assert result["user_message"] == "hello"


def test_start_falls_back_to_state() -> None:
    result = asyncio.run(StartNode().execute(_ctx(state={"user_message": "from_state"})))
    assert result["user_message"] == "from_state"


# ---------------------------------------------------------------------------
# EndNode
# ---------------------------------------------------------------------------


def test_end_returns_output_and_halts() -> None:
    ctx = _ctx(inputs={"output_text": "done"})
    result = asyncio.run(EndNode().execute(ctx))
    assert result["output_text"] == "done"
    assert ctx.should_halt


# ---------------------------------------------------------------------------
# StickyNoteNode
# ---------------------------------------------------------------------------


def test_sticky_note_returns_empty() -> None:
    result = asyncio.run(StickyNoteNode().execute(_ctx()))
    assert result == {}


# ---------------------------------------------------------------------------
# SetVariableNode
# ---------------------------------------------------------------------------


def test_set_variable_resolves_template() -> None:
    result = asyncio.run(
        SetVariableNode().execute(_ctx(
            inputs={"key": "greeting", "value": "{{msg}}"},
            state={"msg": "hi"},
        ))
    )
    assert result == {"key": "greeting", "value": "hi"}


# ---------------------------------------------------------------------------
# TextFormatterNode
# ---------------------------------------------------------------------------


def test_text_formatter_interpolates() -> None:
    result = asyncio.run(
        TextFormatterNode().execute(_ctx(
            inputs={"template": "Hello {{name}}!"},
            state={"name": "World"},
        ))
    )
    assert result["text"] == "Hello World!"


# ---------------------------------------------------------------------------
# CodeNode
# ---------------------------------------------------------------------------


def test_code_happy_path() -> None:
    result = asyncio.run(
        CodeNode().execute(_ctx(
            inputs={"code": "output = {'doubled': x * 2}"},
            state={"x": 5},
        ))
    )
    assert result["output"] == {"doubled": 10}


def test_code_propagates_sandbox_error() -> None:
    # blocked builtins return result.error (not a SandboxError raise) — node wraps as execution error
    with pytest.raises(NodeExecutionError, match="execution error"):
        asyncio.run(
            CodeNode().execute(_ctx(inputs={"code": "open('/etc/passwd')"}))
        )


# ---------------------------------------------------------------------------
# ConditionNode
# ---------------------------------------------------------------------------


def test_condition_true_branch() -> None:
    result = asyncio.run(
        ConditionNode().execute(_ctx(
            inputs={"condition_expr": "x > 3", "true_output": "yes", "false_output": "no"},
            state={"x": 5},
        ))
    )
    assert result["result"] is True
    assert result["branch"] == "yes"


def test_condition_false_branch() -> None:
    result = asyncio.run(
        ConditionNode().execute(_ctx(
            inputs={"condition_expr": "x > 3", "true_output": "yes", "false_output": "no"},
            state={"x": 1},
        ))
    )
    assert result["result"] is False
    assert result["branch"] == "no"


def test_condition_long_expr_rejected() -> None:
    long_expr = "x > " + "0 and x > " * 60 + "0"
    assert len(long_expr) > _MAX_EXPR_LEN
    with pytest.raises(NodeExecutionError, match="char limit"):
        asyncio.run(
            ConditionNode().execute(_ctx(inputs={"condition_expr": long_expr}))
        )


# ---------------------------------------------------------------------------
# MemoryNode
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def clear_memory_store() -> None:
    _clear_store()


def test_memory_set_and_get() -> None:
    ctx = _ctx(inputs={"action": "set", "key": "color", "value": "blue"})
    asyncio.run(MemoryNode().execute(ctx))

    result = asyncio.run(
        MemoryNode().execute(_ctx(inputs={"action": "get", "key": "color"}))
    )
    assert result["value"] == "blue"


def test_memory_clear() -> None:
    asyncio.run(MemoryNode().execute(_ctx(inputs={"action": "set", "key": "x", "value": "42"})))
    asyncio.run(MemoryNode().execute(_ctx(inputs={"action": "clear", "key": "x"})))
    result = asyncio.run(MemoryNode().execute(_ctx(inputs={"action": "get", "key": "x"})))
    assert result["value"] is None


def test_memory_cross_tenant_isolation() -> None:
    """Keys stored under tenant-A must not be visible to tenant-B."""
    ctx_a = _ctx(inputs={"action": "set", "key": "secret", "value": "a_data"}, tenant_id="tenant-A")
    asyncio.run(MemoryNode().execute(ctx_a))

    ctx_b = _ctx(inputs={"action": "get", "key": "secret"}, tenant_id="tenant-B")
    result = asyncio.run(MemoryNode().execute(ctx_b))
    assert result["value"] is None  # tenant-B cannot see tenant-A's data


def test_memory_missing_tenant_raises() -> None:
    with pytest.raises(NodeExecutionError, match="tenant_id"):
        asyncio.run(
            MemoryNode().execute(_ctx(inputs={"action": "get", "key": "x"}, tenant_id=None))
        )


# ---------------------------------------------------------------------------
# HttpRequestNode — SSRF protection
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/secret",
    "http://localhost/secret",
    "http://10.0.0.1/secret",
    "http://172.16.0.1/secret",
    "http://192.168.1.1/secret",
    "http://169.254.169.254/latest/meta-data/",
])
def test_http_request_ssrf_blocked(url: str) -> None:
    with pytest.raises(NodeExecutionError, match="blocked network"):
        _check_ssrf(url)


def test_http_request_blocked_scheme() -> None:
    with pytest.raises(NodeExecutionError, match="scheme"):
        _check_ssrf("ftp://example.com/file")


def test_http_request_happy_path() -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"ok": true}'
    mock_response.headers = {"content-type": "application/json"}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.request = AsyncMock(return_value=mock_response)

    with patch("app.flow.nodes.http_request._check_ssrf"), \
         patch("app.flow.nodes.http_request.httpx.AsyncClient", return_value=mock_client):
        result = asyncio.run(
            HttpRequestNode().execute(_ctx(inputs={"url": "https://example.com", "method": "GET"}))
        )

    assert result["status_code"] == 200
    assert result["body"] == '{"ok": true}'


# ---------------------------------------------------------------------------
# LlmNode
# ---------------------------------------------------------------------------


def _make_chunk(text: str) -> MagicMock:
    chunk = MagicMock()
    chunk.content = text
    chunk.usage_metadata = None
    return chunk


def test_llm_streams_tokens_individually() -> None:
    """Each chunk from astream must produce a separate TOKEN event."""
    chunks = [_make_chunk(t) for t in ["He", "ll", "o ", "Wo", "rld"]]

    async def _fake_astream(*args: Any, **kwargs: Any):
        for c in chunks:
            yield c

    events: list[ExecutionEvent] = []
    ctx = _ctx(
        inputs={
            "prompt": "say hello",
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

    token_events = [e for e in events if e.type == ExecutionEventType.TOKEN]
    assert len(token_events) == 5
    assert [e.data["token"] for e in token_events] == ["He", "ll", "o ", "Wo", "rld"]
    assert result["text"] == "Hello World"

    llm_done_events = [e for e in events if e.type == ExecutionEventType.LLM_CALL_COMPLETED]
    assert len(llm_done_events) == 1


def test_llm_missing_api_key_raises() -> None:
    ctx = _ctx(
        inputs={"prompt": "hi", "credential_id": "cred1"},
        credentials={"cred1": {"base_url": "https://example.com"}},  # no api_key
    )
    with pytest.raises(NodeExecutionError, match="api_key"):
        asyncio.run(LlmNode().execute(ctx))


def test_llm_missing_credential_raises() -> None:
    ctx = _ctx(
        inputs={"prompt": "hi", "credential_id": "nonexistent"},
        credentials={},
    )
    with pytest.raises(NodeExecutionError, match="not found"):
        asyncio.run(LlmNode().execute(ctx))


# ---------------------------------------------------------------------------
# KnowledgeBaseNode
# ---------------------------------------------------------------------------


def test_knowledge_base_happy_path() -> None:
    import sys
    import types

    mock_embedding = MagicMock()
    mock_embedding.hybrid_search = MagicMock(return_value=[
        {"content": "Paris is the capital of France.", "score_ranking": 0.95, "document_id": "doc1"},
        {"content": "France is in Western Europe.", "score_ranking": 0.87, "document_id": "doc1"},
    ])

    # app.dependencies has heavy transitive imports (structlog, qdrant, triton).
    # Inject a lightweight fake module so the lazy import inside execute() resolves cleanly.
    fake_deps = types.ModuleType("app.dependencies")
    fake_deps.get_embedding_service = MagicMock(return_value=mock_embedding)  # type: ignore[attr-defined]

    with patch.dict(sys.modules, {"app.dependencies": fake_deps}):
        result = asyncio.run(
            KnowledgeBaseNode().execute(_ctx(
                inputs={"kb_id": "kb-123", "query": "What is the capital of France?"},
            ))
        )

    assert len(result["chunks"]) == 2
    assert result["chunks"][0]["text"] == "Paris is the capital of France."
    assert "Paris" in result["context"]


def test_knowledge_base_missing_kb_id_raises() -> None:
    with pytest.raises(NodeExecutionError, match="kb_id"):
        asyncio.run(
            KnowledgeBaseNode().execute(_ctx(inputs={"kb_id": "", "query": "test"}))
        )
