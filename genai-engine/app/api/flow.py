"""Flow execution API router — POST /v1/flows/execute (SSE), GET /v1/flows/node-types, POST /v1/flows/validate."""
from __future__ import annotations

import asyncio
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.flow.executor import FlowExecutor, FlowValidator
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition
from app.flow.streaming import EventQueue, event_to_sse

router = APIRouter(prefix="/v1/flows", tags=["Flows"])


def _require_internal_key(request: Request) -> None:
    """Validate X-Internal-Key header matches configured secret."""
    from app.config import settings

    expected = settings.WEB_BACKEND_INTERNAL_KEY
    if expected and request.headers.get("X-Internal-Key") != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


class ExecuteFlowRequest(BaseModel):
    flow_def: FlowDefinition
    credentials: dict[str, dict[str, Any]] = {}
    inputs: dict[str, Any] = {}


class ValidateFlowRequest(BaseModel):
    flow_def: FlowDefinition


@router.post("/execute")
async def execute_flow(
    req: ExecuteFlowRequest,
    _: None = Depends(_require_internal_key),
) -> StreamingResponse:
    """Execute a flow definition and stream SSE events."""
    queue = EventQueue()

    async def _run() -> None:
        executor = FlowExecutor(
            flow=req.flow_def,
            credentials=req.credentials,
            emit=queue.emit,
            session_id=req.inputs.get("session_id"),
            execution_id=req.inputs.get("execution_id"),
        )
        try:
            await executor.stream(req.inputs)
        except Exception as exc:
            queue.emit(ExecutionEvent(type=ExecutionEventType.ERROR, error=str(exc)))
        finally:
            queue.close()

    asyncio.create_task(_run())

    return StreamingResponse(
        _drain_queue(queue),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _drain_queue(queue: EventQueue) -> AsyncGenerator[str, None]:
    async for event in queue:
        yield event_to_sse(event)


@router.get("/node-types")
async def list_node_types(
    _: None = Depends(_require_internal_key),
) -> dict:
    """Return JSON Schema for all registered node types."""
    import app.flow.nodes  # noqa: F401 — triggers registration

    return {
        "nodes": [d.model_dump() for d in NodeRegistry.all_definitions()]
    }


@router.post("/validate")
async def validate_flow(
    req: ValidateFlowRequest,
    _: None = Depends(_require_internal_key),
) -> dict:
    """Validate flow structure — check orphan nodes, required inputs, unknown types."""
    import app.flow.nodes  # noqa: F401 — triggers registration

    errors = FlowValidator(req.flow_def).validate()
    return {"valid": len(errors) == 0, "errors": errors}
