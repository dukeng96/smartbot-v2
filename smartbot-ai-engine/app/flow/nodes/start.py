"""StartNode — flow entry point, passes user_message into state."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class StartNode(BaseNode):
    definition = NodeDefinition(
        type="start",
        category=NodeCategory.CONTROL,
        label="Start",
        description="Flow entry point. Passes user_message and any flow inputs into state.",
        icon="play",
        inputs=[
            NodeInput(name="user_message", type="string", required=False, default=""),
        ],
        outputs=[
            NodeOutput(name="user_message", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        user_message = ctx.resolve(ctx.inputs.get("user_message", ""))
        # Also pick up from top-level flow inputs (chat_input key from backend)
        if not user_message:
            user_message = ctx.state.get("chat_input", "") or ctx.state.get("user_message", "")
        # Output as both 'message' (frontend template convention: {{start.message}})
        # and 'user_message' for backward compat
        return {"message": user_message, "user_message": user_message}
