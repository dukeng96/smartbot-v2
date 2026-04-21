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
var CreditsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CreditsService = CreditsService_1 = class CreditsService {
    prisma;
    logger = new common_1.Logger(CreditsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrentUsage(tenantId) {
        const today = new Date();
        let usage = await this.prisma.creditUsage.findFirst({
            where: {
                tenantId,
                periodStart: { lte: today },
                periodEnd: { gte: today },
            },
        });
        if (!usage) {
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
    async checkQuota(tenantId) {
        const usage = await this.getCurrentUsage(tenantId);
        if (usage.creditsUsed >= usage.creditsAllocated + usage.topUpCredits) {
            throw new common_1.ForbiddenException('Credit limit reached. Please upgrade or top up.');
        }
    }
    async increment(tenantId, credits) {
        const usage = await this.getCurrentUsage(tenantId);
        await this.prisma.creditUsage.update({
            where: { id: usage.id },
            data: { creditsUsed: { increment: credits } },
        });
    }
    async addTopUp(tenantId, credits) {
        const usage = await this.getCurrentUsage(tenantId);
        await this.prisma.creditUsage.update({
            where: { id: usage.id },
            data: { topUpCredits: { increment: credits } },
        });
    }
};
exports.CreditsService = CreditsService;
exports.CreditsService = CreditsService = CreditsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CreditsService);
//# sourceMappingURL=credits.service.js.map