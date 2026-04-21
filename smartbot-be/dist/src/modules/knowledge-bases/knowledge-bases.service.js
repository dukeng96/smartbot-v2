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
var KnowledgeBasesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBasesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let KnowledgeBasesService = KnowledgeBasesService_1 = class KnowledgeBasesService {
    prisma;
    configService;
    logger = new common_1.Logger(KnowledgeBasesService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async create(tenantId, dto) {
        const kb = await this.prisma.knowledgeBase.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                chunkSize: dto.chunkSize || 500,
                chunkOverlap: dto.chunkOverlap || 50,
            },
        });
        return this.prisma.knowledgeBase.update({
            where: { id: kb.id },
            data: { vectorCollection: `kb_${kb.id.replace(/-/g, '')}` },
        });
    }
    async findAll(tenantId, query) {
        const where = { tenantId, deletedAt: null };
        const [data, total] = await Promise.all([
            this.prisma.knowledgeBase.findMany({
                where,
                orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
                skip: query.skip,
                take: query.limit,
                include: {
                    _count: { select: { documents: true, bots: true } },
                },
            }),
            this.prisma.knowledgeBase.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async findOne(tenantId, kbId) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: kbId, tenantId, deletedAt: null },
            include: {
                _count: { select: { documents: true, bots: true } },
            },
        });
        if (!kb)
            throw new common_1.NotFoundException('Knowledge base not found');
        return kb;
    }
    async update(tenantId, kbId, dto) {
        await this.ensureKbExists(tenantId, kbId);
        return this.prisma.knowledgeBase.update({
            where: { id: kbId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.chunkSize !== undefined && { chunkSize: dto.chunkSize }),
                ...(dto.chunkOverlap !== undefined && { chunkOverlap: dto.chunkOverlap }),
            },
        });
    }
    async softDelete(tenantId, kbId) {
        await this.ensureKbExists(tenantId, kbId);
        const aiEngineUrl = this.configService.get('aiEngine.url');
        this.logger.log(`[MOCK] DELETE ${aiEngineUrl}/engine/v1/collections/kb_${kbId.replace(/-/g, '')}`);
        return this.prisma.knowledgeBase.update({
            where: { id: kbId },
            data: { deletedAt: new Date() },
        });
    }
    async ensureKbExists(tenantId, kbId) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: kbId, tenantId, deletedAt: null },
        });
        if (!kb)
            throw new common_1.NotFoundException('Knowledge base not found');
        return kb;
    }
};
exports.KnowledgeBasesService = KnowledgeBasesService;
exports.KnowledgeBasesService = KnowledgeBasesService = KnowledgeBasesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], KnowledgeBasesService);
//# sourceMappingURL=knowledge-bases.service.js.map