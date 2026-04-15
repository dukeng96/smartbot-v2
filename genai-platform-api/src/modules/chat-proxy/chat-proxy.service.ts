import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../conversations/messages.service';
import { FlowExecService } from '../flow-exec/flow-exec.service';

interface ChatRequest {
  botId: string;
  message: string;
  conversationId?: string;
  endUserId?: string;
  endUserName?: string;
  // When set, bypass status='active' gating and scope lookup to this tenant
  // (used by the Test Panel so owners can chat against draft bots).
  testTenantId?: string;
}

interface SseEvent {
  event: string;
  data: string;
}

@Injectable()
export class ChatProxyService {
  private readonly logger = new Logger(ChatProxyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly botsService: BotsService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly flowExecService: FlowExecService,
  ) {}

  async getBotConfig(botId: string, _refererHost?: string) {
    const bot = await this.botsService.findActive(botId);
    return {
      id: bot.id,
      name: bot.name,
      avatarUrl: bot.avatarUrl,
      greetingMessage: bot.greetingMessage,
      suggestedQuestions: bot.suggestedQuestions,
      widgetConfig: bot.widgetConfig,
    };
  }

  async getConversationHistory(
    _botId: string,
    conversationId: string,
    _endUserId?: string,
  ) {
    return this.messagesService.getRecent(conversationId, 50);
  }

  async *processChat(req: ChatRequest): AsyncGenerator<SseEvent> {
    // 1. Validate bot + load flow (flowId is always set — guaranteed by schema).
    // Test mode: tenant-scoped lookup, ignores status='active' gate.
    const botWithFlow = req.testTenantId
      ? await this.botsService.findWithFlowForTenant(req.botId, req.testTenantId)
      : await this.botsService.findActiveWithFlow(req.botId);
    const flow = botWithFlow.flow!;

    // 2. Get or create conversation
    const conv = await this.conversationsService.getOrCreate(
      req.botId,
      botWithFlow.tenantId,
      req.conversationId,
      req.endUserId,
      req.endUserName,
    );

    yield {
      event: 'conversation',
      data: JSON.stringify({ type: 'conversation', data: { conversationId: conv.id } }),
    };

    // 3. Save user message
    await this.messagesService.create({
      conversationId: conv.id,
      botId: req.botId,
      tenantId: botWithFlow.tenantId,
      role: 'user',
      content: req.message,
    });

    // 4. Load recent history for LLM memory
    const historyRecords = await this.messagesService.getRecent(conv.id, botWithFlow.memoryTurns);
    const history = historyRecords.map((m: any) => ({
      role: m.role as string,
      content: m.content as string,
    }));

    // 5. Dispatch through FlowExecService — all SSE events proxied to client
    const sessionId = `${req.botId}:${conv.id}`;
    let fullContent = '';
    let done = false;

    try {
      for await (const ev of this.flowExecService.runFlow({
        flow: { id: flow.id, flowData: flow.flowData },
        botId: req.botId,
        tenantId: botWithFlow.tenantId,
        sessionId,
        message: req.message,
        conversationId: conv.id,
        history,
        knowledgeBaseIds: botWithFlow.knowledgeBases?.map((kb: any) => kb.knowledgeBaseId) ?? [],
      })) {
        // Accumulate token content for persisting assistant message
        if (ev.type === 'token') {
          fullContent += ev.content ?? '';
        }
        if (ev.type === 'done') {
          done = true;
        }
        // Send full lean envelope so client can dispatch by ev.type
        // (named SSE event field kept for spec-compliance / debugging).
        yield {
          event: ev.type,
          data: JSON.stringify(ev),
        };
      }
    } catch (err: any) {
      this.logger.error(`processChat failed: ${err.message}`, err.stack);
      yield {
        event: 'error',
        data: JSON.stringify({ type: 'error', message: err.message }),
      };
    }

    // 6. Persist assistant message
    if (fullContent) {
      await this.messagesService.create({
        conversationId: conv.id,
        botId: req.botId,
        tenantId: botWithFlow.tenantId,
        role: 'assistant',
        content: fullContent,
      });

      await this.conversationsService.updateStats(conv.id, fullContent);
    }

    if (!done) {
      yield {
        event: 'done',
        data: JSON.stringify({ type: 'done', data: { conversationId: conv.id } }),
      };
    }
  }
}
