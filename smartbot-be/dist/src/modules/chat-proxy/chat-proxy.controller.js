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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatProxyController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatProxyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const chat_proxy_service_1 = require("./chat-proxy.service");
const chat_dto_1 = require("./dto/chat.dto");
let ChatProxyController = ChatProxyController_1 = class ChatProxyController {
    chatProxyService;
    logger = new common_1.Logger(ChatProxyController_1.name);
    constructor(chatProxyService) {
        this.chatProxyService = chatProxyService;
    }
    getBotConfig(botId, referer) {
        const refererHost = referer ? this.extractHost(referer) : undefined;
        return this.chatProxyService.getBotConfig(botId, refererHost);
    }
    async chat(botId, dto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const stream = this.chatProxyService.processChat({
                botId,
                message: dto.message,
                conversationId: dto.conversationId,
                endUserId: dto.endUserId,
                endUserName: dto.endUserName,
            });
            for await (const event of stream) {
                res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
            }
        }
        catch (error) {
            this.logger.error(`Chat error for bot ${botId}: ${error.message}`, error.stack);
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        }
        finally {
            res.end();
        }
    }
    getConversationMessages(botId, convId, endUserId) {
        return this.chatProxyService.getConversationHistory(botId, convId, endUserId);
    }
    extractHost(referer) {
        try {
            return new URL(referer).hostname;
        }
        catch {
            return undefined;
        }
    }
};
exports.ChatProxyController = ChatProxyController;
__decorate([
    (0, common_1.Get)(':botId/config'),
    (0, swagger_1.ApiOperation)({ summary: 'Widget loads bot config (name, avatar, greeting, suggestions)' }),
    __param(0, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)('referer')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ChatProxyController.prototype, "getBotConfig", null);
__decorate([
    (0, common_1.Post)(':botId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Send message, receive SSE stream' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Bot-Api-Key', required: false, description: 'Bot API key for auth' }),
    __param(0, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_dto_1.ChatDto, Object]),
    __metadata("design:returntype", Promise)
], ChatProxyController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)(':botId/conversations/:convId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Load conversation history for returning user' }),
    __param(0, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('convId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-end-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ChatProxyController.prototype, "getConversationMessages", null);
exports.ChatProxyController = ChatProxyController = ChatProxyController_1 = __decorate([
    (0, swagger_1.ApiTags)('Chat — Public Widget API'),
    (0, common_1.Controller)('api/v1/chat'),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [chat_proxy_service_1.ChatProxyService])
], ChatProxyController);
//# sourceMappingURL=chat-proxy.controller.js.map