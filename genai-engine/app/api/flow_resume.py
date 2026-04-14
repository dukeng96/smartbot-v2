"""Flow resume API — POST /v1/flows/resume/{run_id} for human_input continuation."""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.flow.executor import FlowExecutor, _SUSPENDED_GRAPHS
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.streaming import EventQueue, event_to_sse

router = APIRouter(prefix="/v1/flows", tags=["Flows"])


def _require_internal_key(request: Request) -> None:
    from app.config import settings

    expected = settings.WEB_BACKEND_INTERNAL_KEY
    if expected and request.headers.get("X-Internal-Key") != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


class ResumeFlowRequest(BaseModel):
    approval: str
    credentials: dict[str, Any] = {}


@router.post("/resume/{run_id}")
async def resume_flow(
    run_id: str,
    req: ResumeFlowRequest,
    _: None = Depends(_require_internal_key),
) -> StreamingResponse:
    """Resume a suspended flow (paused at human_input node) with an approval value."""
    if run_id not in _SUSPENDED_GRAPHS:
        raise HTTPException(status_code=404, detail=f"No suspended flow for run_id '{run_id}'")

    queue = EventQueue()

    async def _run() -> None:
        executor = FlowExecutor(
            flow=_build_stub_flow(),
            credentials=req.credentials,
            emit=queue.emit,
            execution_id=run_id,
        )
        try:
            await executor.resume(req.approval)
        except Exception as exc:
            queue.emit(ExecutionEvent(type=ExecutionEventType.ERROR, message=str(exc)))
        finally:
            queue.close()

    asyncio.create_task(_run())

    return StreamingResponse(
        _drain_queue(queue),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _drain_queue(queue: EventQueue) -> Any:
    async for event in queue:
        yield event_to_sse(event)


def _build_stub_flow() -> Any:
    """Return a minimal stub FlowDefinition — resume() only uses the graph from _SUSPENDED_GRAPHS."""
    from app.flow.schemas.flow_definition import FlowDefinition
    return FlowDefinition(nodes=[], edges=[])
