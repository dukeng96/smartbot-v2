import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { generateSlug } from '../../common/utils/slug';
import { generateToken } from '../../common/utils/crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const fullName = dto.fullName || dto.email.split('@')[0];

    // Get Free plan
    const freePlan = await this.prisma.plan.findUnique({
      where: { slug: 'free' },
    });

    const result = await this.prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName,
          authProvider: 'email',
        },
      });

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: `${fullName}'s workspace`,
          slug: generateSlug(fullName),
          ownerId: user.id,
          planId: freePlan?.id,
        },
      });

      // Create tenant membership
      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        },
      });

      // Create subscription for Free plan
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

        // Create initial credit usage
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

    const tokens = await this.generateTokens(
      result.user.id,
      result.tenant.id,
      'owner',
    );

    return {
      user: this.sanitizeUser(result.user),
      tenant: this.sanitizeTenant(result.tenant),
      role: 'owner' as const,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
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
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No active tenant membership');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      membership.tenantId,
      membership.role,
    );

    return {
      user: this.sanitizeUser(user),
      tenant: this.sanitizeTenant(membership.tenant),
      role: membership.role,
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(refreshToken: string) {
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete the used token + clean up expired/old tokens for this user
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
      throw new UnauthorizedException('No active tenant membership');
    }

    const tokens = await this.generateTokens(
      stored.user.id,
      membership.tenantId,
      membership.role,
    );

    return {
      user: this.sanitizeUser(stored.user),
      tenant: this.sanitizeTenant(membership.tenant),
      role: membership.role,
      ...tokens,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = generateToken();
    this.logger.log(
      `Password reset token for ${email}: ${resetToken} (stub: would send email)`,
    );

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Stub: in production, verify token from DB/cache
    this.logger.log(`Reset password with token: ${token} (stub implementation)`);
    throw new BadRequestException(
      'Password reset not fully implemented yet. Token verification pending.',
    );
  }

  async verifyEmail(token: string) {
    // Stub: in production, verify token from DB/cache
    this.logger.log(`Verify email with token: ${token} (stub implementation)`);
    throw new BadRequestException(
      'Email verification not fully implemented yet. Token verification pending.',
    );
  }

  async googleOAuth(idToken: string) {
    // Stub: in production, verify Google ID token
    this.logger.log(`Google OAuth with idToken (stub implementation)`);
    throw new BadRequestException(
      'Google OAuth not fully implemented yet. Configure GOOGLE_CLIENT_ID first.',
    );
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    role: string,
  ) {
    const payload = { userId, tenantId, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<number>('jwt.accessTtl'),
    });

    const refreshTokenValue = generateToken(64);
    const refreshTtl = this.configService.get<number>('jwt.refreshTtl') ?? 604800;

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private sanitizeUser(user: any) {
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

  private sanitizeTenant(tenant: any) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl ?? null,
      planId: tenant.planId ?? null,
    };
  }
}
