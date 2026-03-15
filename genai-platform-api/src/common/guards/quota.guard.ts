import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { QUOTA_TYPE_KEY } from '../decorators/quota-type.decorator';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaType = this.reflector.get<string>(
      QUOTA_TYPE_KEY,
      context.getHandler(),
    );
    if (!quotaType) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
      include: { plan: true },
    });

    if (!sub) {
      throw new ForbiddenException('No active subscription');
    }

    switch (quotaType) {
      case 'bot_create': {
        const botCount = await this.prisma.bot.count({
          where: { tenantId, deletedAt: null },
        });
        if (sub.plan.maxBots !== -1 && botCount >= sub.plan.maxBots) {
          throw new HttpException(
            'Bot limit reached. Please upgrade your plan.',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        break;
      }
      case 'chat': {
        const now = new Date();
        const usage = await this.prisma.creditUsage.findFirst({
          where: {
            tenantId,
            periodStart: { lte: now },
            periodEnd: { gte: now },
          },
        });
        if (
          usage &&
          usage.creditsUsed >= usage.creditsAllocated + usage.topUpCredits
        ) {
          throw new HttpException(
            'Credit limit reached. Please top up or upgrade your plan.',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        break;
      }
      case 'document_upload': {
        const totalChars = await this.prisma.document.aggregate({
          where: { tenantId, deletedAt: null },
          _sum: { charCount: true },
        });
        const usedChars = totalChars._sum.charCount || BigInt(0);
        if (
          sub.plan.maxKnowledgeCharsPerBot !== BigInt(-1) &&
          usedChars >= sub.plan.maxKnowledgeCharsPerBot
        ) {
          throw new HttpException(
            'Knowledge base character limit reached. Please upgrade your plan.',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        break;
      }
    }

    return true;
  }
}
