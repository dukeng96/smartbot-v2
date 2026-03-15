import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { PaginatedResult, PaginationDto } from '../../common/dto/pagination.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllByBot(tenantId: string, botId: string, query: ListConversationsDto) {
    const where: Prisma.ConversationWhereInput = { botId, tenantId };

    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          endUserId: true,
          endUserName: true,
          channel: true,
          status: true,
          messageCount: true,
          lastMessageAt: true,
          rating: true,
          createdAt: true,
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async findOne(tenantId: string, convId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: convId, tenantId },
      include: { bot: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async getMessages(tenantId: string, convId: string, query: PaginationDto) {
    await this.ensureConvExists(tenantId, convId);

    const where = { conversationId: convId, tenantId };
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          creditsUsed: true,
          responseTimeMs: true,
          modelUsed: true,
          feedback: true,
          createdAt: true,
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async archive(tenantId: string, convId: string) {
    await this.ensureConvExists(tenantId, convId);

    await this.prisma.conversation.update({
      where: { id: convId },
      data: { status: 'archived' },
    });

    return { message: 'Conversation archived' };
  }

  async rate(tenantId: string, convId: string, dto: RateConversationDto) {
    await this.ensureConvExists(tenantId, convId);

    await this.prisma.conversation.update({
      where: { id: convId },
      data: { rating: dto.rating, feedbackText: dto.feedbackText },
    });

    return { message: 'Rating saved' };
  }

  async messageFeedback(tenantId: string, msgId: string, feedback: string) {
    const msg = await this.prisma.message.findFirst({
      where: { id: msgId, tenantId },
    });
    if (!msg) throw new NotFoundException('Message not found');

    await this.prisma.message.update({
      where: { id: msgId },
      data: { feedback },
    });

    return { message: 'Feedback saved' };
  }

  async searchMessages(tenantId: string, botId: string, q: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    // Basic full-text search using PostgreSQL ILIKE
    // For production, use tsvector/tsquery or external search engine
    const where: Prisma.MessageWhereInput = {
      tenantId,
      botId,
      content: { contains: q, mode: 'insensitive' },
    };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          conversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  /** Used by chat proxy to get/create conversation */
  async getOrCreate(
    botId: string,
    tenantId: string,
    conversationId?: string,
    endUserId?: string,
    endUserName?: string,
    channel = 'web_widget',
  ) {
    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: { id: conversationId, botId, tenantId },
      });
      if (existing) return existing;
    }

    return this.prisma.conversation.create({
      data: {
        botId,
        tenantId,
        endUserId,
        endUserName,
        channel,
        status: 'active',
      },
    });
  }

  /** Update conversation stats after new message */
  async updateStats(convId: string) {
    const count = await this.prisma.message.count({
      where: { conversationId: convId },
    });

    await this.prisma.conversation.update({
      where: { id: convId },
      data: { messageCount: count, lastMessageAt: new Date() },
    });
  }

  private async ensureConvExists(tenantId: string, convId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: convId, tenantId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }
}
