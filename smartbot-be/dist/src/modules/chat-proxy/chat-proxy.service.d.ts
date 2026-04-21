import { ConfigService } from '@nestjs/config';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../conversations/messages.service';
import { CreditsService } from '../billing/credits.service';
interface ChatRequest {
    botId: string;
    message: string;
    conversationId?: string;
    endUserId?: string;
    endUserName?: string;
}
interface SseEvent {
    event: string;
    data: string;
}
export declare class ChatProxyService {
    private readonly configService;
    private readonly botsService;
    private readonly conversationsService;
    private readonly messagesService;
    private readonly creditsService;
    private readonly logger;
    private readonly aiEngineUrl;
    constructor(configService: ConfigService, botsService: BotsService, conversationsService: ConversationsService, messagesService: MessagesService, creditsService: CreditsService);
    getBotConfig(botId: string, refererHost?: string): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getConversationHistory(botId: string, conversationId: string, endUserId?: string): Promise<{
        role: string;
        createdAt: Date;
        content: string;
    }[]>;
    processChat(req: ChatRequest): AsyncGenerator<SseEvent>;
    private generateMockResponse;
}
export {};
