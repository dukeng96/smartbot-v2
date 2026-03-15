import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

jest.mock('bcrypt');
jest.mock('../../common/utils/slug', () => ({
  generateSlug: jest.fn().mockReturnValue('test-slug'),
}));
jest.mock('../../common/utils/crypto', () => ({
  generateToken: jest.fn().mockReturnValue('mock-token-value'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let jwtService: { sign: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    phone: null,
    emailVerified: false,
    authProvider: 'email',
    status: 'active',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockTenant = {
    id: 'tenant-1',
    name: "Test User's workspace",
    slug: 'test-slug',
    ownerId: 'user-1',
  };

  const mockFreePlan = {
    id: 'plan-free',
    slug: 'free',
    maxCreditsPerMonth: 100,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    jwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.accessTtl') return 3600;
              if (key === 'jwt.refreshTtl') return 604800;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register a new user with tenant and subscription', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue(mockFreePlan);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // $transaction receives the callback, we mock it to call cb with prisma
      prisma.$transaction.mockImplementation(async (cb: any) => {
        prisma.user.create.mockResolvedValue(mockUser);
        prisma.tenant.create.mockResolvedValue(mockTenant);
        prisma.tenantMember.create.mockResolvedValue({});
        prisma.subscription.create.mockResolvedValue({});
        prisma.creditUsage.create.mockResolvedValue({});
        return cb(prisma);
      });

      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        fullName: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tenant.slug).toBe('test-slug');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-token-value');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw ConflictException if email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should lowercase the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      prisma.$transaction.mockImplementation(async (cb: any) => {
        prisma.user.create.mockResolvedValue({ ...mockUser, email: 'upper@test.com' });
        prisma.tenant.create.mockResolvedValue(mockTenant);
        prisma.tenantMember.create.mockResolvedValue({});
        return cb(prisma);
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register({
        email: 'UPPER@TEST.COM',
        password: 'SecurePass123!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@test.com' },
      });
    });
  });

  describe('login', () => {
    const userWithMembership = {
      ...mockUser,
      memberships: [
        {
          tenantId: 'tenant-1',
          role: 'owner',
          status: 'active',
          tenant: mockTenant,
          createdAt: new Date(),
        },
      ],
    };

    it('should login successfully with correct credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithMembership);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'bad@email.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithMembership);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...userWithMembership,
        status: 'suspended',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no membership', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete the refresh token', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('some-token');

      expect(result.message).toBe('Logged out successfully');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens for valid refresh token', async () => {
      const stored = {
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: 'user-1',
          memberships: [{ tenantId: 'tenant-1', role: 'owner' }],
        },
      };

      prisma.refreshToken.findUnique.mockResolvedValue(stored);
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-token-value');
    });

    it('should throw for expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        expiresAt: new Date(Date.now() - 100000),
        user: { id: 'user-1', memberships: [] },
      });
      prisma.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for non-existent refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('noone@test.com');

      expect(result.message).toContain('If the email exists');
    });

    it('should return success message if email found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If the email exists');
    });
  });
});
