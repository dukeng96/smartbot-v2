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

    // 7. Proxy to AI Engine (MOCK — AI Engine not running yet)
    // In production: POST to AI Engine SSE endpoint and forward stream
    const aiEnginePayload = {
      bot_id: req.botId,
      tenant_id: bot.tenantId,
      message: req.message,
      system_prompt: bot.systemPrompt,
      knowledge_base_ids: kbIds,
      top_k: bot.topK,
      memory_turns: bot.memoryTurns,
      conversation_history: history.map((m: any) => ({ role: m.role, content: m.content })),
      stream: true,
    };

    this.logger.log(
      `[MOCK] POST ${this.aiEngineUrl}/engine/v1/chat/completions — payload keys: ${Object.keys(aiEnginePayload).join(', ')}`,
    );

    // 8. Mock SSE stream — simulate AI Engine response
    const mockResponse = this.generateMockResponse(req.message);
    let fullContent = '';

    for (const chunk of mockResponse) {
      fullContent += chunk;
      yield {
        event: 'delta',
        data: JSON.stringify({ content: chunk }),
      };
    }

    const responseTimeMs = Date.now() - startTime;

    // 9. Save assistant message
    await this.messagesService.create({
      conversationId: conv.id,
      botId: req.botId,
      tenantId: bot.tenantId,
      role: 'assistant',
      content: fullContent,
      responseTimeMs,
      creditsUsed: 1,
      modelUsed: 'mock-gpt-4',
    });

    // 10. Increment credit usage
    await this.creditsService.increment(bot.tenantId, 1);

    // 11. Update conversation stats
    await this.conversationsService.updateStats(conv.id);

    // Final event
    yield {
      event: 'done',
      data: JSON.stringify({
        conversationId: conv.id,
        responseTimeMs,
        creditsUsed: 1,
      }),
    };
  }

  /**
   * Mock response generator — simulates chunked AI response
   * In production, this is replaced by real AI Engine SSE stream
   */
  private generateMockResponse(userMessage: string): string[] {
    const response =
      `Cảm ơn bạn đã gửi tin nhắn: "${userMessage.slice(0, 50)}". ` +
      'Đây là phản hồi mẫu từ hệ thống. ' +
      'Khi AI Engine được kết nối, bạn sẽ nhận được câu trả lời thực tế ' +
      'dựa trên knowledge base đã được train. ' +
      'Hệ thống hỗ trợ streaming (SSE) để trả lời real-time.';

    // Simulate chunked streaming — split into ~10 word chunks
    const words = response.split(' ');
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ');
      chunks.push(i === 0 ? chunk : ' ' + chunk);
    }

    return chunks;
  }
}
