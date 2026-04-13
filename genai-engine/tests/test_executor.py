"""Unit tests for FlowExecutor, FlowValidator, and apply_state_updates."""
import asyncio
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import FlowValidationError
from app.flow.executor import FlowExecutor, FlowValidator, apply_state_updates
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_node(node_id: str, node_type: str, data: dict | None = None) -> FlowNode:
    return FlowNode(id=node_id, type=node_type, data=data or {})


def _make_edge(source: str, target: str) -> FlowEdge:
    return FlowEdge(source=source, target=target)


def _collect_events(flow: FlowDefinition, inputs: dict | None = None) -> list[ExecutionEvent]:
    events: list[ExecutionEvent] = []

    async def _run() -> None:
        executor = FlowExecutor(
            flow=flow,
            credentials={},
            emit=events.append,
        )
        await executor.stream(inputs or {})

    asyncio.run(_run())
    return events


# ---------------------------------------------------------------------------
# Fixture nodes registered for the duration of each test
# ---------------------------------------------------------------------------


class _StartNode(BaseNode):
    definition = NodeDefinition(
        type="start",
        category=NodeCategory.CONTROL,
        label="Start",
        description="Flow entry point",
        icon="play",
        inputs=[],
        outputs=[NodeOutput(name="trigger", type="any")],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        return {"trigger": True}


class _EchoNode(BaseNode):
    definition = NodeDefinition(
        type="echo",
        category=NodeCategory.UTILITY,
        label="Echo",
        description="Returns its input",
        icon="repeat",
        inputs=[NodeInput(name="message", type="string", required=False, default="hi")],
        outputs=[NodeOutput(name="out", type="string")],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        return {"out": ctx.resolve(ctx.inputs.get("message", "hi"))}


@pytest.fixture(autouse=True)
def _register_test_nodes():
    NodeRegistry.register(_StartNode)
    NodeRegistry.register(_EchoNode)
    yield
    # Cleanup: remove only the nodes we added (preserves hello, etc.)
    NodeRegistry._nodes.pop("start", None)
    NodeRegistry._nodes.pop("echo", None)


# ---------------------------------------------------------------------------
# apply_state_updates
# ---------------------------------------------------------------------------


class TestApplyStateUpdates:
    def test_literal_value(self) -> None:
        result = apply_state_updates(
            state={"x": 1},
            node_output={"answer": 42},
            updates=[{"key": "y", "value": "hello"}],
        )
        assert result["y"] == "hello"
        assert result["x"] == 1  # original unchanged

    def test_cross_node_ref(self) -> None:
        # resolve_template always returns str when the whole value is a template
        state = {"node_a": {"score": 99}}
        result = apply_state_updates(
            state=state,
            node_output={"out": "ignored"},
            updates=[{"key": "score_copy", "value": "{{node_a.score}}"}],
        )
        assert result["score_copy"] == "99"

    def test_self_node_ref(self) -> None:
        # {{$node.output}} → resolved against _node_output alias
        result = apply_state_updates(
            state={},
            node_output={"greeting": "hello world"},
            updates=[{"key": "last_greeting", "value": "{{_node_output.greeting}}"}],
        )
        assert result["last_greeting"] == "hello world"

    def test_missing_key_skipped(self) -> None:
        result = apply_state_updates(
            state={"x": 1},
            node_output={},
            updates=[{"value": "oops"}],  # no "key"
        )
        assert result == {"x": 1}


# ---------------------------------------------------------------------------
# FlowValidator
# ---------------------------------------------------------------------------


class TestFlowValidator:
    def test_valid_single_node(self) -> None:
        flow = FlowDefinition(
            nodes=[_make_node("n1", "start")],
            edges=[],
        )
        errors = FlowValidator(flow).validate()
        assert errors == []

    def test_orphan_node_detected(self) -> None:
        flow = FlowDefinition(
            nodes=[
                _make_node("n1", "start"),
                _make_node("n2", "echo"),
                _make_node("n3", "echo"),
            ],
            edges=[_make_edge("n1", "n2")],  # n3 is orphaned
        )
        errors = FlowValidator(flow).validate()
        assert any("n3" in e and "orphan" in e.lower() for e in errors)

    def test_unknown_node_type(self) -> None:
        flow = FlowDefinition(
            nodes=[_make_node("n1", "unknown_xyz")],
            edges=[],
        )
        errors = FlowValidator(flow).validate()
        assert any("unknown_xyz" in e for e in errors)

    def test_edge_references_missing_node(self) -> None:
        flow = FlowDefinition(
            nodes=[_make_node("n1", "start")],
            edges=[_make_edge("n1", "ghost")],
        )
        errors = FlowValidator(flow).validate()
        assert any("ghost" in e for e in errors)

    def test_required_input_missing(self) -> None:
        # NodeInput with required=True and no default
        class _RequiredNode(BaseNode):
            definition = NodeDefinition(
                type="req_node",
                category=NodeCategory.UTILITY,
                label="Req",
                description="",
                icon="x",
                inputs=[NodeInput(name="must_have", type="string", required=True)],
                outputs=[],
            )

            async def execute(self, ctx: NodeExecutionContext) -> dict:
                return {}

        NodeRegistry.register(_RequiredNode)
        try:
            flow = FlowDefinition(
                nodes=[_make_node("n1", "req_node", data={})],
                edges=[],
            )
            errors = FlowValidator(flow).validate()
            assert any("must_have" in e for e in errors)
        finally:
            NodeRegistry._nodes.pop("req_node", None)


# ---------------------------------------------------------------------------
# FlowExecutor — graph build + event emission
# ---------------------------------------------------------------------------


class TestFlowExecutor:
    def test_raises_without_start_node(self) -> None:
        flow = FlowDefinition(
            nodes=[_make_node("n1", "echo")],
            edges=[],
        )
        with pytest.raises(FlowValidationError, match="start"):
            FlowExecutor(flow=flow, credentials={}, emit=lambda e: None).build_graph()

    def test_simple_start_to_echo(self) -> None:
        flow = FlowDefinition(
            nodes=[
                _make_node("n1", "start"),
                _make_node("n2", "echo", data={"message": "world"}),
            ],
            edges=[_make_edge("n1", "n2")],
        )
        events = _collect_events(flow)
        types = [e.type for e in events]

        assert ExecutionEventType.FLOW_START in types
        assert ExecutionEventType.NODE_START in types
        assert ExecutionEventType.NODE_END in types
        assert ExecutionEventType.DONE in types

    def test_node_end_fires_for_each_node(self) -> None:
        flow = FlowDefinition(
            nodes=[
                _make_node("n1", "start"),
                _make_node("n2", "echo", data={"message": "ping"}),
            ],
            edges=[_make_edge("n1", "n2")],
        )
        events = _collect_events(flow)
        node_end_ids = {e.node_id for e in events if e.type == ExecutionEventType.NODE_END}
        assert "n1" in node_end_ids
        assert "n2" in node_end_ids
        # node_end carries no output per client contract (client-side timing only)
        node_end_outputs = [e.output for e in events if e.type == ExecutionEventType.NODE_END]
        assert all(o is None for o in node_end_outputs)

    def test_flow_start_carries_execution_id(self) -> None:
        flow = FlowDefinition(
            nodes=[_make_node("n1", "start")],
            edges=[],
        )
        events: list[ExecutionEvent] = []
        exec_id = "test-exec-123"

        async def _run() -> None:
            executor = FlowExecutor(
                flow=flow,
                credentials={},
                emit=events.append,
                execution_id=exec_id,
            )
            await executor.stream({})

        asyncio.run(_run())
        flow_start = next(e for e in events if e.type == ExecutionEventType.FLOW_START)
        assert flow_start.data and flow_start.data.get("execution_id") == exec_id

    def test_sticky_note_nodes_skipped(self) -> None:
        flow = FlowDefinition(
            nodes=[
                _make_node("n1", "start"),
                _make_node("sticky1", "sticky_note"),
            ],
            edges=[],
        )
        # Should not raise even though sticky_note not in registry
        events = _collect_events(flow)
        node_ids = [e.node_id for e in events if e.node_id]
        assert "sticky1" not in node_ids
