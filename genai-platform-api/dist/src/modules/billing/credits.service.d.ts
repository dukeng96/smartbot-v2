import { PrismaService } from '../../common/prisma/prisma.service';
export declare class CreditsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getCurrentUsage(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        periodStart: Date;
        periodEnd: Date;
        creditsAllocated: number;
        creditsUsed: number;
        topUpCredits: number;
    }>;
    checkQuota(tenantId: string): Promise<void>;
    increment(tenantId: string, credits: number): Promise<void>;
    addTopUp(tenantId: string, credits: number): Promise<void>;
}
