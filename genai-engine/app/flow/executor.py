import asyncio
from collections.abc import AsyncIterator
from typing import Any, Callable

from langgraph.graph import END, START, StateGraph

from app.flow.context import NodeExecutionContext
from app.flow.exceptions import FlowValidationError
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent
from app.flow.schemas.flow_definition import FlowDefinition, FlowNode


def apply_state_updates(
    state: dict[str, Any],
    node_output: dict[str, Any],
    updates: list[dict[str, Any]],
    node_id: str,
) -> dict[str, Any]:
    """Apply update_flow_state side-effects after a node runs.

    Value can be a literal OR a reference {{nodeId.output}} / {{$node.output}}
    where $node refers to the current node's output.
    """
    next_state = {**state}
    for u in updates:
        key = u["key"]
        raw = u["value"]
        if isinstance(raw, str) and raw.startswith("{{") and raw.endswith("}}"):
            path = raw[2:-2].strip()
            src_id, out_name = path.split(".", 1)
            if src_id == "$node":
                next_state[key] = node_output.get(out_name)
            else:
                next_state[key] = next_state.get(src_id, {}).get(out_name)
        else:
            next_state[key] = raw
    return next_state


class FlowExecutor:
    def __init__(
        self,
        flow_def: FlowDefinition,
        credentials: dict[str, dict],
        emit: Callable[[ExecutionEvent], None],
    ) -> None:
        self.flow = flow_def
        self.credentials = credentials
        self.emit = emit

    def build_graph(self):
        graph = StateGraph(dict)

        for node in self.flow.nodes:
            if node.type in ("start", "end"):
                continue
            node_cls = NodeRegistry.get(node.type)
            instance = node_cls()
            graph.add_node(node.id, self._wrap_node(node, instance))

        start_node = next(n for n in self.flow.nodes if n.type == "start")
        end_node = next((n for n in self.flow.nodes if n.type == "end"), None)

        # Resolve edges — skip virtual start/end nodes; wire through real nodes
        real_node_ids = {n.id for n in self.flow.nodes if n.type not in ("start", "end")}

        for edge in self.flow.edges:
            src_node = next((n for n in self.flow.nodes if n.id == edge.source), None)
            tgt_node = next((n for n in self.flow.nodes if n.id == edge.target), None)

            if src_node and src_node.type == "start":
                if tgt_node and tgt_node.type not in ("start", "end"):
                    graph.add_edge(START, tgt_node.id)
            elif tgt_node and tgt_node.type == "end":
                if src_node and src_node.type not in ("start", "end"):
                    graph.add_edge(src_node.id, END)
            elif edge.source in real_node_ids and edge.target in real_node_ids:
                graph.add_edge(edge.source, edge.target)

        return graph.compile()

    def _wrap_node(self, node: FlowNode, instance: Any) -> Callable:
        emit = self.emit
        credentials = self.credentials

        async def run(state: dict) -> dict:
            emit(ExecutionEvent(type="node_start", node_id=node.id))
            try:
                ctx = NodeExecutionContext(
                    node_id=node.id,
                    inputs=self._resolve_inputs(node, state),
                    credentials=credentials,
                    emit=emit,
                    state=state,
                    session_id=state.get("session_id"),
                    execution_id=state.get("execution_id"),
                )
                result = await instance.execute(ctx)
                next_state = {**state, node.id: result}
                updates = node.data.get("update_flow_state") or []
                if updates:
                    next_state = apply_state_updates(next_state, result, updates, node.id)
                    emit(ExecutionEvent(
                        type="state_updated",
                        node_id=node.id,
                        data={u["key"]: next_state.get(u["key"]) for u in updates},
                    ))
                emit(ExecutionEvent(type="node_end", node_id=node.id, output=result))
                return next_state
            except Exception as e:
                emit(ExecutionEvent(type="node_error", node_id=node.id, error=str(e)))
                raise

        return run

    def _resolve_inputs(self, node: FlowNode, state: dict) -> dict[str, Any]:
        return node.data.get("inputs", {})

    async def stream(self, inputs: dict[str, Any]) -> AsyncIterator[ExecutionEvent]:
        queue: asyncio.Queue[ExecutionEvent] = asyncio.Queue()
        orig_emit = self.emit

        def queued_emit(ev: ExecutionEvent) -> None:
            queue.put_nowait(ev)
            orig_emit(ev)

        self.emit = queued_emit
        graph = self.build_graph()

        async def _run() -> None:
            try:
                await graph.ainvoke(inputs)
                queue.put_nowait(ExecutionEvent(type="done"))
            except Exception as e:
                queue.put_nowait(ExecutionEvent(type="error", error=str(e)))

        task = asyncio.create_task(_run())
        while True:
            ev = await queue.get()
            yield ev
            if ev.type in ("done", "error"):
                break
        await task


class FlowValidator:
    def __init__(self, flow: FlowDefinition) -> None:
        self.flow = flow

    def validate(self) -> list[str]:
        errors: list[str] = []
        node_ids = {n.id for n in self.flow.nodes}
        connected = set()

        for edge in self.flow.edges:
            connected.add(edge.source)
            connected.add(edge.target)

        # Unknown node types (skip start/end — they are virtual)
        for node in self.flow.nodes:
            if node.type in ("start", "end"):
                continue
            try:
                NodeRegistry.get(node.type)
            except FlowValidationError:
                errors.append(f"Unknown node type: {node.type!r} (node {node.id!r})")

        # Orphan nodes — not connected to any edge
        for node in self.flow.nodes:
            if node.id not in connected:
                errors.append(f"Orphan node: {node.id!r} (type {node.type!r})")

        # Must have exactly one start node
        start_nodes = [n for n in self.flow.nodes if n.type == "start"]
        if not start_nodes:
            errors.append("Flow has no start node")

        return errors
