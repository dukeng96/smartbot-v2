import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConversationsToday,
      totalMessagesToday,
      activeBots,
      totalDocuments,
      creditUsage,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { tenantId, createdAt: { gte: today } },
      }),
      this.prisma.message.count({
        where: { tenantId, createdAt: { gte: today } },
      }),
      this.prisma.bot.count({
        where: { tenantId, status: 'active', deletedAt: null },
      }),
      this.prisma.document.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.creditUsage.findFirst({
        where: {
          tenantId,
          periodStart: { lte: today },
          periodEnd: { gte: today },
        },
      }),
    ]);

    return {
      totalConversationsToday,
      totalMessagesToday,
      creditsUsed: creditUsage?.creditsUsed ?? 0,
      creditsRemaining: creditUsage
        ? (creditUsage.creditsAllocated + creditUsage.topUpCredits) - creditUsage.creditsUsed
        : 0,
      activeBots,
      totalDocuments,
    };
  }

  async getConversationsOverTime(tenantId: string, period: string, botId?: string) {
    const days = this.parsePeriodDays(period);
    const botFilter = botId
      ? Prisma.sql`AND c.bot_id = ${botId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('day', c.created_at)::date AS date,
        COUNT(*)::int AS count,
        ROUND(AVG(c.message_count), 1) AS "avgMessages",
        ROUND(AVG(m.avg_response_time))::int AS "avgResponseTimeMs"
      FROM conversations c
      LEFT JOIN (
        SELECT conversation_id, AVG(response_time_ms) AS avg_response_time
        FROM messages
        WHERE role = 'assistant' AND response_time_ms IS NOT NULL
        GROUP BY conversation_id
      ) m ON m.conversation_id = c.id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.created_at >= NOW() - INTERVAL '1 day' * ${days}
        ${botFilter}
      GROUP BY DATE_TRUNC('day', c.created_at)
      ORDER BY date ASC
    `;

    return rows;
  }

  async getMessagesOverTime(tenantId: string, period: string, botId?: string) {
    const days = this.parsePeriodDays(period);
    const botFilter = botId
      ? Prisma.sql`AND bot_id = ${botId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('day', created_at)::date AS date,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE role = 'user')::int AS "userMessages",
        COUNT(*) FILTER (WHERE role = 'assistant')::int AS "assistantMessages"
      FROM messages
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= NOW() - INTERVAL '1 day' * ${days}
        ${botFilter}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    return rows;
  }

  async getCreditsOverTime(tenantId: string, period: string) {
    const days = this.parsePeriodDays(period);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('day', created_at)::date AS date,
        SUM(credits_used)::numeric AS "creditsUsed"
      FROM messages
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= NOW() - INTERVAL '1 day' * ${days}
        AND credits_used > 0
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    return rows;
  }

  async getChannelBreakdown(tenantId: string, period: string) {
    const days = this.parsePeriodDays(period);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        channel,
        COUNT(*)::int AS conversations,
        SUM(message_count)::int AS messages
      FROM conversations
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= NOW() - INTERVAL '1 day' * ${days}
      GROUP BY channel
      ORDER BY conversations DESC
    `;

    return rows;
  }

  async getTopQuestions(tenantId: string, botId: string, limit: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        LEFT(content, 50) AS question_prefix,
        COUNT(*)::int AS count,
        MIN(content) AS sample
      FROM messages
      WHERE tenant_id = ${tenantId}::uuid
        AND bot_id = ${botId}::uuid
        AND role = 'user'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY LEFT(content, 50)
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return rows;
  }

  async getSatisfaction(tenantId: string, botId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        rating,
        COUNT(*)::int AS count
      FROM conversations
      WHERE tenant_id = ${tenantId}::uuid
        AND bot_id = ${botId}::uuid
        AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating ASC
    `;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      distribution[row.rating] = row.count;
    }

    const totalRatings = rows.reduce((sum: number, r: any) => sum + r.count, 0);
    const avgRating = totalRatings > 0
      ? rows.reduce((sum: number, r: any) => sum + r.rating * r.count, 0) / totalRatings
      : 0;

    return { distribution, totalRatings, avgRating: Math.round(avgRating * 100) / 100 };
  }

  private parsePeriodDays(period: string): number {
    const map: Record<string, number> = {
      '1d': 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90,
    };
    return map[period] || 7;
  }
}
