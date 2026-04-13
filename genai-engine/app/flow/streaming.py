"""SSE event queue — bridges synchronous emit() callbacks to async SSE stream."""
from __future__ import annotations

import asyncio
import json

from app.flow.schemas.execution_event import ExecutionEvent


class EventQueue:
    """Thread-safe async queue for ExecutionEvents.

    Nodes call emit() synchronously; the SSE endpoint drains via __aiter__.
    """

    def __init__(self) -> None:
        self._queue: asyncio.Queue[ExecutionEvent | None] = asyncio.Queue()

    def emit(self, event: ExecutionEvent) -> None:
        """Put event onto queue (sync-safe via put_nowait)."""
        self._queue.put_nowait(event)

    def close(self) -> None:
        """Signal end of stream."""
        self._queue.put_nowait(None)

    async def __aiter__(self):
        while True:
            event = await self._queue.get()
            if event is None:
                return
            yield event


def event_to_sse(event: ExecutionEvent) -> str:
    """Serialize an ExecutionEvent to SSE wire format."""
    return f"event: {event.type}\ndata: {json.dumps(event.model_dump(exclude_none=True))}\n\n"
