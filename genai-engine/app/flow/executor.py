"""FlowExecutor — builds LangGraph StateGraph from FlowDefinition and runs it."""
from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator, Callable

from langgraph.graph import END, START, StateGraph

from app.flow.context import NodeExecutionContext, resolve_template
from app.flow.exceptions import FlowValidationError, NodeExecutionError
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowNode


def apply_state_updates(
    state: dict[str, Any],
    node_output: dict[str, Any],
    updates: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Apply update_flow_state side-effects after a node runs.

    Each update: {"key": "var_name", "value": <literal or {{ref}}>}
    Value resolution uses current state + node output merged together so
    {{$node.outputName}} resolves against the just-completed node's output.
    """
    merged = {**state, "_node_output": node_output}

    next_state = {**state}
    for update in updates:
        key = update.get("key", "")
        raw = update.get("value")
        if not key:
            continue

        if isinstance(raw, str) and "{{" in raw:
            # Substitute {{$node.x}} → {{_node_output.x}} for resolution
            raw_substituted = raw.replace("{{$node.", "{{_node_output.")
            resolved = resolve_template(raw_substituted, merged)
        else:
            resolved = raw

        next_state[key] = resolved

    return next_state


class FlowValidator:
    """Structural validator — checks for orphan nodes, missing required inputs, unknown types."""

    def __init__(self, flow: FlowDefinition) -> None:
        self._flow = flow

    def validate(self) -> list[str]:
        errors: list[str] = []
        node_ids = {n.id for n in self._flow.nodes}
        connected = set()

        for edge in self._flow.edges:
            if edge.source not in node_ids:
                errors.append(f"Edge references unknown source node '{edge.source}'")
            if edge.target not in node_ids:
                errors.append(f"Edge references unknown target node '{edge.target}'")
            connected.add(edge.source)
            connected.add(edge.target)

        for node in self._flow.nodes:
            # Unknown type check
            try:
                node_cls = NodeRegistry.get(node.type)
            except FlowValidationError:
                errors.append(f"Node '{node.id}' has unknown type '{node.type}'")
                continue

            # Orphan check (sticky_note exempt — it's canvas-only)
            if node.type != "sticky_note" and node.id not in connected and len(self._flow.nodes) > 1:
                errors.append(f"Node '{node.id}' (type={node.type}) is orphaned — no edges connect to it")

            # Required input check
            for inp in node_cls.definition.inputs:
                if inp.required and inp.name not in node.data and inp.default is None:
                    errors.append(
                        f"Node '{node.id}' (type={node.type}) missing required input '{inp.name}'"
                    )

        return errors


class FlowExecutor:
    def __init__(
        self,
        flow: FlowDefinition,
        credentials: dict[str, dict],
        emit: Callable[[ExecutionEvent], None],
        session_id: str | None = None,
        execution_id: str | None = None,
        tenant_id: str | None = None,
    ) -> None:
        self._flow = flow
        self._credentials = credentials
        self._emit = emit
        self._session_id = session_id
        self._execution_id = execution_id
        self._tenant_id = tenant_id
        self._halt = False

    def build_graph(self) -> Any:
        """Compile a LangGraph StateGraph from the flow definition."""
        graph = StateGraph(dict)

        # Nodes — skip sticky_note (canvas annotation, no execution)
        for node in self._flow.nodes:
            if node.type == "sticky_note":
                continue
            node_cls = NodeRegistry.get(node.type)
            instance = node_cls()
            graph.add_node(node.id, self._wrap_node(node, instance))

        # Entry edge: START → first start-typed node
        start_nodes = [n for n in self._flow.nodes if n.type == "start"]
        if not start_nodes:
            raise FlowValidationError("Flow must contain a 'start' node")
        graph.add_edge(START, start_nodes[0].id)

        # Flow edges
        for edge in self._flow.edges:
            source = edge.source
            target = edge.target
            # Skip edges involving sticky_note
            source_node = next((n for n in self._flow.nodes if n.id == source), None)
            target_node = next((n for n in self._flow.nodes if n.id == target), None)
            if source_node and source_node.type == "sticky_note":
                continue
            if target_node and target_node.type == "sticky_note":
                continue
            graph.add_edge(source, target)

        return graph.compile()

    def _wrap_node(self, node: FlowNode, instance: Any) -> Callable:
        async def run(state: dict[str, Any]) -> dict[str, Any]:
            if self._halt:
                return state

            self._emit(ExecutionEvent(
                type=ExecutionEventType.NODE_START,
                node_id=node.id,
                meta={"node_type": node.type},
            ))

            ctx = NodeExecutionContext(
                node_id=node.id,
                inputs=node.data,
                credentials=self._credentials,
                emit=self._emit,
                state=state,
                session_id=self._session_id,
                execution_id=self._execution_id,
                tenant_id=self._tenant_id,
            )

            try:
                result = await instance.execute(ctx)
            except Exception as exc:
                self._emit(ExecutionEvent(
                    type=ExecutionEventType.NODE_ERROR,
                    node_id=node.id,
                    error=str(exc),
                ))
                raise NodeExecutionError(f"Node '{node.id}' failed: {exc}") from exc

            # Merge node output into state under its node_id key
            next_state = {**state, node.id: result}

            # Apply update_flow_state side-effects
            updates = node.data.get("update_flow_state") or []
            if updates:
                next_state = apply_state_updates(next_state, result, updates)
                self._emit(ExecutionEvent(
                    type=ExecutionEventType.STATE_UPDATED,
                    node_id=node.id,
                    data={u["key"]: next_state.get(u["key"]) for u in updates if "key" in u},
                ))

            self._emit(ExecutionEvent(
                type=ExecutionEventType.NODE_END,
                node_id=node.id,
                output=result,
            ))

            if ctx.should_halt:
                self._halt = True
                self._emit(ExecutionEvent(
                    type=ExecutionEventType.HALTED,
                    node_id=node.id,
                    data={"reason": "node requested halt"},
                ))

            return next_state

        return run

    async def stream(self, inputs: dict[str, Any]) -> AsyncIterator[ExecutionEvent]:
        """Run the graph and yield events. Caller drains into SSE."""
        graph = self.build_graph()
        self._emit(ExecutionEvent(
            type=ExecutionEventType.FLOW_START,
            data={"execution_id": self._execution_id},
        ))

        try:
            async for _ in graph.astream(inputs, stream_mode="updates"):
                pass  # events already emitted via self._emit callback
        except NodeExecutionError:
            raise
        except Exception as exc:
            self._emit(ExecutionEvent(
                type=ExecutionEventType.ERROR,
                error=str(exc),
            ))
            return

        self._emit(ExecutionEvent(type=ExecutionEventType.DONE))
