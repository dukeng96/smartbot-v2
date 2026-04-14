"""CustomToolNode — loads a user-authored tool from backend and runs it in a sandbox."""
from __future__ import annotations

from typing import Any

import httpx

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.sandbox import run_code
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType


async def _fetch_tool_def(tool_id: str, tenant_id: str | None) -> dict[str, Any]:
    from app.config import settings

    url = f"{settings.WEB_BACKEND_URL}/internal/custom-tools/{tool_id}"
    headers: dict[str, str] = {"X-Internal-Key": settings.WEB_BACKEND_INTERNAL_KEY}
    if tenant_id:
        headers["X-Tenant-Id"] = tenant_id

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code == 404:
        raise NodeExecutionError(f"CustomTool '{tool_id}' not found")
    if not resp.is_success:
        raise NodeExecutionError(f"Failed to fetch CustomTool '{tool_id}': HTTP {resp.status_code}")
    return resp.json()


@NodeRegistry.register
class CustomToolNode(BaseNode):
    definition = NodeDefinition(
        type="custom_tool",
        category=NodeCategory.TOOL,
        label="Custom Tool",
        description="Execute a user-authored tool from the tenant library (sandboxed Python).",
        icon="wrench",
        inputs=[
            NodeInput(name="custom_tool_id", type="string", required=True),
            NodeInput(name="args", type="object", required=False, default={}),
        ],
        outputs=[NodeOutput(name="result", type="any")],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        tool_id = ctx.resolve(ctx.inputs["custom_tool_id"])
        if not tool_id:
            raise NodeExecutionError("CustomToolNode: custom_tool_id is required")

        tool_def = await _fetch_tool_def(tool_id, ctx.tenant_id)

        raw_args = ctx.inputs.get("args") or {}
        resolved_args = (
            {k: ctx.resolve(v) for k, v in raw_args.items()}
            if isinstance(raw_args, dict)
            else {}
        )

        ctx.emit(ExecutionEvent(
            type=ExecutionEventType.TOOL_CALL,
            node_id=ctx.node_id,
            data={"tool_name": tool_def["name"], "tool_input": resolved_args},
        ))

        result_obj = run_code(
            code=tool_def["implementation"],
            inputs=resolved_args,
            timeout_sec=5.0,
        )

        if result_obj.error:
            ctx.emit(ExecutionEvent(
                type=ExecutionEventType.TOOL_RESULT,
                node_id=ctx.node_id,
                data={"tool_name": tool_def["name"], "result": None, "error": result_obj.error},
            ))
            raise NodeExecutionError(f"CustomTool '{tool_def['name']}' failed: {result_obj.error}")

        ctx.emit(ExecutionEvent(
            type=ExecutionEventType.TOOL_RESULT,
            node_id=ctx.node_id,
            data={"tool_name": tool_def["name"], "result": result_obj.output, "error": None},
        ))
        return {"result": result_obj.output}
