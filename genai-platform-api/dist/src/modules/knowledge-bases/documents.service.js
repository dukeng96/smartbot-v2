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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    prisma;
    storageService;
    configService;
    documentQueue;
    logger = new common_1.Logger(DocumentsService_1.name);
    constructor(prisma, storageService, configService, documentQueue) {
        this.prisma = prisma;
        this.storageService = storageService;
        this.configService = configService;
        this.documentQueue = documentQueue;
    }
    async uploadFile(tenantId, kbId, file) {
        const kb = await this.ensureKbExists(tenantId, kbId);
        const storagePath = await this.storageService.upload(file);
        const doc = await this.prisma.document.create({
            data: {
                knowledgeBaseId: kbId,
                tenantId,
                sourceType: 'file_upload',
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: BigInt(file.size),
                storagePath,
                status: 'pending',
            },
        });
        await this.enqueueProcessing(doc.id, kbId, tenantId, {
            storagePath,
            mimeType: file.mimetype,
            chunkSize: kb.chunkSize,
            chunkOverlap: kb.chunkOverlap,
        });
        return doc;
    }
    async createFromUrl(tenantId, kbId, url) {
        const kb = await this.ensureKbExists(tenantId, kbId);
        const doc = await this.prisma.document.create({
            data: {
                knowledgeBaseId: kbId,
                tenantId,
                sourceType: 'url_crawl',
                sourceUrl: url,
                originalName: url,
                status: 'pending',
            },
        });
        await this.enqueueProcessing(doc.id, kbId, tenantId, {
            sourceUrl: url,
            chunkSize: kb.chunkSize,
            chunkOverlap: kb.chunkOverlap,
        });
        return doc;
    }
    async createFromText(tenantId, kbId, content, name) {
        const kb = await this.ensureKbExists(tenantId, kbId);
        const doc = await this.prisma.document.create({
            data: {
                knowledgeBaseId: kbId,
                tenantId,
                sourceType: 'text_input',
                originalName: name || 'Text Input',
                charCount: BigInt(content.length),
                status: 'pending',
            },
        });
        await this.enqueueProcessing(doc.id, kbId, tenantId, {
            textContent: content,
            chunkSize: kb.chunkSize,
            chunkOverlap: kb.chunkOverlap,
        });
        return doc;
    }
    async findAll(tenantId, kbId, query) {
        const where = { knowledgeBaseId: kbId, tenantId, deletedAt: null };
        const [data, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
                skip: query.skip,
                take: query.limit,
                select: {
                    id: true,
                    sourceType: true,
                    originalName: true,
                    mimeType: true,
                    fileSize: true,
                    sourceUrl: true,
                    status: true,
                    processingStep: true,
                    processingProgress: true,
                    charCount: true,
                    chunkCount: true,
                    enabled: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.document.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async findOne(tenantId, kbId, docId) {
        const doc = await this.prisma.document.findFirst({
            where: { id: docId, knowledgeBaseId: kbId, tenantId, deletedAt: null },
        });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        return doc;
    }
    async update(tenantId, kbId, docId, dto) {
        await this.ensureDocExists(tenantId, kbId, docId);
        return this.prisma.document.update({
            where: { id: docId },
            data: {
                ...(dto.enabled !== undefined && { enabled: dto.enabled }),
                ...(dto.metadata !== undefined && { metadata: dto.metadata }),
            },
        });
    }
    async softDelete(tenantId, kbId, docId) {
        const doc = await this.ensureDocExists(tenantId, kbId, docId);
        const aiEngineUrl = this.configService.get('aiEngine.url');
        this.logger.log(`[MOCK] DELETE ${aiEngineUrl}/engine/v1/documents/${docId}/vectors`);
        await this.prisma.document.update({
            where: { id: docId },
            data: { deletedAt: new Date() },
        });
        await this.updateKbTotals(kbId);
        return { message: 'Document deleted' };
    }
    async reprocess(tenantId, kbId, docId) {
        const doc = await this.ensureDocExists(tenantId, kbId, docId);
        const kb = await this.ensureKbExists(tenantId, kbId);
        await this.prisma.document.update({
            where: { id: docId },
            data: { status: 'pending', processingProgress: 0, errorMessage: null },
        });
        await this.enqueueProcessing(docId, kbId, tenantId, {
            storagePath: doc.storagePath,
            sourceUrl: doc.sourceUrl,
            mimeType: doc.mimeType,
            chunkSize: kb.chunkSize,
            chunkOverlap: kb.chunkOverlap,
            reprocess: true,
        });
        return { message: 'Document queued for reprocessing' };
    }
    async reprocessAll(tenantId, kbId) {
        const kb = await this.ensureKbExists(tenantId, kbId);
        const docs = await this.prisma.document.findMany({
            where: { knowledgeBaseId: kbId, tenantId, deletedAt: null },
        });
        for (const doc of docs) {
            await this.prisma.document.update({
                where: { id: doc.id },
                data: { status: 'pending', processingProgress: 0, errorMessage: null },
            });
            await this.enqueueProcessing(doc.id, kbId, tenantId, {
                storagePath: doc.storagePath,
                sourceUrl: doc.sourceUrl,
                mimeType: doc.mimeType,
                chunkSize: kb.chunkSize,
                chunkOverlap: kb.chunkOverlap,
                reprocess: true,
            });
        }
        return { message: `${docs.length} documents queued for reprocessing` };
    }
    async updateStatus(docId, dto) {
        const doc = await this.prisma.document.findUnique({ where: { id: docId } });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        const data = {
            status: dto.status,
            ...(dto.processingStep !== undefined && { processingStep: dto.processingStep }),
            ...(dto.processingProgress !== undefined && { processingProgress: dto.processingProgress }),
            ...(dto.errorMessage !== undefined && { errorMessage: dto.errorMessage }),
            ...(dto.charCount !== undefined && { charCount: BigInt(dto.charCount) }),
            ...(dto.chunkCount !== undefined && { chunkCount: dto.chunkCount }),
            ...(dto.markdownStoragePath !== undefined && { markdownStoragePath: dto.markdownStoragePath }),
        };
        if (dto.status === 'processing' && !doc.processingStartedAt) {
            data.processingStartedAt = new Date();
        }
        if (dto.status === 'completed') {
            data.processingCompletedAt = new Date();
        }
        await this.prisma.document.update({ where: { id: docId }, data });
        if (dto.status === 'completed') {
            await this.updateKbTotals(doc.knowledgeBaseId);
        }
        return { message: 'Status updated' };
    }
    async enqueueProcessing(documentId, knowledgeBaseId, tenantId, params) {
        await this.documentQueue.add('process-document', { documentId, knowledgeBaseId, tenantId, ...params }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
        this.logger.log(`Enqueued document processing: ${documentId}`);
    }
    async updateKbTotals(kbId) {
        const aggregation = await this.prisma.document.aggregate({
            where: { knowledgeBaseId: kbId, deletedAt: null, status: 'completed' },
            _count: true,
            _sum: { charCount: true },
        });
        await this.prisma.knowledgeBase.update({
            where: { id: kbId },
            data: {
                totalDocuments: aggregation._count,
                totalChars: aggregation._sum.charCount || BigInt(0),
            },
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
    async ensureDocExists(tenantId, kbId, docId) {
        const doc = await this.prisma.document.findFirst({
            where: { id: docId, knowledgeBaseId: kbId, tenantId, deletedAt: null },
        });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        return doc;
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)('document-processing')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        config_1.ConfigService,
        bullmq_2.Queue])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map