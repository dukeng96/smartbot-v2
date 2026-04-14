# Phase 10 — Integration + Templates + E2E Testing + Polish

**Status:** ⬜ pending

## Goal
Seed 5 template flows. Full system integration test. Docs. Migration path for existing bots. Polish UX.

## Tasks

### 1. Template seeding (1 day)

All templates are tenant-agnostic JSON files loaded at startup. UI prompts user to bind credentials (and CustomTools where applicable) on first import.

#### Templates

##### 1. `simple-rag.json` — Retrieval-augmented chat (also seeded as tenant's default flow)

```
Start → Retriever (qdrant, top_k=5) → LLM (vnpt, return_response_as=assistant_message)
```

LLM node terminates — streams tokens to client directly. No Direct Reply needed.

##### 2. `agent-with-custom-tool.json` — Tool-using agent

```
Start → Agent (vnpt, tools=[<placeholder CustomTool ID>], max_iterations=5, return_response_as=assistant_message)
```

Agent node terminates. Tool ID placeholder — UI prompts "Select a Custom Tool" on import. Seeded example CustomTool: `fetch_weather` (dummy schema, skeleton RestrictedPython impl).

##### 3. `conditional-routing.json` — Intent-based branching

```
Start
  → LLM (classify intent → flow_state; output parsed to {intent: "support" | "sales" | "other"})
  → Condition (on {{llm.intent}})
      "support" → Retriever → LLM (return_response_as=assistant_message)
      "sales"   → Direct Reply ("Let me connect you with sales")
      "other"   → Direct Reply ("I'm not sure, can you rephrase?")
```

Mixed terminals: LLM-terminal for dynamic branch, Direct Reply for static branches.

##### 4. `summarize-then-answer.json` — Two-pass LLM

```
Start
  → Retriever (top_k=10)
  → LLM #1 (flow_state; messages=[system:"Summarize these docs", user:"{{retriever.documents}}"])
  → LLM #2 (return_response_as=assistant_message; messages=[system:"Answer using this summary", user:"summary={{llm_1.response}}, query={{state.user_message}}"])
```

Second LLM terminates and streams final answer.

##### 5. `webhook-with-approval.json` — Human-in-the-loop

```
Start
  → Custom Function (extract_entities: parse name/email/intent from user msg → state)
  → Human Input (prompt="Approve webhook POST for {{state.email}}?", context={{state}})
  → Condition (on {{human_input.approved}})
      true  → HTTP (POST to webhook URL, body={{state}}) → Direct Reply ("Submitted!")
      false → Direct Reply ("Cancelled. {{human_input.feedback}}")
```

Demonstrates Custom Function + Human Input + HTTP + Condition composition. Direct Reply used here because final text is static/templated — no LLM call needed.

#### Seeding mechanism

```ts
// genai-platform-api/src/modules/flows/templates/seed.ts
export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'rag' | 'agent' | 'routing' | 'approval';
  flowData: FlowData;              // parsed JSON
  requiredCredentials: string[];   // e.g. ['vnpt', 'qdrant']
  requiredCustomTools?: string[];  // placeholder tool names user must create
}

export const TEMPLATES: FlowTemplate[] = [
  { id: 'simple-rag',              /* ... */ },
  { id: 'agent-with-custom-tool',  /* ... */ },
  { id: 'conditional-routing',     /* ... */ },
  { id: 'summarize-then-answer',   /* ... */ },
  { id: 'webhook-with-approval',   /* ... */ },
];

// Not stored in DB — read from file at startup
// API: GET /api/v1/flows/templates → list
// POST /api/v1/flows/from-template { templateId } → deep-clone + create tenant-scoped Flow
```

**Import UX:** After `POST /from-template`, return `{ flow, unresolved: { credentials: [...], customTools: [...] } }` so UI walks user through binding.

### 2. Default flow auto-provision

Every new Bot receives a `simple-rag` flow on creation (clone from template, tenant-scoped). `Bot.flowId` is non-nullable — no bot exists without a flow.

```ts
// bots.service.ts — create()
const defaultFlow = await this.flowsService.createFromTemplate(
  tenantId, 'simple-rag', { name: `${bot.name} - Flow` }
);
await this.prisma.bot.create({
  data: { ...botData, flowId: defaultFlow.id },
});
```

Existing bots: deleted as part of this migration (confirmed with user — no RAG fallback retained).

### 3. E2E test suite

```
tests/e2e/agentcanvas/
  01-create-flow.spec.ts         # Create via API, verify in DB
  02-canvas-interactions.spec.ts # Playwright: drag, connect, save
  03-execution.spec.ts           # Send chat, receive tokens
  04-credentials.spec.ts         # Encrypt/decrypt roundtrip
  05-tenant-isolation.spec.ts    # Cross-tenant access denied
  06-default-flow.spec.ts        # New bot auto-provisioned with simple-rag flow
  07-templates.spec.ts           # Import each of 5 templates, execute end-to-end
  08-custom-tool-sandbox.spec.ts # RestrictedPython sandbox escape attempts
  09-human-input-resume.spec.ts  # interrupt() + resume across process restart
  10-ssrf.spec.ts                # HTTP node rejects private/loopback/link-local IPs
```

### 4. Docs

Update:
- `docs/backend-api-reference.md` — new routes
- `docs/backend-codebase-summary.md` — flows + credentials + customTools modules
- `docs/system-architecture.md` — 3rd service role (engine = control plane + data plane)
- `docs/agentcanvas-user-guide.md` — NEW: screenshots, how to build a flow
- `README.md` — mention agentcanvas feature

### 5. UX polish

- Loading states on canvas save
- Error toasts with actionable messages ("Missing credential: create one in Settings")
- Empty state on `/flow` page: "No flow yet — start from template?"
- Keyboard shortcut help modal (? key)
- Canvas default zoom + initial fit
- Mobile block: desktop-only canvas

### 6. Bug-fix iteration loop

Run full E2E suite → fix every failure → re-run → repeat until 3 consecutive clean runs. No feature work during this phase. Log each bug + root cause in `plans/reports/phase-10-bugs.md` for future regression tests.

### 7. Monitoring hooks

- Log structured events: `flow.created`, `flow.executed`, `credential.decrypted`, `customTool.invoked`, `sandbox.violation`
- Metrics: executions/min, avg duration, error rate per node type
- Alert on: engine unavailable > 1min, error rate > 5%, sandbox violations > 0

## Checklist — production readiness

- [ ] All prior phases ✅
- [ ] E2E test suite passes (3 consecutive clean runs)
- [ ] 5 templates import + execute end-to-end
- [ ] New bot auto-provisioned with `simple-rag` flow
- [ ] Docs updated
- [ ] No credential leaks in logs (grep `apiKey|sk-|bearer` in log samples)
- [ ] Load test: 10 concurrent flow executions stable
- [ ] Feature flag: `FEATURE_AGENTCANVAS=true` to gate rollout

## Rollout plan

1. Wipe existing bots in all environments (staging + prod)
2. Deploy to staging, run E2E suite
3. Internal dogfood: team uses agentcanvas for 1 week
4. Beta: 5-10 pilot customers, feature flag per-tenant
5. GA: announce in release notes

## Risks

- **Engine reliability** — ops runbook: restart engine, drain current executions
- **Credential vault key loss** — backup `CREDENTIAL_ENCRYPTION_KEY` in KMS (NOT in repo)
- **Flow breaking changes** — flowData schema version field from day 1; migration script ready
- **Template placeholder resolution** — `unresolved` binding flow must work or templates unusable. Block release until UX tested.
- **Custom Function in webhook-with-approval template** — hard dep on Phase 04.5 sandbox.
- **Default flow provision failure** — if `simple-rag` template broken, bot creation fails. Add health check on startup: validate + instantiate `simple-rag` before marking service ready.

## Success criteria

- [ ] Full E2E: user logs in → creates bot (auto-gets default flow) → chats → sees streaming response from flow execution
- [ ] Tenant A flow invisible to Tenant B (isolation)
- [ ] New bot creation auto-provisions `simple-rag` flow; `Bot.flowId` never null
- [ ] User can edit default flow or swap to another template
- [ ] All 5 templates validate (`POST /v1/flows/validate`) and execute end-to-end
- [ ] `GET /api/v1/flows/templates` returns 5 templates
- [ ] `POST /api/v1/flows/from-template { templateId: 'simple-rag' }` creates functional tenant-scoped flow
- [ ] `webhook-with-approval` exercises Custom Function + Human Input + HTTP + Condition composition
- [ ] Bug-fix loop completes: 3 consecutive clean E2E runs
- [ ] 7-day stability test: no credential leaks, no stuck executions, no data loss

## Open questions

1. Feature flag at tenant level or global? (Recommend: env var global for MVP, tenant-level phase 2)
2. Credits cost per flow execution — same as RAG? Or per-node pricing? (MVP: same as RAG)
3. Pricing tier gating? (e.g., only Pro plan has agentcanvas?) — decide before GA
4. Human Input timeout — auto-reject after N hours? Or pause indefinitely until resume/cancel?
