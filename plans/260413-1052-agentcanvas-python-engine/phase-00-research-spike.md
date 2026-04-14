# Phase 00 — Research & Spike

**Status:** ⬜ pending

## Goal
De-risk Phase 03 before writing production engine code. Confirm LangGraph-Python can express every Flowise Agentflow V2 pattern needed. Lock versions. Build a working spike.

## Deliverables

### 1. Research report (researcher subagent)

**Output:** `plans/reports/researcher-260413-1249-langgraph-flowise-porting.md`

Covers:
- LangGraph-Python latest stable + feature coverage
- Deep-read of Flowise `buildAgentflow.ts`, `Interface.Agentflow.ts`, buildAgentGraph.ts
- **Mapping table:** Flowise concept → LangGraph primitive
- **Version lock** — pinned `requirements.txt` snippet
- Spike plan (validated before coding)
- Risks + unresolved questions

### 2. Spike code — minimal working prototype

```
genai-engine/app/flow/spike/
  graph.py         # StateGraph with 3 nodes: Start → LLM → End
  nodes.py         # Mock LLM node (no real API call) + real VNPT LLM variant
  api.py           # FastAPI endpoint: POST /spike/execute → SSE stream
  test_spike.py    # 1 integration test: curl → see token delta stream
```

**Success criteria for spike:**
- [ ] `curl -N http://localhost:8000/spike/execute -d '{"message":"hi"}'` streams token-by-token from real VNPT endpoint
- [ ] Each token arrives < 100ms after generation (no buffering)
- [ ] Final event = `{"type": "done"}` with full response
- [ ] Error handling: if VNPT returns 401 → `{"type": "error"}` event, graph doesn't hang
- [ ] Log confirms LangGraph topological order respected
- [ ] Use `langchain-openai.ChatOpenAI` pointed at VNPT (no custom adapter)

### 3. Update Phase 03-10 based on research findings

After research report lands, revisit:
- Phase 03 requirements.txt versions
- Phase 04 node impl patterns (adjust to LangGraph idioms)
- Phase 07 SSE relay (confirm event schema from spike)
- Phase 09 execution trace (LangGraph has `stream_mode="updates"` — use it?)

## Steps

1. Spawn researcher subagent → writes report
2. Read report, discuss gaps, decide on scope adjustments
3. Implement spike (150-200 LOC)
4. Test spike end-to-end: `curl` → Python spike → VNPT real API → verify streaming
5. Document findings in report addendum. Update Phase 03-10 with concrete decisions.

## Entry criteria
- Plan approved
- Access to VNPT test credentials — or MockLLM fallback

## Exit criteria
- [ ] Research report reviewed + approved
- [ ] Spike works end-to-end (SSE streaming confirmed)
- [ ] Version pins locked in `requirements.txt` draft
- [ ] Mapping table validates: every Flowise pattern has a LangGraph equivalent (or documented custom impl)
- [ ] Phase 03-10 updated with research-informed decisions
- [ ] No blocker unknowns remain for Phase 03 start

## Research findings (from [researcher report](../reports/researcher-260413-1251-langgraph-flowise-porting.md))

**Verdict: ✅ GO — LangGraph-Python 1.1.6 covers ~80% of Flowise patterns.**

### Mapping table

| Flowise concept | LangGraph-Python | Fit |
|---|---|---|
| INodeQueue topological order | StateGraph auto-resolves at `compile()` | ✅ Full |
| Conditional edges | `add_conditional_edges()` | ✅ Full |
| IHumanInput pause | `interrupt()` + PostgresSaver checkpoint | ✅ Full |
| Tool-calling agent | `create_tool_calling_agent()` + `bind_tools()` | ✅ Full |
| SSE per-node streaming | `.astream(stream_mode="messages"+"updates"+"custom")` | ✅ Achievable |
| IWaitingNode (multi-input wait) | State dict — explicit accumulation in node fn | ⚠️ Partial (no primitive, manual logic) |
| Loop node (iteration_count) | Subgraph + conditional edge loop back | ⚠️ Custom impl needed (~50-100 LOC) |
| Variable resolution `{{x.y}}` | State dict + `resolve_variables()` helper | ⚠️ Manual (build helper) |
| Execution trace JSON (Flowise format) | Aggregate checkpoint history + stream events | ⚠️ Plumbing work |

### 3 gaps — resolved

1. **Loop node** — DEFER post-MVP. Not built. Known limitation documented.
2. **Multi-input accumulation** — build helper `accumulate_inputs(state, node_id, required)` in `app/flow/context.py`. Node fns call it explicitly.
3. **Trace format** — NATIVE LangGraph StateSnapshot. No Flowise JSON compat.

### VNPT LLM — confirmed (from [docs/API-LLM-VNPT.md](../../docs/API-LLM-VNPT.md))

- **Full OpenAI-compat.** Use `openai.OpenAI` SDK directly.
- **Base URL:** `https://assistant-stream.vnpt.vn/v1/`
- **Auth:** Bearer JWT in `api_key` param (OpenAI SDK handles `Authorization: Bearer <token>`)
- **Models:** `llm-small-v4`, `llm-medium-v4`, `llm-large-v4`
- **Streaming:** standard OpenAI delta format via `stream=True`
- **No custom adapter needed** — `langchain-openai.ChatOpenAI(model="llm-large-v4", api_key=jwt, base_url="https://assistant-stream.vnpt.vn/v1/")` works.

### Version lock (confirmed compatible)

```
langgraph==1.1.6, langchain-core==0.3.0, langchain-openai==0.2.0,
langchain-anthropic==0.2.0, langgraph-checkpoint-postgres==0.2.0,
asyncpg==0.30.0, pydantic==2.9.0
```

**Python ≥3.11 required** (3.10 has ContextVar propagation bug with stream writer).

## Risks

- **LangGraph API instability** — pre-1.0 library, breaking changes possible. Pin exact versions, lock lock file.
- **Flowise uses `@langchain/langgraph` (JS)** — JS & Python APIs diverge. Do not assume 1:1 translation.
- **Streaming latency** — LangGraph may buffer events for batching. Confirm per-token passthrough in spike.
- **VNPT LLM quirks** — OpenAI-compat ≠ OpenAI. Test specifically with VNPT endpoint, not just mock.

## Out of scope

- Implementing actual Phase 03 scaffolding (that's Phase 03's job)
- Writing any node beyond spike's mock/VNPT LLM
- UI work
- Benchmarking / load testing

## Next

Once this phase completes → Phase 01 (Prisma) + Phase 03 (engine scaffold) unblocked.
