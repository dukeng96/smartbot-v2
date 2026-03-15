import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
export declare class KnowledgeBasesService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    create(tenantId: string, dto: CreateKnowledgeBaseDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<{
        _count: {
            documents: number;
            bots: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>>;
    findOne(tenantId: string, kbId: string): Promise<{
        _count: {
            documents: number;
            bots: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    update(tenantId: string, kbId: string, dto: UpdateKnowledgeBaseDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    softDelete(tenantId: string, kbId: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    private ensureKbExists;
}
