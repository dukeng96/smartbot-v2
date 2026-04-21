"""SetVariableNode — writes a template-resolved value into flow state."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class SetVariableNode(BaseNode):
    definition = NodeDefinition(
        type="set_variable",
        category=NodeCategory.UTILITY,
        label="Set Variable",
        description="Resolves a {{template}} value and stores it under a named key in flow state.",
        icon="variable",
        inputs=[
            NodeInput(name="key", type="string", required=True),
            NodeInput(name="value", type="string", required=False, default=""),
        ],
        outputs=[
            NodeOutput(name="key", type="string"),
            NodeOutput(name="value", type="any"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        key = ctx.resolve(ctx.inputs.get("key", ""))
        value = ctx.resolve(ctx.inputs.get("value", ""))
        return {"key": key, "value": value}
