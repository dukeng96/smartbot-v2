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
var ConversationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let ConversationsService = ConversationsService_1 = class ConversationsService {
    prisma;
    logger = new common_1.Logger(ConversationsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByBot(tenantId, botId, query) {
        const where = { botId, tenantId };
        if (query.channel)
            where.channel = query.channel;
        if (query.status)
            where.status = query.status;
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom)
                where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.createdAt.lte = new Date(query.dateTo);
        }
        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
                skip: query.skip,
                take: query.limit,
                select: {
                    id: true,
                    endUserId: true,
                    endUserName: true,
                    channel: true,
                    status: true,
                    messageCount: true,
                    lastMessageAt: true,
                    rating: true,
                    createdAt: true,
                },
            }),
            this.prisma.conversation.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async findOne(tenantId, convId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id: convId, tenantId },
            include: { bot: { select: { id: true, name: true, avatarUrl: true } } },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        return conv;
    }
    async getMessages(tenantId, convId, query) {
        await this.ensureConvExists(tenantId, convId);
        const where = { conversationId: convId, tenantId };
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                skip: query.skip,
                take: query.limit,
                select: {
                    id: true,
                    role: true,
                    content: true,
                    inputTokens: true,
                    outputTokens: true,
                    totalTokens: true,
                    creditsUsed: true,
                    responseTimeMs: true,
                    modelUsed: true,
                    feedback: true,
                    createdAt: true,
                },
            }),
            this.prisma.message.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async archive(tenantId, convId) {
        await this.ensureConvExists(tenantId, convId);
        await this.prisma.conversation.update({
            where: { id: convId },
            data: { status: 'archived' },
        });
        return { message: 'Conversation archived' };
    }
    async rate(tenantId, convId, dto) {
        await this.ensureConvExists(tenantId, convId);
        await this.prisma.conversation.update({
            where: { id: convId },
            data: { rating: dto.rating, feedbackText: dto.feedbackText },
        });
        return { message: 'Rating saved' };
    }
    async messageFeedback(tenantId, msgId, feedback) {
        const msg = await this.prisma.message.findFirst({
            where: { id: msgId, tenantId },
        });
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        await this.prisma.message.update({
            where: { id: msgId },
            data: { feedback },
        });
        return { message: 'Feedback saved' };
    }
    async searchMessages(tenantId, botId, q, page, limit) {
        const offset = (page - 1) * limit;
        const where = {
            tenantId,
            botId,
            content: { contains: q, mode: 'insensitive' },
        };
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    conversationId: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            }),
            this.prisma.message.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, page, limit);
    }
    async getOrCreate(botId, tenantId, conversationId, endUserId, endUserName, channel = 'web_widget') {
        if (conversationId) {
            const existing = await this.prisma.conversation.findFirst({
                where: { id: conversationId, botId, tenantId },
            });
            if (existing)
                return existing;
        }
        return this.prisma.conversation.create({
            data: {
                botId,
                tenantId,
                endUserId,
                endUserName,
                channel,
                status: 'active',
            },
        });
    }
    async updateStats(convId) {
        const count = await this.prisma.message.count({
            where: { conversationId: convId },
        });
        await this.prisma.conversation.update({
            where: { id: convId },
            data: { messageCount: count, lastMessageAt: new Date() },
        });
    }
    async ensureConvExists(tenantId, convId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id: convId, tenantId },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        return conv;
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = ConversationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map