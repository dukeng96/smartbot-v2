from app.flow.nodes.hello import HelloNode
from app.flow.registry import NodeRegistry

NodeRegistry.register(HelloNode)
