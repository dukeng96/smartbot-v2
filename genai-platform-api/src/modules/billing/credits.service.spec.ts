import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('CreditsService', () => {
  let service: CreditsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const tenantId = 'tenant-1';
  const mockUsage = {
    id: 'usage-1',
    tenantId,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    creditsAllocated: 1000,
    creditsUsed: 50,
    topUpCredits: 0,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
  });

  describe('getCurrentUsage', () => {
    it('should return existing usage record', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(mockUsage);

      const result = await service.getCurrentUsage(tenantId);

      expect(result).toEqual(mockUsage);
    });

    it('should auto-create usage if none exists', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(null);
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { maxCreditsPerMonth: 500 },
      });
      prisma.creditUsage.create.mockResolvedValue({
        ...mockUsage,
        creditsAllocated: 500,
        creditsUsed: 0,
      });

      const result = await service.getCurrentUsage(tenantId);

      expect(result.creditsAllocated).toBe(500);
      expect(prisma.creditUsage.create).toHaveBeenCalled();
    });

    it('should default to 100 credits if no subscription', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(null);
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.creditUsage.create.mockResolvedValue({
        ...mockUsage,
        creditsAllocated: 100,
      });

      const result = await service.getCurrentUsage(tenantId);

      expect(prisma.creditUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ creditsAllocated: 100 }),
      });
    });
  });

  describe('checkQuota', () => {
    it('should pass if within quota', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(mockUsage);

      await expect(service.checkQuota(tenantId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if credits exhausted', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue({
        ...mockUsage,
        creditsAllocated: 100,
        creditsUsed: 100,
        topUpCredits: 0,
      });

      await expect(service.checkQuota(tenantId)).rejects.toThrow(ForbiddenException);
    });

    it('should allow if topUp credits available', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue({
        ...mockUsage,
        creditsAllocated: 100,
        creditsUsed: 100,
        topUpCredits: 50,
      });

      await expect(service.checkQuota(tenantId)).resolves.not.toThrow();
    });
  });

  describe('increment', () => {
    it('should increment credits used', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(mockUsage);
      prisma.creditUsage.update.mockResolvedValue({});

      await service.increment(tenantId, 5);

      expect(prisma.creditUsage.update).toHaveBeenCalledWith({
        where: { id: mockUsage.id },
        data: { creditsUsed: { increment: 5 } },
      });
    });
  });

  describe('addTopUp', () => {
    it('should increment topUp credits', async () => {
      prisma.creditUsage.findFirst.mockResolvedValue(mockUsage);
      prisma.creditUsage.update.mockResolvedValue({});

      await service.addTopUp(tenantId, 200);

      expect(prisma.creditUsage.update).toHaveBeenCalledWith({
        where: { id: mockUsage.id },
        data: { topUpCredits: { increment: 200 } },
      });
    });
  });
});
