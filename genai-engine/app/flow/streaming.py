import asyncio
from collections.abc import AsyncIterator

from app.flow.schemas.execution_event import ExecutionEvent


async def event_stream(queue: asyncio.Queue) -> AsyncIterator[str]:
    """Convert an asyncio.Queue of ExecutionEvent into SSE-formatted strings."""
    while True:
        ev: ExecutionEvent = await queue.get()
        yield f"event: {ev.type}\ndata: {ev.model_dump_json()}\n\n"
        if ev.type in ("done", "error"):
            break
