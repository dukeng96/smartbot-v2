from enum import Enum


class NodeCategory(str, Enum):
    LLM = "llm"
    RETRIEVAL = "retrieval"
    CONTROL = "control"
    UTILITY = "utility"
    INPUT = "input"
    OUTPUT = "output"
