# Brainstorm Summary — Lean-11 Node Set Lock

**Date:** 2026-04-13 17:49
**Plan:** [agentcanvas-python-engine](../plan.md)
**Trigger:** User review of Flowise RAG screenshots vs plan + parallelization feasibility

## Problem Statement

Plan có 21 nodes (13 P0 + 8 P1). User feedback:
- 21 nodes = overengineering
- Must-have: Agent, LLM, Custom Tool, Custom Function
- Thiếu Custom Function trong plan (explicitly SKIPPED vì security)
- Thiếu Custom Tool user-defined (chỉ có static TOOL_REGISTRY)
- LLM node thiếu messages array (multi-role repeater)
- Flowise v2 UI thực tế chỉ có 15 nodes

## Decisions Locked

### D1 — Node set: Lean-11

Rebuild Phase 04/08 around 11 nodes:

| # | Node | Category | Notes |
|---|---|---|---|
| 1 | `start` | control | Entry + Flow State init + Ephemeral Memory toggle |
| 2 | `llm` | llm | VNPT-only MVP. Messages array `[{role, content}]` repeater. Inline memory toggle + window size |
| 3 | `agent` | agent | Tool-calling loop. Bound tools + max_iterations |
| 4 | `custom_tool` | tool | User-defined tool (name + schema + RestrictedPython impl) |
| 5 | `custom_function` | utility | Inline RestrictedPython execution — escape hatch |
| 6 | `condition` | control | N-way rule-based branch (eq/ne/gt/lt/contains) |
| 7 | `retriever` | retrieval | Qdrant hybrid search (bge-m3) |
| 8 | `direct_reply` | io | Terminal message. Templated. Streams as tokens |
| 9 | `sticky_note` | utility | Canvas annotation. No-op execute |
| 10 | `http` | tool | HTTP request with SSRF protection |
| 11 | `human_input` | control | LangGraph interrupt() pause for approval |

**Removed from old plan (10 nodes):**
- `end` → merged into `direct_reply`
- `chat_input` → merged into `start`
- `chat_output` → `direct_reply` handles streaming
- `prompt_template` → inline in LLM messages array (Jinja2 resolver)
- `buffer_memory` → inline toggle on LLM + Agent
- `variable_set` → use `update_flow_state` field (Flowise parity)
- `output_parser_json` → compose with Custom Function
- `tool_calculator` → compose with Custom Function
- `tool_web_search` → compose with HTTP + Custom Function (or defer as user credential-backed tool)
- `llm_openai`, `llm_anthropic` → Phase 2 multi-provider

**Deferred post-MVP:** Loop, Iteration, Execute Flow, Condition Agent

### D2 — LLM = VNPT-only for MVP

Single `llm` node. Credential type = `vnpt`. Models: `llm-small-v4`, `llm-medium-v4`, `llm-large-v4`. OpenAI/Anthropic → Phase 2. Saves ~1-2d.

### D3 — Custom Function = Python RestrictedPython

- Sandbox: `RestrictedPython` lib, import whitelist, `signal.alarm` time limit (5s default)
- Runs in-engine (no JS bridge)
- Accepts Flow State as `$state.*` refs, returns dict → next node
- **Trade-off:** Flowise uses JS (`$variableName`). User copy-paste from Flowise requires syntax translation. Acceptable cost for infra simplicity.

### D4 — Custom Tool = user-authored

New Prisma model `CustomTool` per tenant:
```prisma
model CustomTool {
  id            String @id @default(cuid())
  tenantId      String
  name          String
  description   String
  schema        Json   // JSON Schema for tool args
  implementation String // RestrictedPython code
  createdAt     DateTime @default(now())
}
```
- CRUD in NestJS flows module
- Agent node "tools" input = array of CustomTool IDs
- Engine loads tool → wraps as LangChain Tool → binds to agent

### D5 — LLM Messages array

Replace `system_prompt` + `user_message` scalar inputs with:
```python
NodeInput(name="messages", type="array", required=True,
  schema=[{"role": "system|user|assistant", "content": "string"}])
```
- Supports `{{state.var}}` + `{{node.output}}` in content
- Inline memory toggle prepends conversation history
- +0.5d on top of existing llm_vnpt Phase 04 task

### D6 — Parallelization: NO

User chose sequential execution. Plan keeps 54-66d timeline (revised ~48-58d after Lean-11 reduction). No `/ck:cook --parallel` rework.

## Plan Impact

**Old effort:** 54-66d
**New effort:** 48-58d (Lean-11 removes 10 nodes, adds 2 custom + messages array)

| Phase | Old | New | Delta |
|---|---|---|---|
| 03 Scaffold | 4.5-5.5d | 4.5-5.5d | — |
| 04 Core nodes | 8.5-10.5d | 7-9d | −1.5d (fewer nodes, messages array +0.5d) |
| 05 Flow CRUD | 3-4d | 4-5d | +1d (CustomTool CRUD) |
| 06 Canvas UI | 10-12d | 9-11d | −1d (fewer node configs, messages array editor +0.5d) |
| 08 Extended | 6-8d | 4-5d | −3d (fewer new nodes: HTTP + Human Input only) |

**Net:** −5-6d total. New range: **~48-60d ≈ 10-12 weeks**.

## Phase Files to Update

1. `plan.md` — node count, effort table, design decisions
2. `phase-04-core-nodes-p0.md` — rewrite around 9 P0 nodes (Lean-11 minus HTTP + Human Input)
3. `phase-05-flow-crud-api.md` — add CustomTool CRUD endpoints
4. `phase-06-canvas-ui.md` — messages array editor, Custom Tool/Function code editor (Monaco)
5. `phase-08-extended-nodes.md` — shrink to HTTP + Human Input + 5 templates
6. New file: `phase-04.5-custom-tool-function-security.md` — RestrictedPython setup, sandbox test cases, CSP

## Risks

- **RestrictedPython learning curve** — users expect Flowise JS. Need clear docs + migration examples. Risk: low (Python users likely prefer Python).
- **Messages array UI complexity** — repeater with role dropdown + templating picker. Drawer already planned (Phase 06 decision #12).
- **Custom Tool security** — user writes code that runs server-side. Even with RestrictedPython, audit needed. Consider hard cap: 50 custom tools per tenant.
- **Agent node without OpenAI function-calling** — VNPT may not support native tool calling. Fallback: ReAct-style parsing (LangChain `create_react_agent`). Test Phase 00.

## Success Metrics

- [ ] User can reproduce Flowise RAG flow screenshot 1:1 with Lean-11 nodes
- [ ] Custom Function node executes RestrictedPython safely (escape attempts blocked)
- [ ] Custom Tool node can be authored via UI, bound to Agent, invoked
- [ ] LLM messages array supports 3+ messages with inline refs
- [ ] Plan total ≤60d (10-12 weeks)

## Next Steps

1. User confirms brainstorm summary
2. Invoke `/ck:plan` to regenerate affected phase files (04, 05, 06, 08 + new 04.5)
3. Update `plan.md` design decisions + effort table
4. Journal decision via `/ck:journal`

## Unresolved Questions

1. Custom Tool quota per tenant — hard cap 50 same as credentials? Or separate?
2. RestrictedPython version lock — latest is 8.x (2024). Confirm compat with Python 3.11+
3. Agent node ReAct fallback — test if VNPT supports OpenAI function-calling format, else use LangChain `create_react_agent`
4. Messages array — support assistant prefilling (pre-filled assistant turn before user message)? Anthropic feature, Flowise has it
5. Custom Function `$state.*` syntax vs `{{state.*}}` templating — unified pattern?
