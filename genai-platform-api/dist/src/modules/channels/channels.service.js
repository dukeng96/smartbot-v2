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
var ChannelsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ChannelsService = ChannelsService_1 = class ChannelsService {
    prisma;
    logger = new common_1.Logger(ChannelsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.channel.create({
            data: {
                botId,
                tenantId,
                type: dto.type,
                config: dto.config ?? {},
                connectedAt: new Date(),
            },
        });
    }
    async findAll(tenantId, botId) {
        await this.ensureBotExists(tenantId, botId);
        return this.prisma.channel.findMany({
            where: { botId, tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(tenantId, botId, channelId, dto) {
        await this.ensureChannelExists(tenantId, botId, channelId);
        return this.prisma.channel.update({
            where: { id: channelId },
            data: {
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.config !== undefined && { config: dto.config }),
                ...(dto.status === 'active' && { lastActiveAt: new Date() }),
            },
        });
    }
    async remove(tenantId, botId, channelId) {
        await this.ensureChannelExists(tenantId, botId, channelId);
        await this.prisma.channel.delete({ where: { id: channelId } });
        return { message: 'Channel disconnected' };
    }
    async connectFacebook(tenantId, botId, dto) {
        await this.ensureBotExists(tenantId, botId);
        this.logger.log(`[STUB] Facebook connect for bot ${botId}, pageId: ${dto.pageId}`);
        return this.prisma.channel.create({
            data: {
                botId,
                tenantId,
                type: 'facebook_messenger',
                status: 'active',
                config: { pageId: dto.pageId, accessToken: dto.accessToken },
                connectedAt: new Date(),
            },
        });
    }
    async ensureBotExists(tenantId, botId) {
        const bot = await this.prisma.bot.findFirst({
            where: { id: botId, tenantId, deletedAt: null },
        });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        return bot;
    }
    async ensureChannelExists(tenantId, botId, channelId) {
        const channel = await this.prisma.channel.findFirst({
            where: { id: channelId, botId, tenantId },
        });
        if (!channel)
            throw new common_1.NotFoundException('Channel not found');
        return channel;
    }
};
exports.ChannelsService = ChannelsService;
exports.ChannelsService = ChannelsService = ChannelsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChannelsService);
//# sourceMappingURL=channels.service.js.map