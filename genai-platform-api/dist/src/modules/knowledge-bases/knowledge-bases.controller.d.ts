import { KnowledgeBasesService } from './knowledge-bases.service';
import { DocumentsService } from './documents.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class KnowledgeBasesController {
    private readonly kbService;
    private readonly documentsService;
    constructor(kbService: KnowledgeBasesService, documentsService: DocumentsService);
    create(tenantId: string, dto: CreateKnowledgeBaseDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    findAll(tenantId: string, query: PaginationDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
        _count: {
            documents: number;
            bots: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>>;
    findOne(tenantId: string, id: string): Promise<{
        _count: {
            documents: number;
            bots: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    update(tenantId: string, id: string, dto: UpdateKnowledgeBaseDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    remove(tenantId: string, id: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        deletedAt: Date | null;
        vectorCollection: string | null;
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        totalDocuments: number;
        totalChars: bigint;
    }>;
    reprocessAll(tenantId: string, id: string): Promise<{
        message: string;
    }>;
}
