import { PrismaService } from '../../common/prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getOverview(tenantId: string): Promise<{
        totalConversationsToday: number;
        totalMessagesToday: number;
        creditsUsed: number;
        creditsRemaining: number;
        activeBots: number;
        totalDocuments: number;
    }>;
    getConversationsOverTime(tenantId: string, period: string, botId?: string): Promise<any[]>;
    getMessagesOverTime(tenantId: string, period: string, botId?: string): Promise<any[]>;
    getCreditsOverTime(tenantId: string, period: string): Promise<any[]>;
    getChannelBreakdown(tenantId: string, period: string): Promise<any[]>;
    getTopQuestions(tenantId: string, botId: string, limit: number): Promise<any[]>;
    getSatisfaction(tenantId: string, botId: string): Promise<{
        distribution: Record<number, number>;
        totalRatings: any;
        avgRating: number;
    }>;
    private parsePeriodDays;
}
