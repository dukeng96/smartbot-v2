"""SSE execution event types — shared contract between engine and NestJS relay."""
from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class ExecutionEventType(StrEnum):
    FLOW_START = "flow_start"
    NODE_START = "node_start"
    TOKEN = "token"
    NODE_END = "node_end"
    NODE_ERROR = "node_error"
    LLM_CALL_COMPLETED = "llm_call_completed"
    STATE_UPDATED = "state_updated"
    AWAITING_INPUT = "awaiting_input"
    HALTED = "halted"
    DONE = "done"
    ERROR = "error"


class ExecutionEvent(BaseModel):
    type: ExecutionEventType
    node_id: str | None = None
    data: Any = None
    output: dict[str, Any] | None = None
    error: str | None = None
    message: str | None = None
    meta: dict[str, Any] | None = None
