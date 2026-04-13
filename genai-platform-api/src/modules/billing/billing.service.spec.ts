import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreditsService } from './credits.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockCreditsService: { getCurrentUsage: jest.Mock; addTopUp: jest.Mock };

  const tenantId = 'tenant-1';
  const mockPlan = {
    id: 'plan-1',
    name: 'Pro',
    slug: 'pro',
    isActive: true,
    priceMonthly: BigInt(299000),
    priceYearly: BigInt(2990000),
    priceWeekly: BigInt(99000),
    maxCreditsPerMonth: 1000,
    maxBots: 5,
    sortOrder: 1,
  };

  const mockSub = {
    id: 'sub-1',
    tenantId,
    planId: 'plan-1',
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    cancelAtPeriodEnd: false,
    paymentMethod: 'vnpay',
    plan: mockPlan,
  };

  const mockUsage = {
    id: 'usage-1',
    tenantId,
    creditsAllocated: 1000,
    creditsUsed: 50,
    topUpCredits: 0,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    mockCreditsService = {
      getCurrentUsage: jest.fn().mockResolvedValue(mockUsage),
      addTopUp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: mockCreditsService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('listPlans', () => {
    it('should return active plans sorted by sortOrder', async () => {
      prisma.plan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.listPlans();

      expect(result).toHaveLength(1);
      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return subscription and credit usage', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);

      const result = await service.getCurrentSubscription(tenantId);

      expect(result.subscription).toEqual(mockSub);
      expect(result.creditUsage).toEqual(mockUsage);
      expect(mockCreditsService.getCurrentUsage).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('subscribe', () => {
    it('should throw NotFoundException if plan not found', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.subscribe(tenantId, {
          planId: 'bad-plan',
          billingCycle: 'monthly',
          paymentMethod: 'vnpay',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create new subscription when none exists', async () => {
      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(mockSub);
      prisma.tenant.update.mockResolvedValue({});
      prisma.creditUsage.create.mockResolvedValue({});
      prisma.paymentHistory.create.mockResolvedValue({});

      const result = await service.subscribe(tenantId, {
        planId: 'plan-1',
        billingCycle: 'monthly',
        paymentMethod: 'vnpay',
      });

      expect(result).toEqual(mockSub);
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: { planId: 'plan-1' },
      });
    });

    it('should upgrade existing subscription', async () => {
      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.subscription.update.mockResolvedValue(mockSub);
      prisma.tenant.update.mockResolvedValue({});
      prisma.paymentHistory.create.mockResolvedValue({});

      const result = await service.subscribe(tenantId, {
        planId: 'plan-1',
        billingCycle: 'monthly',
        paymentMethod: 'vnpay',
      });

      expect(result).toEqual(mockSub);
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('should throw NotFoundException if no active subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSubscription(tenantId, { billingCycle: 'yearly' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update billing cycle', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.subscription.update.mockResolvedValue({
        ...mockSub,
        billingCycle: 'yearly',
      });

      const result = await service.updateSubscription(tenantId, {
        billingCycle: 'yearly',
      });

      expect(result.billingCycle).toBe('yearly');
    });
  });

  describe('cancelSubscription', () => {
    it('should throw NotFoundException if no active subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription(tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set cancelAtPeriodEnd to true', async () => {
      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.subscription.update.mockResolvedValue({
        ...mockSub,
        cancelAtPeriodEnd: true,
      });

      const result = await service.cancelSubscription(tenantId);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: mockSub.id },
        data: { cancelAtPeriodEnd: true },
      });
    });
  });

  describe('topUpCredits', () => {
    it('should add credits and create payment record', async () => {
      prisma.paymentHistory.create.mockResolvedValue({});

      const result = await service.topUpCredits(tenantId, {
        amount: 100,
        paymentMethod: 'momo',
      });

      expect(result.message).toContain('100 credits added');
      expect(mockCreditsService.addTopUp).toHaveBeenCalledWith(tenantId, 100);
      expect(prisma.paymentHistory.create).toHaveBeenCalled();
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      prisma.paymentHistory.findMany.mockResolvedValue([]);
      prisma.paymentHistory.count.mockResolvedValue(0);

      const result = await service.getPaymentHistory(tenantId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        get skip() {
          return 0;
        },
      });

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('handleVnpayCallback', () => {
    it('should return success response', async () => {
      const result = await service.handleVnpayCallback({ orderId: '123' });

      expect(result.RspCode).toBe('00');
    });
  });

  describe('handleMomoCallback', () => {
    it('should return success response', async () => {
      const result = await service.handleMomoCallback({ orderId: '123' });

      expect(result.status).toBe(0);
    });
  });
});
