"""Node category enum — used in NodeDefinition.category."""
import sys

if sys.version_info >= (3, 11):
    from enum import StrEnum
else:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        """Backport of StrEnum for Python < 3.11."""


class NodeCategory(StrEnum):
    LLM = "llm"
    AGENT = "agent"
    CONTROL = "control"
    TOOL = "tool"
    RETRIEVAL = "retrieval"
    IO = "io"
    UTILITY = "utility"
