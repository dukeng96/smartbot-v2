# Brainstorm Report — Agentcanvas Plan Refinements (4 Items)

**Date:** 2026-04-14
**Plan touched:** `plans/260413-1052-agentcanvas-python-engine/`
**Scope:** 4 targeted refinements to existing plan. No architectural rework.

## Problem Statement

User reviewed agentcanvas plan, flagged 4 issues with current plan shape:

1. **Direct Reply overused in templates.** Flowise has `return_response_as = "assistant_message"` on LLM/Agent nodes making them terminal. Plan's Phase 10 templates wire Direct Reply after every LLM — redundant. Confirm Python port has this option; if not, add it.
2. **Migration path for existing bots is unwanted noise.** User OK wiping all existing bots. No RAG fallback. Every bot must bind to a flow (default = basic RAG template). Whole plan must be audited for conflicts.
3. **Performance audit not needed** in MVP.
4. **Optional dedicated bug-fix phase?** — loop: test → fix → test until clean.

Constraint: no noise context when editing.

## Decisions

### 1. `return_response_as` input added to LLM + Agent nodes

**Values:** `flow_state` (default, writes to state for downstream nodes) | `assistant_message` (terminal, streams final response, halts executor).

**Implementation:** Phase 04 node spec now includes `return_response_as` in `VnptLlmNode` and `AgentNode` inputs. Terminal branch calls `ctx.halt()` + emits `assistant_message` SSE event directly — no Direct Reply needed.

**Template impact:** Phase 10 templates rewritten. `simple-rag` now `Start → Retriever → LLM(return_response_as=assistant_message)`. Direct Reply retained only where output is static/templated (no LLM call needed — e.g., "Cancelled" branch in `webhook-with-approval`).

### 2. Non-nullable `Bot.flowId` + auto-provision default flow

**Chosen:** wipe existing bots, make `flowId` NOT NULL + `@unique`, auto-provision `simple-rag` on bot creation, remove `runDefaultRag()` fallback entirely.

**Rationale:** simpler dispatch (single codepath), no legacy RAG cruft, matches user's mental model (every bot = one flow).

**Files updated:**
- `plan.md` — Intent, Architecture, Decision 7 rewritten. Success criteria updated.
- `phase-01-prisma-foundation.md` — Prisma schema: `flowId String` required, `Flow` relation required, `onDelete: Restrict`. Added destructive `DELETE FROM bots;` step. Risks note.
- `phase-05-flow-crud-api.md` — `DELETE /bots/:botId/flow` removed; replaced with `POST /bots/:botId/swap-flow`. Flow delete rejected when bot references it. Success criteria updated.
- `phase-07-execution-dispatch.md` — dispatch logic simplified to unconditional `runFlow()`. Success criterion for "Bot without flowId → RAG" dropped.
- `phase-10-integration-e2e.md` — "Migration path" section replaced with "Default flow auto-provision"; E2E test `06-migration.spec.ts` → `06-default-flow.spec.ts`. Rollout step 1 = wipe bots. Risk added: default flow provision failure → service startup health check.

**Cascade semantics:**
- Flow delete while attached to bot → rejected (`onDelete: Restrict`)
- User flow: swap bot's flow first → delete orphaned flow
- No detach endpoint (flowId cannot be null)

### 3. Performance audit removed

Phase 10 "Performance audit" section removed. Load test line retained in production-readiness checklist ("10 concurrent flow executions stable") as smoke signal only — no dedicated profiling task.

### 4. Bug-fix iteration folded into Phase 10 (no new phase)

**Chosen:** add bug-fix loop as a phase-10 task, not a standalone phase.

**Rationale:** bugs discovered during E2E are natural output of E2E run; separating into own phase adds artificial ceremony. Loop is a task, not a phase.

**Task shape:**
> Run full E2E suite → fix every failure → re-run → repeat until 3 consecutive clean runs. No feature work during this task. Log each bug + root cause in `plans/reports/phase-10-bugs.md`.

**Stop condition:** 3 consecutive clean runs — deterministic, prevents "until it feels stable" drift.

Added to success criteria: "Bug-fix loop completes: 3 consecutive clean E2E runs".

## Files Modified (Final List)

| File | Change |
|---|---|
| `plan.md` | Intent, Architecture, Decision 7, success criteria |
| `phase-01-prisma-foundation.md` | Bot.flowId NOT NULL + Restrict, wipe step, risks |
| `phase-04-nodes.md` | `return_response_as` added to LLM + Agent nodes |
| `phase-05-flow-crud-api.md` | swap-flow endpoint, Restrict semantics, success criteria |
| `phase-07-execution-dispatch.md` | Dispatch simplified, RAG fallback removed |
| `phase-10-integration-e2e.md` | Templates rewritten, migration removed, perf audit removed, bug-fix loop added |

## Implementation Considerations

- **Template validity:** `simple-rag` template must be validated at service startup — if broken, bot creation breaks. Health check added to Phase 10 risks.
- **Swap-flow atomicity:** `POST /bots/:botId/swap-flow` must be transactional (verify flow ownership → check 1:1 free → update) to prevent race where two bots grab same flow.
- **Orphan flow cleanup:** after swap, previous flow is unattached. Not auto-deleted (user may intentionally want backup). Future: add "unused flows" filter to list UI.

## Risks / Follow-ups

- Destructive migration confirmed with user (no prod data to preserve yet — pre-launch).
- `return_response_as` mutually exclusive with `update_flow_state` when terminal? Decision deferred — Phase 04 execute() enforces: if terminal, `update_flow_state` still applied pre-halt so downstream traces are complete. Document in Phase 04 test cases.
- Bug-fix loop duration uncertain — 3-clean-runs rule protects against runaway, but may extend timeline. Acceptable tradeoff for MVP stability.

## Success Metrics

- Plan consistency: grep `\brunDefaultRag\b|fallback.*RAG|flowId.*null` across plan dir → 0 hits (except historical notes).
- Phase-10 templates compile (run validator against each template JSON).
- Bot creation E2E: new bot always has flowId, always executable.

## Open Questions (carried forward)

1. Swap-flow — should previous flow auto-archive or stay active? (leaning: stay active, user explicit delete)
2. Default template version drift — if `simple-rag` template updated later, existing tenant flows cloned from it stay on old version. Accept? (MVP: yes, no auto-migration)
3. Bug-fix loop — cap iterations (e.g., max 10 rounds) to prevent eternal debugging? (MVP: no cap, trust judgment)

## Next Step

User decides: run `/ck:plan --hard` to regenerate plan from scratch with these locked decisions, OR accept current in-place edits and proceed to implementation. Current edits are self-consistent; regeneration only needed if user wants fresh phase breakdown.
