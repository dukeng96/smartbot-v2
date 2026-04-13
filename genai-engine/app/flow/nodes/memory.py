"""MemoryNode — in-process key/value store scoped by (tenant_id, session_id)."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry

# Module-level store: (tenant_id, session_id, key) → value
# Lost on process restart — Redis persistence deferred to a later phase.
_store: dict[tuple[str, str, str], Any] = defaultdict(lambda: None)


def _clear_store() -> None:
    """Test helper — wipe all stored values."""
    _store.clear()


@NodeRegistry.register
class MemoryNode(BaseNode):
    definition = NodeDefinition(
        type="memory",
        category=NodeCategory.UTILITY,
        label="Memory",
        description=(
            "In-process key/value store scoped by (tenant_id, session_id). "
            "Actions: get, set, clear. "
            "NOTE: Data is lost on process restart."
        ),
        icon="database",
        inputs=[
            NodeInput(name="action", type="string", required=True),   # get | set | clear
            NodeInput(name="key", type="string", required=False, default=""),
            NodeInput(name="value", type="any", required=False, default=None),
        ],
        outputs=[
            NodeOutput(name="value", type="any"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        tenant_id = ctx.tenant_id
        if not tenant_id:
            raise NodeExecutionError(
                "MemoryNode requires tenant_id in execution context — cannot proceed without it"
            )

        session_id = ctx.session_id or ""
        action = ctx.resolve(ctx.inputs.get("action", ""))
        key = ctx.resolve(ctx.inputs.get("key", ""))

        store_key = (tenant_id, session_id, key)

        if action == "get":
            return {"value": _store[store_key]}

        if action == "set":
            value = ctx.inputs.get("value")
            if isinstance(value, str):
                value = ctx.resolve(value)
            _store[store_key] = value
            return {"value": value}

        if action == "clear":
            _store[store_key] = None
            return {"value": None}

        raise NodeExecutionError(f"MemoryNode unknown action '{action}' — expected get/set/clear")
