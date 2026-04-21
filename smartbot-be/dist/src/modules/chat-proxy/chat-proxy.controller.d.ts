import type { Response } from 'express';
import { ChatProxyService } from './chat-proxy.service';
import { ChatDto } from './dto/chat.dto';
export declare class ChatProxyController {
    private readonly chatProxyService;
    private readonly logger;
    constructor(chatProxyService: ChatProxyService);
    getBotConfig(botId: string, referer?: string): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
        greetingMessage: string | null;
        suggestedQuestions: import("@prisma/client/runtime/client").JsonValue;
        widgetConfig: import("@prisma/client/runtime/client").JsonValue;
    }>;
    chat(botId: string, dto: ChatDto, res: Response): Promise<void>;
    getConversationMessages(botId: string, convId: string, endUserId?: string): Promise<{
        role: string;
        createdAt: Date;
        content: string;
    }[]>;
    private extractHost;
}
