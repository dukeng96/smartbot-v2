import { PrismaService } from '../../common/prisma/prisma.service';
interface CreateMessageInput {
    conversationId: string;
    botId: string;
    tenantId: string;
    role: string;
    content: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    creditsUsed?: number;
    searchQuery?: string;
    retrievalContext?: any;
    responseTimeMs?: number;
    modelUsed?: string;
}
export declare class MessagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateMessageInput): Promise<{
        id: string;
        tenantId: string;
        role: string;
        createdAt: Date;
        creditsUsed: import("@prisma/client-runtime-utils").Decimal;
        botId: string;
        content: string;
        conversationId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        searchQuery: string | null;
        retrievalContext: import("@prisma/client/runtime/client").JsonValue | null;
        responseTimeMs: number | null;
        modelUsed: string | null;
        feedback: string | null;
    }>;
    getRecent(conversationId: string, limit: number): Promise<{
        role: string;
        createdAt: Date;
        content: string;
    }[]>;
}
export {};
