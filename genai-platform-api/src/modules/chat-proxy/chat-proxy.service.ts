import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../conversations/messages.service';
import { CreditsService } from '../billing/credits.service';

interface ChatRequest {
  botId: string;
  message: string;
  conversationId?: string;
  endUserId?: string;
  endUserName?: string;
}

interface SseEvent {
  event: string;
  data: string;
}

@Injectable()
export class ChatProxyService {
  private readonly logger = new Logger(ChatProxyService.name);
  private readonly aiEngineUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly botsService: BotsService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly creditsService: CreditsService,
  ) {
    this.aiEngineUrl = this.configService.get<string>('aiEngine.url', 'http://localhost:8000');
  }

  async getBotConfig(botId: string, refererHost?: string) {
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

  async getConversationHistory(botId: string, conversationId: string, endUserId?: string) {
    const messages = await this.messagesService.getRecent(conversationId, 50);
    return messages;
  }

  /**
   * Process chat request: validate → save user msg → proxy to AI Engine → save assistant msg
   * Returns an async generator of SSE events
   */
  async *processChat(req: ChatRequest): AsyncGenerator<SseEvent> {
    const startTime = Date.now();

    // 1. Validate bot exists & active
    const bot = await this.botsService.findActive(req.botId);

    // 2. Check tenant quota
    await this.creditsService.checkQuota(bot.tenantId);

    // 3. Get or create conversation
    const conv = await this.conversationsService.getOrCreate(
      req.botId,
      bot.tenantId,
      req.conversationId,
      req.endUserId,
      req.endUserName,
    );

    // Yield conversation ID so client knows which conversation this is
    yield { event: 'conversation', data: JSON.stringify({ conversationId: conv.id }) };

    // 4. Save user message
    await this.messagesService.create({
      conversationId: conv.id,
      botId: req.botId,
      tenantId: bot.tenantId,
      role: 'user',
      content: req.message,
    });

    // 5. Load conversation history
    const history = await this.messagesService.getRecent(conv.id, bot.memoryTurns);

    // 6. Get attached KB IDs
    const kbIds = await this.botsService.getKnowledgeBaseIds(req.botId);

    // 7. Build AI Engine payload
    const aiEnginePayload = {
      bot_id: req.botId,
      tenant_id: bot.tenantId,
      message: req.message,
      system_prompt: bot.systemPrompt || 'Bạn là trợ lý AI hữu ích.',
      knowledge_base_ids: kbIds,
      top_k: bot.topK,
      memory_turns: bot.memoryTurns,
      conversation_history: history.map((m: any) => ({ role: m.role, content: m.content })),
      stream: true,
    };

    // 8. Proxy SSE stream from AI Engine
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let modelUsed = 'vnpt-llm';

    try {
      const engineResponse = await fetch(
        `${this.aiEngineUrl}/engine/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiEnginePayload),
        },
      );

      if (!engineResponse.ok) {
        const errorText = await engineResponse.text();
        this.logger.error(`AI Engine error ${engineResponse.status}: ${errorText}`);
        throw new Error(`AI Engine returned ${engineResponse.status}`);
      }

      // Parse SSE stream from engine
      const reader = engineResponse.body?.getReader();
      if (!reader) throw new Error('No response stream from AI Engine');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // sse-starlette uses \r\n line endings; normalize to \n
        const normalized = buffer.replace(/\r\n/g, '\n');
        const events = normalized.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          if (!raw.trim()) continue;

          let eventType = '';
          let eventData = '';

          for (const line of raw.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) eventData = line.slice(6);
          }

          if (!eventType || !eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            switch (eventType) {
              case 'delta': {
                const content = parsed.content ?? '';
                fullContent += content;
                yield { event: 'delta', data: JSON.stringify({ content }) };
                break;
              }
              case 'message_end': {
                inputTokens = parsed.input_tokens ?? 0;
                outputTokens = parsed.output_tokens ?? 0;
                break;
              }
              case 'error': {
                this.logger.error(`AI Engine stream error: ${parsed.error}`);
                yield { event: 'error', data: JSON.stringify({ error: parsed.error ?? 'AI Engine error' }) };
                break;
              }
              // message_start, retrieval — skip (internal engine events)
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      this.logger.error(`AI Engine request failed: ${error.message}`, error.stack);

      // Fallback: yield error event so frontend shows a message
      if (!fullContent) {
        yield {
          event: 'error',
          data: JSON.stringify({ error: `Không thể kết nối AI Engine: ${error.message}` }),
        };
      }
    }

    const responseTimeMs = Date.now() - startTime;
    const creditsUsed = Math.max(1, Math.ceil((inputTokens + outputTokens) / 1000));

    // 9. Save assistant message (even if partial)
    if (fullContent) {
      await this.messagesService.create({
        conversationId: conv.id,
        botId: req.botId,
        tenantId: bot.tenantId,
        role: 'assistant',
        content: fullContent,
        responseTimeMs,
        creditsUsed,
        modelUsed,
        inputTokens,
        outputTokens,
      });
    }

    // 10. Increment credit usage
    await this.creditsService.increment(bot.tenantId, creditsUsed);

    // 11. Update conversation stats
    if (fullContent) {
      await this.conversationsService.updateStats(conv.id, fullContent);
    }

    // Final event
    yield {
      event: 'done',
      data: JSON.stringify({
        conversationId: conv.id,
        responseTimeMs,
        creditsUsed,
      }),
    };
  }
}
