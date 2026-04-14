# Phase 09 — Execution Trace + Replay UI

**Status:** ⬜ pending

## Goal
UI to browse FlowExecution history per flow/bot. Replay view showing which nodes ran, inputs/outputs, timing, errors. Canvas highlights last-run path.

## Files to create

```
smartbot-web/src/app/(dashboard)/bots/[botId]/flow/executions/
  page.tsx                            # List view
  [executionId]/page.tsx              # Detail view

smartbot-web/src/components/features/flow-executions/
  execution-list.tsx                  # DataTable
  execution-detail.tsx                # Trace panel + canvas replay
  trace-timeline.tsx                  # Vertical timeline of node events
  node-trace-item.tsx                 # Collapsible per node
  execution-status-badge.tsx

genai-platform-api/src/modules/flow-exec/
  executions.controller.ts            # NEW: list/detail endpoints
  executions.service.ts
```

## API

```
GET  /api/v1/flows/:flowId/executions        List (paginated, filter: state, date)
GET  /api/v1/executions/:id                  Detail (full trace)
POST /api/v1/executions/:id/rerun            Re-execute with same inputs (debug)
DELETE /api/v1/executions/:id                Delete single trace
```

## UI — list page

```
Bot: Customer Support Bot
Flow: Simple RAG
───────────────────────────
Executions (last 7 days)

Status     StartedAt         Duration  Tokens  Conversation
───────────────────────────────────────────────────────────
FINISHED   2026-04-13 14:32  2.4s      542     conv-abc... [View]
ERROR      2026-04-13 14:30  0.8s      120     conv-def... [View]
FINISHED   2026-04-13 14:28  1.9s      380     conv-ghi... [View]
```

## UI — detail page (canvas replay)

Left: Canvas in **read-only mode** with nodes colored by their status:
- ✅ Green = successful node
- ❌ Red = errored node
- ⚪ Gray = not executed (branch skipped)
- Node border thickness = duration (thicker = slower)

Right: timeline panel

```
Execution abc-123                  [Rerun] [Close]
───────────────────────────────
State: FINISHED
Started: 14:32:05
Duration: 2.4s
Tokens: 542
Conversation: conv-abc... [Open]

───────────────────────────────
Trace

▶ Start (n1)                        2ms
  input:  { chat_input: "What is X?" }
  output: { chat_input: "What is X?" }

▶ Qdrant Retriever (n2)            450ms
  input:  { query: "What is X?", top_k: 5 }
  output: { documents: [5 items], context: "..." }  [Expand]

▶ Prompt Template (n3)             5ms
  [Expand]

▶ VNPT LLM (n4)                    1.8s
  input:  { user_message: "...", model: "llm-large-v4" }
  output: { response: "X is ..." }
  tokens: 542
  [Expand]

▶ End (n5)                          1ms
```

## Replay canvas component

```tsx
export function ExecutionReplay({ executionId }: { executionId: string }) {
  const { data: exec } = useExecution(executionId)
  const { data: flow } = useFlow(exec?.flowId)

  const nodes = flow?.flowData.nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      trace: exec?.executionData.find(t => t.nodeId === n.id),
    },
  }))

  return (
    <ReactFlow
      nodes={nodes}
      edges={flow?.flowData.edges}
      nodeTypes={REPLAY_NODE_COMPONENTS}
      nodesConnectable={false}
      nodesDraggable={false}
      fitView
    >
      <MiniMap />
      <Controls />
    </ReactFlow>
  )
}

// Each replay node component reads data.trace and styles accordingly:
function ReplayLlmNode({ data }) {
  const { trace } = data
  const color = !trace ? 'gray' : trace.error ? 'red' : 'green'
  return (
    <div className={cn("...", `border-${color}-500`)}>
      {/* ...same as edit node, but locked */}
      {trace && <Badge>{trace.duration}ms</Badge>}
    </div>
  )
}
```

## Pagination + filters

- Page size 25, max 100
- Filter: state (ALL/FINISHED/ERROR/STOPPED), date range, conversation search
- Sort: startedAt desc (default), duration desc

## Retention

- Keep FlowExecutions for 30 days default (soft limit)
- Cron job: daily cleanup `DELETE FROM flow_executions WHERE started_at < now() - interval '30 days'`
- Per-tenant configurable (Pro plan: 90 days)

## Engine changes needed — NATIVE LangGraph trace (no Flowise JSON compat)

**Decision:** Use LangGraph native event stream + StateSnapshot, NOT Flowise `executionData` JSON format.

Aggregate trace from `.astream(stream_mode=["updates", "custom", "tasks"])`:
- `tasks` mode → node start/end timing
- `updates` mode → state deltas per node (output)
- `custom` mode → token emissions, `llm_call_completed` events

Trace JSON shape (stored in `FlowExecution.executionData`):

```json
[
  {
    "nodeId": "n2",
    "nodeType": "qdrant_retriever",
    "startedAt": 1713123456789,
    "finishedAt": 1713123457239,
    "duration": 450,
    "stateDelta": { "documents": [...], "context": "..." },
    "error": null
  },
  ...
]
```

This is our own format (not Flowise) — simpler aggregation, no legacy compat cruft.

## Success criteria

- [ ] List page shows all executions for current bot's flow, paginated
- [ ] Click row → detail page with canvas replay + timeline
- [ ] Errored node highlighted red on canvas
- [ ] Timeline expandable per-node to see full input/output JSON
- [ ] Rerun button reproduces execution (dev-only? or all users?)
- [ ] Retention cleanup runs, executions > 30d deleted
- [ ] Performance: 1000 executions in list loads < 2s

## Risks

- **Trace payload size** — a node with large retrieved docs may save 50KB. Consider truncating in trace (full data via separate "full dump" endpoint).
- **PII in trace** — user messages saved verbatim. Document data retention for compliance.
- **Replay of stale flow** — if flow was edited after execution, replay shows current flow with old trace. Warn user: "Flow was updated X time ago."

## Out of scope

- Real-time execution watching (live canvas updates while running) — Phase 3
- Execution diff view (compare two runs)
- Export trace to CSV/JSON
