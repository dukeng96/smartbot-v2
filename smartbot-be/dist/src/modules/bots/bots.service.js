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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const crypto_1 = require("../../common/utils/crypto");
let BotsService = class BotsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        return this.prisma.bot.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                status: 'draft',
            },
        });
    }
    async findAll(tenantId, query) {
        const where = { tenantId, deletedAt: null };
        if (query.status)
            where.status = query.status;
        const [data, total] = await Promise.all([
            this.prisma.bot.findMany({
                where,
                orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
                skip: query.skip,
                take: query.limit,
                include: {
                    _count: { select: { knowledgeBases: true, conversations: true, channels: true } },
                },
            }),
            this.prisma.bot.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async findOne(tenantId, botId) {
        const bot = await this.prisma.bot.findFirst({
            where: { id: botId, tenantId, deletedAt: null },
            include: {
                knowledgeBases: {
                    include: {
                        knowledgeBase: {
                            select: { id: true, name: true, totalDocuments: true, totalChars: true, status: true },
                        },
                    },
                    orderBy: { priority: 'asc' },
                },
                _count: { select: { conversations: true, channels: true } },
            },
        });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        return bot;
    }
    async findActive(botId) {
        const bot = await this.prisma.bot.findFirst({
            where: { id: botId, status: 'active', deletedAt: null },
        });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found or inactive');
        return bot;
    }
    async update(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.bot.update({
            where: { id: botId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.topK !== undefined && { topK: dto.topK }),
                ...(dto.memoryTurns !== undefined && { memoryTurns: dto.memoryTurns }),
            },
        });
    }
    async softDelete(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.bot.update({
            where: { id: botId },
            data: { deletedAt: new Date() },
        });
    }
    async duplicate(tenantId, botId) {
        const original = await this.findOne(tenantId, botId);
        const clone = await this.prisma.bot.create({
            data: {
                tenantId,
                name: `${original.name} (copy)`,
                description: original.description,
                avatarUrl: original.avatarUrl,
                status: 'draft',
                systemPrompt: original.systemPrompt,
                greetingMessage: original.greetingMessage,
                suggestedQuestions: original.suggestedQuestions,
                personality: original.personality,
                fallbackMessage: original.fallbackMessage,
                topK: original.topK,
                memoryTurns: original.memoryTurns,
                widgetConfig: original.widgetConfig,
            },
        });
        if (original.knowledgeBases.length > 0) {
            await this.prisma.botKnowledgeBase.createMany({
                data: original.knowledgeBases.map((bkb) => ({
                    botId: clone.id,
                    knowledgeBaseId: bkb.knowledgeBaseId,
                    priority: bkb.priority,
                })),
            });
        }
        return clone;
    }
    async getPersonality(tenantId, botId) {
        const bot = await this.ensureBotExists(tenantId, botId);
        return {
            systemPrompt: bot.systemPrompt,
            greetingMessage: bot.greetingMessage,
            suggestedQuestions: bot.suggestedQuestions,
            fallbackMessage: bot.fallbackMessage,
            personality: bot.personality,
        };
    }
    async updatePersonality(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.bot.update({
            where: { id: botId },
            data: {
                ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
                ...(dto.greetingMessage !== undefined && { greetingMessage: dto.greetingMessage }),
                ...(dto.suggestedQuestions !== undefined && { suggestedQuestions: dto.suggestedQuestions }),
                ...(dto.fallbackMessage !== undefined && { fallbackMessage: dto.fallbackMessage }),
                ...(dto.personality !== undefined && { personality: dto.personality }),
            },
            select: {
                id: true,
                systemPrompt: true,
                greetingMessage: true,
                suggestedQuestions: true,
                fallbackMessage: true,
                personality: true,
            },
        });
    }
    async updateWidget(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
        const currentConfig = (bot?.widgetConfig ?? {});
        return this.prisma.bot.update({
            where: { id: botId },
            data: {
                widgetConfig: {
                    ...currentConfig,
                    ...(dto.theme !== undefined && { theme: dto.theme }),
                    ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
                    ...(dto.position !== undefined && { position: dto.position }),
                    ...(dto.bubbleIcon !== undefined && { bubbleIcon: dto.bubbleIcon }),
                    ...(dto.showPoweredBy !== undefined && { showPoweredBy: dto.showPoweredBy }),
                    ...(dto.customCss !== undefined && { customCss: dto.customCss }),
                    ...(dto.headerText !== undefined && { headerText: dto.headerText }),
                },
            },
            select: { id: true, widgetConfig: true },
        });
    }
    async getWidgetPreview(tenantId, botId) {
        const bot = await this.ensureBotExists(tenantId, botId);
        const config = bot.widgetConfig || {};
        const escapedName = this.escapeHtml(bot.name);
        const escapedConfig = JSON.stringify(config)
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return {
            html: `<!-- Widget Preview for Bot: ${escapedName} -->
<div id="genai-widget" data-bot-id="${bot.id}" data-config='${escapedConfig}'></div>
<script src="/widget/loader.js"></script>`,
        };
    }
    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    async generateApiKey(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        const rawKey = (0, crypto_1.generateApiKey)();
        const hash = (0, crypto_1.hashApiKey)(rawKey);
        const prefix = (0, crypto_1.getApiKeyPrefix)(rawKey);
        await this.prisma.bot.update({
            where: { id: botId },
            data: { apiKeyHash: hash, apiKeyPrefix: prefix },
        });
        return { apiKey: rawKey, prefix };
    }
    async revokeApiKey(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        await this.prisma.bot.update({
            where: { id: botId },
            data: { apiKeyHash: null, apiKeyPrefix: null },
        });
        return { message: 'API key revoked' };
    }
    async getEmbedCode(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        const appUrl = process.env.APP_URL || 'https://platform.vn';
        return {
            iframe: `<iframe src="${appUrl}/widget/${botId}" width="400" height="600" frameborder="0"></iframe>`,
            bubble: `<script src="${appUrl}/widget/loader.js" data-bot-id="${botId}"></script>`,
            directLink: `${appUrl}/chat/${botId}`,
        };
    }
    async attachKnowledgeBase(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: dto.knowledgeBaseId, tenantId, deletedAt: null },
        });
        if (!kb)
            throw new common_1.NotFoundException('Knowledge base not found');
        const existing = await this.prisma.botKnowledgeBase.findUnique({
            where: { botId_knowledgeBaseId: { botId, knowledgeBaseId: dto.knowledgeBaseId } },
        });
        if (existing)
            throw new common_1.ConflictException('Knowledge base already attached');
        return this.prisma.botKnowledgeBase.create({
            data: {
                botId,
                knowledgeBaseId: dto.knowledgeBaseId,
                priority: dto.priority || 0,
            },
            include: {
                knowledgeBase: {
                    select: { id: true, name: true, totalDocuments: true },
                },
            },
        });
    }
    async detachKnowledgeBase(tenantId, botId, kbId) {
        await this.ensureBotExists(tenantId, botId);
        await this.prisma.botKnowledgeBase.delete({
            where: { botId_knowledgeBaseId: { botId, knowledgeBaseId: kbId } },
        });
        return { message: 'Knowledge base detached' };
    }
    async listKnowledgeBases(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.botKnowledgeBase.findMany({
            where: { botId },
            include: {
                knowledgeBase: {
                    select: { id: true, name: true, description: true, totalDocuments: true, totalChars: true, status: true },
                },
            },
            orderBy: { priority: 'asc' },
        });
    }
    async getKnowledgeBaseIds(botId) {
        const links = await this.prisma.botKnowledgeBase.findMany({
            where: { botId },
            select: { knowledgeBaseId: true },
        });
        return links.map((l) => l.knowledgeBaseId);
    }
    async ensureBotExists(tenantId, botId) {
        const bot = await this.prisma.bot.findFirst({
            where: { id: botId, tenantId, deletedAt: null },
        });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        return bot;
    }
};
exports.BotsService = BotsService;
exports.BotsService = BotsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BotsService);
//# sourceMappingURL=bots.service.js.map