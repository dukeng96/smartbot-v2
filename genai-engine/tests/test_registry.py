"""Unit tests for NodeRegistry."""
import pytest

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import FlowValidationError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@pytest.fixture(autouse=True)
def clean_registry():
    """Isolate each test from NodeRegistry state."""
    before = dict(NodeRegistry._nodes)
    yield
    NodeRegistry._nodes.clear()
    NodeRegistry._nodes.update(before)


class _FooNode(BaseNode):
    definition = NodeDefinition(
        type="foo",
        category=NodeCategory.UTILITY,
        label="Foo",
        description="Test node",
        icon="box",
        inputs=[NodeInput(name="x", type="string", required=True)],
        outputs=[NodeOutput(name="result", type="string")],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict:
        return {"result": ctx.inputs.get("x", "")}


def test_register_and_get():
    NodeRegistry.register(_FooNode)
    cls = NodeRegistry.get("foo")
    assert cls is _FooNode


def test_register_via_decorator():
    @NodeRegistry.register
    class _BarNode(BaseNode):
        definition = NodeDefinition(
            type="bar",
            category=NodeCategory.UTILITY,
            label="Bar",
            description="Bar",
            icon="box",
            inputs=[],
            outputs=[],
        )

        async def execute(self, ctx: NodeExecutionContext) -> dict:
            return {}

    assert NodeRegistry.get("bar") is _BarNode


def test_get_unknown_type_raises():
    with pytest.raises(FlowValidationError, match="Unknown node type"):
        NodeRegistry.get("does_not_exist")


def test_all_definitions_includes_registered():
    NodeRegistry.register(_FooNode)
    defs = NodeRegistry.all_definitions()
    types = [d.type for d in defs]
    assert "foo" in types


def test_register_returns_class():
    result = NodeRegistry.register(_FooNode)
    assert result is _FooNode
