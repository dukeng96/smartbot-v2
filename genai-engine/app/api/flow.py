import asyncio
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import app.flow  # noqa: F401 — triggers HelloNode registration
from app.flow.executor import FlowExecutor, FlowValidator
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent
from app.flow.schemas.flow_definition import FlowDefinition

router = APIRouter()


class ExecuteFlowRequest(BaseModel):
    flow_def: FlowDefinition
    inputs: dict[str, Any] = {}
    credentials: dict[str, dict] = {}


@router.post("/v1/flows/execute")
async def execute_flow(req: ExecuteFlowRequest):
    async def stream():
        queue: asyncio.Queue[ExecutionEvent] = asyncio.Queue()

        def emit(ev: ExecutionEvent) -> None:
            queue.put_nowait(ev)

        executor = FlowExecutor(req.flow_def, req.credentials, emit)

        async def _run_to_completion() -> None:
            try:
                graph = executor.build_graph()
                await graph.ainvoke(req.inputs)
                queue.put_nowait(ExecutionEvent(type="done"))
            except Exception as e:
                queue.put_nowait(ExecutionEvent(type="error", error=str(e)))

        queue.put_nowait(ExecutionEvent(type="flow_start"))
        task = asyncio.create_task(_run_to_completion())

        while True:
            ev = await queue.get()
            yield f"event: {ev.type}\ndata: {ev.model_dump_json()}\n\n"
            if ev.type in ("done", "error"):
                break

        await task

    return EventSourceResponse(stream())


@router.get("/v1/flows/node-types")
async def list_node_types():
    return {"nodes": [d.model_dump() for d in NodeRegistry.all_definitions()]}


@router.post("/v1/flows/validate")
async def validate_flow(flow: FlowDefinition):
    errors = FlowValidator(flow).validate()
    return {"valid": len(errors) == 0, "errors": errors}
