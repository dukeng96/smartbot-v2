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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let MessagesService = class MessagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        return this.prisma.message.create({
            data: {
                conversationId: input.conversationId,
                botId: input.botId,
                tenantId: input.tenantId,
                role: input.role,
                content: input.content,
                inputTokens: input.inputTokens,
                outputTokens: input.outputTokens,
                totalTokens: input.totalTokens,
                creditsUsed: input.creditsUsed,
                searchQuery: input.searchQuery,
                retrievalContext: input.retrievalContext,
                responseTimeMs: input.responseTimeMs,
                modelUsed: input.modelUsed,
            },
        });
    }
    async getRecent(conversationId, limit) {
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: limit * 2,
            select: {
                role: true,
                content: true,
                createdAt: true,
            },
        });
        return messages.reverse();
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map