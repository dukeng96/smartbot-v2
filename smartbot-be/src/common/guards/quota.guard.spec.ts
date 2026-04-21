import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QuotaGuard } from './quota.guard';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../testing/prisma-mock.helper';

describe('QuotaGuard', () => {
  let guard: QuotaGuard;
  let prisma: ReturnType<typeof createPrismaMock>;
  let reflector: Reflector;

  const tenantId = 'tenant-1';

  const mockSub = {
    plan: {
      maxBots: 3,
      maxKnowledgeCharsPerBot: BigInt(100000),
    },
  };

  function createMockContext(
    quotaType: string | undefined,
    user?: any,
  ): ExecutionContext {
    reflector.get = jest.fn().mockReturnValue(quotaType);
    return {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: user ?? { tenantId } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    guard = module.get<QuotaGuard>(QuotaGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow if no quota type set', async () => {
    const ctx = createMockContext(undefined);

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should allow if no tenantId in request', async () => {
    const ctx = createMockContext('bot_create', {});

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException if no active subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    const ctx = createMockContext('bot_create');

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  describe('bot_create quota', () => {
    it('should allow if under bot limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.bot.count.mockResolvedValue(1);
      const ctx = createMockContext('bot_create');

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should throw HttpException if bot limit reached', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.bot.count.mockResolvedValue(3);
      const ctx = createMockContext('bot_create');

      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
    });

    it('should allow unlimited bots when maxBots is -1', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { ...mockSub.plan, maxBots: -1 },
      });
      prisma.bot.count.mockResolvedValue(100);
      const ctx = createMockContext('bot_create');

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('chat quota', () => {
    it('should allow if credits remaining', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.creditUsage.findFirst.mockResolvedValue({
        creditsAllocated: 1000,
        creditsUsed: 500,
        topUpCredits: 0,
      });
      const ctx = createMockContext('chat');

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should throw HttpException if credits exhausted', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.creditUsage.findFirst.mockResolvedValue({
        creditsAllocated: 100,
        creditsUsed: 100,
        topUpCredits: 0,
      });
      const ctx = createMockContext('chat');

      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
    });

    it('should allow if no usage record yet', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.creditUsage.findFirst.mockResolvedValue(null);
      const ctx = createMockContext('chat');

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('document_upload quota', () => {
    it('should allow if under character limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.document.aggregate.mockResolvedValue({
        _sum: { charCount: BigInt(50000) },
      });
      const ctx = createMockContext('document_upload');

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should throw HttpException if character limit reached', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.document.aggregate.mockResolvedValue({
        _sum: { charCount: BigInt(100000) },
      });
      const ctx = createMockContext('document_upload');

      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
    });

    it('should allow unlimited chars when maxKnowledgeCharsPerBot is -1', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { ...mockSub.plan, maxKnowledgeCharsPerBot: BigInt(-1) },
      });
      prisma.document.aggregate.mockResolvedValue({
        _sum: { charCount: BigInt(999999) },
      });
      const ctx = createMockContext('document_upload');

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should handle null charCount sum', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.document.aggregate.mockResolvedValue({
        _sum: { charCount: null },
      });
      const ctx = createMockContext('document_upload');

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });
});
