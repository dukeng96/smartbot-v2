"""NodeExecutionContext — passed to every node's execute() call."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable

from app.flow.schemas.execution_event import ExecutionEvent


_TEMPLATE_RE = re.compile(r"\{\{([^}]+)\}\}")


def resolve_template(value: Any, state: dict[str, Any], current_node_output: dict[str, Any] | None = None) -> Any:
    """
    Resolve {{...}} templates in a string value against flow state.

    Supported patterns:
      {{nodeId.outputName}}   → state[nodeId][outputName]
      {{state.varName}}       → state[varName]  (explicit prefix)
      {{varName}}             → state[varName]  (shorthand, no dot)
    """
    if not isinstance(value, str):
        return value

    def replace(match: re.Match) -> str:
        path = match.group(1).strip()
        parts = path.split(".", 1)

        if len(parts) == 1:
            # {{varName}} → top-level state lookup
            return str(state.get(parts[0], ""))

        prefix, rest = parts[0], parts[1]

        if prefix == "state":
            # {{state.varName}}
            return str(state.get(rest, ""))

        # {{nodeId.outputName}}
        node_output = state.get(prefix, {})
        if isinstance(node_output, dict):
            return str(node_output.get(rest, ""))
        return ""

    return _TEMPLATE_RE.sub(replace, value)


@dataclass
class NodeExecutionContext:
    node_id: str
    inputs: dict[str, Any]
    credentials: dict[str, dict]       # {credId: decrypted payload}
    emit: Callable[[ExecutionEvent], None]
    state: dict[str, Any]
    session_id: str | None
    execution_id: str | None
    _halt_flag: bool = field(default=False, init=False, repr=False)

    def resolve(self, value: Any) -> Any:
        """Resolve {{...}} templates against current flow state."""
        return resolve_template(value, self.state)

    def halt(self) -> None:
        """Signal executor to stop after this node completes."""
        self._halt_flag = True

    @property
    def should_halt(self) -> bool:
        return self._halt_flag
