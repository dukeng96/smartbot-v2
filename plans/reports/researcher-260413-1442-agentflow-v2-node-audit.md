# Flowise Agentflow V2 — Node Inventory Audit & Plan Cross-Check

**Date:** 2026-04-13  
**Scope:** All 16 subdirs in `smart-agent/packages/components/nodes/agentflow/`  
**Cross-checked against:** Phase 04 (P0, 10 nodes) + Phase 08 (P1, 9 nodes)

---

## 1. Complete Flowise Agentflow V2 Node Inventory

| # | Flowise Name | `name` field | What it does | Key inputs | Key outputs |
|---|---|---|---|---|---|
| 1 | **Start** | `startAgentflow` | Entry point. Supports chat input OR form input. Initializes flow state. Supports `ephemeralMemory`, `persistState`. | startInputType (chat/form), formInputTypes[], startState[], ephemeralMemory, persistState | question / form + state |
| 2 | **LLM** | `llmAgentflow` | Multi-provider LLM call. Built-in memory (all/window/summary/summaryBuffer). Structured JSON output via Zod. State updates. Streaming. | llmModel (asyncOptions), llmMessages[], llmEnableMemory, llmMemoryType, llmStructuredOutput[], llmUpdateState[] | content, structured fields, chatHistory, timeMetadata |
| 3 | **Agent** | `agentAgentflow` | Tool-calling agent w/ reasoning loop. Accepts external tools + document stores (KBs). Supports OpenAI built-in tools (web_search, code_interpreter, image_gen), Anthropic built-in (web_search, web_fetch), Gemini built-in. Multi-step reasoning. | agentModel, agentMessages[], agentTools[], agentKnowledgeDocumentStores[], agentKnowledgeVSEmbeddings[], agentEnableMemory, agentMemoryType | content, usedTools, sourceDocuments, chatHistory |
| 4 | **Condition** | `conditionAgentflow` | Rule-based branching (if/else). Evaluates string/number/boolean comparisons. Multi-condition array. Outputs N conditions + else. | conditions[] (type, value1, operation, value2) | conditions[] with isFulfilled flags → N+1 outputs |
| 5 | **Condition Agent** | `conditionAgentAgentflow` | LLM-powered branching. Describes scenarios in natural language; LLM picks scenario. JSON-structured output via few-shot prompt. | conditionAgentModel, conditionAgentInstructions, conditionAgentInput, conditionAgentScenarios[] | conditions[] with isFulfilled, content |
| 6 | **Custom Function** | `customFunctionAgentflow` | Execute JS code snippet (node-fetch available). Input vars prefixed `$`. State update support. | customFunctionInputVariables[], customFunctionJavascriptFunction (code), customFunctionUpdateState[] | JS return value (string or object) |
| 7 | **Direct Reply** | `directReplyAgentflow` | Send static/templated text to user — no LLM. Streams token event if last node. | directReplyMessage (acceptVariable) | content |
| 8 | **Execute Flow** | `executeFlowAgentflow` | Embed/call another Flowise flow via HTTP API. Credential optional. Override config. | executeFlowSelectedFlow, executeFlowInput, executeFlowOverrideConfig, executeFlowBaseURL, executeFlowReturnResponseAs | response (sub-flow output) |
| 9 | **HTTP** | `httpAgentflow` | Send HTTP request. Supports Basic/Bearer/ApiKey auth. GET/POST/PUT/DELETE/PATCH. Query params, headers, body types. Uses `secureAxiosRequest` (SSRF protection built-in). | method, url, headers[], queryParams[], bodyType, body, credential | response body, status |
| 10 | **Human Input** | `humanInputAgentflow` | Pause flow; await user approval/rejection. Two output branches. Description can be fixed or LLM-generated (dynamic). | humanInputDescriptionType (fixed/dynamic), humanInputDescription, humanInputModel (if dynamic) | approve / reject outputs |
| 11 | **Iteration** | `iterationAgentflow` | Loop over array — execute enclosed nodes for each element. Input must be JSON array. | iterationInput (string/array, acceptVariable) | iterates over items |
| 12 | **Loop** | `loopAgentflow` | Go-to: loop back to a previous node. Max loop count + fallback message. State update. | loopBackToNode (asyncOptions → previous nodes), maxLoopCount, fallbackMessage, loopUpdateState[] | (goto target node) |
| 13 | **Retriever** | `retrieverAgentflow` | Vector DB retrieval from document stores. Output as text or text+metadata. State update. | retrieverKnowledgeDocumentStores[] (asyncOptions), retrieverQuery (acceptVariable), outputFormat (text/textWithMetadata), retrieverUpdateState[] | retrieved text / docs |
| 14 | **Sticky Note** | `stickyNoteAgentflow` | Canvas annotation only — no execution. | note (string) | undefined (no-op) |
| 15 | **Tool** | `toolAgentflow` | Invoke a specific LangChain Tool directly (deterministic, not agent-driven). Accepts tool input args as variables. State update. | toolAgentflowSelectedTool (asyncOptions), toolInputArgs[], toolUpdateState[] | tool output |
| 16 | *(Interface file)* | `Interface.Agentflow.ts` | ILLMMessage, IStructuredOutput, IFlowState types | — | — |

**Total executable nodes: 15** (StickyNote = no-op canvas UI element, not an execution node)

---

## 2. Plan vs. Flowise Node Mapping Table

| Flowise Node | Flowise `name` | Plan Phase | Smartbot Equivalent | Status | Notes |
|---|---|---|---|---|---|
| Start | `startAgentflow` | P0 Phase 04 #1 | `start` | ✅ mapped | Plan misses: formInput mode, persistState |
| LLM (VNPT) | `llmAgentflow` | P0 Phase 04 #5 | `llm_vnpt` | ⚠️ partial | Plan splits into 3 LLM nodes (vnpt/openai/anthropic). Flowise uses 1 unified LLM node with model selector. Plan misses: memory types inside LLM node, structured output capability, state update |
| LLM (OpenAI) | `llmAgentflow` | P1 Phase 08 #11 | `llm_openai` | ⚠️ partial | Same unified node in Flowise |
| LLM (Anthropic) | `llmAgentflow` | P1 Phase 08 #12 | `llm_anthropic` | ⚠️ partial | Same unified node in Flowise |
| Agent | `agentAgentflow` | P1 Phase 08 #16 | `agent_tool_calling` | ⚠️ partial | Plan misses: knowledge base integration in agent, built-in provider tools (web_search, code_interpreter), multi-tool iteration |
| Condition | `conditionAgentflow` | P0 Phase 04 #9 | `condition` | ✅ mapped | Flowise has rich multi-condition array; plan has basic if/else — acceptable for MVP |
| Condition Agent | `conditionAgentAgentflow` | ❌ missing | — | ❌ missing | LLM-driven routing node; not in plan at all |
| Custom Function | `customFunctionAgentflow` | P1 Phase 08 #17 | `custom_function` | ⛔ defer | Plan intentionally skips (security). Flowise uses JS; plan notes Python/RestrictedPython option |
| Direct Reply | `directReplyAgentflow` | ❌ missing | — | ❌ missing | Non-LLM static reply node — not in plan |
| Execute Flow | `executeFlowAgentflow` | ❌ missing | — | ❌ missing | Sub-flow embedding — not in plan |
| HTTP | `httpAgentflow` | P1 Phase 08 #13 | `tool_http` | ⚠️ partial | Flowise has SSRF protection (`secureAxiosRequest`), full auth types, form/multipart body. Plan covers basics |
| Human Input | `humanInputAgentflow` | P1 Phase 08 #20 | `human_input` | ⚠️ partial | Plan has checkpoint concept; Flowise has approve/reject branches + optional LLM-generated description |
| Iteration | `iterationAgentflow` | ❌ missing | — | ❌ missing | Array iteration block — not in plan |
| Loop | `loopAgentflow` | P1 Phase 08 #19 | ~~`loop`~~ (deferred) | ⛔ defer | Plan explicitly deferred. Flowise impl = goto target node |
| Retriever | `retrieverAgentflow` | P0 Phase 04 #8 | `qdrant_retriever` | ⚠️ partial | Plan is Qdrant-specific; Flowise uses document store abstraction (pluggable). Acceptable for MVP |
| Sticky Note | `stickyNoteAgentflow` | ❌ missing | — | ⛔ defer | Canvas annotation only — no execution impact |
| Tool | `toolAgentflow` | ❌ missing | — | ❌ missing | Deterministic tool invocation node (separate from agent loop) |
| Start (formInput) | `startAgentflow` sub-feature | ❌ missing | — | ⚠️ partial | Plan `start` only covers chatInput mode |
| LLM structuredOutput | Built into `llmAgentflow` | ❌ missing | `output_parser_json` (P1) | ⚠️ partial | Plan treats as separate node; Flowise integrates into LLM node. Either approach works |
| LLM state update | Built into `llmAgentflow`, `agentAgentflow`, etc. | ❌ missing | — | ⚠️ partial | `variable_set` in plan is analogous but less elegant |

**Summary counts:**
- ✅ mapped (solid): 2 nodes (Start, Condition)
- ⚠️ partial: 8 nodes (LLMs ×3, Agent, HTTP, HumanInput, Retriever + LLM structured output)
- ❌ missing (not in plan): 5 executable nodes (ConditionAgent, DirectReply, ExecuteFlow, Iteration, Tool)
- ⛔ deferred (intentional): 2 (CustomFunction, Loop, StickyNote)

---

## 3. Gap Analysis — Missing Nodes Severity Assessment

| Missing Node | Severity | LangGraph Difficulty | Effort | Recommended Phase | Justification |
|---|---|---|---|---|---|
| `conditionAgentAgentflow` (Condition Agent) | **IMPORTANT** | easy | 0.5d | P1 Phase 08 | LLM call with few-shot JSON output → pick scenario index. Pure Python, no graph complexity. Enables natural-language routing without hard-coded rules. Used in multi-step chain template. |
| `directReplyAgentflow` (Direct Reply) | **IMPORTANT** | easy | 0.5d | P0 Phase 04 | 10-line node. Sends static string to user — no LLM. Critical for: error messages, conditional fallbacks, form confirmations. Many real flows use it instead of End node for intermediate replies. |
| `toolAgentflow` (Tool) | **IMPORTANT** | medium | 1d | P1 Phase 08 | Deterministic tool call (not agent-driven). Needed for: calling calculator/HTTP/search as explicit step in flow (not inside agent loop). Without it, you can only use tools inside agents — no standalone tool nodes. |
| `iterationAgentflow` (Iteration) | **NICE** | hard | 3d+ | P2 post-MVP | Requires sub-graph / conditional edges in LangGraph to loop N times over array. Complex — deferred correctly. Not blocking any of the 3 seed templates. |
| `executeFlowAgentflow` (Execute Flow) | **NICE** | medium | 2d | P2 post-MVP | Sub-flow embedding. Nice for modularity but none of the 5 seed templates use it. HTTP call to self-service. Low priority. |
| `stickyNoteAgentflow` (Sticky Note) | **NICE** | trivial | 0.25d | P0 or skip | Canvas-only. Engine ignores it. But canvas renderer needs to know the node type so it doesn't error. Add to registry as no-op node with `execute = noop`. |

---

## 4. Plan Architecture Concerns

### 4a. LLM Node Fragmentation

Plan has 3 separate LLM node types (`llm_vnpt`, `llm_openai`, `llm_anthropic`). Flowise uses **1 unified `llmAgentflow`** with a model selector (`asyncOptions` listing only VNPT/OpenAI/Anthropic).

**Recommendation:** Keep plan's approach — provider-specific nodes are simpler to implement and debug for MVP. Unifying later is straightforward refactor. No change needed.

### 4b. Memory Built Into LLM Node

Flowise's `llmAgentflow` has 4 memory types built-in (all/window/summary/summaryBuffer). Plan has `buffer_memory` as a separate node feeding into the LLM node.

**Impact:** Plan's approach is more composable (UNIX pipe style) but creates awkward wiring. For MVP, the separate `buffer_memory` node is fine. However: the **structured output** capability (`llmStructuredOutput` Zod schema) in Flowise's LLM node is effectively the same as plan's Phase 08 `output_parser_json`. Both work — just note that plan's Phase 08 `output_parser_json` can be simplified to a flag on the LLM node rather than a separate node.

### 4c. State Update Pattern

Flowise embeds `updateFlowState` in almost every node (LLM, Agent, Retriever, Tool, Loop, CustomFunction, ExecuteFlow). Plan has a separate `variable_set` utility node. 

**Impact:** Plan's approach adds node count. But it's more explicit and easier to visualize on canvas. Keep for now — not a blocker.

### 4d. Agent Node Gap (Knowledge Base Integration)

Plan's `agent_tool_calling` maps to Flowise's `agentAgentflow`, but misses:
- `agentKnowledgeDocumentStores[]` — KB as agent tool (auto-retrieval)
- `agentKnowledgeVSEmbeddings[]` — vector store directly in agent

For smartbot-v2 RAG use case, this is **significant**. The Agent node in plan requires user to manually wire Retriever → Agent. Flowise lets you embed KB directly in the agent. This is MVP-relevant for the `tool-calling-agent.json` template.

---

## 5. Re-Prioritization Recommendation

### Nodes to ADD (new, not currently in plan)

| Node | Smartbot Name | Add To | Priority |
|---|---|---|---|
| Direct Reply | `direct_reply` | **Phase 04 P0** | P0 — needed for conditional branch fallbacks |
| Condition Agent | `condition_agent` | Phase 08 P1 | P1 — natural language routing |
| Tool (deterministic) | `tool_call` | Phase 08 P1 | P1 — explicit tool node outside agent loop |
| Sticky Note | `sticky_note` | Phase 04 P0 | P0 — canvas no-op, 10 lines |

### Nodes to PROMOTE P1 → P0

None. Current P0 list is sound.

### Nodes to DEMOTE P0 → P1 (optional optimization)

| Node | Reason | Risk |
|---|---|---|
| `buffer_memory` | Could be merged as flag on `llm_vnpt`. Separate node adds canvas noise. | Low — keep as separate node for clarity, it's easy to build |
| `variable_set` | Low standalone value; state updates on LLM/Agent nodes cover most cases | Low — keep, provides explicit state mutation |

No demotions recommended — current 10 nodes all justified for P0.

### Final Recommended P0 List (Phase 04) — 12 nodes max

| # | Type | Change from current plan |
|---|---|---|
| 1 | `start` | Keep |
| 2 | `end` | Keep |
| 3 | `chat_input` | Keep |
| 4 | `chat_output` | Keep |
| 5 | `llm_vnpt` | Keep |
| 6 | `prompt_template` | Keep |
| 7 | `buffer_memory` | Keep |
| 8 | `qdrant_retriever` | Keep |
| 9 | `condition` | Keep |
| 10 | `variable_set` | Keep |
| 11 | `direct_reply` | **ADD** — 0.5d, enables branch fallbacks |
| 12 | `sticky_note` | **ADD** — 0.25d no-op, prevents canvas errors |

### Final Recommended P1 List (Phase 08) — 11 nodes

| # | Type | Change from current plan |
|---|---|---|
| 11 | `llm_openai` | Keep |
| 12 | `llm_anthropic` | Keep |
| 13 | `tool_http` | Keep |
| 14 | `tool_calculator` | Keep |
| 15 | `tool_web_search` | Keep |
| 16 | `agent_tool_calling` | Keep (add KB integration flag) |
| 17 | `output_parser_json` | Keep (or merge into LLM node as flag) |
| 18 | `human_input` | Keep |
| 19 | `condition_agent` | **ADD** — 0.5d |
| 20 | `tool_call` | **ADD** — 1d (deterministic tool node) |
| — | ~~`custom_function`~~ | Keep deferred |
| — | ~~`loop`~~ | Keep deferred |

### Defer to P2 (post-MVP)

- `iteration` (complex LangGraph subgraph, 3d+)
- `execute_flow` (sub-flow embedding, 2d, zero seed template dependency)
- `custom_function` (security attack surface)
- `loop` (already deferred, 3d+)

---

## 6. Coverage Analysis (Flowise Parity)

| Category | Flowise Total | Plan P0 | Plan P0+P1 | After Recommendations |
|---|---|---|---|---|
| Control flow | 4 (Start, Condition, ConditionAgent, Loop) | 2 | 3 | 4 (adding ConditionAgent) |
| LLM | 1 unified (3 providers) | 1 (VNPT only) | 3 | 3 |
| Agent | 1 | 0 | 1 | 1 |
| IO / Reply | 2 (DirectReply, HumanInput) | 2 (chat_input/output) | 3 | 4 (adding DirectReply) |
| Tool | 2 (Tool, HTTP) | 0 | 2 | 3 (adding tool_call) |
| Retrieval | 1 | 1 | 1 | 1 |
| Iteration/Loop | 2 (Iteration, Loop) | 0 | 0 (deferred) | 0 |
| Utility | 3 (CustomFunc, ExecuteFlow, StickyNote) | 1 (variable_set) | 1 | 2 (adding sticky_note) |
| **Total** | **15** | **6** (40%) | **11** (73%) | **14** (93%) |

Recommended P0+P1 covers **93%** of Flowise node functionality (excluding Iteration/Loop/ExecuteFlow/CustomFunction which are complexity-deferred or security-deferred).

---

## 7. Seed Template Impact Check

| Template | Current P0 nodes sufficient? | After recommendations |
|---|---|---|
| `simple-rag.json` | ✅ yes (start→retriever→prompt→llm→end) | ✅ no change |
| `tool-calling-agent.json` | ✅ yes (start→memory→agent_tool_calling→end) | ✅ + KB in agent flag |
| `multi-step-chain.json` | ⚠️ partial — needs `condition` routing both branches | ✅ with `direct_reply` as fallback |
| `summarize-then-answer.json` | ✅ yes (no new nodes needed) | ✅ no change |
| `lead-gen-form.json` | ⚠️ needs `output_parser_json` (P1) + `tool_http` (P1) | ✅ P1 covered |

---

## Unresolved Questions

1. **`chat_input` / `chat_output` vs. `Start`** — Flowise V2 has no separate `chat_input`/`chat_output` nodes; `startAgentflow` handles both modes and the response is implicit from the last node. Plan's split into 4 nodes (start, end, chat_input, chat_output) adds overhead. Is the separation intentional for composability, or should `start` / `end` collapse the IO nodes?

2. **`condition` multi-branch outputs** — Flowise `conditionAgentflow` supports N conditions (not just binary if/else). Plan implies binary. Should Python `condition` node support N outputs (enumerate conditions) or stay binary?

3. **Tool node (deterministic) vs. Agent's tool calling** — in Flowise, `toolAgentflow` is for _explicit, deterministic_ tool execution in a flow step (you hardcode the input). `agentAgentflow` uses tools _autonomously_. Plan's `agent_tool_calling` conflates both. Clarify: does smartbot need standalone tool nodes outside agent loops?

4. **Memory architecture** — Flowise integrates memory directly in LLM/Agent nodes (4 types). Plan has separate `buffer_memory` node. Will `buffer_memory` node support all 4 types (window/all/summary/summaryBuffer), or just window? If only window, there's a capability gap vs. Flowise.

5. **State update pattern** — `variable_set` vs. per-node `update_state`. The plan's `variable_set` is standalone. But if LLM/Agent nodes need to write to state as a side-effect (e.g., store intent classification result), the plan needs a `updateState` hook on every node's `execute()` or a post-node middleware. Confirm design choice.

6. **KB integration in Agent node** — Flowise's agent directly embeds document stores + vector embeddings as knowledge. Plan routes retriever → agent via explicit nodes. For `tool-calling-agent.json` template to work correctly with RAG, does the agent node need inline KB config, or is explicit wiring sufficient?
