"""Spike FastAPI router: POST /spike/execute → SSE token stream."""
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage
from pydantic import BaseModel

router = APIRouter(prefix="/spike", tags=["Spike"])


class SpikeExecuteRequest(BaseModel):
    message: str
    use_vnpt: bool = False


@router.post("/execute")
async def execute_spike(req: SpikeExecuteRequest) -> StreamingResponse:
    """Execute spike graph and stream SSE events token by token."""
    return StreamingResponse(
        _stream_events(req.message, req.use_vnpt),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _stream_events(message: str, use_vnpt: bool) -> AsyncGenerator[str, None]:
    if use_vnpt:
        from app.flow.spike.graph import _build_spike_graph

        graph = _build_spike_graph(use_vnpt=True)
    else:
        from app.flow.spike.graph import spike_graph_mock as graph

    initial_state = {"chat_input": message, "messages": []}

    try:
        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            for node_id, node_state in chunk.items():
                messages = node_state.get("messages", [])
                for msg in messages:
                    if isinstance(msg, AIMessage) and msg.content:
                        # Emit token-by-token from mock; real VNPT produces full content here
                        for word in msg.content.split(" "):
                            token = word + " "
                            event = {"type": "token", "node_id": node_id, "data": token}
                            yield f"data: {json.dumps(event)}\n\n"
                            await asyncio.sleep(0)  # yield control to event loop
        done_event = {"type": "done", "node_id": None}
        yield f"data: {json.dumps(done_event)}\n\n"
    except Exception as exc:
        error_event = {"type": "error", "node_id": None, "data": str(exc)}
        yield f"data: {json.dumps(error_event)}\n\n"
