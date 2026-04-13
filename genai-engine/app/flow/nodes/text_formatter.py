"""TextFormatterNode — resolves {{template}} placeholders into a final string."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class TextFormatterNode(BaseNode):
    definition = NodeDefinition(
        type="text_formatter",
        category=NodeCategory.UTILITY,
        label="Text Formatter",
        description="Interpolates {{...}} placeholders in a template string using flow state.",
        icon="type",
        inputs=[
            NodeInput(name="template", type="string", required=True),
        ],
        outputs=[
            NodeOutput(name="text", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        template = ctx.inputs.get("template", "")
        return {"text": ctx.resolve(template)}
