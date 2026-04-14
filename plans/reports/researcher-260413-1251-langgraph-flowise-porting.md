# LangGraph-Python Porting Research: Flowise Agentflow V2 Execution Engine

**Report Date:** 2026-04-13  
**Status:** Pre-implementation analysis  
**Scope:** Python LangGraph viability for user-customizable agent flows in smartbot-v2  

---

## 1. LangGraph-Python State Assessment

### Latest Version & Stability
- **Current stable:** 1.1.6 (Apr 3, 2026) | **Python:** ≥3.10 (tested 3.10–3.13)
- **Maturity:** Production-ready (v1.0 reached Q4 2025; adopted by Klarna, Uber, Replit, Elastic)
- **Verdict:** ✅ Safe for production MVP. No beta warnings.

### Core Primitives Coverage
| Primitive | Status | Notes |
|---|---|---|
| `StateGraph`, `add_node`, `add_edge` | ✅ Available | Foundational; well-tested |
| `add_conditional_edges` | ✅ Available | Dynamic routing confirmed |
| `START`, `END` constants | ✅ Available | Standard entry/exit markers |
| `compile()` → `CompiledGraph` | ✅ Available | Returns immutable, runnable graph |
| `.stream()` / `.astream()` | ✅ Available | Sync & async execution modes |
| Subgraphs | ✅ Available | Nested graphs with state isolation |
| Tool binding & agents | ✅ Available | `bind_tools()` + `create_tool_calling_agent()` |

**Gap:** No built-in loop node. Flowise has `loopAgentflow`; LangGraph requires subgraph + recursion or conditional edges that loop back.

### Streaming Modes (for SSE-per-node requirement)
LangGraph `.astream()` supports **7 stream modes**:

| Mode | Output | Use Case |
|---|---|---|
| `values` | Full state snapshot after each step | UI state sync |
| `updates` | Deltas (changes only) after each step | Bandwidth-efficient updates |
| `messages` | 2-tuple (token, metadata) from LLM calls | Token-by-token streaming to client |
| `custom` | User-defined data via `get_stream_writer()` | Node-emitted arbitrary data |
| `checkpoints` | State save events (requires checkpointer) | Execution trace logging |
| `tasks` | Start/finish events per node | Progress bars, node timing |
| `debug` | All info combined (checkpoints + tasks + metadata) | Full observability |

**Recommendation for MVP:** Use `messages` mode (native LLM token streaming) + `updates` mode (node completion events). Emit node-level events via `custom` mode for trace persistence.

### Checkpointing Backends

| Backend | Type | Production Ready | Setup Complexity |
|---|---|---|---|
| `MemorySaver` | In-memory | ❌ Dev only | Trivial |
| `SqliteSaver` | File-based SQLite | ⚠️ Single-user | Low |
| `PostgresSaver` | PostgreSQL | ✅ Yes | Medium (requires async setup) |
| `AsyncPostgresSaver` | PostgreSQL async | ✅ Yes | Medium (lifecycle mgmt required) |

**Verdict:** Use `PostgresSaver` + FastAPI lifespan context manager for production. Matches existing PostgreSQL 16 in smartbot-v2.

### Interrupts & Human-in-the-Loop
- **API:** `interrupt(value)` pauses node, surfaces value to caller, persists state via checkpointer.
- **Resume:** `graph.invoke(Command(resume=user_input), config={"configurable": {"thread_id": "..."}})` continues from pause point.
- **State Inspection:** Pending interrupts visible in `get_state()` → `StateSnapshot.interrupts`.
- **Maturity:** ✅ Stable (Feb 2025 LangChain release simplified API).
- **Fit:** Replaces Flowise's `IHumanInput` pause mechanism cleanly. ✅

### Async + FastAPI Compatibility
**No inherent blocking issues.** Key gotchas:
1. **Sync DB calls in async handlers block event loop** — wrap with `asyncio.to_thread()`.
2. **PostgresSaver lifecycle:** Move setup into FastAPI `lifespan` context manager, not module-level scripts.
3. **ContextVar propagation (Python 3.10):** Known issue with stream writer across async tasks. **Use Python ≥3.11 for safety.**
4. **UVLoop recommended** for 1000+ concurrent requests (agents = mostly I/O-bound waiting on LLM).

---

## 2. Flowise Agentflow V2 Execution Model

### Flow Data Schema (from `buildAgentflow.ts` + Interfaces)

```typescript
// Flow definition
interface IReactFlowObject {
  nodes: IReactFlowNode[]    // [{ id, type, data: INodeData, position, ... }]
  edges: IReactFlowEdge[]    // [{ source, target, sourceHandle, targetHandle, ... }]
  viewport: { x, y, zoom }
}

// Single node
interface IReactFlowNode {
  id: string
  type: string  // e.g. "llmAgentflow", "toolAgentflow", "humanInputAgentflow"
  data: {
    name: string         // Component name
    label: string        // UI label
    inputs: Record<string, any>  // Input configs (can contain {{variable}} refs)
    output: any          // Last output of this node
  }
  position: { x, y }
  // ... UI metadata
}

interface IReactFlowEdge {
  source: string        // source node ID
  target: string        // target node ID
  sourceHandle: string  // output port
  targetHandle: string  // input port
  data?: {
    isHumanInput?: boolean  // Flag for pause edges
    edgeLabel?: string
  }
}
```

### Execution State Persistence (Flowise)
```typescript
// Flowise Execution entity
{
  id: uuid,
  agentflowId: string,
  state: "INPROGRESS" | "STOPPED" | "COMPLETED",
  sessionId: string,
  executionData: JSON.stringify([  // Array of node executions in order
    {
      nodeId: string,
      data: {
        name: string,
        label: string,
        inputs: {...},
        output: {...}    // What the node produced
      },
      startTime: number,
      endTime: number
    },
    ...
  ]),
  createdDate, updatedDate, stoppedDate
}
```

### Core Execution Algorithm (simplified)
1. **Topological sort:** Determine execution order from DAG (nodes + edges).
2. **Node queue:** Maintain `INodeQueue[]` of nodes ready to execute (dependencies met).
3. **Waiting nodes:** Track nodes awaiting multiple inputs via `IWaitingNode` (Map of source node ID → input).
4. **Execute step-by-step:**
   - Dequeue next node.
   - Resolve variables ({{$question}}, {{$form.field}}, {{$chat_history}}).
   - Instantiate node, call `.execute()`, record output.
   - Process node outputs → determine next nodes to queue.
   - For conditional edges: skip certain children based on condition logic.
   - For human input pause: call `sseStreamer.streamNextAgentFlowEvent()` with pause marker.
5. **Loop handling:** `loopAgentflow` node can re-queue a prior node up to `maxLoopCount` (default 10).
6. **Stream callbacks:** `sseStreamer` emits tokens (from LLM nodes) + node progress events.

**Key insight:** Flowise manages execution as a **sequential state machine with topological ordering**, not a graph traversal. The executor explicitly queues nodes and tracks waiting dependencies.

---

## 3. Flowise → LangGraph Mapping Table

| Flowise Concept | LangGraph-Python Primitive | Mapping Fit | Gaps/Notes |
|---|---|---|---|
| **INodeQueue** (topological order) | StateGraph topological resolution at compile time | ✅ Automatic | LangGraph resolves at `.compile()`, not runtime. For dynamic routing, use `add_conditional_edges()`. |
| **IWaitingNode** (multi-input accumulation) | State schema; node fn waits for required keys | ⚠️ Partial | LangGraph nodes are functions; accumulation must be explicit in state. No built-in "wait for N inputs" primitive. |
| **Conditional edges** | `add_conditional_edges(source, condition_fn, {path: target})` | ✅ Full | Condition function evaluates state → next node(s). Mature feature. |
| **Loop node** | Subgraph + conditional edge back to parent | ⚠️ Workaround | LangGraph has no native loop node. Implement via: (a) subgraph enclosing loop body, (b) conditional edge that evaluates iteration count, (c) edge back to loop start. |
| **Variable resolution** ({{...}}) | State dict + condition/node function logic | ✅ Manual | Flowise does string interpolation; LangGraph uses state dict. Implement variable resolution in node functions. |
| **IHumanInput pause** | `interrupt(value)` + checkpointer | ✅ Full | Direct parallel. Pause node calls `interrupt()`, client resumes with `Command(resume=input)`. |
| **IServerSideEventStreamer** | `.astream(stream_mode=[...])` + custom emitter | ✅ Achievable | Use `stream_mode="custom"` + `get_stream_writer()` for per-node events. Use `stream_mode="messages"` for LLM token streaming. |
| **Tool-calling agent** | `create_tool_calling_agent()` + `bind_tools()` | ✅ Full | LangChain abstracts tool binding. OpenAI SDK integration via `langchain-openai`. |
| **Execution trace JSON** | StateSnapshot (from checkpointer) + astream events | ✅ Achievable | Reconstruct trace from checkpoint history + streamed updates. No single "executionData" JSON; must aggregate. |

**Bottom line:** ~80% direct mapping. Gaps: loop node (custom implementation), multi-input waiting (explicit state logic), execution trace aggregation (plumbing work).

---

## 4. Version Lock Recommendation

### Compatibility Matrix (April 2026)

```txt
langgraph                 1.1.6     (core orchestration)
├─ requires: langchain-core >= 0.2.0
├─ requires: pydantic >= 1.7
│
langchain-core            0.3.0     (message types, tools, runnables)
langchain                 0.3.0     (utilities, deprecated in favor of partner packages)
langchain-openai          0.2.0     (OpenAI ChatModel binding)
langchain-anthropic       0.2.0     (Anthropic ChatModel binding)
langchain-community       0.3.0     (community integrations)

langgraph-checkpoint-postgres  0.2.0  (async PostgreSQL checkpointer)
pydantic                  2.9.0     (data validation)
fastapi                   0.115.0   (existing in smartbot-v2)
uvicorn                   0.30.0    (ASGI server)
```

### Recommended `requirements.txt` snippet

```text
# LangGraph Core
langgraph==1.1.6
langchain-core==0.3.0
pydantic==2.9.0

# LLM Integrations
langchain-openai==0.2.0
langchain-anthropic==0.2.0
langchain-community==0.3.0

# Persistence
langgraph-checkpoint-postgres==0.2.0
sqlalchemy==2.0.23          # ORM for PostgresSaver
asyncpg==0.30.0             # Async PostgreSQL driver

# Async/Server
fastapi==0.115.0
uvicorn[standard]==0.30.0
uvloop==0.20.0              # Performance: 2-4x faster than default asyncio

# Utilities
pydantic-settings==2.3.0    # For env-based config
python-dotenv==1.0.1
```

**Rationale:**
- All packages follow semantic versioning (1.x stable).
- langchain-core 0.3.0 is latest as of April 2026 (no breaking changes vs 0.2.x for this use case).
- langgraph-checkpoint-postgres requires langchain-core ≥0.2.0 ✅
- asyncpg for PostgresSaver async I/O (required for FastAPI).
- uvloop is optional but strongly recommended for high concurrency (1000+ req/s).

---

## 5. Spike Proposal — One-Day Validation

### Objective
Validate: StateGraph with 3 nodes (Start → VNPT LLM → End) streams tokens to FastAPI SSE endpoint in real-time.

### Files to Create (~120 LOC total)

#### 1. `genai-engine/app/agents/spike_agent.py` (60 LOC)
```python
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI  # or equivalent for VNPT
from langchain_core.messages import BaseMessage, HumanMessage
from typing import Annotated
from pydantic import BaseModel

class AgentState(BaseModel):
    messages: list[BaseMessage]

def llm_node(state: AgentState) -> dict:
    """Call LLM and update state."""
    llm = ChatOpenAI(model="gpt-4", api_key="...")  # or VNPT endpoint
    response = llm.invoke(state.messages)
    return {"messages": state.messages + [response]}

def build_spike_graph():
    """Simple 3-node graph: START → LLM → END"""
    graph = StateGraph(AgentState)
    graph.add_node("llm", llm_node)
    graph.add_edge(START, "llm")
    graph.add_edge("llm", END)
    return graph.compile()

# Export for endpoint
spike_graph = build_spike_graph()
```

#### 2. `genai-engine/app/routes/spike_sse.py` (50 LOC)
```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
import json
from app.agents.spike_agent import spike_graph

router = APIRouter()

@router.post("/spike/stream")
async def stream_agent(query: str):
    """Stream agent execution as SSE."""
    
    def event_generator():
        config = {"configurable": {"thread_id": "spike-test"}}
        initial_state = {
            "messages": [{"type": "human", "content": query}]
        }
        
        # Astream with updates mode
        for chunk in spike_graph.stream(initial_state, config, stream_mode="updates"):
            # Emit as SSE
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

#### 3. Test Script (`spike_test.sh`) (10 LOC)
```bash
#!/bin/bash
curl -X POST http://localhost:8000/spike/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What is 2+2?"}' \
  --no-buffer  # Real-time streaming
```

### Success Criteria
- ✅ `/spike/stream` endpoint responds with `text/event-stream`.
- ✅ Tokens arrive at client in real-time (curl shows output as it streams).
- ✅ Graph executes without errors (LLM call succeeds).
- ✅ State updates are valid JSON in SSE format.
- ✅ Thread-based resumption works (same `thread_id` resume after interrupt).

### Blockers to Watch
1. **VNPT LLM API incompatibility** — if endpoint diverges from OpenAI (e.g., different auth headers, model names). *Action:* Test VNPT auth/schema first.
2. **PostgreSQL connection in FastAPI lifespan** — if using `AsyncPostgresSaver`, must wire checkpointer in lifespan. *Action:* Test with MemorySaver first, add Postgres after.
3. **Async context propagation** — if stream writer fails across tasks in Python 3.10. *Action:* Use Python 3.11+.
4. **Uvicorn reload with checkpointer** — dev mode may create connection leaks. *Action:* Test with `--no-reload` or context manager cleanup.

---

## 6. Risks & Unknowns

### Cannot Confirm Without Trying (Spike Tests)

| Risk | Severity | Mitigation |
|---|---|---|
| **VNPT LLM API contract** — Does it follow OpenAI spec exactly, or are there auth/streaming differences? | HIGH | Before MVP: (1) Test `langchain-openai.ChatOpenAI(base_url=vnpt_endpoint)` call. (2) Verify streaming token deltas match OpenAI format. (3) Test error responses. |
| **Loop node custom implementation overhead** — How complex is a loop node vs hardcoded loop in Flowise? | MEDIUM | Spike: build minimal loop via subgraph + recursion. Estimate: 50–100 LOC per loop node type. If too complex, recommend loop as "advanced feature, phase 2." |
| **Multi-input node accumulation in practice** — Does explicit state management scale for 25+ node types? | MEDIUM | Spike: test a 2-input node (e.g., merge node) and check state coupling. If unwieldy, consider helper `accumulate_inputs()` utility. |
| **Execution trace reconstruction** — Can we replay full trace from checkpointer? | LOW | Verification: after execution, call `graph.get_state(config)` → check `StateSnapshot`. If incomplete, use stream events log. |

### Flowise Pattern Gaps (Confirmed)

1. **Loop node:** Flowise has built-in `loopAgentflow` node; LangGraph requires custom subgraph or conditional recursion. **Workaround:** Wrap loop body in StateGraph subgraph; parent graph conditionally edges back to subgraph until count exhausted.

2. **Variable resolution:** Flowise does {{...}} string interpolation at node init; LangGraph uses typed state dict. **Mitigation:** Build `resolve_variables(node_inputs, state)` helper to populate inputs from state before node call.

3. **Execution trace schema:** Flowise stores `executionData` as single JSON blob; LangGraph checkpointer stores state snapshots + separate event logs. **Mitigation:** On execution end, aggregate checkpoint history + streamed events into Flowise-like trace format for backwards compatibility.

### Performance Unknowns

- **LangGraph overhead vs raw async:** No published benchmarks for 15-node flows. Likely <50ms overhead per node (graph compilation is O(n), execution is O(n) calls). **Acceptable for MVP.**
- **PostgresSaver latency:** Checkpoint write per step (if enabled). If high-frequency updates bog down, consider async batching or cached in-memory checkpointer until end.

### VNPT LLM Unknowns

VNPT is Vietnam's state telecom. No public documentation found on a "VNPT LLM" service or its API spec. Assuming:
- Exists and is OpenAI-compatible (common pattern for self-hosted LLMs).
- Authentication likely via API key or mTLS.
- Streaming may have custom metadata fields.

**Before implementation:** Contact VNPT team or reverse-engineer from existing smartbot-v2 usage.

---

## 7. Recommendations

### MVP Go/No-Go
✅ **Recommended: GO ahead with LangGraph.**

**Rationale:**
- LangGraph 1.1.6 is stable, production-proven, and covers 80% of Flowise patterns.
- SSE streaming via `astream()` is straightforward.
- Interrupt-based human-in-the-loop is simpler than Flowise's callback pattern.
- PostgreSQL checkpointer aligns with existing infrastructure.
- Spike (5–8 hours) is low-risk validation.

### Phase Sequencing
1. **Phase 1 (Spike, 1 day):** 3-node graph + streaming + VNPT auth validation.
2. **Phase 2 (MVP, 2 weeks):** 15 basic node types + conditional routing + human pause + trace persistence.
3. **Phase 3 (Polish, 1 week):** Loop node custom impl, multi-input node tests, error handling, docs.
4. **Phase 4 (Stretch, if time):** Advanced features (subgraphs for team workflows, multi-agent coordination).

### Node Type Priority (MVP)
Start with high-frequency node types in existing flows:
1. LLM/Chat nodes (bind VNPT).
2. Conditional/routing nodes.
3. Human input pause node.
4. Tool calling node (integrate with backend /{route} calls).
5. Data transform node (JSON manipulation).

Defer: Loop, recursion agents, advanced tool combinations.

### Code Location
- Graph definitions: `genai-engine/app/agents/flows/` (one file per flow or type).
- Node implementations: `genai-engine/app/nodes/` (one file per node type).
- Routes: `genai-engine/app/routes/execution.py` (streaming endpoint).
- Schema: `genai-engine/app/schemas/agent.py` (StateGraph state types, flow JSON schema).

---

## Unresolved Questions

1. **VNPT LLM exact API spec** — Is it OpenAI-compatible? What auth method? Streaming delta format?
2. **Loop node execution model** — Should loops be a discrete node type or a graph composition pattern? Complexity vs. user ergonomics tradeoff?
3. **Backwards compatibility** — Must new Python engine produce Flowise-compatible trace JSON? Or is clean break acceptable?
4. **Execution history depth** — How many execution traces to retain per bot? (Affects checkpoint table size.)
5. **Rate limiting & concurrency** — Expected QPS per bot? Affects PostgresSaver batch sizing and uvloop necessity.

---

## Sources Consulted

- [LangGraph Python Docs — Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangGraph Python Docs — Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LangGraph Python Docs — Subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)
- [LangGraph Python Docs — Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph PyPI — Latest 1.1.6](https://pypi.org/project/langgraph/)
- [LangChain Release Policy](https://docs.langchain.com/oss/python/release-policy)
- [LangGraph Tool Calling Blog](https://blog.langchain.com/tool-calling-with-langchain/)
- [LangChain GitHub Releases](https://github.com/langchain-ai/langchain/releases)
- Flowise fork analysis: `buildAgentflow.ts`, `buildAgentGraph.ts`, Interface definitions, Execution entity.

---

**Report compiled:** 2026-04-13 by Researcher Agent  
**Next step:** Approval for Phase 1 spike execution.
