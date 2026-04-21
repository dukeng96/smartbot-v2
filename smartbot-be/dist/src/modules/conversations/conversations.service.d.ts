import { PrismaService } from '../../common/prisma/prisma.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { PaginatedResult, PaginationDto } from '../../common/dto/pagination.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { Prisma } from '@prisma/client';
export declare class ConversationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: ListConversationsDto): Promise<PaginatedResult<{
        bot: {
            name: string;
            id: string;
        };
        channel: string;
        id: string;
        status: string;
        createdAt: Date;
        botId: string;
        rating: number | null;
        endUserId: string | null;
        endUserName: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
        lastMessagePreview: string | null;
    }>>;
    findAllByBot(tenantId: string, botId: string, query: ListConversationsDto): Promise<PaginatedResult<{
        channel: string;
        id: string;
        status: string;
        createdAt: Date;
        rating: number | null;
        endUserId: string | null;
        endUserName: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
        lastMessagePreview: string | null;
    }>>;
    findOne(tenantId: string, convId: string): Promise<{
        bot: {
            name: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        channel: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        botId: string;
        rating: number | null;
        feedbackText: string | null;
        endUserId: string | null;
        endUserName: string | null;
        endUserEmail: string | null;
        endUserMetadata: Prisma.JsonValue;
        channelConversationId: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
        lastMessagePreview: string | null;
    }>;
    getMessages(tenantId: string, convId: string, query: PaginationDto): Promise<PaginatedResult<{
        id: string;
        role: string;
        createdAt: Date;
        creditsUsed: Prisma.Decimal;
        content: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        responseTimeMs: number | null;
        modelUsed: string | null;
        feedback: string | null;
    }>>;
    archive(tenantId: string, convId: string): Promise<{
        message: string;
    }>;
    rate(tenantId: string, convId: string, dto: RateConversationDto): Promise<{
        message: string;
    }>;
    messageFeedback(tenantId: string, msgId: string, feedback: string): Promise<{
        message: string;
    }>;
    searchMessages(tenantId: string, botId: string, q: string, page: number, limit: number): Promise<PaginatedResult<{
        id: string;
        role: string;
        createdAt: Date;
        content: string;
        conversationId: string;
    }>>;
    getOrCreate(botId: string, tenantId: string, conversationId?: string, endUserId?: string, endUserName?: string, channel?: string): Promise<{
        channel: string;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        botId: string;
        rating: number | null;
        feedbackText: string | null;
        endUserId: string | null;
        endUserName: string | null;
        endUserEmail: string | null;
        endUserMetadata: Prisma.JsonValue;
        channelConversationId: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
        lastMessagePreview: string | null;
    }>;
    updateStats(convId: string, lastMessageContent?: string): Promise<void>;
    private ensureConvExists;
}
