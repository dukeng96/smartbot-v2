from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext


class HelloNode(BaseNode):
    definition = NodeDefinition(
        type="hello",
        category="utility",
        label="Hello",
        description="Test node that returns a hello message.",
        icon="hand-wave",
        inputs=[
            NodeInput(name="name", type="string", required=False, default="world"),
        ],
        outputs=[
            NodeOutput(name="message", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        return {"message": "hello"}
