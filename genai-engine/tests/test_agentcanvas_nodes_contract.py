"""E2E contract tests for agentcanvas nodes: agent, custom_tool, human_input.

Scope:
  1. CustomToolNode — fetches tool def from backend internal API, runs in sandbox, emits tool_call + tool_result events
  2. HumanInputNode — emits human_input_required SSE, calls interrupt(), resume path injects approval
  3. AgentNode — fetches tool def, emits tool_call + tool_result SSE events via LangChain StructuredTool wrapper
  4. FlowExecutor — human_input suspend/resume stores graph in _SUSPENDED_GRAPHS keyed by execution_id
  5. URL contract: engine resume endpoint is /v1/flows/resume/{run_id} (PLURAL). Backend engine-client calls
     /v1/flow/resume/{execId} (SINGULAR). This mismatch is detected as a contract violation test.
"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.flow.context import NodeExecutionContext
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.nodes.custom_tool import CustomToolNode
from app.flow.nodes.human_input import HumanInputNode
from app.flow.executor import FlowExecutor, _SUSPENDED_GRAPHS
from app.flow.schemas.flow_definition import FlowDefinition, FlowNode, FlowEdge


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_ctx(
    node_id: str = "node-1",
    inputs: dict[str, Any] | None = None,
    state: dict[str, Any] | None = None,
    tenant_id: str | None = "tenant-1",
    execution_id: str | None = "exec-1",
) -> tuple[NodeExecutionContext, list[ExecutionEvent]]:
    emitted: list[ExecutionEvent] = []

    ctx = NodeExecutionContext(
        node_id=node_id,
        inputs=inputs or {},
        credentials={},
        emit=emitted.append,
        state=state or {},
        session_id=None,
        execution_id=execution_id,
        tenant_id=tenant_id,
    )
    return ctx, emitted


MOCK_TOOL_DEF = {
    "id": "tool-abc",
    "name": "add_numbers",
    "description": "Adds two numbers",
    "schema": {
        "type": "object",
        "properties": {
            "a": {"type": "number"},
            "b": {"type": "number"},
        },
        "required": ["a", "b"],
    },
    "implementation": "output = {'sum': inputs['a'] + inputs['b']}",
}


def _tool_def_response(tool_def: dict[str, Any] = MOCK_TOOL_DEF) -> MagicMock:
    """httpx mock response returning tool_def JSON."""
    resp = MagicMock()
    resp.status_code = 200
    resp.is_success = True
    resp.json.return_value = tool_def
    return resp


# ---------------------------------------------------------------------------
# 1. CustomToolNode contract
# ---------------------------------------------------------------------------


class TestCustomToolNode:
    """Verify CustomToolNode fetches tool def from backend and executes in sandbox."""

    @pytest.mark.asyncio
    async def test_emits_tool_call_then_tool_result_on_success(self):
        ctx, emitted = make_ctx(
            node_id="ct-1",
            inputs={"custom_tool_id": "tool-abc", "args": {"a": 3, "b": 7}},
        )

        with patch("app.flow.nodes.custom_tool.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=_tool_def_response())
            mock_client_cls.return_value = mock_client

            node = CustomToolNode()
            result = await node.execute(ctx)

        # SSE event sequence: tool_call then tool_result
        types = [e.type for e in emitted]
        assert ExecutionEventType.TOOL_CALL in types, f"Missing tool_call in {types}"
        assert ExecutionEventType.TOOL_RESULT in types, f"Missing tool_result in {types}"
        tc_idx = types.index(ExecutionEventType.TOOL_CALL)
        tr_idx = types.index(ExecutionEventType.TOOL_RESULT)
        assert tc_idx < tr_idx, "tool_call must precede tool_result"

        # tool_call carries tool name and args
        tc_event = emitted[tc_idx]
        assert tc_event.data["tool_name"] == "add_numbers"
        assert tc_event.data["tool_input"] == {"a": 3, "b": 7}

        # tool_result carries computed output
        tr_event = emitted[tr_idx]
        assert tr_event.data["tool_name"] == "add_numbers"
        assert tr_event.data["error"] is None
        assert tr_event.data["result"]["sum"] == 10

        # node output
        assert result["result"]["sum"] == 10

    @pytest.mark.asyncio
    async def test_tool_call_event_has_correct_node_id(self):
        ctx, emitted = make_ctx(
            node_id="ct-custom",
            inputs={"custom_tool_id": "tool-abc", "args": {}},
        )
        tool_def = {**MOCK_TOOL_DEF, "implementation": "output = {'x': 1}"}

        with patch("app.flow.nodes.custom_tool.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=_tool_def_response(tool_def))
            mock_client_cls.return_value = mock_client

            node = CustomToolNode()
            await node.execute(ctx)

        for ev in emitted:
            if ev.type in (ExecutionEventType.TOOL_CALL, ExecutionEventType.TOOL_RESULT):
                assert ev.node_id == "ct-custom", f"Expected node_id=ct-custom, got {ev.node_id}"

    @pytest.mark.asyncio
    async def test_emits_tool_result_error_when_sandbox_fails(self):
        """Sandbox runtime error → tool_result has error field, NodeExecutionError raised."""
        ctx, emitted = make_ctx(
            node_id="ct-err",
            inputs={"custom_tool_id": "tool-abc", "args": {}},
        )
        bad_tool = {**MOCK_TOOL_DEF, "implementation": "raise ValueError('boom')"}

        with patch("app.flow.nodes.custom_tool.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=_tool_def_response(bad_tool))
            mock_client_cls.return_value = mock_client

            node = CustomToolNode()
            from app.flow.exceptions import NodeExecutionError
            with pytest.raises(NodeExecutionError):
                await node.execute(ctx)

        # Should still emit tool_call and tool_result(error)
        types = [e.type for e in emitted]
        assert ExecutionEventType.TOOL_CALL in types
        assert ExecutionEventType.TOOL_RESULT in types
        tr_event = next(e for e in emitted if e.type == ExecutionEventType.TOOL_RESULT)
        assert tr_event.data["error"] is not None

    @pytest.mark.asyncio
    async def test_raises_when_tool_not_found(self):
        """Backend returns 404 → NodeExecutionError."""
        ctx, _ = make_ctx(inputs={"custom_tool_id": "missing", "args": {}})

        not_found = MagicMock()
        not_found.status_code = 404
        not_found.is_success = False

        with patch("app.flow.nodes.custom_tool.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=not_found)
            mock_client_cls.return_value = mock_client

            node = CustomToolNode()
            from app.flow.exceptions import NodeExecutionError
            with pytest.raises(NodeExecutionError, match="not found"):
                await node.execute(ctx)

    @pytest.mark.asyncio
    async def test_backend_url_includes_tool_id(self):
        """Verify the engine calls the correct internal backend URL with tool id."""
        ctx, _ = make_ctx(inputs={"custom_tool_id": "tool-xyz", "args": {}})
        tool_def = {**MOCK_TOOL_DEF, "id": "tool-xyz", "implementation": "output = {}"}

        captured_url: list[str] = []

        async def _mock_get(url: str, **kwargs: Any) -> MagicMock:
            captured_url.append(url)
            resp = MagicMock()
            resp.status_code = 200
            resp.is_success = True
            resp.json.return_value = tool_def
            return resp

        with patch("app.flow.nodes.custom_tool.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = _mock_get
            mock_client_cls.return_value = mock_client

            node = CustomToolNode()
            await node.execute(ctx)

        assert len(captured_url) == 1
        assert "/internal/custom-tools/tool-xyz" in captured_url[0]


# ---------------------------------------------------------------------------
# 2. HumanInputNode contract
# ---------------------------------------------------------------------------


class TestHumanInputNode:
    """Verify HumanInputNode emits human_input_required, then suspends via interrupt()."""

    @pytest.mark.asyncio
    async def test_emits_human_input_required_before_interrupt(self):
        """human_input_required event must be emitted before interrupt() suspends execution."""
        ctx, emitted = make_ctx(
            node_id="hi-1",
            inputs={"prompt": "Approve this action?", "timeout_seconds": 60},
            execution_id="exec-hi-1",
        )

        # interrupt() raises GraphInterrupt; we mock it to capture the emit sequence
        interrupt_call_count = 0

        def mock_interrupt(payload: dict) -> dict:
            nonlocal interrupt_call_count
            interrupt_call_count += 1
            # After real interrupt(), execution continues with Command(resume=...)
            # In tests we simulate the resume path by returning the payload directly
            return {"approval": "yes"}

        with patch("app.flow.nodes.human_input.interrupt", side_effect=mock_interrupt):
            node = HumanInputNode()
            result = await node.execute(ctx)

        # human_input_required must be emitted before interrupt was called
        types = [e.type for e in emitted]
        assert ExecutionEventType.HUMAN_INPUT_REQUIRED in types, f"Missing event in {types}"
        hi_idx = types.index(ExecutionEventType.HUMAN_INPUT_REQUIRED)
        assert hi_idx == 0, "human_input_required should be the first emitted event"

        # interrupt() was called
        assert interrupt_call_count == 1

    @pytest.mark.asyncio
    async def test_human_input_required_event_payload(self):
        """SSE event must carry prompt, run_id (execution_id), and timeout_seconds."""
        ctx, emitted = make_ctx(
            node_id="hi-1",
            inputs={"prompt": "Confirm deletion?", "timeout_seconds": 120},
            execution_id="exec-run-999",
        )

        with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "approved"}):
            node = HumanInputNode()
            await node.execute(ctx)

        hi_event = next(e for e in emitted if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED)
        assert hi_event.node_id == "hi-1"
        assert hi_event.data["prompt"] == "Confirm deletion?"
        assert hi_event.data["run_id"] == "exec-run-999"
        assert hi_event.data["timeout_seconds"] == 120

    @pytest.mark.asyncio
    async def test_node_output_carries_approval_string(self):
        """After resume, node must return response=approval and approved=True."""
        ctx, _ = make_ctx(
            inputs={"prompt": "Proceed?", "timeout_seconds": 300},
            execution_id="exec-1",
        )

        with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "proceed"}):
            node = HumanInputNode()
            result = await node.execute(ctx)

        assert result["response"] == "proceed"
        assert result["approved"] is True

    @pytest.mark.asyncio
    async def test_human_input_required_event_node_id_matches(self):
        """node_id in event must match ctx.node_id."""
        ctx, emitted = make_ctx(
            node_id="hi-node-42",
            inputs={"prompt": "Check?", "timeout_seconds": 60},
        )

        with patch("app.flow.nodes.human_input.interrupt", return_value={"approval": "ok"}):
            node = HumanInputNode()
            await node.execute(ctx)

        hi_event = next(e for e in emitted if e.type == ExecutionEventType.HUMAN_INPUT_REQUIRED)
        assert hi_event.node_id == "hi-node-42"


# ---------------------------------------------------------------------------
# 3. FlowExecutor suspend/resume integration
# ---------------------------------------------------------------------------


class TestFlowExecutorSuspendResume:
    """Verify FlowExecutor stores suspended graph and resume() retrieves it."""

    def _make_flow(self, node_type: str) -> FlowDefinition:
        return FlowDefinition(
            nodes=[
                FlowNode(id="start-1", type="start", data={}, position={"x": 0, "y": 0}),
                FlowNode(id=f"{node_type}-1", type=node_type, data={"prompt": "OK?"}, position={"x": 100, "y": 0}),
                FlowNode(id="end-1", type="end", data={}, position={"x": 200, "y": 0}),
            ],
            edges=[
                FlowEdge(id="e1", source="start-1", target=f"{node_type}-1"),
                FlowEdge(id="e2", source=f"{node_type}-1", target="end-1"),
            ],
        )

    @pytest.mark.asyncio
    async def test_suspended_graph_stored_on_human_input_interrupt(self):
        """When a human_input flow is run and GraphInterrupt occurs, executor stores graph in _SUSPENDED_GRAPHS."""
        flow = self._make_flow("human_input")
        emitted: list[ExecutionEvent] = []
        exec_id = "exec-suspend-test-1"

        # Clear any prior state
        _SUSPENDED_GRAPHS.pop(exec_id, None)

        executor = FlowExecutor(
            flow=flow,
            credentials={},
            emit=emitted.append,
            execution_id=exec_id,
        )

        # Patch the compiled graph to raise GraphInterrupt (simulating human_input node suspension)
        from langgraph.errors import GraphInterrupt

        async def _fake_astream(*args: Any, **kwargs: Any):
            raise GraphInterrupt("suspended at human_input")
            yield  # noqa: unreachable — needed to make this an async generator

        mock_graph = MagicMock()
        mock_graph.astream = _fake_astream

        with patch.object(executor, "build_graph_with_checkpointer", return_value=mock_graph):
            # stream() is a plain coroutine — events go via self._emit callback, not yielded
            await executor.stream({})

        assert exec_id in _SUSPENDED_GRAPHS, "Suspended graph should be stored under execution_id"
        # Cleanup
        _SUSPENDED_GRAPHS.pop(exec_id, None)

    @pytest.mark.asyncio
    async def test_resume_raises_when_no_suspended_graph(self):
        """resume() must raise NodeExecutionError when exec_id not in _SUSPENDED_GRAPHS."""
        emitted: list[ExecutionEvent] = []
        executor = FlowExecutor(
            flow=FlowDefinition(nodes=[], edges=[]),
            credentials={},
            emit=emitted.append,
            execution_id="nonexistent-exec",
        )

        from app.flow.exceptions import NodeExecutionError
        with pytest.raises(NodeExecutionError, match="No suspended flow"):
            await executor.resume("yes")

    @pytest.mark.asyncio
    async def test_resume_pops_suspended_graph(self):
        """resume() must remove the entry from _SUSPENDED_GRAPHS after resuming."""
        import time
        exec_id = "exec-resume-pop-test"
        emitted: list[ExecutionEvent] = []

        # Manually insert a fake suspended graph
        from langgraph.checkpoint.memory import MemorySaver

        async def _done_astream(*args: Any, **kwargs: Any):
            return
            yield  # generator

        mock_graph = MagicMock()
        mock_graph.astream = _done_astream
        saver = MemorySaver()
        _SUSPENDED_GRAPHS[exec_id] = (mock_graph, saver, time.monotonic())

        executor = FlowExecutor(
            flow=FlowDefinition(nodes=[], edges=[]),
            credentials={},
            emit=emitted.append,
            execution_id=exec_id,
        )
        await executor.resume("yes")

        assert exec_id not in _SUSPENDED_GRAPHS, "Suspended graph should be removed after resume"


# ---------------------------------------------------------------------------
# 4. URL contract test — CRITICAL BUG DETECTION
# ---------------------------------------------------------------------------


class TestResumeUrlContract:
    """
    Contract test for engine resume endpoint URL.

    ENGINE exposes:  POST /v1/flows/resume/{run_id}   (PLURAL — flows)
    BACKEND calls:   POST /v1/flow/resume/{execId}    (SINGULAR — flow)

    This is a URL MISMATCH. The backend resumeStream() method in engine-client.ts
    uses the WRONG path /v1/flow/resume/{execId} (singular).

    This test encodes the contract that BOTH sides must agree on:
    the correct URL is /v1/flows/resume/{run_id} (plural, as shipped in engine).
    """

    def test_engine_resume_router_prefix_is_plural_flows(self):
        """
        Verify the engine's flow_resume router uses prefix /v1/flows (plural).

        This encodes the correct contract. If engine ever changes prefix this test fails.
        """
        from app.api.flow_resume import router
        assert router.prefix == "/v1/flows", (
            f"Engine resume router prefix is '{router.prefix}', expected '/v1/flows' (plural). "
            "If changed, update backend engine-client.ts resumeStream() to match."
        )

    def test_engine_resume_endpoint_path_is_resume_run_id(self):
        """Verify the engine resume route path is /resume/{run_id}."""
        from app.api.flow_resume import router
        routes = router.routes
        resume_routes = [r for r in routes if hasattr(r, "path") and "resume" in r.path]
        assert len(resume_routes) >= 1, "Expected at least one /resume route on flow_resume router"
        paths = [r.path for r in resume_routes]
        assert any("/resume/{run_id}" in p for p in paths), (
            f"Expected /resume/{{run_id}} in routes, got: {paths}"
        )

    def test_backend_engine_client_uses_singular_flow_path_BUG(self):
        """
        This test DOCUMENTS the URL mismatch bug.

        The backend engine-client.ts resumeStream() calls:
            /v1/flow/resume/{execId}   ← SINGULAR 'flow'

        The engine serves:
            /v1/flows/resume/{run_id}  ← PLURAL 'flows'

        Result: every POST /api/v1/flow-exec/:execId/resume triggers a 404 from engine.

        To verify: grep the engine-client.ts for the actual URL string.
        Expected correct URL: /v1/flows/resume/{execId}
        """
        import re
        import os
        engine_client_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "genai-platform-api", "src", "modules", "flow-exec", "engine-client.ts"
        )
        engine_client_path = os.path.normpath(engine_client_path)

        with open(engine_client_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Find the resumeStream URL
        match = re.search(r"resumeStream.*?`.*?`", content, re.DOTALL)
        if match:
            url_snippet = match.group(0)
        else:
            # Fallback: find any /flow.*resume line
            url_line_match = re.search(r"(v1/flow[s]?/resume)", content)
            url_snippet = url_line_match.group(0) if url_line_match else ""

        # This assertion will FAIL if the bug exists (singular /flow/) and PASS when fixed (plural /flows/)
        assert "/v1/flows/resume/" in content, (
            f"BUG DETECTED: backend engine-client.ts resumeStream() uses SINGULAR '/v1/flow/resume/' "
            f"but engine exposes PLURAL '/v1/flows/resume/'. "
            f"Fix: change engine-client.ts line ~73 from "
            f"`${{this.engineUrl}}/v1/flow/resume/${{execId}}` "
            f"to `${{this.engineUrl}}/v1/flows/resume/${{execId}}`. "
            f"Snippet found: {url_snippet!r}"
        )


# ---------------------------------------------------------------------------
# 5. AgentNode tool_call / tool_result SSE event contract
# ---------------------------------------------------------------------------


class TestAgentNodeSseContract:
    """
    Verify AgentNode emits tool_call and tool_result events with correct structure.

    We mock the langchain agent graph to simulate a tool-calling loop.
    We do NOT test actual LLM inference — that requires a live VNPT key.
    """

    @pytest.mark.asyncio
    async def test_agent_node_emits_tool_call_event_with_name_and_args(self):
        """AIMessage with tool_calls → tool_call SSE event with tool_name and tool_input."""
        from app.flow.nodes.agent import AgentNode
        from langchain_core.messages import AIMessage, ToolMessage

        ctx, emitted = make_ctx(
            node_id="agent-1",
            inputs={
                "credential_id": "cred-1",
                "model": "llm-large-v4",
                "messages": [{"role": "user", "content": "Calculate 2+2"}],
                "tools": ["tool-abc"],
                "max_iterations": 3,
            },
            state={},
        )
        ctx.credentials = {
            "cred-1": {"api_key": "sk-test", "base_url": "http://mock-engine/v1/", "model": "llm-large-v4"}
        }

        # Mock tool definition fetch
        mock_tool_def = {**MOCK_TOOL_DEF}

        # Simulate agent graph: one tool call iteration then final answer
        tool_call_id = "tc-001"
        ai_with_tool_call = AIMessage(
            content="",
            tool_calls=[{"id": tool_call_id, "name": "add_numbers", "args": {"a": 2, "b": 2}}],
        )
        tool_result_msg = ToolMessage(
            content="4",
            tool_call_id=tool_call_id,
            name="add_numbers",
            status="success",
        )
        ai_final = AIMessage(content="The answer is 4.")

        async def _fake_astream(messages_input: Any, config: Any, stream_mode: str):
            yield {"agent": {"messages": [ai_with_tool_call]}}
            yield {"tools": {"messages": [tool_result_msg]}}
            yield {"agent": {"messages": [ai_final]}}

        mock_agent_graph = MagicMock()
        mock_agent_graph.astream = _fake_astream

        with (
            patch("app.flow.nodes.agent._fetch_tool_def", return_value=mock_tool_def),
            patch("app.flow.nodes.agent.create_react_agent", return_value=mock_agent_graph),
            patch("app.flow.nodes.agent.ChatOpenAI"),
        ):
            node = AgentNode()
            result = await node.execute(ctx)

        types = [e.type for e in emitted]
        assert ExecutionEventType.TOOL_CALL in types, f"Missing tool_call in {types}"
        assert ExecutionEventType.TOOL_RESULT in types, f"Missing tool_result in {types}"

        tc_event = next(e for e in emitted if e.type == ExecutionEventType.TOOL_CALL)
        assert tc_event.node_id == "agent-1"
        assert tc_event.data["tool_name"] == "add_numbers"
        assert tc_event.data["tool_input"] == {"a": 2, "b": 2}

        tr_event = next(e for e in emitted if e.type == ExecutionEventType.TOOL_RESULT)
        assert tr_event.node_id == "agent-1"
        # result should contain the final answer
        assert "The answer is 4." in result.get("response", "")

    @pytest.mark.asyncio
    async def test_agent_node_tool_call_precedes_tool_result(self):
        """tool_call event must be emitted before tool_result event."""
        from app.flow.nodes.agent import AgentNode
        from langchain_core.messages import AIMessage, ToolMessage

        ctx, emitted = make_ctx(
            node_id="agent-order",
            inputs={
                "credential_id": "cred-1",
                "messages": [{"role": "user", "content": "Use tool"}],
                "tools": ["tool-abc"],
            },
        )
        ctx.credentials = {
            "cred-1": {"api_key": "sk-test", "base_url": "http://mock/v1/", "model": "llm-large-v4"}
        }

        tc_id = "tc-order"
        ai_msg = AIMessage(
            content="",
            tool_calls=[{"id": tc_id, "name": "add_numbers", "args": {"a": 1, "b": 1}}],
        )
        tm_msg = ToolMessage(content="2", tool_call_id=tc_id, name="add_numbers", status="success")
        ai_final = AIMessage(content="Done.")

        async def _astream(*a: Any, **k: Any):
            yield {"agent": {"messages": [ai_msg]}}
            yield {"tools": {"messages": [tm_msg]}}
            yield {"agent": {"messages": [ai_final]}}

        mock_graph = MagicMock()
        mock_graph.astream = _astream

        with (
            patch("app.flow.nodes.agent._fetch_tool_def", return_value=MOCK_TOOL_DEF),
            patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph),
            patch("app.flow.nodes.agent.ChatOpenAI"),
        ):
            node = AgentNode()
            await node.execute(ctx)

        types = [e.type for e in emitted]
        tc_idx = types.index(ExecutionEventType.TOOL_CALL)
        tr_idx = types.index(ExecutionEventType.TOOL_RESULT)
        assert tc_idx < tr_idx, f"tool_call must precede tool_result; got indices {tc_idx} vs {tr_idx}"

    @pytest.mark.asyncio
    async def test_agent_node_output_includes_tool_calls_list(self):
        """node output must include tool_calls array with name and args."""
        from app.flow.nodes.agent import AgentNode
        from langchain_core.messages import AIMessage, ToolMessage

        ctx, _ = make_ctx(
            node_id="agent-out",
            inputs={
                "credential_id": "cred-1",
                "messages": [{"role": "user", "content": "test"}],
                "tools": ["tool-abc"],
            },
        )
        ctx.credentials = {
            "cred-1": {"api_key": "sk-test", "base_url": "http://mock/v1/", "model": "llm-large-v4"}
        }

        tc_id = "tc-out"
        ai_msg = AIMessage(
            content="",
            tool_calls=[{"id": tc_id, "name": "add_numbers", "args": {"a": 5, "b": 5}}],
        )
        tm_msg = ToolMessage(content="10", tool_call_id=tc_id, name="add_numbers", status="success")
        ai_final = AIMessage(content="Result is 10.")

        async def _astream(*a: Any, **k: Any):
            yield {"agent": {"messages": [ai_msg]}}
            yield {"tools": {"messages": [tm_msg]}}
            yield {"agent": {"messages": [ai_final]}}

        mock_graph = MagicMock()
        mock_graph.astream = _astream

        with (
            patch("app.flow.nodes.agent._fetch_tool_def", return_value=MOCK_TOOL_DEF),
            patch("app.flow.nodes.agent.create_react_agent", return_value=mock_graph),
            patch("app.flow.nodes.agent.ChatOpenAI"),
        ):
            node = AgentNode()
            result = await node.execute(ctx)

        assert isinstance(result["tool_calls"], list)
        assert len(result["tool_calls"]) >= 1
        assert result["tool_calls"][0]["name"] == "add_numbers"
        assert result["tool_calls"][0]["args"] == {"a": 5, "b": 5}


# ---------------------------------------------------------------------------
# 6. Backend: VALID_NODE_TYPES includes 3 new node types
# ---------------------------------------------------------------------------


class TestBackendValidNodeTypes:
    """
    Verify backend flows.service.ts VALID_NODE_TYPES includes agent, custom_tool, human_input.

    We grep the TypeScript source — no runtime needed.
    """

    def _get_valid_node_types(self) -> set[str]:
        import os
        import re
        path = os.path.normpath(os.path.join(
            os.path.dirname(__file__),
            "..", "..", "genai-platform-api", "src", "modules", "flows", "flows.service.ts"
        ))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract the VALID_NODE_TYPES set literal
        m = re.search(r"VALID_NODE_TYPES\s*=\s*new Set\(\[(.*?)\]\)", content, re.DOTALL)
        if not m:
            return set()

        raw = m.group(1)
        return set(re.findall(r"'([^']+)'", raw))

    def test_agent_in_valid_node_types(self):
        types = self._get_valid_node_types()
        assert "agent" in types, f"'agent' missing from VALID_NODE_TYPES. Found: {types}"

    def test_custom_tool_in_valid_node_types(self):
        types = self._get_valid_node_types()
        assert "custom_tool" in types, f"'custom_tool' missing from VALID_NODE_TYPES. Found: {types}"

    def test_human_input_in_valid_node_types(self):
        types = self._get_valid_node_types()
        assert "human_input" in types, f"'human_input' missing from VALID_NODE_TYPES. Found: {types}"

    def test_total_node_count_is_14(self):
        """Spec says 11→14 after adding 3 new types."""
        types = self._get_valid_node_types()
        assert len(types) == 14, f"Expected 14 VALID_NODE_TYPES, got {len(types)}: {sorted(types)}"


# ---------------------------------------------------------------------------
# 7. Backend: internal custom-tools endpoint contract
# ---------------------------------------------------------------------------


class TestInternalCustomToolsContract:
    """
    Verify the InternalCustomToolsController response shape matches
    what the engine's _fetch_tool_def() expects.
    """

    def test_internal_controller_returns_required_fields(self):
        """
        Response shape must include: id, name, description, schema, implementation.
        Grep the controller source to verify these fields are present.
        """
        import os
        path = os.path.normpath(os.path.join(
            os.path.dirname(__file__),
            "..", "..", "genai-platform-api", "src", "modules",
            "custom-tools", "internal-custom-tools.controller.ts"
        ))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        required_fields = ["id", "name", "description", "schema", "implementation"]
        for field in required_fields:
            assert f"tool.{field}" in content, (
                f"Field '{field}' not in InternalCustomToolsController response. "
                f"Engine _fetch_tool_def() requires this field."
            )

    def test_internal_endpoint_uses_internal_api_key_guard(self):
        """Endpoint must be protected by InternalApiKeyGuard."""
        import os
        path = os.path.normpath(os.path.join(
            os.path.dirname(__file__),
            "..", "..", "genai-platform-api", "src", "modules",
            "custom-tools", "internal-custom-tools.controller.ts"
        ))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "InternalApiKeyGuard" in content, (
            "InternalCustomToolsController must use InternalApiKeyGuard to prevent unauthorized access"
        )

    def test_engine_fetch_tool_sends_internal_key_header(self):
        """Engine _fetch_tool_def must send X-Internal-Key header."""
        import os
        path = os.path.normpath(os.path.join(
            os.path.dirname(__file__),
            "..", "..", "genai-engine", "app", "flow", "nodes", "custom_tool.py"
        ))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "X-Internal-Key" in content, (
            "Engine custom_tool.py must send X-Internal-Key header when fetching tool def"
        )
