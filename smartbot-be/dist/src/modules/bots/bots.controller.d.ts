import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { AttachKnowledgeBaseDto } from './dto/attach-knowledge-base.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
export declare class BotsController {
    private readonly botsService;
    constructor(botsService: BotsService);
    create(tenantId: string, dto: CreateBotDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>;
    findAll(tenantId: string, query: ListBotsQueryDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
        _count: {
            knowledgeBases: number;
            conversations: number;
            channels: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>>;
    findOne(tenantId: string, id: string): Promise<{
        knowledgeBases: ({
            knowledgeBase: {
                name: string;
                id: string;
                status: string;
                totalDocuments: number;
                totalChars: bigint;
            };
        } & {
            createdAt: Date;
            knowledgeBaseId: string;
            priority: number;
            botId: string;
        })[];
        _count: {
            conversations: number;
            channels: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateBotDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>;
    duplicate(tenantId: string, id: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        avatarUrl: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        topK: number;
        memoryTurns: number;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
        maxKnowledgeChars: bigint | null;
        currentKnowledgeChars: bigint;
        apiKeyHash: string | null;
        apiKeyPrefix: string | null;
    }>;
    getPersonality(tenantId: string, id: string): Promise<{
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
    }>;
    updatePersonality(tenantId: string, id: string, dto: UpdatePersonalityDto): Promise<{
        id: string;
        systemPrompt: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        fallbackMessage: string | null;
        personality: import("@prisma/client/runtime/client").JsonValue;
    }>;
    updateWidget(tenantId: string, id: string, dto: UpdateWidgetDto): Promise<{
        id: string;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getWidgetPreview(tenantId: string, id: string): Promise<{
        html: string;
    }>;
    generateApiKey(tenantId: string, id: string): Promise<{
        apiKey: string;
        prefix: string;
    }>;
    revokeApiKey(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    getEmbedCode(tenantId: string, id: string): Promise<{
        iframe: string;
        bubble: string;
        directLink: string;
    }>;
    attachKnowledgeBase(tenantId: string, id: string, dto: AttachKnowledgeBaseDto): Promise<{
        knowledgeBase: {
            name: string;
            id: string;
            totalDocuments: number;
        };
    } & {
        createdAt: Date;
        knowledgeBaseId: string;
        priority: number;
        botId: string;
    }>;
    detachKnowledgeBase(tenantId: string, id: string, kbId: string): Promise<{
        message: string;
    }>;
    listKnowledgeBases(tenantId: string, id: string): Promise<({
        knowledgeBase: {
            description: string | null;
            name: string;
            id: string;
            status: string;
            totalDocuments: number;
            totalChars: bigint;
        };
    } & {
        createdAt: Date;
        knowledgeBaseId: string;
        priority: number;
        botId: string;
    })[]>;
}
