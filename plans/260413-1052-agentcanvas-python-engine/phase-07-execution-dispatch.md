# Phase 07 — Execution Dispatch + SSE Bridge

**Status:** ⬜ pending

## Goal
Route every chat message through the bot's flow (flowId is always set — non-nullable). NestJS decrypts credentials, calls Python engine, proxies SSE stream back to client. Legacy `runDefaultRag()` path removed.

## Files to create/modify

```
genai-platform-api/src/modules/flow-exec/
  flow-exec.module.ts
  flow-exec.service.ts              # Orchestration
  flow-exec.controller.ts           # (Optional: /api/v1/flows/:id/test-run)
  engine-client.ts                  # HTTP client for genai-engine
  sse-relay.ts                      # Stream transformer

genai-platform-api/src/modules/chat-proxy/
  chat-proxy.service.ts             # MODIFY: add dispatch logic
```

## Dispatch logic (chat-proxy.service.ts)

```ts
async processChat(botId, message, sessionId, ...) {
  const bot = await this.botsService.getById(botId, { include: { flow: true } });
  // bot.flowId is non-nullable — guaranteed by schema + auto-provision on create
  return this.flowExecService.runFlow({
    flow: bot.flow,
    botId,
    sessionId,
    message,
    conversationId: conversation.id,
  });
}
```

## FlowExecService

```ts
@Injectable()
export class FlowExecService {
  async runFlow(params: RunFlowParams): AsyncIterable<SseEvent> {
    // 1. Create FlowExecution row (state=INPROGRESS)
    const exec = await this.prisma.flowExecution.create({
      data: {
        flowId: params.flow.id,
        botId: params.botId,
        conversationId: params.conversationId,
        sessionId: params.sessionId,
        state: 'INPROGRESS',
        executionData: [],
      },
    });

    // 2. Resolve credentials referenced in flow
    const credIds = extractCredentialRefs(params.flow.flowData);
    const creds = await this.credentialsService.bulkDecrypt(credIds);
    // creds: { [credId]: { apiKey: "sk-...", baseUrl: "..." } }

    // 3. Load conversation history for buffer_memory node
    const history = await this.conversationsService.getRecentMessages(
      params.conversationId, 20
    );

    // 4. Call engine
    const engineStream = this.engineClient.executeStream({
      flow_def: params.flow.flowData,
      credentials: creds,
      inputs: {
        chat_input: params.message,
        session_id: params.sessionId,
        conversation_id: params.conversationId,
        execution_id: exec.id,
        history,
      },
    });

    // 5. Relay + persist events
    return this.relayAndPersist(engineStream, exec.id);
  }

  private async *relayAndPersist(
    source: AsyncIterable<SseEvent>,
    execId: string,
  ): AsyncIterable<SseEvent> {
    const trace: NodeTrace[] = [];
    let tokens = 0;

    try {
      for await (const ev of source) {
        switch (ev.type) {
          case 'node_start':
            trace.push({ nodeId: ev.node_id, startedAt: Date.now() });
            break;
          case 'node_end':
            const last = trace[trace.length - 1];
            last.finishedAt = Date.now();
            last.output = ev.output;
            last.duration = last.finishedAt - last.startedAt;
            break;
          case 'node_error':
            trace[trace.length - 1].error = ev.error;
            break;
          case 'token':
            tokens++;
            // Relay only the content delta to client (don't leak internal events)
            yield { type: 'token', data: ev.data };
            continue;  // don't double-yield
          case 'done':
            yield { type: 'done', data: ev.data };
            continue;
        }
        // Internal events: only forward select ones
        if (['flow_start', 'node_start', 'node_end', 'error'].includes(ev.type)) {
          yield { type: ev.type, nodeId: ev.node_id };  // lean payload
        }
      }
      await this.prisma.flowExecution.update({
        where: { id: execId },
        data: {
          state: 'FINISHED',
          finishedAt: new Date(),
          executionData: trace as any,
          tokensUsed: tokens,
        },
      });
    } catch (err) {
      await this.prisma.flowExecution.update({
        where: { id: execId },
        data: {
          state: 'ERROR',
          finishedAt: new Date(),
          executionData: trace as any,
          errorMessage: err.message,
        },
      });
      yield { type: 'error', message: err.message };
    }
  }
}
```

## Engine client (HTTP + SSE)

```ts
export class EngineClient {
  constructor(private url: string, private internalKey: string) {}

  async *executeStream(body: ExecuteRequest): AsyncIterable<SseEvent> {
    const response = await fetch(`${this.url}/v1/flows/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': this.internalKey,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new HttpException(`Engine ${response.status}`, 502);
    if (!response.body) throw new Error('No stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const ev = parseSseBlock(part);
        if (ev) yield ev;
      }
    }
  }
}
```

## Engine-side change (add internal key guard)

```python
# genai-engine/app/api/flow.py
@router.post("/v1/flows/execute", dependencies=[Depends(verify_internal_key)])
async def execute_flow(req: ExecuteFlowRequest): ...
```

## Credentials extraction

```ts
function extractCredentialRefs(flowData: FlowData): string[] {
  const ids = new Set<string>();
  for (const node of flowData.nodes) {
    for (const [k, v] of Object.entries(node.data.config || {})) {
      if (typeof v === 'string' && v.startsWith('cred_')) ids.add(v);
    }
  }
  return [...ids];
}
```

Then `credentialsService.bulkDecrypt` verifies tenant ownership:
```ts
async bulkDecrypt(ids: string[], tenantId: string) {
  const creds = await this.prisma.credential.findMany({
    where: { id: { in: ids }, tenantId },
  });
  if (creds.length !== ids.length) throw new ForbiddenException('Missing credential');
  return Object.fromEntries(creds.map(c => [c.id, JSON.parse(decrypt(c))]));
}
```

## Credit / quota integration — VNPT-only model

**Rule:** Only VNPT LLM calls consume smartbot credits. External LLMs (OpenAI/Anthropic via user's own credential) = 0 credits.

### Per-model credit table

| Model | Credits/call |
|---|---|
| `llm-small-v4`  | 1 |
| `llm-medium-v4` | 2 |
| `llm-large-v4`  | 4 |

### Credit tracking flow

1. **Pre-check (before engine call):** Verify tenant has ≥1 credit remaining (minimum 1 call cost).
   ```ts
   const usage = await this.creditsService.getRemaining(tenantId);
   if (usage.remaining < 1) throw new ForbiddenException('Insufficient credits');
   ```

2. **During execution:** Engine emits `token` events but also emits **`llm_call_completed`** event per VNPT LLM call:
   ```python
   # In vnpt.py node, after successful call:
   ctx.emit(ExecutionEvent(
     type="llm_call_completed",
     node_id=ctx.node_id,
     data={"provider": "vnpt", "model": ctx.inputs["model"], "tokens": tokens_used}
   ))
   ```
   *Non-VNPT LLM nodes (openai, anthropic) do NOT emit this event.*

3. **Post-execution (NestJS relay aggregator):**
   ```ts
   const VNPT_CREDIT_MAP = { 'llm-small-v4': 1, 'llm-medium-v4': 2, 'llm-large-v4': 4 };
   let creditsUsed = 0;

   for await (const ev of engineStream) {
     if (ev.type === 'llm_call_completed' && ev.data.provider === 'vnpt') {
       creditsUsed += VNPT_CREDIT_MAP[ev.data.model] ?? 1;
     }
     // ... relay to client
   }

   // On finish:
   await this.creditsService.consume(tenantId, creditsUsed, {
     source: 'flow_execution',
     flowExecutionId: exec.id,
   });
   await this.prisma.flowExecution.update({
     where: { id: exec.id },
     data: { tokensUsed: creditsUsed },  // reuse field name (or rename to creditsUsed)
   });
   ```

### Sum across loops — agent runs 5 large-v4 calls → 20 credits

No cap for MVP. Every VNPT call counts. Consider runaway protection in future (e.g., max 20 LLM calls per request — kill flow if exceeded).

### Model mismatch guard

Engine's `llm_vnpt` node validates `model` input is in `{small,medium,large}-v4`. If user picks unknown model → reject with clear error, prevent silent free credit bypass.

### Insufficient mid-flow?

Pre-check only enforces ≥1 credit. If flow burns 20 credits and tenant had 15 → allow completion (don't interrupt mid-flow). Record `creditsOwed` as debt field on CreditUsage (future dunning). **MVP:** just log warning, let it complete.

### External LLM nodes — no credit

`llm_openai`, `llm_anthropic` use user's own API key → user pays provider directly → smartbot charges 0 credits. These nodes do NOT emit `llm_call_completed`.

## Success criteria

- [ ] Every chat message for a bot routes through its flow (no RAG fallback path exists)
- [ ] Client receives SSE stream with tokens + done event
- [ ] FlowExecution row created per chat, state transitions properly
- [ ] Credentials decrypted per request, never cached
- [ ] Engine failure → client sees `error` event, FlowExecution state=ERROR
- [ ] Cross-tenant credential access blocked (403)
- [ ] Quota enforced — tenant with 0 credits blocked
- [ ] E2E: full user flow from UI save → attach bot → chat → see response

## Risks

- **SSE backpressure** — if client slow, engine blocks. Use queue with bounded size, drop old token events if client lag > 500ms.
- **Long-running flows timeout** — set 60s default timeout, configurable per flow
- **Credential leak in logs** — strip sensitive fields in logging middleware
- **Abandoned FlowExecution rows** (client disconnects mid-stream) — cleanup job marks stuck INPROGRESS as STOPPED after 5min

## Out of scope

- Parallel flow executions per bot (single-threaded per conversation)
- Flow execution resume after crash (Phase 09 checkpointing)
- Cost tracking per node (aggregated only for now)
