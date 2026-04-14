"""HumanInputNode — pauses flow execution and waits for human approval via LangGraph interrupt."""
from __future__ import annotations

from typing import Any

from langgraph.types import interrupt

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


@NodeRegistry.register
class HumanInputNode(BaseNode):
    definition = NodeDefinition(
        type="human_input",
        category=NodeCategory.UTILITY,
        label="Human Input",
        description=(
            "Pauses flow execution and waits for a human to provide input. "
            "Emits human_input_required SSE event then suspends via LangGraph interrupt(). "
            "Resume via POST /engine/v1/flows/resume/{run_id}."
        ),
        icon="user-check",
        inputs=[
            NodeInput(name="prompt", type="string", required=True),
            NodeInput(name="timeout_seconds", type="number", required=False, default=300),
        ],
        outputs=[
            NodeOutput(name="response", type="string"),
            NodeOutput(name="approved", type="boolean"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        prompt = ctx.resolve(ctx.inputs.get("prompt", ""))
        timeout_seconds = int(ctx.inputs.get("timeout_seconds") or 300)
        run_id = ctx.execution_id or ""

        ctx.emit(ExecutionEvent(
            type=ExecutionEventType.HUMAN_INPUT_REQUIRED,
            node_id=ctx.node_id,
            data={"prompt": prompt, "run_id": run_id, "timeout_seconds": timeout_seconds},
        ))

        # Suspends graph execution — LangGraph checkpointer saves state here.
        # Resume by re-invoking graph with Command(resume={"approval": str}).
        decision: dict[str, Any] = interrupt({"prompt": prompt, "run_id": run_id})

        approval = str(decision.get("approval", ""))
        return {"response": approval, "approved": True}
