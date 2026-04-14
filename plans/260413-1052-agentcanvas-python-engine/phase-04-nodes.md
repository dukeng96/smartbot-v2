# Phase 04 — Node Set (11 nodes)

**Status:** ⬜ pending

## Goal
Implement all 11 flow nodes. Covers RAG, tool-calling agent, conditional branching, user-authored custom logic, HTTP calls, and human-in-the-loop approval.

## Node list

| # | Type | Category | Description |
|---|---|---|---|
| 1 | `start` | control | Entry. Inputs: `chat_input: string`, optional `ephemeral_memory: boolean`. Inits Flow State |
| 2 | `llm` | llm | VNPT LLM. **Messages array** `[{role, content}]` repeater. Inline memory toggle + window size |
| 3 | `agent` | agent | Tool-calling loop. Bound tools = array of `CustomTool` IDs. `max_iterations` default 5 |
| 4 | `custom_tool` | tool | User-authored tool ref: `{ custom_tool_id: uuid, overrides?: {...} }`. Loads from DB, wraps as LangChain Tool |
| 5 | `custom_function` | utility | Inline RestrictedPython block. Returns dict → next node |
| 6 | `condition` | control | N-way rule-based branch. Comparators: eq/ne/gt/lt/contains. Implicit else |
| 7 | `retriever` | retrieval | Qdrant hybrid search (bge-m3). Calls existing `genai-engine/services/retriever.py` |
| 8 | `direct_reply` | io | Terminal node. Static/templated reply, streams as tokens |
| 9 | `sticky_note` | utility | Canvas annotation. No-op `execute()` |
| 10 | `http` | tool | Generic HTTP request. Inputs: method, url, headers, body. SSRF protection built-in |
| 11 | `human_input` | control | Pause execution via LangGraph `interrupt()`, wait for user approve/reject |

## File layout

```
genai-engine/app/flow/nodes/
  __init__.py         # imports + registers all 11 nodes
  control/
    start.py
    condition.py
    human_input.py
  io/
    direct_reply.py
  llm/
    vnpt.py
  agent/
    tool_calling.py
  tool/
    custom_tool.py
    http.py
  utility/
    custom_function.py
    sticky_note.py
  retrieval/
    qdrant.py
```

## Node specs

### `llm` — VNPT LLM with messages array

```python
class VnptLlmNode(BaseNode):
    definition = NodeDefinition(
        type="llm",
        category="llm",
        label="LLM",
        description="Call VNPT Chat Completions (OpenAI-compatible)",
        icon="sparkles",
        credentials=["vnpt"],
        inputs=[
            NodeInput(name="credential_id", type="credential:vnpt", required=True),
            NodeInput(name="model", type="string", default="llm-large-v4",
                      enum=["llm-small-v4", "llm-medium-v4", "llm-large-v4"]),
            NodeInput(
                name="messages",
                type="array",
                required=True,
                description="Ordered chat messages. Roles: system|user|assistant. Content supports {{state.var}} + {{nodeId.output}} templating.",
                schema=[{"role": "system|user|assistant", "content": "string"}],
            ),
            NodeInput(name="memory_enabled", type="boolean", default=False,
                      description="Prepend last N conversation turns from session history"),
            NodeInput(name="memory_window", type="number", default=5),
            NodeInput(name="temperature", type="number", default=0.7),
            NodeInput(name="max_tokens", type="number", default=4096),
            NodeInput(name="stream", type="boolean", default=True),
            NodeInput(
                name="return_response_as",
                type="string",
                default="flow_state",
                enum=["assistant_message", "flow_state"],
                description="assistant_message = terminal, stream tokens to client, node must have no downstream edges. flow_state = write output to state, continue flow.",
            ),
        ],
        outputs=[
            NodeOutput(name="response", type="string"),
            NodeOutput(name="tokens_used", type="number"),
        ],
    )

    async def execute(self, ctx):
        cred = ctx.credentials[ctx.inputs["credential_id"]]
        client = AsyncOpenAI(api_key=cred["apiKey"], base_url=cred["baseUrl"])

        model = ctx.inputs["model"]
        ALLOWED = {"llm-small-v4", "llm-medium-v4", "llm-large-v4"}
        if model not in ALLOWED:
            raise NodeExecutionError(f"Unsupported VNPT model: {model}")

        messages = [
            {"role": m["role"], "content": ctx.resolve(m["content"])}
            for m in ctx.inputs["messages"]
        ]

        if ctx.inputs.get("memory_enabled"):
            history = await ctx.load_history(
                session_id=ctx.session_id,
                window=ctx.inputs["memory_window"],
            )
            sys_end = next((i for i, m in enumerate(messages) if m["role"] != "system"), 0)
            messages = messages[:sys_end] + history + messages[sys_end:]

        # Terminal mode: force streaming to client, mark as final assistant reply
        terminal = ctx.inputs.get("return_response_as") == "assistant_message"
        should_stream = terminal or ctx.inputs.get("stream")

        if should_stream:
            response = ""
            stream = await client.chat.completions.create(
                model=model, messages=messages,
                temperature=ctx.inputs["temperature"],
                max_tokens=ctx.inputs["max_tokens"],
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                response += delta
                ctx.emit(ExecutionEvent(
                    type="token", node_id=ctx.node_id, data=delta,
                    meta={"terminal": terminal},
                ))
            ctx.emit(ExecutionEvent(
                type="llm_call_completed",
                node_id=ctx.node_id,
                data={"provider": "vnpt", "model": model, "tokens": None},
            ))
            if terminal:
                ctx.emit(ExecutionEvent(
                    type="assistant_message",
                    node_id=ctx.node_id,
                    data={"content": response},
                ))
                ctx.halt()  # executor stops after this node; downstream edges forbidden by validator
            return {"response": response, "tokens_used": None}

        resp = await client.chat.completions.create(
            model=model, messages=messages,
            temperature=ctx.inputs["temperature"],
            max_tokens=ctx.inputs["max_tokens"],
        )
        ctx.emit(ExecutionEvent(
            type="llm_call_completed",
            node_id=ctx.node_id,
            data={"provider": "vnpt", "model": model, "tokens": resp.usage.total_tokens},
        ))
        return {"response": resp.choices[0].message.content, "tokens_used": resp.usage.total_tokens}
```

### `agent` — Tool-calling agent

```python
class AgentNode(BaseNode):
    definition = NodeDefinition(
        type="agent",
        category="agent",
        label="Agent",
        description="LLM reasons and calls tools iteratively (max N iterations)",
        icon="robot",
        credentials=["vnpt"],
        inputs=[
            NodeInput(name="credential_id", type="credential:vnpt", required=True),
            NodeInput(name="model", type="string", default="llm-large-v4"),
            NodeInput(
                name="messages",
                type="array",
                required=True,
                description="System + initial user message. Same shape as LLM node.",
            ),
            NodeInput(
                name="tools",
                type="array",
                description="CustomTool IDs to expose to the agent",
                schema={"type": "string", "format": "uuid"},
            ),
            NodeInput(name="max_iterations", type="number", default=5),
            NodeInput(name="memory_enabled", type="boolean", default=False),
            NodeInput(name="memory_window", type="number", default=5),
            NodeInput(
                name="return_response_as",
                type="string",
                default="flow_state",
                enum=["assistant_message", "flow_state"],
                description="assistant_message = terminal, stream final answer to client, node must have no downstream edges. flow_state = write output to state, continue flow.",
            ),
        ],
        outputs=[
            NodeOutput(name="response", type="string"),
            NodeOutput(name="tool_calls", type="array"),
        ],
    )

    async def execute(self, ctx):
        from langchain.agents import create_tool_calling_agent, AgentExecutor
        tools = [await ctx.load_custom_tool(tid) for tid in ctx.inputs.get("tools", [])]
        llm = self._build_vnpt_llm(ctx)

        try:
            agent = create_tool_calling_agent(llm, tools, prompt=self._build_prompt(ctx))
        except NotImplementedError:
            from langchain.agents import create_react_agent
            agent = create_react_agent(llm, tools, prompt=self._build_react_prompt(ctx))

        executor = AgentExecutor(
            agent=agent, tools=tools,
            max_iterations=ctx.inputs["max_iterations"],
            return_intermediate_steps=True,
        )
        result = await executor.ainvoke({"input": self._initial_user_message(ctx)})

        terminal = ctx.inputs.get("return_response_as") == "assistant_message"
        if terminal:
            # Agent loops use non-streaming per-call; stream final answer as one chunk
            ctx.emit(ExecutionEvent(type="token", node_id=ctx.node_id,
                                    data=result["output"], meta={"terminal": True}))
            ctx.emit(ExecutionEvent(type="assistant_message", node_id=ctx.node_id,
                                    data={"content": result["output"]}))
            ctx.halt()
        return {
            "response": result["output"],
            "tool_calls": result.get("intermediate_steps", []),
        }
```

Agent with 0 tools degrades to single-turn LLM.

### `custom_tool` — User-authored tool reference

```python
class CustomToolNode(BaseNode):
    """
    Serves as a TOOL BINDING for the Agent node.
    Canvas UI: rendered as a "tool card" child of Agent, or bound via Agent.tools array.
    When placed standalone (advanced), invokes the tool directly with resolved args.
    """
    definition = NodeDefinition(
        type="custom_tool",
        category="tool",
        label="Custom Tool",
        description="Reference a user-authored tool from the tenant's CustomTool library",
        icon="wrench",
        inputs=[
            NodeInput(name="custom_tool_id", type="uuid", required=True,
                      description="ID of a CustomTool row in tenant's library"),
            NodeInput(name="args", type="object", required=False,
                      description="Resolved tool arguments (matches CustomTool.schema). Only for standalone invocation."),
        ],
        outputs=[NodeOutput(name="result", type="any")],
    )

    async def execute(self, ctx):
        tool_def = await ctx.load_custom_tool_def(ctx.inputs["custom_tool_id"])
        from app.flow.sandbox import run_restricted_python
        result = await run_restricted_python(
            code=tool_def.implementation,
            args=ctx.inputs.get("args", {}),
            schema=tool_def.schema,
            timeout_s=5,
        )
        return {"result": result}
```

### `custom_function` — Inline RestrictedPython

```python
class CustomFunctionNode(BaseNode):
    definition = NodeDefinition(
        type="custom_function",
        category="utility",
        label="Custom Function",
        description="Inline Python code (sandboxed). Escape hatch for one-off logic.",
        icon="code",
        inputs=[
            NodeInput(name="code", type="string", required=True,
                      description="RestrictedPython source. Access state via $state.var. Return dict."),
            NodeInput(name="state_refs", type="array", required=False,
                      description="Names of state variables to expose (e.g. ['user_name', 'last_answer'])"),
        ],
        outputs=[NodeOutput(name="output", type="any")],
    )

    async def execute(self, ctx):
        from app.flow.sandbox import run_restricted_python
        state_vars = {k: ctx.state.get(k) for k in ctx.inputs.get("state_refs", [])}
        result = await run_restricted_python(
            code=ctx.inputs["code"],
            args=state_vars,
            schema=None,
            timeout_s=5,
        )
        return {"output": result}
```

Sandbox logic, import whitelist, timeout enforcement live in Phase 04.5.

### `retriever` — Qdrant hybrid RAG

```python
class RetrieverNode(BaseNode):
    definition = NodeDefinition(
        type="retriever",
        category="retrieval",
        label="Qdrant Hybrid Retriever",
        description="Semantic + BM25 hybrid search with RRF fusion (bge-m3)",
        icon="database",
        inputs=[
            NodeInput(name="query", type="string", required=True),
            NodeInput(name="kb_ids", type="array", required=True, description="KnowledgeBase IDs"),
            NodeInput(name="top_k", type="number", default=5),
        ],
        outputs=[
            NodeOutput(name="documents", type="array"),
            NodeOutput(name="context", type="string", description="Joined doc text for prompt"),
        ],
    )

    async def execute(self, ctx):
        from app.services.retriever import hybrid_search
        docs = await hybrid_search(
            query=ctx.inputs["query"],
            kb_ids=ctx.inputs["kb_ids"],
            top_k=ctx.inputs["top_k"],
        )
        context = "\n\n".join(d["text"] for d in docs)
        return {"documents": docs, "context": context}
```

### `http` — Generic HTTP request

```python
# genai-engine/app/flow/nodes/tool/http.py
class HttpNode(BaseNode):
    definition = NodeDefinition(
        type="http",
        category="tool",
        label="HTTP Request",
        description="Make an HTTP request with SSRF protection",
        icon="globe",
        inputs=[
            NodeInput(name="method", type="string", required=True, default="GET",
                      description="GET | POST | PUT | PATCH | DELETE"),
            NodeInput(name="url", type="string", required=True,
                      description="Full URL (public only — private/metadata IPs blocked)"),
            NodeInput(name="headers", type="object", required=False, default={}),
            NodeInput(name="body", type="any", required=False,
                      description="JSON body or string"),
            NodeInput(name="timeout_s", type="number", required=False, default=10),
        ],
        outputs=[
            NodeOutput(name="status", type="number"),
            NodeOutput(name="headers", type="object"),
            NodeOutput(name="body", type="any"),
        ],
    )

    async def execute(self, ctx):
        url = ctx.inputs["url"]
        await self._ssrf_check(url)
        async with httpx.AsyncClient(timeout=ctx.inputs.get("timeout_s", 10)) as client:
            resp = await client.request(
                method=ctx.inputs["method"].upper(),
                url=url,
                headers=ctx.inputs.get("headers") or {},
                json=ctx.inputs.get("body") if isinstance(ctx.inputs.get("body"), (dict, list)) else None,
                content=ctx.inputs.get("body") if isinstance(ctx.inputs.get("body"), str) else None,
            )
        if len(resp.content) > 1_000_000:
            raise NodeExecutionError("Response exceeds 1MB limit")
        body = resp.json() if "application/json" in resp.headers.get("content-type", "") else resp.text
        return {"status": resp.status_code, "headers": dict(resp.headers), "body": body}

    async def _ssrf_check(self, url: str):
        import ipaddress, socket
        from urllib.parse import urlparse
        host = urlparse(url).hostname
        if not host:
            raise NodeExecutionError("Invalid URL")
        for res in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(res[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                raise NodeExecutionError(f"Blocked private/metadata IP: {ip}")
```

**Security rules:**
- **SSRF protection:** DNS-resolve hostname → reject private (`10.*`, `172.16.*`, `192.168.*`), loopback (`127.*`), link-local (`169.254.*` — AWS/Azure metadata), multicast
- **Timeout:** default 10s, max 30s (config clamp)
- **Response size:** hard limit 1MB, raises `NodeExecutionError` on overflow
- **Redirect follow:** httpx default up to 5; post-follow URL re-checked

### `human_input` — Pause for approval

```python
# genai-engine/app/flow/nodes/control/human_input.py
from langgraph.types import interrupt, Command

class HumanInputNode(BaseNode):
    """
    Pause flow via LangGraph `interrupt()`. Emits 'awaiting_input' SSE event.
    Frontend shows approve/reject UI. On resume, routes to one of two branches.
    Requires PostgresSaver checkpointer (configured in Phase 03).
    """
    definition = NodeDefinition(
        type="human_input",
        category="control",
        label="Human Input",
        description="Pause for human approval — routes to approve or reject branch",
        icon="user-check",
        inputs=[
            NodeInput(name="prompt", type="string", required=True,
                      description="Message shown to human reviewer"),
            NodeInput(name="context", type="any", required=False,
                      description="Additional data rendered in approval UI"),
        ],
        outputs=[
            NodeOutput(name="approved", type="boolean", description="true → approved branch"),
            NodeOutput(name="feedback", type="string", description="Optional reviewer note"),
        ],
    )

    async def execute(self, ctx):
        ctx.emit(ExecutionEvent(
            type="awaiting_input",
            node_id=ctx.node_id,
            data={"prompt": ctx.inputs["prompt"], "context": ctx.inputs.get("context")},
        ))
        decision = interrupt({
            "prompt": ctx.inputs["prompt"],
            "context": ctx.inputs.get("context"),
        })
        return {
            "approved": decision.get("approved", False),
            "feedback": decision.get("feedback", ""),
        }
```

**Branching:** Use `condition` node downstream of `human_input` → check `{{human_input.approved}} == true` → approve branch, else reject branch.

**Resume API (NestJS):**
```
POST /api/v1/flows/executions/:executionId/resume
Body: { "approved": true, "feedback": "LGTM" }
```

Engine resumes via `graph.ainvoke(Command(resume={...}), config={"configurable": {"thread_id": execution_id}})`.

### `start`, `condition`, `direct_reply`, `sticky_note`

```python
class StartNode(BaseNode):
    """Entry point. Initializes Flow State with chat_input + optional ephemeral_memory toggle."""
    definition = NodeDefinition(
        type="start", category="control", label="Start", icon="play",
        inputs=[
            NodeInput(name="ephemeral_memory", type="boolean", default=False,
                      description="If true, skip persisting state/history at flow end"),
        ],
        outputs=[NodeOutput(name="chat_input", type="string")],
    )
    async def execute(self, ctx):
        return {"chat_input": ctx.state.get("chat_input", "")}


class ConditionNode(BaseNode):
    """N-way rule-based branch. Emits `branch_taken` event."""
    definition = NodeDefinition(
        type="condition", category="control", label="Condition", icon="git-branch",
        inputs=[
            NodeInput(name="conditions", type="array", required=True,
                      description="[{ left, operator (eq|ne|gt|lt|contains), right, label }]"),
        ],
        outputs=[NodeOutput(name="branch", type="string", description="Matched branch label, or 'else'")],
    )
    async def execute(self, ctx):
        for cond in ctx.inputs["conditions"]:
            left = ctx.resolve(cond["left"])
            right = ctx.resolve(cond["right"])
            if self._compare(left, cond["operator"], right):
                ctx.emit(ExecutionEvent(type="branch_taken", node_id=ctx.node_id, data=cond["label"]))
                return {"branch": cond["label"]}
        return {"branch": "else"}


class DirectReplyNode(BaseNode):
    """Terminal node. Streams reply as tokens."""
    definition = NodeDefinition(
        type="direct_reply", category="io", label="Direct Reply", icon="message-circle",
        inputs=[
            NodeInput(name="message", type="string", required=True,
                      description="Supports {{state.var}} + {{nodeId.output}} templating"),
            NodeInput(name="stream_as_tokens", type="boolean", default=True),
        ],
        outputs=[NodeOutput(name="response", type="string")],
    )
    async def execute(self, ctx):
        msg = ctx.resolve(ctx.inputs["message"])
        if ctx.inputs["stream_as_tokens"]:
            for word in msg.split():
                ctx.emit(ExecutionEvent(type="token", node_id=ctx.node_id, data=word + " "))
        return {"response": msg}


class StickyNoteNode(BaseNode):
    """Canvas annotation. Executor skips in graph."""
    definition = NodeDefinition(
        type="sticky_note", category="utility", label="Sticky Note", icon="sticky-note",
        inputs=[NodeInput(name="text", type="string")],
        outputs=[],
    )
    async def execute(self, ctx):
        return {}
```

## `update_flow_state` — per-node state writes

Universally applied by executor from `node.data.update_flow_state`. See `phase-03` for `apply_state_updates` helper.

### Shape (example on LLM node)

```json
{
  "id": "n4",
  "type": "llm",
  "data": {
    "credential_id": "cred_vnpt",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Summarize: {{n2.context}}" }
    ],
    "update_flow_state": [
      { "key": "last_summary", "value": "{{$node.response}}" },
      { "key": "model_used",   "value": "llm-large-v4" }
    ]
  }
}
```

### Semantics

- `key` → written to **top-level** state. Downstream: `{{state.last_summary}}` OR shorthand `{{last_summary}}`.
- `value` can be literal, `"{{nodeId.output}}"`, or `"{{$node.output}}"`.
- Emits `state_updated` SSE event.

Use cases absorbed by `update_flow_state`:
- Init state → Start node's ephemeral_memory toggle + initial flow state payload from caller
- Branch-local assign → `update_flow_state` on the first node inside the branch
- Reset counter → `custom_function` returning a dict written via its `update_flow_state`

## Terminal nodes — `return_response_as`

LLM and Agent nodes accept `return_response_as` with values:

- `flow_state` (default) — output written to flow state via `response` output; execution continues to downstream edges.
- `assistant_message` — node terminates flow. Tokens stream to client as the final assistant reply. Emits `assistant_message` event + calls `ctx.halt()`.

**Validator rule (Phase 05):** if any node has `return_response_as == "assistant_message"`, it MUST have zero outgoing edges. Reject flow on save with clear error: `"LLM/Agent node set to 'assistant_message' cannot have outgoing edges — remove connections or switch to 'flow_state'."`

**Terminal set:** `direct_reply`, `llm(assistant_message)`, `agent(assistant_message)`. Every flow must end in at least one terminal reachable from Start.

## Input resolution convention

Input value can be:
- **Literal:** `"Hello"`, `42`, `true`
- **Reference:** `"{{node_id.output_name}}"` — resolved from flow state
- **State shorthand:** `"{{state.var_name}}"` or `"{{var_name}}"` — top-level state lookup
- **Credential:** `"cred_abc-123"` — resolved via `ctx.credentials` lookup

Resolver defined in Phase 03 `executor.py`.

## Success criteria

- [ ] All 11 nodes register on engine startup
- [ ] `GET /v1/flows/node-types` returns 11 entries with full schemas
- [ ] Seed RAG flow executes: user message → retriever → llm (return_response_as=assistant_message) streams tokens + halts
- [ ] Seed Agent flow executes: with 1+ CustomTools → invokes tool → terminates with assistant_message
- [ ] Tokens stream via SSE from terminal LLM/Agent AND from standalone direct_reply
- [ ] LLM/Agent with `return_response_as=assistant_message` halts flow (no downstream node executes)
- [ ] Condition node switches N-way branches correctly (3+ conditions + else)
- [ ] LLM inline memory (window mode) loads last N turns from session history when enabled
- [ ] Custom Function executes simple RestrictedPython (e.g. `return {"doubled": args["n"] * 2}`)
- [ ] Custom Tool loads from DB, validates args against schema, executes sandboxed
- [ ] Sticky note registered but skipped in execution graph
- [ ] HTTP SSRF test: blocks requests to `169.254.169.254`, `127.0.0.1`, `10.0.0.1` → `NodeExecutionError`
- [ ] HTTP response >1MB → `NodeExecutionError`
- [ ] Human Input pauses flow → SSE emits `awaiting_input` event → resume via `POST /executions/:id/resume` routes correctly
- [ ] Human Input resume persists across engine process restart (PostgresSaver)
- [ ] `update_flow_state` works: `{key:"last_answer", value:"{{$node.response}}"}` → downstream reads `{{last_answer}}`
- [ ] `state_updated` SSE event visible in trace
- [ ] Agent degrades to single-turn LLM when 0 tools bound (smoke test)
- [ ] Unit tests per executable node: 10 files (sticky_note skipped), ≥1 happy path each
- [ ] SSRF test suite

## Dependencies

- Phase 01 — CustomTool Prisma model available
- Phase 02 — Credential service (AES-256-GCM) available
- Phase 03 — Registry, context, executor scaffolding + PostgresSaver checkpointer
- Phase 04.5 — `run_restricted_python` sandbox helper (custom_tool + custom_function)
- Existing `app/services/retriever.py` exposing `hybrid_search()`

## Risks

- **VNPT native tool-calling support unknown** — test Phase 00. Fallback ReAct parser via `create_react_agent` if function-calling not supported.
- **Messages array UI complexity** — repeater with role dropdown + templating picker (Phase 06).
- **Inline memory in LLM node** — `ctx.load_history()` requires session_id in state. Start node must pass it through.
- **Custom Tool security** — user-authored code runs server-side. See Phase 04.5 for hardening.
- **Streaming inside LangGraph node** — emit via callback bypasses LangGraph's built-in streaming. Confirm order preservation.
- **kb_ids authorization** — engine assumes NestJS already verified tenant owns these KBs.
- **SSRF bypass via DNS rebinding** — httpx resolves at request time; attacker flips DNS between resolve + connect. Mitigation: resolve once, pin IP, use httpx `transport` override. Documented limitation.
- **Human Input checkpoint persistence** — requires `PostgresSaver` configured in Phase 03 + `thread_id = execution_id`. Verify resume works across restart.

## Out of scope

- OpenAI, Anthropic LLM providers (Phase 2)
- Buffer memory summary / summaryBuffer modes — window only
- Condition Agent (LLM-driven routing) — compose with LLM + `condition`
- Structured output parser — compose with `custom_function` returning dict
- Calculator, web search tools — user authors as `CustomTool`
- Start formInput mode — chat-only entry
- Loop / Iteration / ExecuteFlow — deferred
