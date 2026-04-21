"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview(tenantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalConversationsToday, totalMessagesToday, activeBots, totalDocuments, creditUsage,] = await Promise.all([
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
    async getConversationsOverTime(tenantId, period, botId) {
        const days = this.parsePeriodDays(period);
        const botFilter = botId
            ? client_1.Prisma.sql `AND c.bot_id = ${botId}::uuid`
            : client_1.Prisma.empty;
        const rows = await this.prisma.$queryRaw `
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
    async getMessagesOverTime(tenantId, period, botId) {
        const days = this.parsePeriodDays(period);
        const botFilter = botId
            ? client_1.Prisma.sql `AND bot_id = ${botId}::uuid`
            : client_1.Prisma.empty;
        const rows = await this.prisma.$queryRaw `
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
    async getCreditsOverTime(tenantId, period) {
        const days = this.parsePeriodDays(period);
        const rows = await this.prisma.$queryRaw `
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
    async getChannelBreakdown(tenantId, period) {
        const days = this.parsePeriodDays(period);
        const rows = await this.prisma.$queryRaw `
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
    async getTopQuestions(tenantId, botId, limit) {
        const rows = await this.prisma.$queryRaw `
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
    async getSatisfaction(tenantId, botId) {
        const rows = await this.prisma.$queryRaw `
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
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const row of rows) {
            distribution[row.rating] = row.count;
        }
        const totalRatings = rows.reduce((sum, r) => sum + r.count, 0);
        const avgRating = totalRatings > 0
            ? rows.reduce((sum, r) => sum + r.rating * r.count, 0) / totalRatings
            : 0;
        return { distribution, totalRatings, avgRating: Math.round(avgRating * 100) / 100 };
    }
    parsePeriodDays(period) {
        const map = {
            '1d': 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90,
        };
        return map[period] || 7;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map