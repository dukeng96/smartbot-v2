# AgentCanvas Cook Session — dev-agentflow

**Date**: 2026-04-14  
**Severity**: High (BUG-02 would have been a 100% production incident)  
**Component**: genai-engine, genai-platform-api, smartbot-web, Prisma  
**Status**: Resolved — branch `dev-agentflow`, HEAD `067698d`, 25 linear commits

---

## What Happened

Ran `/ck:team cook plans/260413-1052-agentcanvas-python-engine --delegate` to ship a 10-phase plan replacing hard-coded RAG with a Flowise-inspired user-customizable flow execution engine across all three services. Team of 4 (3 devs + tester). Lead stayed in delegate mode throughout — never touched code. All teammates shut down cleanly. Landed in a single afternoon.

---

## The Brutal Truth

We almost shipped a flow executor that would have crashed on **every single bot creation**. The `buildSimpleRagFlowData` template — the function that auto-provisions a default flow when a user creates a bot — wired node types (`retriever`, `direct_reply`, `http`, `custom_tool`) that flat-out do not exist in the engine's `NodeRegistry`. The backend DAG validator blessed them because `VALID_NODE_TYPES` was copied from the plan's aspirational type list, not from what the engine actually registered.

Nobody cross-checked. Not the dev who wrote the validator. Not the dev who wrote the template. Not me.

The tester caught it. Late. But they caught it. That's the only reason BUG-02 isn't a postmortem.

---

## Technical Details

### What Landed

- **Engine**: LangGraph `StateGraph` executor, 11 canonical node types (`start`, `end`, `llm`, `condition`, `set_variable`, `http_request`, `knowledge_base`, `code`, `text_formatter`, `sticky_note`, `memory`). RestrictedPython sandbox for `code` nodes (safe_builtins + thread semaphore, max 10 concurrent). SSE envelope: `{type, node_id?, data:{...}}`. 42 unit tests + 23 contract tests.
- **Backend**: `FlowsModule` (CRUD + DAG validation + simple-rag auto-provision), `CredentialsModule` (AES-256-GCM vault), `CustomToolsModule` (50/tenant cap), `FlowExecModule` (engine SSE relay with credential pre-resolution — secrets never sent plaintext over HTTP). 194 tests green.
- **Frontend**: Canvas UI (React Flow v12), Zustand+immer store with first-party undo/redo, node palette, config drawer with Pydantic-schema-driven forms, Monaco code editor, test panel with SSE consumer. Typecheck + build clean.
- **Prisma**: Added `flows`, `flow_executions`, `credentials`, `custom_tools` tables. `bots.flow_id` is now `UNIQUE NOT NULL` — this wiped existing bots per plan. New route `/bots/[botId]/flow`.

### BUG-02: Validator Whitelisted Non-Existent Node Types

Fix commit: `17375e2`

```
# Backend VALID_NODE_TYPES before fix (wrong):
['start','end','llm','condition','set_variable','http_request',
 'knowledge_base','code','text_formatter','sticky_note','memory',
 'agent','custom_tool','custom_function','retriever',      # NONE of these exist
 'direct_reply','http','human_input']                      # in the engine registry

# buildSimpleRagFlowData template before fix (wrong):
start -> retriever -> llm -> direct_reply
         ^^^^^^^^^             ^^^^^^^^^^^
         not in engine         not in engine
```

Every bot creation would call `buildSimpleRagFlowData`, the DAG validator would pass (whitelist too broad), but the engine would throw `FlowValidationError: unknown node type 'retriever'` on first execution. Zero bots would have worked post-deploy.

### SSE Envelope: Three Rounds to Land

The cross-language SSE contract (`{type, node_id?, data:{...}}`) required three alignment rounds:

1. Engine originally emitted mixed shapes. Backend relay read `ev.data`. Frontend consumed different fields.
2. `b8c1ba7`: engine used top-level `updates=` kwarg. Backend relay dropped it silently (read nested `data`). Produced empty relay.
3. `36b1e87`: nested everything inside `data`. Also renamed `token.delta` → `token.content`, top-leveled `message` field for errors, stripped `node_start.meta` and `node_end.output` from client payload.

Tester's `test_e2e_contracts.py` (23 tests) forced three-way verification and proved alignment at HEAD.

### BUG-01 False Positive

Tester initially flagged a `token.content` contract mismatch. At HEAD, both sides already used `content` as the top-level field. Tester downgraded the severity after I pointed to the actual lines in the source. The confusion came from testing against a stale mental model of intermediate commits, not HEAD.

### Minor Fixes

- `e4d46e2`: Pydantic alias `sourceHandle` → `source_handle` so frontend camelCase flows parsed correctly.
- `067698d`: `test_api.py` gated behind `RUN_LIVE_API_TESTS=1` env var to stop CI noise on module-level skip.

---

## What We Tried

- DAG validator written first in backend, then template written separately — no one ran a diff against engine registry. Worked in isolation, failed when composed.
- Three SSE envelope iterations across engine, backend, frontend. No shared schema file; alignment happened through human review + contract tests.
- Lead-delegate mode: coordinated without writing code. File ownership boundaries (engine / backend / frontend / tests) prevented merge conflicts on linear history with no worktrees.

---

## Root Cause Analysis

**BUG-02 root cause**: The plan document listed aspirational node types for future phases alongside the types being implemented in this phase. The backend dev copied the full list into `VALID_NODE_TYPES` without verifying which ones the engine actually registered. The template dev wrote against the plan's flow diagram, not the engine's type registry. A single `grep -r "NodeRegistry.register" genai-engine/app/flow/nodes/` would have prevented this. Nobody ran it.

**SSE fragility root cause**: Three services in three languages consuming the same streaming protocol with no shared schema file and no automated three-way alignment check until contract tests were written post-implementation. We got lucky that the tester wrote them.

---

## Lessons Learned

1. **Run validators against the actual implementation registry, not the spec.** When writing a whitelist of valid types, always derive it programmatically from what's registered, not from what the design doc intended. `grep -r "NodeRegistry.register"` takes 2 seconds.

2. **Lean SSE envelopes across 3 languages are fragile by default.** `{type, node_id?, data:{...}}` is a good pattern but every shape change needs three-way confirmation. Budget for it. Contract tests are non-negotiable, not a nice-to-have.

3. **Auto-provisioning templates must be integration-tested against the live validator.** `buildSimpleRagFlowData` returns a DAG; there should be a unit test that pipes it through `validateFlowDAG`. There wasn't. Now there is (sort of — tester caught it, but not via automated test of the template itself).

4. **Delegate mode works at this scale.** Lead coordinated 3 devs on a single branch, 25 linear commits, zero merge conflicts. File ownership boundaries (engine/backend/frontend/tests) were the key. The cook plan's default worktree recommendation was ignored; devs self-coordinated. It held.

5. **Test against HEAD, not memory.** BUG-01 was a false positive because the tester was reasoning from an intermediate commit state. Always grep the actual file before filing a bug.

---

## Next Steps

| Item | Owner | Priority |
|------|-------|----------|
| Major docs sync pass: `backend-api-reference.md`, `backend-codebase-summary.md`, `system-architecture.md`, `frontend-architecture.md` all stale — new DB tables, new modules, new route, new services not reflected anywhere | doc-updater agent | High |
| Credentials encrypt/decrypt roundtrip unit test (vault code exists, no round-trip coverage) | backend dev | Medium |
| Implement deferred node types: `agent`, `custom_tool`, `custom_function`, `human_input` — specced for future phases, backend validator correctly excludes them now, but they're dangling expectations | engine dev | Low (future phase) |
| Live-stack E2E run (tester ran contract-level E2E only; full stack boot with Docker not attempted this session) | tester | Medium |
| Automate "template DAG passes own validator" as a unit test — the gap that allowed BUG-02 | backend dev | High |

---

## Unresolved Questions

- Should `VALID_NODE_TYPES` in the backend validator be derived dynamically from the engine's `/engine/v1/flows/node-types` endpoint at startup, rather than a hardcoded list? Avoids the drift problem permanently but introduces a startup-time coupling.
- `bots.flow_id UNIQUE NOT NULL` wiped existing bots. Migration was destructive by design (per plan). Is the plan's decision to nuke existing bots acceptable to the product owner, or does this need a migration path on next merge to `main`?
- RestrictedPython sandbox: max 10 concurrent `code` node executions via semaphore. Is that the right cap for production load? No load test run.
