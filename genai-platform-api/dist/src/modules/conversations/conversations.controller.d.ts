import { ConversationsService } from './conversations.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { MessageFeedbackDto } from './dto/message-feedback.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class ConversationsController {
    private readonly conversationsService;
    constructor(conversationsService: ConversationsService);
    findAllByBot(tenantId: string, botId: string, query: ListConversationsDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
        channel: string;
        id: string;
        status: string;
        createdAt: Date;
        rating: number | null;
        endUserId: string | null;
        endUserName: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
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
        endUserMetadata: import("@prisma/client/runtime/client").JsonValue;
        channelConversationId: string | null;
        messageCount: number;
        lastMessageAt: Date | null;
    }>;
    getMessages(tenantId: string, convId: string, query: PaginationDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
        id: string;
        role: string;
        createdAt: Date;
        creditsUsed: import("@prisma/client-runtime-utils").Decimal;
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
    searchMessages(tenantId: string, botId: string, query: SearchMessagesDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
        id: string;
        role: string;
        createdAt: Date;
        content: string;
        conversationId: string;
    }>>;
    rate(tenantId: string, convId: string, dto: RateConversationDto): Promise<{
        message: string;
    }>;
    messageFeedback(tenantId: string, msgId: string, dto: MessageFeedbackDto): Promise<{
        message: string;
    }>;
}
