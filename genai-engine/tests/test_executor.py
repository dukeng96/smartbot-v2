import pytest

from app.flow.base_node import BaseNode, NodeDefinition, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import FlowValidationError
from app.flow.executor import FlowExecutor, FlowValidator, apply_state_updates
from app.flow.nodes.hello import HelloNode
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent
from app.flow.schemas.flow_definition import FlowDefinition, FlowEdge, FlowNode


def _noop_emit(ev: ExecutionEvent) -> None:
    pass


def _make_minimal_flow() -> FlowDefinition:
    return FlowDefinition(
        nodes=[
            FlowNode(id="n_start", type="start", label="Start"),
            FlowNode(id="n_hello", type="hello", label="Hello"),
            FlowNode(id="n_end", type="end", label="End"),
        ],
        edges=[
            FlowEdge(source="n_start", target="n_hello"),
            FlowEdge(source="n_hello", target="n_end"),
        ],
    )


@pytest.fixture(autouse=True)
def setup_registry():
    NodeRegistry.clear()
    NodeRegistry.register(HelloNode)
    yield
    NodeRegistry.clear()


# ── apply_state_updates ────────────────────────────────────────────────────────

def test_apply_state_updates_literal():
    state = {"x": 1}
    result = apply_state_updates(state, {}, [{"key": "x", "value": 42}], "n1")
    assert result["x"] == 42


def test_apply_state_updates_cross_node_ref():
    state = {"n2": {"score": 99}}
    result = apply_state_updates(
        state, {}, [{"key": "final_score", "value": "{{n2.score}}"}], "n1"
    )
    assert result["final_score"] == 99


def test_apply_state_updates_self_node_ref():
    state = {}
    node_output = {"message": "hello"}
    result = apply_state_updates(
        state, node_output, [{"key": "greeting", "value": "{{$node.message}}"}], "n1"
    )
    assert result["greeting"] == "hello"


# ── FlowExecutor.build_graph ───────────────────────────────────────────────────

def test_build_graph_valid_flow():
    flow = _make_minimal_flow()
    executor = FlowExecutor(flow, {}, _noop_emit)
    graph = executor.build_graph()
    assert graph is not None


def test_build_graph_unknown_node_type_raises():
    flow = FlowDefinition(
        nodes=[
            FlowNode(id="n_start", type="start"),
            FlowNode(id="n_bad", type="nonexistent"),
            FlowNode(id="n_end", type="end"),
        ],
        edges=[
            FlowEdge(source="n_start", target="n_bad"),
            FlowEdge(source="n_bad", target="n_end"),
        ],
    )
    executor = FlowExecutor(flow, {}, _noop_emit)
    with pytest.raises(FlowValidationError, match="Unknown node type"):
        executor.build_graph()


# ── FlowValidator ──────────────────────────────────────────────────────────────

def test_validator_detects_orphan_node():
    flow = FlowDefinition(
        nodes=[
            FlowNode(id="n_start", type="start"),
            FlowNode(id="n_hello", type="hello"),
            FlowNode(id="n_orphan", type="hello"),
            FlowNode(id="n_end", type="end"),
        ],
        edges=[
            FlowEdge(source="n_start", target="n_hello"),
            FlowEdge(source="n_hello", target="n_end"),
        ],
    )
    errors = FlowValidator(flow).validate()
    assert any("orphan" in e.lower() for e in errors)


def test_validator_detects_unknown_type():
    flow = FlowDefinition(
        nodes=[
            FlowNode(id="n_start", type="start"),
            FlowNode(id="n_bad", type="unknown_xyz"),
            FlowNode(id="n_end", type="end"),
        ],
        edges=[
            FlowEdge(source="n_start", target="n_bad"),
            FlowEdge(source="n_bad", target="n_end"),
        ],
    )
    errors = FlowValidator(flow).validate()
    assert any("unknown_xyz" in e for e in errors)


def test_validator_detects_missing_start():
    flow = FlowDefinition(
        nodes=[FlowNode(id="n_hello", type="hello")],
        edges=[],
    )
    errors = FlowValidator(flow).validate()
    assert any("start" in e.lower() for e in errors)


def test_validator_valid_flow_no_errors():
    flow = _make_minimal_flow()
    errors = FlowValidator(flow).validate()
    assert errors == []


# ── end-to-end graph execution ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_minimal_flow_executes():
    events: list[ExecutionEvent] = []

    def collect(ev: ExecutionEvent) -> None:
        events.append(ev)

    flow = _make_minimal_flow()
    executor = FlowExecutor(flow, {}, collect)
    graph = executor.build_graph()
    result = await graph.ainvoke({})

    assert "n_hello" in result
    assert result["n_hello"]["message"] == "hello"
    event_types = [e.type for e in events]
    assert "node_start" in event_types
    assert "node_end" in event_types
