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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const conversations_service_1 = require("./conversations.service");
const list_conversations_dto_1 = require("./dto/list-conversations.dto");
const rate_conversation_dto_1 = require("./dto/rate-conversation.dto");
const message_feedback_dto_1 = require("./dto/message-feedback.dto");
const search_messages_dto_1 = require("./dto/search-messages.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let ConversationsController = class ConversationsController {
    conversationsService;
    constructor(conversationsService) {
        this.conversationsService = conversationsService;
    }
    findAllByBot(tenantId, botId, query) {
        return this.conversationsService.findAllByBot(tenantId, botId, query);
    }
    findOne(tenantId, convId) {
        return this.conversationsService.findOne(tenantId, convId);
    }
    getMessages(tenantId, convId, query) {
        return this.conversationsService.getMessages(tenantId, convId, query);
    }
    archive(tenantId, convId) {
        return this.conversationsService.archive(tenantId, convId);
    }
    searchMessages(tenantId, botId, query) {
        return this.conversationsService.searchMessages(tenantId, botId, query.q, query.page, query.limit);
    }
    rate(tenantId, convId, dto) {
        return this.conversationsService.rate(tenantId, convId, dto);
    }
    messageFeedback(tenantId, msgId, dto) {
        return this.conversationsService.messageFeedback(tenantId, msgId, dto.feedback);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)('bots/:botId/conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'List conversations for bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, list_conversations_dto_1.ListConversationsDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "findAllByBot", null);
__decorate([
    (0, common_1.Get)('conversations/:convId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get conversation detail' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('convId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('conversations/:convId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'List messages in conversation' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('convId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Delete)('conversations/:convId'),
    (0, swagger_1.ApiOperation)({ summary: 'Archive conversation' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('convId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "archive", null);
__decorate([
    (0, common_1.Get)('bots/:botId/messages/search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search messages across bot conversations' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, search_messages_dto_1.SearchMessagesDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "searchMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:convId/rating'),
    (0, swagger_1.ApiOperation)({ summary: 'Rate conversation' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('convId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, rate_conversation_dto_1.RateConversationDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "rate", null);
__decorate([
    (0, common_1.Post)('messages/:msgId/feedback'),
    (0, swagger_1.ApiOperation)({ summary: 'Per-message feedback (thumbs up/down)' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('msgId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, message_feedback_dto_1.MessageFeedbackDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "messageFeedback", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, swagger_1.ApiTags)('Conversations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map