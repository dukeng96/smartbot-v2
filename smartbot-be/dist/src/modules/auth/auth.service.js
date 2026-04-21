"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const slug_1 = require("../../common/utils/slug");
const crypto_1 = require("../../common/utils/crypto");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const fullName = dto.fullName || dto.email.split('@')[0];
        const freePlan = await this.prisma.plan.findUnique({
            where: { slug: 'free' },
        });
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    fullName,
                    authProvider: 'email',
                },
            });
            const tenant = await tx.tenant.create({
                data: {
                    name: `${fullName}'s workspace`,
                    slug: (0, slug_1.generateSlug)(fullName),
                    ownerId: user.id,
                    planId: freePlan?.id,
                },
            });
            await tx.tenantMember.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                    role: 'owner',
                    status: 'active',
                    joinedAt: new Date(),
                },
            });
            if (freePlan) {
                const now = new Date();
                const periodEnd = new Date(now);
                periodEnd.setMonth(periodEnd.getMonth() + 1);
                await tx.subscription.create({
                    data: {
                        tenantId: tenant.id,
                        planId: freePlan.id,
                        status: 'active',
                        billingCycle: 'monthly',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                });
                await tx.creditUsage.create({
                    data: {
                        tenantId: tenant.id,
                        periodStart: now,
                        periodEnd: periodEnd,
                        creditsAllocated: freePlan.maxCreditsPerMonth,
                    },
                });
            }
            return { user, tenant };
        });
        const tokens = await this.generateTokens(result.user.id, result.tenant.id, 'owner');
        return {
            user: this.sanitizeUser(result.user),
            tenant: this.sanitizeTenant(result.tenant),
            role: 'owner',
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            include: {
                memberships: {
                    where: { status: 'active' },
                    include: { tenant: true },
                    take: 1,
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        const membership = user.memberships[0];
        if (!membership) {
            throw new common_1.UnauthorizedException('No active tenant membership');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const tokens = await this.generateTokens(user.id, membership.tenantId, membership.role);
        return {
            user: this.sanitizeUser(user),
            tenant: this.sanitizeTenant(membership.tenant),
            role: membership.role,
            ...tokens,
        };
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        return { message: 'Logged out successfully' };
    }
    async refreshTokens(refreshToken) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: {
                user: {
                    include: {
                        memberships: {
                            where: { status: 'active' },
                            include: { tenant: true },
                            take: 1,
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
        });
        if (!stored || stored.expiresAt < new Date()) {
            if (stored) {
                await this.prisma.refreshToken.delete({ where: { id: stored.id } });
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        await this.prisma.refreshToken.deleteMany({
            where: {
                userId: stored.user.id,
                OR: [
                    { id: stored.id },
                    { expiresAt: { lt: new Date() } },
                    { createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                ],
            },
        });
        const membership = stored.user.memberships[0];
        if (!membership) {
            throw new common_1.UnauthorizedException('No active tenant membership');
        }
        const tokens = await this.generateTokens(stored.user.id, membership.tenantId, membership.role);
        return {
            user: this.sanitizeUser(stored.user),
            tenant: this.sanitizeTenant(membership.tenant),
            role: membership.role,
            ...tokens,
        };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return { message: 'If the email exists, a reset link has been sent' };
        }
        const resetToken = (0, crypto_1.generateToken)();
        this.logger.log(`Password reset token for ${email}: ${resetToken} (stub: would send email)`);
        return { message: 'If the email exists, a reset link has been sent' };
    }
    async resetPassword(token, newPassword) {
        this.logger.log(`Reset password with token: ${token} (stub implementation)`);
        throw new common_1.BadRequestException('Password reset not fully implemented yet. Token verification pending.');
    }
    async verifyEmail(token) {
        this.logger.log(`Verify email with token: ${token} (stub implementation)`);
        throw new common_1.BadRequestException('Email verification not fully implemented yet. Token verification pending.');
    }
    async googleOAuth(idToken) {
        this.logger.log(`Google OAuth with idToken (stub implementation)`);
        throw new common_1.BadRequestException('Google OAuth not fully implemented yet. Configure GOOGLE_CLIENT_ID first.');
    }
    async generateTokens(userId, tenantId, role) {
        const payload = { userId, tenantId, role };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('jwt.accessTtl'),
        });
        const refreshTokenValue = (0, crypto_1.generateToken)(64);
        const refreshTtl = this.configService.get('jwt.refreshTtl') ?? 604800;
        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: refreshTokenValue,
                expiresAt: new Date(Date.now() + refreshTtl * 1000),
            },
        });
        return { accessToken, refreshToken: refreshTokenValue };
    }
    sanitizeUser(user) {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            emailVerified: user.emailVerified,
            authProvider: user.authProvider,
            status: user.status,
            createdAt: user.createdAt,
        };
    }
    sanitizeTenant(tenant) {
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            logoUrl: tenant.logoUrl ?? null,
            planId: tenant.planId ?? null,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map