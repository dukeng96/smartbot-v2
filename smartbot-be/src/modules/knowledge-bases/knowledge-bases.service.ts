import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';

@Injectable()
export class KnowledgeBasesService {
  private readonly logger = new Logger(KnowledgeBasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(tenantId: string, dto: CreateKnowledgeBaseDto) {
    const kb = await this.prisma.knowledgeBase.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        chunkSize: dto.chunkSize || 500,
        chunkOverlap: dto.chunkOverlap || 50,
      },
    });

    // Set vectorCollection = kb_{id}
    return this.prisma.knowledgeBase.update({
      where: { id: kb.id },
      data: { vectorCollection: `kb_${kb.id.replace(/-/g, '')}` },
    });
  }

  async findAll(tenantId: string, query: PaginationDto) {
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

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async findOne(tenantId: string, kbId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, tenantId, deletedAt: null },
      include: {
        _count: { select: { documents: true, bots: true } },
      },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }

  async update(tenantId: string, kbId: string, dto: UpdateKnowledgeBaseDto) {
    await this.ensureKbExists(tenantId, kbId);

    return this.prisma.knowledgeBase.update({
      where: { id: kbId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.chunkSize !== undefined && { chunkSize: dto.chunkSize }),
        ...(dto.chunkOverlap !== undefined && {
          chunkOverlap: dto.chunkOverlap,
        }),
      },
    });
  }

  async softDelete(tenantId: string, kbId: string) {
    await this.ensureKbExists(tenantId, kbId);

    // Mock: Call AI Engine to delete Qdrant collection
    const aiEngineUrl = this.configService.get<string>('aiEngine.url');
    this.logger.log(
      `[MOCK] DELETE ${aiEngineUrl}/engine/v1/collections/kb_${kbId.replace(/-/g, '')}`,
    );

    return this.prisma.knowledgeBase.update({
      where: { id: kbId },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureKbExists(tenantId: string, kbId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, tenantId, deletedAt: null },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }
}
