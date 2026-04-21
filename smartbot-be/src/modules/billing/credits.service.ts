import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUsage(tenantId: string) {
    const today = new Date();

    let usage = await this.prisma.creditUsage.findFirst({
      where: {
        tenantId,
        periodStart: { lte: today },
        periodEnd: { gte: today },
      },
    });

    if (!usage) {
      // Auto-create usage record for current period
      const sub = await this.prisma.subscription.findFirst({
        where: { tenantId, status: { in: ['active', 'trialing'] } },
        include: { plan: true },
      });

      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      usage = await this.prisma.creditUsage.create({
        data: {
          tenantId,
          periodStart,
          periodEnd,
          creditsAllocated: sub?.plan?.maxCreditsPerMonth ?? 100,
          creditsUsed: 0,
          topUpCredits: 0,
        },
      });
    }

    return usage;
  }

  async checkQuota(tenantId: string) {
    const usage = await this.getCurrentUsage(tenantId);
    if (usage.creditsUsed >= usage.creditsAllocated + usage.topUpCredits) {
      throw new ForbiddenException(
        'Credit limit reached. Please upgrade or top up.',
      );
    }
  }

  async increment(tenantId: string, credits: number) {
    const usage = await this.getCurrentUsage(tenantId);

    await this.prisma.creditUsage.update({
      where: { id: usage.id },
      data: { creditsUsed: { increment: credits } },
    });
  }

  async addTopUp(tenantId: string, credits: number) {
    const usage = await this.getCurrentUsage(tenantId);

    await this.prisma.creditUsage.update({
      where: { id: usage.id },
      data: { topUpCredits: { increment: credits } },
    });
  }
}
