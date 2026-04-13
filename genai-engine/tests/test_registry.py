import pytest

from app.flow.base_node import BaseNode, NodeDefinition, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import FlowValidationError
from app.flow.registry import NodeRegistry


class _DummyNode(BaseNode):
    definition = NodeDefinition(
        type="dummy",
        category="utility",
        label="Dummy",
        description="Test node",
        icon="circle",
        inputs=[],
        outputs=[NodeOutput(name="result", type="string")],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict:
        return {"result": "ok"}


@pytest.fixture(autouse=True)
def clean_registry():
    NodeRegistry.clear()
    yield
    NodeRegistry.clear()


def test_register_and_get():
    NodeRegistry.register(_DummyNode)
    assert NodeRegistry.get("dummy") is _DummyNode


def test_all_definitions_returns_registered():
    NodeRegistry.register(_DummyNode)
    defs = NodeRegistry.all_definitions()
    assert len(defs) == 1
    assert defs[0].type == "dummy"


def test_get_unknown_raises():
    with pytest.raises(FlowValidationError, match="Unknown node type"):
        NodeRegistry.get("nonexistent")


def test_register_overwrites_same_type():
    NodeRegistry.register(_DummyNode)
    NodeRegistry.register(_DummyNode)
    assert len(NodeRegistry.all_definitions()) == 1
