import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { CreditsService } from '../billing/credits.service';
import { EngineClient } from './engine-client';
import type { SseEvent, NodeTrace, RunFlowParams } from './types/sse-event.types';
import type { FlowData } from '../flows/types/flow-data.types';

const VNPT_CREDIT_MAP: Record<string, number> = {
  'llm-small-v4': 1,
  'llm-medium-v4': 2,
  'llm-large-v4': 4,
};

// SSE event types forwarded to the client (lean payload — no internal plumbing data)
const CLIENT_FORWARD_TYPES = new Set([
  'flow_start', 'node_start', 'node_end', 'node_error',
  'token', 'state_updated', 'awaiting_input', 'done', 'error',
  'tool_call', 'tool_result', 'human_input_required',
]);

function extractCredentialRefs(flowData: FlowData): string[] {
  const ids = new Set<string>();
  for (const node of flowData.nodes) {
    const config = (node.data as any)?.config ?? {};
    for (const v of Object.values(config)) {
      if (typeof v === 'string' && v.startsWith('cred_')) ids.add(v);
    }
  }
  return [...ids];
}

@Injectable()
export class FlowExecService {
  private readonly logger = new Logger(FlowExecService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly creditsService: CreditsService,
    private readonly engineClient: EngineClient,
  ) {}

  async *runFlow(params: RunFlowParams): AsyncIterable<SseEvent> {
    // Pre-check: tenant must have ≥1 credit
    const usage = await this.creditsService.getCurrentUsage(params.tenantId);
    const remaining = usage.creditsAllocated + usage.topUpCredits - usage.creditsUsed;
    if (remaining < 1) {
      throw new ForbiddenException('Insufficient credits. Please upgrade or top up.');
    }

    // Create FlowExecution row
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

    // Resolve credentials referenced in flow nodes
    const credIds = extractCredentialRefs(params.flow.flowData as FlowData);
    const credentials: Record<string, Record<string, string>> = {};
    for (const credId of credIds) {
      credentials[credId] = await this.credentialsService.decryptById(credId, params.tenantId);
    }

    const engineStream = this.engineClient.executeStream({
      flow_def: params.flow.flowData as { nodes: any[]; edges: any[] },
      credentials,
      inputs: {
        chat_input: params.message,
        session_id: params.sessionId,
        conversation_id: params.conversationId,
        execution_id: exec.id,
        history: params.history.length > 0 ? params.history : undefined,
      },
    });

    yield* this.relayAndPersist(engineStream, exec.id, params.tenantId);
  }

  async *resumeExecution(
    execId: string,
    tenantId: string,
    approval: string,
  ): AsyncIterable<SseEvent> {
    const exec = await this.prisma.flowExecution.findUnique({
      where: { id: execId },
      include: { flow: { select: { tenantId: true } } },
    });

    if (!exec || exec.flow.tenantId !== tenantId) {
      throw new NotFoundException('Execution not found');
    }

    if (exec.state !== 'INPROGRESS') {
      throw new BadRequestException(
        `Execution is in state '${exec.state}', expected INPROGRESS`,
      );
    }

    const engineStream = this.engineClient.resumeStream(execId, approval);
    yield* this.relayAndPersist(engineStream, execId, tenantId);
  }

  private async *relayAndPersist(
    source: AsyncIterable<SseEvent>,
    execId: string,
    tenantId: string,
  ): AsyncIterable<SseEvent> {
    const trace: NodeTrace[] = [];
    let creditsUsed = 0;

    try {
      for await (const ev of source) {
        switch (ev.type) {
          case 'node_start':
            trace.push({ nodeId: ev.node_id!, startedAt: Date.now() });
            break;

          case 'node_end': {
            const last = trace[trace.length - 1];
            if (last) {
              last.finishedAt = Date.now();
              last.duration = last.finishedAt - last.startedAt;
              last.output = ev.output;
            }
            break;
          }

          case 'node_error': {
            const last = trace[trace.length - 1];
            if (last) last.error = ev.error;
            break;
          }

          case 'llm_call_completed': {
            // Only VNPT calls emit this event — accumulate credits
            const model = ev.data?.model as string | undefined;
            if (model) {
              creditsUsed += VNPT_CREDIT_MAP[model] ?? 1;
            }
            // Don't forward to client — internal accounting only
            continue;
          }
        }

        if (CLIENT_FORWARD_TYPES.has(ev.type)) {
          yield this.leanPayload(ev);
        }
      }

      await this.prisma.flowExecution.update({
        where: { id: execId },
        data: {
          state: 'FINISHED',
          finishedAt: new Date(),
          executionData: trace as any,
          tokensUsed: creditsUsed,
        },
      });

      // Consume credits after stream completes (allow mid-flow debt per spec)
      if (creditsUsed > 0) {
        await this.creditsService.increment(tenantId, creditsUsed);
      }
    } catch (err: any) {
      this.logger.error(`Flow execution ${execId} failed: ${err.message}`, err.stack);

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

  // Strip engine internals — only send type + node_id + minimal data to client
  private leanPayload(ev: SseEvent): SseEvent {
    switch (ev.type) {
      case 'token':
        return { type: 'token', content: ev.data?.content ?? ev.content ?? '' };
      case 'awaiting_input':
        return { type: 'awaiting_input', node_id: ev.node_id, data: ev.data };
      case 'state_updated':
        return { type: 'state_updated', node_id: ev.node_id, data: ev.data };
      case 'done':
        return { type: 'done', data: ev.data };
      case 'node_error':
        return { type: 'node_error', node_id: ev.node_id, error: ev.error };
      case 'error':
        return { type: 'error', message: ev.message };
      case 'tool_call':
        return { type: 'tool_call', node_id: ev.node_id, data: ev.data };
      case 'tool_result':
        return { type: 'tool_result', node_id: ev.node_id, data: ev.data };
      case 'human_input_required':
        return { type: 'human_input_required', node_id: ev.node_id, data: ev.data };
      default:
        return { type: ev.type, node_id: ev.node_id };
    }
  }

  // Expose execution record for human_input resume flow (Phase 09)
  async getExecution(execId: string) {
    return this.prisma.flowExecution.findUnique({ where: { id: execId } });
  }
}
