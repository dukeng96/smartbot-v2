from typing import TYPE_CHECKING

from app.flow.exceptions import FlowValidationError

if TYPE_CHECKING:
    from app.flow.base_node import BaseNode, NodeDefinition


class NodeRegistry:
    _nodes: dict[str, type["BaseNode"]] = {}

    @classmethod
    def register(cls, node_cls: type["BaseNode"]) -> None:
        cls._nodes[node_cls.definition.type] = node_cls

    @classmethod
    def get(cls, node_type: str) -> type["BaseNode"]:
        if node_type not in cls._nodes:
            raise FlowValidationError(f"Unknown node type: {node_type}")
        return cls._nodes[node_type]

    @classmethod
    def all_definitions(cls) -> list["NodeDefinition"]:
        return [n.definition for n in cls._nodes.values()]

    @classmethod
    def clear(cls) -> None:
        """Test helper — reset registry between tests."""
        cls._nodes = {}
