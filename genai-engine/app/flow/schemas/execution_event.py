from typing import Any

from pydantic import BaseModel


class ExecutionEvent(BaseModel):
    type: str
    node_id: str | None = None
    output: dict[str, Any] | None = None
    error: str | None = None
    data: dict[str, Any] | None = None
