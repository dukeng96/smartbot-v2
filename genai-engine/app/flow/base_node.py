from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel


class NodeInput(BaseModel):
    name: str
    type: str
    required: bool = False
    default: Any = None
    description: str | None = None


class NodeOutput(BaseModel):
    name: str
    type: str
    description: str | None = None


class StateUpdate(BaseModel):
    key: str
    value: Any


class NodeDefinition(BaseModel):
    type: str
    category: str
    label: str
    description: str
    icon: str
    version: int = 1
    inputs: list[NodeInput]
    outputs: list[NodeOutput]
    credentials: list[str] = []


if TYPE_CHECKING:
    from app.flow.context import NodeExecutionContext


class BaseNode(ABC):
    definition: NodeDefinition

    @abstractmethod
    async def execute(self, ctx: "NodeExecutionContext") -> dict[str, Any]:
        """Return dict keyed by output name."""
