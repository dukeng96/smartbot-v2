"""FlowExecutor — builds LangGraph StateGraph from FlowDefinition and runs it."""
from __future__ import annotations

import asyncio
import time
from typing import Any, AsyncIterator, Callable

from langgraph.checkpoint.memory import MemorySaver
from langgraph.errors import GraphInterrupt
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from app.flow.context import NodeExecutionContext, resolve_template
from app.flow.exceptions import FlowValidationError, NodeExecutionError
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType
from app.flow.schemas.flow_definition import FlowDefinition, FlowNode

# Keyed by execution_id — stores (compiled_graph, MemorySaver, suspended_at_timestamp)
# for flows paused at a human_input node. TTL eviction runs lazily on each resume call.
_SUSPENDED_GRAPHS: dict[str, tuple[Any, MemorySaver, float]] = {}


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

    # ------------------------------------------------------------------
    # Graph construction helpers (shared by both build methods)
    # ------------------------------------------------------------------

    def _is_sticky(self, node_id: str) -> bool:
        """Check if a node id belongs to a sticky_note."""
        node = next((n for n in self._flow.nodes if n.id == node_id), None)
        return node is not None and node.type == "sticky_note"

    def _add_nodes_to_graph(self, graph: StateGraph) -> None:
        """Register all non-sticky nodes with the graph."""
        for node in self._flow.nodes:
            if node.type == "sticky_note":
                continue
            node_cls = NodeRegistry.get(node.type)
            instance = node_cls()
            graph.add_node(node.id, self._wrap_node(node, instance))

    def _add_entry_edge(self, graph: StateGraph) -> None:
        """Wire START → first start-typed node."""
        start_nodes = [n for n in self._flow.nodes if n.type == "start"]
        if not start_nodes:
            raise FlowValidationError("Flow must contain a 'start' node")
        graph.add_edge(START, start_nodes[0].id)

    def _build_conditional_edge_map(self, condition_node_id: str) -> dict[str, str]:
        """
        Return {branch_key: target_node_id} for a condition node.
        Reads edge.source_handle ("true"/"false") to determine mapping.
        Falls back to positional order if source_handle is absent.
        """
        outgoing = [
            e for e in self._flow.edges
            if e.source == condition_node_id
            and not self._is_sticky(e.target)
        ]
        mapping: dict[str, str] = {}
        for i, edge in enumerate(outgoing):
            key = edge.source_handle or ("true" if i == 0 else "false")
            mapping[key] = edge.target
        return mapping

    def _make_condition_router(self, node_id: str) -> Callable[[dict], str]:
        """
        Returns a router function that reads state[node_id]["branch"].
        Defaults to "false" if key absent.
        """
        def _router(state: dict[str, Any]) -> str:
            node_out = state.get(node_id, {})
            if isinstance(node_out, dict):
                return str(node_out.get("branch", "false"))
            return "false"
        return _router

    def _add_edges_to_graph(self, graph: StateGraph) -> None:
        """Wire all edges: static for regular nodes, conditional for condition nodes."""
        condition_node_ids: set[str] = {
            n.id for n in self._flow.nodes if n.type == "condition"
        }

        for edge in self._flow.edges:
            source = edge.source
            target = edge.target
            # Skip edges involving sticky_note
            if self._is_sticky(source) or self._is_sticky(target):
                continue
            # Condition node edges handled via add_conditional_edges below
            if source in condition_node_ids:
                continue
            graph.add_edge(source, target)

        # Wire conditional edges
        for cond_id in condition_node_ids:
            mapping = self._build_conditional_edge_map(cond_id)
            if not mapping:
                continue  # condition node with no outgoing edges — skip gracefully
            router = self._make_condition_router(cond_id)
            graph.add_conditional_edges(cond_id, router, mapping)

    def _build_state_init_defaults(self) -> dict[str, Any]:
        """
        Read flow_state_init from the Start node config and return
        a dict of {key: value} defaults to pre-populate before graph runs.
        Returns empty dict if no start node or no flow_state_init configured.
        """
        start_node = next(
            (n for n in self._flow.nodes if n.type == "start"), None
        )
        if start_node is None:
            return {}

        raw: list[dict[str, Any]] = start_node.data.get("flow_state_init") or []
        defaults: dict[str, Any] = {}
        for row in raw:
            key = row.get("key", "").strip()
            value = row.get("value", "")
            if key:
                defaults[key] = value
        return defaults

    # ------------------------------------------------------------------
    # Public build methods
    # ------------------------------------------------------------------

    def build_graph(self) -> Any:
        """Compile a LangGraph StateGraph from the flow definition."""
        graph = StateGraph(dict)
        self._add_nodes_to_graph(graph)
        self._add_entry_edge(graph)
        self._add_edges_to_graph(graph)
        return graph.compile()

    def build_graph_with_checkpointer(self, checkpointer: MemorySaver) -> Any:
        """Compile graph with a MemorySaver checkpointer — required for human_input interrupt()."""
        graph = StateGraph(dict)
        self._add_nodes_to_graph(graph)
        self._add_entry_edge(graph)
        self._add_edges_to_graph(graph)
        return graph.compile(checkpointer=checkpointer)

    def _wrap_node(self, node: FlowNode, instance: Any) -> Callable:
        async def run(state: dict[str, Any]) -> dict[str, Any]:
            if self._halt:
                return state

            self._emit(ExecutionEvent(
                type=ExecutionEventType.NODE_START,
                node_id=node.id,
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
            except GraphInterrupt:
                raise  # Let GraphInterrupt propagate for human_input suspension
            except Exception as exc:
                self._emit(ExecutionEvent(
                    type=ExecutionEventType.NODE_ERROR,
                    node_id=node.id,
                    error=str(exc),
                ))
                raise NodeExecutionError(f"Node '{node.id}' failed: {exc}") from exc

            # Merge node output into state under both node_id and node_type keys
            # so templates like {{start.message}} (type) and {{start-1.message}} (id) both work
            next_state = {**state, node.id: result, node.type: result}

            # Apply update_flow_state side-effects
            updates = node.data.get("update_flow_state") or []
            if updates:
                next_state = apply_state_updates(next_state, result, updates)
                self._emit(ExecutionEvent(
                    type=ExecutionEventType.STATE_UPDATED,
                    node_id=node.id,
                    data={"updates": {u["key"]: next_state.get(u["key"]) for u in updates if "key" in u}},
                ))

            self._emit(ExecutionEvent(
                type=ExecutionEventType.NODE_END,
                node_id=node.id,
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
        # Pre-populate state from Start node flow_state_init config.
        # Caller-supplied inputs win over defaults (merge order: defaults first).
        state_defaults = self._build_state_init_defaults()
        if state_defaults:
            inputs = {**state_defaults, **inputs}

        has_human_input = any(n.type == "human_input" for n in self._flow.nodes)

        if has_human_input:
            saver = MemorySaver()
            graph = self.build_graph_with_checkpointer(saver)
        else:
            graph = self.build_graph()
            saver = None

        self._emit(ExecutionEvent(
            type=ExecutionEventType.FLOW_START,
            data={"execution_id": self._execution_id},
        ))

        astream_config: dict[str, Any] = {}
        if has_human_input and self._execution_id:
            astream_config["configurable"] = {"thread_id": self._execution_id}

        was_interrupted = False
        try:
            async for update in graph.astream(inputs, config=astream_config or None, stream_mode="updates"):
                # LangGraph 1.1+ emits __interrupt__ update instead of raising GraphInterrupt
                if "__interrupt__" in update:
                    was_interrupted = True
        except GraphInterrupt:
            # Fallback for older LangGraph versions that raise GraphInterrupt
            was_interrupted = True
        except NodeExecutionError:
            raise
        except Exception as exc:
            self._emit(ExecutionEvent(
                type=ExecutionEventType.ERROR,
                message=str(exc),
            ))
            return

        if was_interrupted:
            # Flow suspended at a human_input node — store graph for resume
            if self._execution_id and saver is not None:
                _SUSPENDED_GRAPHS[self._execution_id] = (graph, saver, time.monotonic())
            return

        self._emit(ExecutionEvent(type=ExecutionEventType.DONE, data={}))

    async def resume(self, approval: str) -> None:
        """Resume a suspended human_input flow by injecting the approval value."""
        if not self._execution_id:
            raise NodeExecutionError("resume() requires execution_id")

        _evict_stale_graphs()

        entry = _SUSPENDED_GRAPHS.pop(self._execution_id, None)
        if entry is None:
            raise NodeExecutionError(f"No suspended flow found for execution_id '{self._execution_id}'")

        graph, _saver, _ts = entry
        config = {"configurable": {"thread_id": self._execution_id}}

        was_interrupted = False
        try:
            async for update in graph.astream(
                Command(resume={"approval": approval}),
                config=config,
                stream_mode="updates",
            ):
                # LangGraph 1.1+ emits __interrupt__ update instead of raising GraphInterrupt
                if "__interrupt__" in update:
                    was_interrupted = True
        except GraphInterrupt:
            # Fallback for older LangGraph versions that raise GraphInterrupt
            was_interrupted = True
        except NodeExecutionError:
            raise
        except Exception as exc:
            self._emit(ExecutionEvent(
                type=ExecutionEventType.ERROR,
                message=str(exc),
            ))
            return

        if was_interrupted:
            # Re-suspended (chained human_input nodes) — store again
            _SUSPENDED_GRAPHS[self._execution_id] = (graph, _saver, time.monotonic())
            return

        self._emit(ExecutionEvent(type=ExecutionEventType.DONE, data={}))


def _evict_stale_graphs(max_age_seconds: float = 600.0) -> None:
    """Remove suspended graph entries older than max_age_seconds."""
    now = time.monotonic()
    stale = [eid for eid, (_, _, ts) in _SUSPENDED_GRAPHS.items() if now - ts > max_age_seconds]
    for eid in stale:
        _SUSPENDED_GRAPHS.pop(eid, None)
