---
title: "Agentcanvas — Flowise-inspired, Python LangGraph Engine"
description: "User-customizable agent flows per assistant. Python engine (LangGraph) + NestJS control plane + Next.js canvas (React Flow v12 + shadcn)."
status: pending
priority: P1
branch: kai/feat/agentcanvas
tags: [agentcanvas, flowise, langgraph, langchain, react-flow, multi-service, rag]
created: 2026-04-13
last_updated: 2026-04-13
blockedBy: []
blocks: []
---

# Agentcanvas — Implementation Plan

## Intent

Replace hard-coded RAG flow with **user-customizable agent flows** per Assistant. Inspired by Flowise Agentflow V2 but rewritten native to smartbot-v2 stack. Every Bot is bound to exactly one Flow (non-nullable `Bot.flowId`). New bots auto-provision a `simple-rag` default flow. Existing pre-agentcanvas bots are deleted — no RAG fallback retained.

**Not migrating Flowise** — referencing Flowise source for logic patterns, schemas, execution model. Building clean implementation across 3 services.

## Architecture — 3 services

```
Next.js 16 (smartbot-web)
  /dashboard/bots/[botId]/flow — React Flow v12 canvas + shadcn UI
        │ REST + SSE
        ▼
NestJS 11 (genai-platform-api)  ← Control plane
  modules/flows          Flow CRUD, validation, template provisioning
  modules/custom-tools   User-authored tool CRUD (per tenant)
  modules/credentials    AES-256-GCM vault (multi-tenant)
  modules/flow-exec      HTTP proxy → Python engine, SSE relay
  Dispatch: always flow-exec (Bot.flowId non-nullable)
        │ HTTP + SSE
        ▼
FastAPI (genai-engine)  ← Data plane (flow subsystem)
  app/flow/executor.py    LangGraph StateGraph builder
  app/flow/nodes/         11 node impls (VNPT LLM, Qdrant retriever, Agent, Custom Tool/Function, etc.)
  app/flow/registry.py    Node type registry
  app/flow/streaming.py   SSE event emitter per node
  app/flow/sandbox.py     RestrictedPython executor (Custom Tool/Function)
  app/services/retriever  (existing Qdrant hybrid search — kept)
```

## Reference mapping from Flowise

| From Flowise (`smart-agent/`) | How we use it |
|---|---|
| `ChatFlow` entity schema | Prisma `Flow` model structure |
| `Execution` entity | Prisma `FlowExecution` model |
| `Credential` + AES encryption pattern | `credentials` module design |
| `flowData` JSON format `{nodes, edges}` | Same React Flow JSON — compat |
| `buildAgentflow.ts` execution logic | Port patterns to Python LangGraph StateGraph |
| INode interface | Python `BaseNode` Pydantic class |
| Marketplace templates JSON | Seed 5 default templates |
| Canvas.jsx UX ideas | Keyboard shortcuts, duplicate, undo/redo, connection validation |

## Node set (11)

`start`, `llm`, `agent`, `custom_tool`, `custom_function`, `condition`, `retriever`, `direct_reply`, `sticky_note`, `http`, `human_input`.

## Phases

| # | Phase | Owner service | Deps |
|---|---|---|---|
| 00 | Research & Spike — LangGraph-Python + Flowise mapping | genai-engine | — |
| 01 | Foundation — Prisma models + migration | NestJS + DB | — |
| 02 | Credentials vault (AES-256-GCM) | NestJS | 01 |
| 03 | Python flow engine scaffold (LangGraph + `update_flow_state` helper) | genai-engine | 00 |
| 04 | Node set (all 11 Lean nodes) | genai-engine | 03, 04.5 |
| 04.5 | Custom Tool/Function security — RestrictedPython sandbox + CSP | genai-engine | 03 |
| 05 | Flow CRUD API + CustomTool CRUD + validation | NestJS | 01, 03 |
| 06 | Canvas UI (React Flow v12 + shadcn) — right-panel drawer, test panel, inline trace, variable picker, update_flow_state repeater, LLM messages-array editor, Monaco code editor | Next.js | 05 |
| 07 | Flow execution dispatch + SSE bridge | NestJS + genai-engine | 03, 04, 05 |
| 09 | Execution trace + replay UI | all 3 | 07 |
| 10 | Integration + Templates (5 seed) + E2E testing + polish | all 3 | all |

Phase 00 blocks Phase 03. Phase 01/02 (NestJS) can run in parallel with Phase 00 since different services. Phase 04.5 (security sandbox) gates Phase 04's Custom Tool/Function nodes.

## Key design decisions (locked)

1. **Engine lives in Python (genai-engine)** — LangGraph-Python mature, reuse existing FastAPI + Celery infra
2. **Node schemas single source of truth = Pydantic in Python** → export JSON Schema → generate TS types for UI
3. **Credentials encrypt at NestJS, decrypt on exec, pass via HTTPS body** (never store plaintext, never in Python)
4. **Canvas from scratch** — React Flow v12 + shadcn, not MUI-based Flowise UI
5. **Bot-Flow relation = 1:1** — each Bot has at most 1 Flow, each Flow belongs to at most 1 Bot. `Bot.flowId` unique constraint.
6. **Execution trace stored in NestJS Prisma** (not in Python) — NestJS is source of truth for all persistence
7. **No RAG fallback — every Bot has a Flow.** `Bot.flowId` non-nullable. New bots auto-provision `simple-rag` template flow on creation. Existing pre-agentcanvas bots wiped as part of rollout. `genai-engine/services/rag_chat.py` removed.
8. **No flow versioning for MVP** — edit = overwrite. User uses "Duplicate flow" for backup. Future: snapshot history.
9. **Credential hard cap = 50 per tenant** for MVP (not plan-based yet)
10. **Per-node `update_flow_state`:** every node with outputs accepts optional `update_flow_state: [{key, value}]` on its `data` JSON. Executor applies writes to top-level state after `execute()`.
11. **Credit model — per-call, VNPT-only, sum across loops:**
    - `llm` node call: small-v4=1, medium-v4=2, large-v4=4 credits per call
    - Agent/chain with 5 LLM calls → sum all 5 (no cap)
    - Flow using non-VNPT LLM (user's own key) → 0 credits
    - Credits charged regardless of token count (simple, predictable)
12. **Canvas config UI = RIGHT-PANEL DRAWER.** shadcn Sheet 400px right, tabs: Inputs / Update State / Advanced.
13. **React Flow v12 + first-party `useUndoRedo`.** Use `screenToFlowPosition()`. Use built-in `useUndoRedo()` hook with `takeSnapshot()` before every mutating action.
14. **Keyboard shortcut set (9):** Delete, Cmd+S (save), Cmd+Z (undo), Cmd+Shift+Z (redo), Cmd+D (duplicate), Cmd+C/V (copy/paste), Cmd+A (select all), Escape (clear selection). All gated by `dialogDepth` counter — suppressed while any dialog/drawer open.
15. **Validator = DAG-only (no semantic typecheck in MVP).** BFS `wouldCreateCycle` on connect. Required-input + orphan-node checks stay server-side (Phase 05). Type-compatible handle matching deferred post-MVP.
16. **State management = Zustand + immer.** Immutable updates only. Enables RF v12 `useUndoRedo` snapshot capture.
17. **LLM = VNPT-only MVP.** Single `llm` node. Credential type = `vnpt`. Models: `llm-small-v4`, `llm-medium-v4`, `llm-large-v4`. OpenAI / Anthropic → Phase 2.
18. **Custom Function = Python RestrictedPython sandbox.** Inline code execution node. `RestrictedPython` lib + import whitelist + `signal.alarm` 5s timeout. Accepts Flow State via `$state.*` refs, returns dict → next node. Sandbox hardening is Phase 04.5 (dedicated security gate before Phase 04 ships).
19. **Custom Tool = user-authored per tenant.** Prisma model `CustomTool { id, tenantId, name, description, schema Json, implementation String, createdAt }`. CRUD via NestJS (`POST/GET/PATCH/DELETE /api/v1/custom-tools`). Agent node's `tools` input = array of `CustomTool.id`. Engine loads tool record → wraps as LangChain `Tool` (schema + RestrictedPython impl) → binds to agent at execute time. Hard cap 50 tools per tenant.
20. **LLM messages array replaces scalar inputs.** `messages: array<{role, content}>` repeater (system/user/assistant). Supports `{{state.var}}` + `{{nodeId.output}}` templating in content. Inline memory toggle prepends conversation history. Supports assistant-prefill pattern.

## Success criteria

- [ ] User can create flow in `/dashboard/bots/[botId]/flow`, drag 10+ nodes, wire edges, save
- [ ] Flow validates server-side (no orphan nodes, required inputs filled, credential refs exist)
- [ ] Attach flow to bot → chat message streams through flow via SSE end-to-end
- [ ] FlowExecution table logs every node's input/output/timing
- [ ] Credential vault encrypts + decrypts VNPT API key successfully
- [ ] 5 seed templates work out-of-box (simple-rag, agent-with-custom-tool, conditional-routing, summarize-then-answer, webhook-with-approval)
- [ ] New bot creation auto-provisions `simple-rag` default flow (`Bot.flowId` never null)
- [ ] E2E test: create bot → chat → see token stream + final FlowExecution trace

## Phase detail files

- [Phase 00 — Research & Spike](phase-00-research-spike.md)
- [Phase 01 — Prisma Foundation](phase-01-prisma-foundation.md)
- [Phase 02 — Credentials Vault](phase-02-credentials-vault.md)
- [Phase 03 — Python Engine Scaffold](phase-03-python-engine-scaffold.md)
- [Phase 04 — Nodes (all 11)](phase-04-nodes.md)
- [Phase 04.5 — Custom Tool/Function Security (RestrictedPython)](phase-04.5-custom-tool-function-security.md)
- [Phase 05 — Flow CRUD API + CustomTool CRUD](phase-05-flow-crud-api.md)
- [Phase 06 — Canvas UI](phase-06-canvas-ui.md)
- [Phase 07 — Execution Dispatch + SSE](phase-07-execution-dispatch.md)
- [Phase 09 — Execution Trace + Replay](phase-09-execution-trace.md)
- [Phase 10 — Integration + Templates + E2E](phase-10-integration-e2e.md)

## Open questions

1. Marketplace public templates — MVP skip, Phase 2 evaluate
2. Runaway flow protection — if agent enters infinite loop, hard cap at 20 LLM calls / request?
3. Plan-based credential quota (currently hard 50) — when to revisit?
4. Model routing per call — if user picks large-v4 for agent node but agent internally calls small-v4 helper, credits attribute to actual model used per call
5. Multi-select delete — require confirm dialog when ≥3 nodes selected? (Phase 06)
6. Copy/paste buffer — clipboard API vs. Zustand in-memory? (Phase 06)
7. Right-panel auto-close on canvas click vs. sticky until Escape? (Phase 06)
8. Test-panel chat history — persist per-flow across canvas reloads or wipe? (Phase 06)
9. Agent node ReAct fallback — test if VNPT supports OpenAI function-calling format, else use LangChain `create_react_agent` (Phase 04)
10. Messages array — assistant prefilling (pre-filled assistant turn before user) supported? Anthropic-only feature, keep or defer?
11. Custom Function `$state.*` syntax vs `{{state.*}}` templating — unify to one convention? (Phase 04.5)

## Phase 00 research — resolved

- **VNPT LLM:** confirmed full OpenAI-compat via [`docs/API-LLM-VNPT.md`](../../docs/API-LLM-VNPT.md). Use `openai.OpenAI(api_key=<JWT>, base_url="https://assistant-stream.vnpt.vn/v1/")`. Models: `llm-small-v4`, `llm-medium-v4`, `llm-large-v4`. Streaming via `stream=True`. No VNPT-specific adapter needed.
- **Loop node:** DEFER post-MVP. Document as known limitation. Users who need loops → wait for Phase 2.
- **Execution trace:** NATIVE LangGraph StateSnapshot format. No Flowise JSON compat.
- **Config UI:** right-panel drawer — NOT Flowise inline popover
- **Undo/redo:** RF v12 first-party `useUndoRedo()`
- **Validator:** BFS DAG-only cycle detection — type-compat handles deferred
- **Node palette:** cmdk Command Menu
- **Handle ID encoding:** `{nodeId}-{direction}-{paramName}-{type}`
- **Dialog guard:** `dialogDepth` counter
- **Promise `useConfirm`:** ~37 line port from Flowise
