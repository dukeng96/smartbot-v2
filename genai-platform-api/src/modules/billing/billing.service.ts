import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreditsService } from './credits.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TopUpCreditsDto } from './dto/top-up-credits.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
  ) {}

  async listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCurrentSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true },
    });

    const creditUsage = await this.creditsService.getCurrentUsage(tenantId);

    return { subscription: sub, creditUsage };
  }

  async subscribe(tenantId: string, dto: SubscribeDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    // Check if already has active subscription
    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
    });

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, dto.billingCycle);

    if (existing) {
      // Upgrade/downgrade — update existing subscription
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

      // Update tenant's plan reference
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { planId: dto.planId },
      });

      // Create payment record
      const price = this.getPlanPrice(plan, dto.billingCycle);
      if (price > 0) {
        await this.createPaymentRecord(
          tenantId,
          updated.id,
          'subscription',
          price,
          dto.paymentMethod,
        );
      }

      return updated;
    }

    // New subscription
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

    // Update tenant's plan
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { planId: dto.planId },
    });

    // Create credit usage for new period
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
      await this.createPaymentRecord(
        tenantId,
        sub.id,
        'subscription',
        price,
        dto.paymentMethod,
      );
    }

    return sub;
  }

  async updateSubscription(tenantId: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
      },
      include: { plan: true },
    });
  }

  async cancelSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async topUpCredits(tenantId: string, dto: TopUpCreditsDto) {
    // Mock: In production, redirect to payment gateway
    this.logger.log(
      `[MOCK] TopUp ${dto.amount} credits for tenant ${tenantId} via ${dto.paymentMethod || 'vnpay'}`,
    );

    await this.creditsService.addTopUp(tenantId, dto.amount);

    await this.createPaymentRecord(
      tenantId,
      null,
      'top_up',
      BigInt(dto.amount * 100), // mock price: 100 VND per credit
      dto.paymentMethod,
    );

    return { message: `${dto.amount} credits added`, credits: dto.amount };
  }

  async getCreditUsage(tenantId: string) {
    return this.creditsService.getCurrentUsage(tenantId);
  }

  async getPaymentHistory(tenantId: string, query: PaginationDto) {
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

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async handleVnpayCallback(body: Record<string, any>) {
    // Mock: Verify VNPay checksum and process payment
    this.logger.log(`[MOCK] VNPay IPN callback: ${JSON.stringify(body)}`);
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleMomoCallback(body: Record<string, any>) {
    // Mock: Verify MoMo signature and process payment
    this.logger.log(`[MOCK] MoMo IPN callback: ${JSON.stringify(body)}`);
    return { status: 0, message: 'success' };
  }

  private async createPaymentRecord(
    tenantId: string,
    subscriptionId: string | null,
    type: string,
    amount: bigint | number,
    paymentMethod?: string,
  ) {
    return this.prisma.paymentHistory.create({
      data: {
        tenantId,
        subscriptionId,
        type,
        amount: BigInt(amount),
        currency: 'VND',
        status: 'completed',
        paymentMethod: paymentMethod || 'system',
        description:
          type === 'subscription' ? 'Subscription payment' : 'Credit top-up',
      },
    });
  }

  private calculatePeriodEnd(start: Date, cycle: string): Date {
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

  private getPlanPrice(plan: any, cycle: string): bigint {
    switch (cycle) {
      case 'weekly':
        return plan.priceWeekly;
      case 'yearly':
        return plan.priceYearly;
      case 'monthly':
      default:
        return plan.priceMonthly;
    }
  }
}
