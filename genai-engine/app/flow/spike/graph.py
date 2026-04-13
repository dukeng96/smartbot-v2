"""Spike: 3-node StateGraph (Start → LLM → End) for SSE streaming validation."""
from typing import Any, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph import END, START, StateGraph


def _build_spike_graph(use_vnpt: bool = False) -> Any:
    """Build a minimal Start → LLM → End graph. use_vnpt=True swaps in real VNPT call."""
    from app.flow.spike.nodes import mock_llm_node, vnpt_llm_node

    llm_node = vnpt_llm_node if use_vnpt else mock_llm_node

    graph = StateGraph(dict)
    graph.add_node("start_node", _start_node)
    graph.add_node("llm", llm_node)
    graph.add_node("end_node", _end_node)

    graph.add_edge(START, "start_node")
    graph.add_edge("start_node", "llm")
    graph.add_edge("llm", "end_node")
    graph.add_edge("end_node", END)

    return graph.compile()


async def _start_node(state: dict[str, Any]) -> dict[str, Any]:
    from langchain_core.messages import HumanMessage

    chat_input: str = state.get("chat_input", "")
    return {"messages": [HumanMessage(content=chat_input)]}


async def _end_node(state: dict[str, Any]) -> dict[str, Any]:
    return state


spike_graph_mock = _build_spike_graph(use_vnpt=False)
