"""Pydantic models for React Flow JSON (flowData) passed from NestJS to engine."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class FlowNodeData(BaseModel):
    """Freeform node config — inputs + optional update_flow_state."""

    model_config = {"extra": "allow"}

    update_flow_state: list[dict[str, Any]] = []


class FlowNode(BaseModel):
    id: str
    type: str  # maps to NodeRegistry key
    data: dict[str, Any] = {}
    position: dict[str, float] = {}  # canvas metadata — engine ignores


class FlowEdge(BaseModel):
    source: str
    target: str
    source_handle: str | None = None
    target_handle: str | None = None

    model_config = {"populate_by_name": True}


class FlowDefinition(BaseModel):
    nodes: list[FlowNode]
    edges: list[FlowEdge]
