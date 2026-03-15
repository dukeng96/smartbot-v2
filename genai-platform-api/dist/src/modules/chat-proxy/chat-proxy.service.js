"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatProxyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatProxyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bots_service_1 = require("../bots/bots.service");
const conversations_service_1 = require("../conversations/conversations.service");
const messages_service_1 = require("../conversations/messages.service");
const credits_service_1 = require("../billing/credits.service");
let ChatProxyService = ChatProxyService_1 = class ChatProxyService {
    configService;
    botsService;
    conversationsService;
    messagesService;
    creditsService;
    logger = new common_1.Logger(ChatProxyService_1.name);
    aiEngineUrl;
    constructor(configService, botsService, conversationsService, messagesService, creditsService) {
        this.configService = configService;
        this.botsService = botsService;
        this.conversationsService = conversationsService;
        this.messagesService = messagesService;
        this.creditsService = creditsService;
        this.aiEngineUrl = this.configService.get('aiEngine.url', 'http://localhost:8000');
    }
    async getBotConfig(botId, refererHost) {
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
    async getConversationHistory(botId, conversationId, endUserId) {
        const messages = await this.messagesService.getRecent(conversationId, 50);
        return messages;
    }
    async *processChat(req) {
        const startTime = Date.now();
        const bot = await this.botsService.findActive(req.botId);
        await this.creditsService.checkQuota(bot.tenantId);
        const conv = await this.conversationsService.getOrCreate(req.botId, bot.tenantId, req.conversationId, req.endUserId, req.endUserName);
        yield { event: 'conversation', data: JSON.stringify({ conversationId: conv.id }) };
        await this.messagesService.create({
            conversationId: conv.id,
            botId: req.botId,
            tenantId: bot.tenantId,
            role: 'user',
            content: req.message,
        });
        const history = await this.messagesService.getRecent(conv.id, bot.memoryTurns);
        const kbIds = await this.botsService.getKnowledgeBaseIds(req.botId);
        const aiEnginePayload = {
            bot_id: req.botId,
            tenant_id: bot.tenantId,
            message: req.message,
            system_prompt: bot.systemPrompt,
            knowledge_base_ids: kbIds,
            top_k: bot.topK,
            memory_turns: bot.memoryTurns,
            conversation_history: history.map((m) => ({ role: m.role, content: m.content })),
            stream: true,
        };
        this.logger.log(`[MOCK] POST ${this.aiEngineUrl}/engine/v1/chat/completions — payload keys: ${Object.keys(aiEnginePayload).join(', ')}`);
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
        await this.creditsService.increment(bot.tenantId, 1);
        await this.conversationsService.updateStats(conv.id);
        yield {
            event: 'done',
            data: JSON.stringify({
                conversationId: conv.id,
                responseTimeMs,
                creditsUsed: 1,
            }),
        };
    }
    generateMockResponse(userMessage) {
        const response = `Cảm ơn bạn đã gửi tin nhắn: "${userMessage.slice(0, 50)}". ` +
            'Đây là phản hồi mẫu từ hệ thống. ' +
            'Khi AI Engine được kết nối, bạn sẽ nhận được câu trả lời thực tế ' +
            'dựa trên knowledge base đã được train. ' +
            'Hệ thống hỗ trợ streaming (SSE) để trả lời real-time.';
        const words = response.split(' ');
        const chunks = [];
        for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ');
            chunks.push(i === 0 ? chunk : ' ' + chunk);
        }
        return chunks;
    }
};
exports.ChatProxyService = ChatProxyService;
exports.ChatProxyService = ChatProxyService = ChatProxyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        bots_service_1.BotsService,
        conversations_service_1.ConversationsService,
        messages_service_1.MessagesService,
        credits_service_1.CreditsService])
], ChatProxyService);
//# sourceMappingURL=chat-proxy.service.js.map