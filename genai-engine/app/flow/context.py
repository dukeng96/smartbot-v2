from dataclasses import dataclass
from typing import Any, Callable

from app.flow.schemas.execution_event import ExecutionEvent


@dataclass
class NodeExecutionContext:
    node_id: str
    inputs: dict[str, Any]
    credentials: dict[str, dict]
    emit: Callable[[ExecutionEvent], None]
    state: dict[str, Any]
    session_id: str | None
    execution_id: str | None
