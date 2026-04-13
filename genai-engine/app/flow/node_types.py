"""Node category enum — used in NodeDefinition.category."""
from enum import StrEnum


class NodeCategory(StrEnum):
    LLM = "llm"
    AGENT = "agent"
    CONTROL = "control"
    TOOL = "tool"
    RETRIEVAL = "retrieval"
    IO = "io"
    UTILITY = "utility"
