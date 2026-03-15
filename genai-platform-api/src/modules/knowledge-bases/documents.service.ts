import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    @InjectQueue('document-processing') private readonly documentQueue: Queue,
  ) {}

  async uploadFile(
    tenantId: string,
    kbId: string,
    file: Express.Multer.File,
  ) {
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

  async createFromUrl(tenantId: string, kbId: string, url: string) {
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

  async createFromText(
    tenantId: string,
    kbId: string,
    content: string,
    name?: string,
  ) {
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

  async findAll(tenantId: string, kbId: string, query: PaginationDto) {
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

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async findOne(tenantId: string, kbId: string, docId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: docId, knowledgeBaseId: kbId, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(tenantId: string, kbId: string, docId: string, dto: UpdateDocumentDto) {
    await this.ensureDocExists(tenantId, kbId, docId);

    return this.prisma.document.update({
      where: { id: docId },
      data: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      },
    });
  }

  async softDelete(tenantId: string, kbId: string, docId: string) {
    const doc = await this.ensureDocExists(tenantId, kbId, docId);

    // Mock: Call AI Engine to delete vectors
    const aiEngineUrl = this.configService.get<string>('aiEngine.url');
    this.logger.log(
      `[MOCK] DELETE ${aiEngineUrl}/engine/v1/documents/${docId}/vectors`,
    );

    await this.prisma.document.update({
      where: { id: docId },
      data: { deletedAt: new Date() },
    });

    // Update KB totals
    await this.updateKbTotals(kbId);

    return { message: 'Document deleted' };
  }

  async reprocess(tenantId: string, kbId: string, docId: string) {
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

  async reprocessAll(tenantId: string, kbId: string) {
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

  /** Called by AI Engine callback — PATCH /api/v1/internal/documents/:id/status */
  async updateStatus(docId: string, dto: UpdateDocumentStatusDto) {
    const doc = await this.prisma.document.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');

    const data: any = {
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

    // Update KB totals when completed
    if (dto.status === 'completed') {
      await this.updateKbTotals(doc.knowledgeBaseId);
    }

    return { message: 'Status updated' };
  }

  private async enqueueProcessing(
    documentId: string,
    knowledgeBaseId: string,
    tenantId: string,
    params: Record<string, any>,
  ) {
    await this.documentQueue.add(
      'process-document',
      { documentId, knowledgeBaseId, tenantId, ...params },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.log(`Enqueued document processing: ${documentId}`);
  }

  private async updateKbTotals(kbId: string) {
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

  private async ensureKbExists(tenantId: string, kbId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, tenantId, deletedAt: null },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }

  private async ensureDocExists(tenantId: string, kbId: string, docId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: docId, knowledgeBaseId: kbId, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
