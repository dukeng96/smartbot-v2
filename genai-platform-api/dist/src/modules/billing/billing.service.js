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
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const credits_service_1 = require("./credits.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let BillingService = BillingService_1 = class BillingService {
    prisma;
    creditsService;
    logger = new common_1.Logger(BillingService_1.name);
    constructor(prisma, creditsService) {
        this.prisma = prisma;
        this.creditsService = creditsService;
    }
    async listPlans() {
        return this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getCurrentSubscription(tenantId) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: { in: ['active', 'trialing', 'past_due'] } },
            include: { plan: true },
        });
        const creditUsage = await this.creditsService.getCurrentUsage(tenantId);
        return { subscription: sub, creditUsage };
    }
    async subscribe(tenantId, dto) {
        const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        const existing = await this.prisma.subscription.findFirst({
            where: { tenantId, status: { in: ['active', 'trialing'] } },
        });
        const now = new Date();
        const periodEnd = this.calculatePeriodEnd(now, dto.billingCycle);
        if (existing) {
            const updated = await this.prisma.subscription.update({
                where: { id: existing.id },
                data: {
                    planId: dto.planId,
                    billingCycle: dto.billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    paymentMethod: dto.paymentMethod,
                    cancelAtPeriodEnd: false,
                },
                include: { plan: true },
            });
            await this.prisma.tenant.update({
                where: { id: tenantId },
                data: { planId: dto.planId },
            });
            const price = this.getPlanPrice(plan, dto.billingCycle);
            if (price > 0) {
                await this.createPaymentRecord(tenantId, updated.id, 'subscription', price, dto.paymentMethod);
            }
            return updated;
        }
        const sub = await this.prisma.subscription.create({
            data: {
                tenantId,
                planId: dto.planId,
                status: 'active',
                billingCycle: dto.billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                paymentMethod: dto.paymentMethod,
            },
            include: { plan: true },
        });
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { planId: dto.planId },
        });
        await this.prisma.creditUsage.create({
            data: {
                tenantId,
                periodStart: now,
                periodEnd,
                creditsAllocated: plan.maxCreditsPerMonth,
            },
        });
        const price = this.getPlanPrice(plan, dto.billingCycle);
        if (price > 0) {
            await this.createPaymentRecord(tenantId, sub.id, 'subscription', price, dto.paymentMethod);
        }
        return sub;
    }
    async updateSubscription(tenantId, dto) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: { in: ['active', 'trialing'] } },
        });
        if (!sub)
            throw new common_1.NotFoundException('No active subscription');
        return this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
                ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
            },
            include: { plan: true },
        });
    }
    async cancelSubscription(tenantId) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: { in: ['active', 'trialing'] } },
        });
        if (!sub)
            throw new common_1.NotFoundException('No active subscription');
        return this.prisma.subscription.update({
            where: { id: sub.id },
            data: { cancelAtPeriodEnd: true },
        });
    }
    async topUpCredits(tenantId, dto) {
        this.logger.log(`[MOCK] TopUp ${dto.amount} credits for tenant ${tenantId} via ${dto.paymentMethod || 'vnpay'}`);
        await this.creditsService.addTopUp(tenantId, dto.amount);
        await this.createPaymentRecord(tenantId, null, 'top_up', BigInt(dto.amount * 100), dto.paymentMethod);
        return { message: `${dto.amount} credits added`, credits: dto.amount };
    }
    async getCreditUsage(tenantId) {
        return this.creditsService.getCurrentUsage(tenantId);
    }
    async getPaymentHistory(tenantId, query) {
        const where = { tenantId };
        const [data, total] = await Promise.all([
            this.prisma.paymentHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: query.skip,
                take: query.limit,
            }),
            this.prisma.paymentHistory.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResult(data, total, query.page, query.limit);
    }
    async handleVnpayCallback(body) {
        this.logger.log(`[MOCK] VNPay IPN callback: ${JSON.stringify(body)}`);
        return { RspCode: '00', Message: 'Confirm Success' };
    }
    async handleMomoCallback(body) {
        this.logger.log(`[MOCK] MoMo IPN callback: ${JSON.stringify(body)}`);
        return { status: 0, message: 'success' };
    }
    async createPaymentRecord(tenantId, subscriptionId, type, amount, paymentMethod) {
        return this.prisma.paymentHistory.create({
            data: {
                tenantId,
                subscriptionId,
                type,
                amount: BigInt(amount),
                currency: 'VND',
                status: 'completed',
                paymentMethod: paymentMethod || 'system',
                description: type === 'subscription' ? 'Subscription payment' : 'Credit top-up',
            },
        });
    }
    calculatePeriodEnd(start, cycle) {
        const end = new Date(start);
        switch (cycle) {
            case 'weekly':
                end.setDate(end.getDate() + 7);
                break;
            case 'yearly':
                end.setFullYear(end.getFullYear() + 1);
                break;
            case 'monthly':
            default:
                end.setMonth(end.getMonth() + 1);
                break;
        }
        return end;
    }
    getPlanPrice(plan, cycle) {
        switch (cycle) {
            case 'weekly': return plan.priceWeekly;
            case 'yearly': return plan.priceYearly;
            case 'monthly':
            default: return plan.priceMonthly;
        }
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credits_service_1.CreditsService])
], BillingService);
//# sourceMappingURL=billing.service.js.map