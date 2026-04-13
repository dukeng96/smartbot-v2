"""HelloNode — trivial test node for framework validation."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class HelloNode(BaseNode):
    definition = NodeDefinition(
        type="hello",
        category=NodeCategory.UTILITY,
        label="Hello",
        description="Test node — echoes greeting. Used for framework validation only.",
        icon="hand",
        inputs=[
            NodeInput(name="name", type="string", required=False, default="World"),
        ],
        outputs=[
            NodeOutput(name="greeting", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        name = ctx.resolve(ctx.inputs.get("name", "World"))
        return {"greeting": f"Hello, {name}!"}
