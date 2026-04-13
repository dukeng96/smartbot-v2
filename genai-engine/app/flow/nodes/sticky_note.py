"""StickyNoteNode — canvas annotation only, never executed by FlowExecutor."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry


@NodeRegistry.register
class StickyNoteNode(BaseNode):
    definition = NodeDefinition(
        type="sticky_note",
        category=NodeCategory.UTILITY,
        label="Sticky Note",
        description="Canvas annotation only — never executed. Use for documentation.",
        icon="sticky-note",
        inputs=[],
        outputs=[],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        return {}
