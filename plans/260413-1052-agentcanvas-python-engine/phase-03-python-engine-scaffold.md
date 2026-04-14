# Phase 03 — Python Flow Engine Scaffold

**Status:** ⬜ pending

## Goal
Scaffold `app/flow/` subsystem in genai-engine. LangGraph StateGraph builder. Node registry. SSE streaming harness. **No real nodes yet** — just framework + 1 "hello" node.

## Files to create

```
genai-engine/
  app/flow/
    __init__.py
    executor.py          # StateGraph builder + runner
    registry.py          # NodeRegistry singleton
    streaming.py         # SSE event emitter
    context.py           # NodeExecutionContext dataclass
    base_node.py         # BaseNode abstract class + Pydantic schema
    node_types.py        # Enum of node categories
    exceptions.py        # FlowValidationError, NodeExecutionError
    nodes/
      __init__.py
      hello.py           # Trivial test node
    schemas/
      flow_definition.py # Pydantic models for flowData JSON
      execution_event.py # SSE event types
  app/api/flow.py        # FastAPI router for flow endpoints
  tests/
    test_executor.py
    test_registry.py
```

## Key interfaces

### BaseNode (`base_node.py`)

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any, AsyncIterator

class NodeInput(BaseModel):
    name: str
    type: str                    # "string" | "number" | "credential:openai" | ...
    required: bool = False
    default: Any = None
    description: str | None = None

class NodeOutput(BaseModel):
    name: str
    type: str
    description: str | None = None

class StateUpdate(BaseModel):
    """Flowise-parity: side-effect state update per node."""
    key: str                     # state variable name (e.g. "user_name")
    value: Any                   # literal OR reference "{{nodeId.output}}"

class NodeDefinition(BaseModel):
    type: str                    # unique id: "llm_vnpt_chat"
    category: str                # "llm" | "retrieval" | "control" | ...
    label: str
    description: str
    icon: str                    # lucide icon name
    version: int = 1
    inputs: list[NodeInput]
    outputs: list[NodeOutput]
    credentials: list[str] = []  # accepted credential types

# Every node instance's `data` JSON may include an optional `update_flow_state` field:
#   { "update_flow_state": [ {"key": "foo", "value": "{{n2.response}}"}, ... ] }
# This is NOT declared per-node — it's injected universally by the executor.
# Applied AFTER execute() returns, before passing state to next node.

class BaseNode(ABC):
    definition: NodeDefinition

    @abstractmethod
    async def execute(self, ctx: "NodeExecutionContext") -> dict[str, Any]:
        """Return dict keyed by output name."""
```

### NodeExecutionContext (`context.py`)

```python
@dataclass
class NodeExecutionContext:
    node_id: str
    inputs: dict[str, Any]                      # resolved from upstream outputs
    credentials: dict[str, dict]                # { credId: decrypted data }
    emit: Callable[[ExecutionEvent], None]      # SSE streaming
    state: dict[str, Any]                       # shared flow state
    session_id: str
    execution_id: str
```

### Registry (`registry.py`)

```python
class NodeRegistry:
    _nodes: dict[str, type[BaseNode]] = {}

    @classmethod
    def register(cls, node_cls: type[BaseNode]):
        cls._nodes[node_cls.definition.type] = node_cls

    @classmethod
    def get(cls, node_type: str) -> type[BaseNode]:
        if node_type not in cls._nodes:
            raise FlowValidationError(f"Unknown node type: {node_type}")
        return cls._nodes[node_type]

    @classmethod
    def all_definitions(cls) -> list[NodeDefinition]:
        return [n.definition for n in cls._nodes.values()]
```

### Executor (`executor.py`)

```python
from langgraph.graph import StateGraph, START, END

def apply_state_updates(state: dict, node_output: dict, updates: list[dict], node_id: str) -> dict:
    """
    Flowise-parity: apply `update_flow_state` side-effects after a node runs.
    Updates write to TOP-LEVEL state keys (not nested under node_id).
    Value can be a literal OR a reference `{{nodeId.output}}` / `{{$node.output}}`
    where `$node` means the current node's output.
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
    def __init__(self, flow_def: FlowDefinition, credentials: dict, emit: Callable):
        self.flow = flow_def
        self.credentials = credentials
        self.emit = emit

    def build_graph(self) -> StateGraph:
        graph = StateGraph(dict)  # state = plain dict for MVP

        for node in self.flow.nodes:
            node_cls = NodeRegistry.get(node.type)
            instance = node_cls()
            graph.add_node(node.id, self._wrap_node(node, instance))

        # Entry edge
        start_node = next(n for n in self.flow.nodes if n.type == "start")
        graph.add_edge(START, start_node.id)

        for edge in self.flow.edges:
            graph.add_edge(edge.source, edge.target)

        # Auto-wire End node → END
        end_nodes = [n for n in self.flow.nodes if n.type == "end"]
        for end in end_nodes:
            graph.add_edge(end.id, END)

        return graph.compile()

    def _wrap_node(self, node, instance):
        async def run(state: dict) -> dict:
            self.emit(ExecutionEvent(type="node_start", node_id=node.id))
            try:
                ctx = NodeExecutionContext(
                    node_id=node.id,
                    inputs=self._resolve_inputs(node, state),
                    credentials=self.credentials,
                    emit=self.emit,
                    state=state,
                    session_id=state.get("session_id"),
                    execution_id=state.get("execution_id"),
                )
                result = await instance.execute(ctx)
                # Flowise-parity: apply update_flow_state AFTER execute
                next_state = {**state, node.id: result}
                updates = node.data.get("update_flow_state") or []
                if updates:
                    next_state = apply_state_updates(next_state, result, updates, node.id)
                    self.emit(ExecutionEvent(
                        type="state_updated", node_id=node.id,
                        data={u["key"]: next_state.get(u["key"]) for u in updates},
                    ))
                self.emit(ExecutionEvent(type="node_end", node_id=node.id, output=result))
                return next_state
            except Exception as e:
                self.emit(ExecutionEvent(type="node_error", node_id=node.id, error=str(e)))
                raise
        return run

    async def stream(self, inputs: dict) -> AsyncIterator[ExecutionEvent]:
        graph = self.build_graph()
        async for event in graph.astream(inputs):
            yield event  # + the events emitted via self.emit flow through SSE directly
```

### SSE endpoint (`app/api/flow.py`)

```python
@router.post("/v1/flows/execute")
async def execute_flow(req: ExecuteFlowRequest):
    async def stream():
        queue = asyncio.Queue()
        def emit(ev): queue.put_nowait(ev)

        executor = FlowExecutor(req.flow_def, req.credentials, emit)
        task = asyncio.create_task(
            _run_to_completion(executor, req.inputs, queue)
        )
        while True:
            ev = await queue.get()
            yield f"event: {ev.type}\ndata: {ev.model_dump_json()}\n\n"
            if ev.type in ("done", "error"):
                break
        await task

    return EventSourceResponse(stream())

@router.get("/v1/flows/node-types")
async def list_node_types():
    return {"nodes": [d.model_dump() for d in NodeRegistry.all_definitions()]}

@router.post("/v1/flows/validate")
async def validate_flow(flow: FlowDefinition):
    errors = FlowValidator(flow).validate()
    return {"valid": len(errors) == 0, "errors": errors}
```

## Requirements

Version-locked per Phase 00 research ([researcher-260413-1251-langgraph-flowise-porting.md](../reports/researcher-260413-1251-langgraph-flowise-porting.md)). Add to `genai-engine/requirements.txt`:

```text
# LangGraph Core
langgraph==1.1.6
langchain-core==0.3.0
pydantic==2.9.0

# LLM Integrations
langchain-openai==0.2.0
langchain-anthropic==0.2.0
langchain-community==0.3.0

# Persistence (Phase 09 uses checkpointer)
langgraph-checkpoint-postgres==0.2.0
asyncpg==0.30.0

# Perf (optional, recommended)
uvloop==0.20.0
```

**Python:** ≥3.11 required (ContextVar propagation issue in 3.10 with stream writer). Confirm `python --version` ≥ 3.11 before install.

## Success criteria

- [ ] `app/flow/` imports cleanly, no circular deps
- [ ] Register `HelloNode` → appears in `GET /v1/flows/node-types`
- [ ] Minimal flow `[Start → Hello → End]` executes end-to-end via `/v1/flows/execute`
- [ ] SSE stream emits: `flow_start, node_start(start), node_end(start), node_start(hello), node_end(hello), ..., done`
- [ ] `POST /v1/flows/validate` detects: orphan nodes, missing required inputs, unknown node types
- [ ] `update_flow_state` helper resolves literal + `{{nodeId.output}}` + `{{$node.output}}` refs correctly
- [ ] `state_updated` SSE event emitted when a node writes to flow state
- [ ] Unit tests: registry, executor graph build, invalid flow detection, `apply_state_updates` (3 cases: literal / cross-node ref / self-node ref)

## Risks

- **LangGraph async + FastAPI event loop** — use `asyncio.to_thread` if any sync LangChain tool blocks
- **SSE keepalive on NestJS proxy** — confirm proxy doesn't buffer (use `X-Accel-Buffering: no`)
- **State serialization** — state dict must be JSON-serializable (no raw objects)

## Out of scope

- Checkpointing / resume (phase 9)
- Parallel node execution (LangGraph default is topological — good enough)
- Subgraphs / nested flows
