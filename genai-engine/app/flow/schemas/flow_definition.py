from typing import Any

from pydantic import BaseModel


class FlowNode(BaseModel):
    id: str
    type: str
    label: str = ""
    data: dict[str, Any] = {}


class FlowEdge(BaseModel):
    source: str
    target: str


class FlowDefinition(BaseModel):
    nodes: list[FlowNode]
    edges: list[FlowEdge]
