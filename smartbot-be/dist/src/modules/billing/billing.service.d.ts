import { PrismaService } from '../../common/prisma/prisma.service';
import { CreditsService } from './credits.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TopUpCreditsDto } from './dto/top-up-credits.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
export declare class BillingService {
    private readonly prisma;
    private readonly creditsService;
    private readonly logger;
    constructor(prisma: PrismaService, creditsService: CreditsService);
    listPlans(): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        maxBots: number;
        maxCreditsPerMonth: number;
        maxKnowledgeCharsPerBot: bigint;
        maxTeamMembers: number;
        features: import("@prisma/client/runtime/client").JsonValue;
        priceMonthly: bigint;
        priceYearly: bigint;
        priceWeekly: bigint;
        sortOrder: number;
    }[]>;
    getCurrentSubscription(tenantId: string): Promise<{
        subscription: ({
            plan: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                isActive: boolean;
                maxBots: number;
                maxCreditsPerMonth: number;
                maxKnowledgeCharsPerBot: bigint;
                maxTeamMembers: number;
                features: import("@prisma/client/runtime/client").JsonValue;
                priceMonthly: bigint;
                priceYearly: bigint;
                priceWeekly: bigint;
                sortOrder: number;
            };
        } & {
            id: string;
            tenantId: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            billingCycle: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            paymentMethod: string | null;
            externalSubscriptionId: string | null;
        }) | null;
        creditUsage: {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            periodStart: Date;
            periodEnd: Date;
            creditsAllocated: number;
            creditsUsed: number;
            topUpCredits: number;
        };
    }>;
    subscribe(tenantId: string, dto: SubscribeDto): Promise<{
        plan: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            isActive: boolean;
            maxBots: number;
            maxCreditsPerMonth: number;
            maxKnowledgeCharsPerBot: bigint;
            maxTeamMembers: number;
            features: import("@prisma/client/runtime/client").JsonValue;
            priceMonthly: bigint;
            priceYearly: bigint;
            priceWeekly: bigint;
            sortOrder: number;
        };
    } & {
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        billingCycle: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        paymentMethod: string | null;
        externalSubscriptionId: string | null;
    }>;
    updateSubscription(tenantId: string, dto: UpdateSubscriptionDto): Promise<{
        plan: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            isActive: boolean;
            maxBots: number;
            maxCreditsPerMonth: number;
            maxKnowledgeCharsPerBot: bigint;
            maxTeamMembers: number;
            features: import("@prisma/client/runtime/client").JsonValue;
            priceMonthly: bigint;
            priceYearly: bigint;
            priceWeekly: bigint;
            sortOrder: number;
        };
    } & {
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        billingCycle: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        paymentMethod: string | null;
        externalSubscriptionId: string | null;
    }>;
    cancelSubscription(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        billingCycle: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        paymentMethod: string | null;
        externalSubscriptionId: string | null;
    }>;
    topUpCredits(tenantId: string, dto: TopUpCreditsDto): Promise<{
        message: string;
        credits: number;
    }>;
    getCreditUsage(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        periodStart: Date;
        periodEnd: Date;
        creditsAllocated: number;
        creditsUsed: number;
        topUpCredits: number;
    }>;
    getPaymentHistory(tenantId: string, query: PaginationDto): Promise<PaginatedResult<{
        description: string | null;
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        type: string;
        paymentMethod: string | null;
        amount: bigint;
        subscriptionId: string | null;
        currency: string;
        gatewayTransactionId: string | null;
        gatewayResponse: import("@prisma/client/runtime/client").JsonValue | null;
    }>>;
    handleVnpayCallback(body: Record<string, any>): Promise<{
        RspCode: string;
        Message: string;
    }>;
    handleMomoCallback(body: Record<string, any>): Promise<{
        status: number;
        message: string;
    }>;
    private createPaymentRecord;
    private calculatePeriodEnd;
    private getPlanPrice;
}
