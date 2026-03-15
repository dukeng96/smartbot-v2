import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, TopQuestionsQueryDto } from './dto/analytics-query.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getOverview(tenantId: string): Promise<{
        totalConversationsToday: number;
        totalMessagesToday: number;
        creditsUsed: number;
        creditsRemaining: number;
        activeBots: number;
        totalDocuments: number;
    }>;
    getConversations(tenantId: string, query: AnalyticsQueryDto): Promise<any[]>;
    getMessages(tenantId: string, query: AnalyticsQueryDto): Promise<any[]>;
    getCredits(tenantId: string, query: AnalyticsQueryDto): Promise<any[]>;
    getChannels(tenantId: string, query: AnalyticsQueryDto): Promise<any[]>;
    getTopQuestions(tenantId: string, botId: string, query: TopQuestionsQueryDto): Promise<any[]>;
    getSatisfaction(tenantId: string, botId: string): Promise<{
        distribution: Record<number, number>;
        totalRatings: any;
        avgRating: number;
    }>;
}
