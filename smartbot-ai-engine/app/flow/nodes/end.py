"""EndNode — terminal node, signals executor to halt after output."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class EndNode(BaseNode):
    definition = NodeDefinition(
        type="end",
        category=NodeCategory.CONTROL,
        label="End",
        description="Terminal node. Captures final output_text and halts the flow.",
        icon="stop-circle",
        inputs=[
            NodeInput(name="output_text", type="string", required=False, default=""),
        ],
        outputs=[
            NodeOutput(name="output_text", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        output_text = ctx.resolve(ctx.inputs.get("output_text", ""))
        ctx.halt()
        return {"output_text": output_text}
