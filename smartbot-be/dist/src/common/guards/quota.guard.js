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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../prisma/prisma.service");
const quota_type_decorator_1 = require("../decorators/quota-type.decorator");
let QuotaGuard = class QuotaGuard {
    prisma;
    reflector;
    constructor(prisma, reflector) {
        this.prisma = prisma;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const quotaType = this.reflector.get(quota_type_decorator_1.QUOTA_TYPE_KEY, context.getHandler());
        if (!quotaType)
            return true;
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;
        if (!tenantId)
            return true;
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: { in: ['active', 'trialing'] } },
            include: { plan: true },
        });
        if (!sub) {
            throw new common_1.ForbiddenException('No active subscription');
        }
        switch (quotaType) {
            case 'bot_create': {
                const botCount = await this.prisma.bot.count({
                    where: { tenantId, deletedAt: null },
                });
                if (sub.plan.maxBots !== -1 && botCount >= sub.plan.maxBots) {
                    throw new common_1.HttpException('Bot limit reached. Please upgrade your plan.', common_1.HttpStatus.PAYMENT_REQUIRED);
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
                if (usage &&
                    usage.creditsUsed >= usage.creditsAllocated + usage.topUpCredits) {
                    throw new common_1.HttpException('Credit limit reached. Please top up or upgrade your plan.', common_1.HttpStatus.PAYMENT_REQUIRED);
                }
                break;
            }
            case 'document_upload': {
                const totalChars = await this.prisma.document.aggregate({
                    where: { tenantId, deletedAt: null },
                    _sum: { charCount: true },
                });
                const usedChars = totalChars._sum.charCount || BigInt(0);
                if (sub.plan.maxKnowledgeCharsPerBot !== BigInt(-1) &&
                    usedChars >= sub.plan.maxKnowledgeCharsPerBot) {
                    throw new common_1.HttpException('Knowledge base character limit reached. Please upgrade your plan.', common_1.HttpStatus.PAYMENT_REQUIRED);
                }
                break;
            }
        }
        return true;
    }
};
exports.QuotaGuard = QuotaGuard;
exports.QuotaGuard = QuotaGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        core_1.Reflector])
], QuotaGuard);
//# sourceMappingURL=quota.guard.js.map