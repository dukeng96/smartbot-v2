import { Injectable } from '@nestjs/common';
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

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMessageInput) {
    return this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        botId: input.botId,
        tenantId: input.tenantId,
        role: input.role,
        content: input.content,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.totalTokens,
        creditsUsed: input.creditsUsed,
        searchQuery: input.searchQuery,
        retrievalContext: input.retrievalContext,
        responseTimeMs: input.responseTimeMs,
        modelUsed: input.modelUsed,
      },
    });
  }

  /** Get recent messages for conversation history (used by chat proxy) */
  async getRecent(conversationId: string, limit: number) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // limit is memoryTurns, each turn = user + assistant
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return messages.reverse();
  }
}
