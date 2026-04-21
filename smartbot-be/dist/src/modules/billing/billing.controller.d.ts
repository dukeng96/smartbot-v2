import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TopUpCreditsDto } from './dto/top-up-credits.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
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
    getSubscription(tenantId: string): Promise<{
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
    getPayments(tenantId: string, query: PaginationDto): Promise<import("../../common/dto/pagination.dto").PaginatedResult<{
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
    vnpayCallback(body: Record<string, any>): Promise<{
        RspCode: string;
        Message: string;
    }>;
    momoCallback(body: Record<string, any>): Promise<{
        status: number;
        message: string;
    }>;
}
