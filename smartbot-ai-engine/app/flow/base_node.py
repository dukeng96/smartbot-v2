"""BaseNode ABC and Pydantic schema types — single source of truth for node definitions."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class NodeInput(BaseModel):
    name: str
    type: str  # "string" | "number" | "boolean" | "array" | "object" | "credential:vnpt" | ...
    required: bool = False
    default: Any = None
    description: str | None = None
    enum: list[Any] | None = None
    schema_: dict | None = None  # JSON schema for array/object types


class NodeOutput(BaseModel):
    name: str
    type: str
    description: str | None = None


class NodeDefinition(BaseModel):
    type: str  # unique registry key e.g. "llm", "start", "condition"
    category: str  # NodeCategory value
    label: str
    description: str
    icon: str  # lucide icon name
    version: int = 1
    inputs: list[NodeInput] = []
    outputs: list[NodeOutput] = []
    credentials: list[str] = []  # accepted credential types


class BaseNode(ABC):
    """Abstract base for all flow nodes. Subclasses declare `definition` as a class var."""

    definition: NodeDefinition

    @abstractmethod
    async def execute(self, ctx: "NodeExecutionContext") -> dict[str, Any]:  # noqa: F821
        """Execute the node. Return dict keyed by output name."""
