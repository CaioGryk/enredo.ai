import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../billing.service';
import { PrismaService } from '@common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreditTransactionReason, SubscriptionType } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let mockTx: any;
  let configService: { get: jest.Mock };

  const createMockPrisma = () => {
    mockTx = {
      creditWallet: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    creditTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    };

    return {
      $transaction: jest.fn((arg: any) => {
        if (typeof arg === 'function') {
          return Promise.resolve(arg(mockTx));
        }
        if (Array.isArray(arg)) {
          return Promise.resolve(arg);
        }
        return Promise.resolve(arg);
      }),
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      creditWallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    creditTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
      dailyUsageLimit: {
        findUnique: jest.fn(),
      },
      modelUsage: {
        aggregate: jest.fn(),
      },
      adEvent: {
        create: jest.fn(),
      },
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: createMockPrisma() },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
    jest.clearAllMocks();
  });

  describe('purchaseCredits', () => {
    const dto = { packageId: 'starter' };

    it('should increment wallet balance and create EARN transaction', async () => {
      const walletId = 'wallet-1';
      prisma.creditWallet.findUnique
        .mockResolvedValueOnce({ id: walletId, balance: 10 })
        .mockResolvedValueOnce({ id: walletId, balance: 60 });

      prisma.creditWallet.update.mockResolvedValue({});
      prisma.creditTransaction.create.mockResolvedValue({});

      const result = await service.purchaseCredits('user-1', dto);

      expect(prisma.creditWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: walletId },
          data: { balance: { increment: 50 } },
        }),
      );
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'EARN',
            amount: 50,
            reason: CreditTransactionReason.PURCHASE,
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(60);
      expect(result.mock).toBe(true);
    });

    it('should include packageId in transaction metadata', async () => {
      prisma.creditWallet.findUnique
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 10 })
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 60 });

      prisma.creditWallet.update.mockResolvedValue({});
      prisma.creditTransaction.create.mockResolvedValue({});

      await service.purchaseCredits('user-1', dto);

      expect(prisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              packageId: 'starter',
              mock: true,
            }),
          }),
        }),
      );
    });

    it('should not grant credits when Stripe boundary is enabled before checkout/idempotency', async () => {
      configService.get.mockImplementation((key: string) => (key === 'STRIPE_ENABLED' ? 'true' : undefined));

      await expect(service.purchaseCredits('user-1', dto))
        .rejects.toThrow(ServiceUnavailableException);

      expect(prisma.creditWallet.findUnique).not.toHaveBeenCalled();
      expect(prisma.creditWallet.update).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown package', async () => {
      await expect(service.purchaseCredits('user-1', { packageId: 'invalid' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      prisma.creditWallet.findUnique.mockResolvedValue(null);

      await expect(service.purchaseCredits('user-1', dto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('spendCredits', () => {
    it('should decrement balance atomically and create SPEND transaction', async () => {
      mockTx.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      mockTx.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      mockTx.creditTransaction.create.mockResolvedValue({});

      const result = await service.spendCredits('user-1', 3, CreditTransactionReason.SCENE_GENERATION);

      expect(result).toBe(true);
      expect(mockTx.creditWallet.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1', balance: { gte: 3 } },
          data: { balance: { decrement: 3 } },
        }),
      );
      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'SPEND',
            amount: -3,
            reason: CreditTransactionReason.SCENE_GENERATION,
            metadata: undefined,
          }),
        }),
      );
    });

    it('should persist metadata in SPEND transaction when provided', async () => {
      mockTx.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      mockTx.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      mockTx.creditTransaction.create.mockResolvedValue({});

      const metadata = { feature: 'SCENE_GENERATION', modelId: 'test-model', sessionId: 'session-1' };

      const result = await service.spendCredits('user-1', 5, CreditTransactionReason.SCENE_GENERATION, metadata);

      expect(result).toBe(true);
      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'SPEND',
            amount: -5,
            reason: CreditTransactionReason.SCENE_GENERATION,
            metadata,
          }),
        }),
      );
    });

    it('should return false when wallet not found', async () => {
      mockTx.creditWallet.findUnique.mockResolvedValue(null);

      const result = await service.spendCredits('user-1', 3, CreditTransactionReason.SCENE_GENERATION);

      expect(result).toBe(false);
      expect(mockTx.creditWallet.updateMany).not.toHaveBeenCalled();
      expect(mockTx.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('should return false when insufficient credits', async () => {
      mockTx.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 2 });
      mockTx.creditWallet.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.spendCredits('user-1', 5, CreditTransactionReason.SCENE_GENERATION);

      expect(result).toBe(false);
      expect(mockTx.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('should return false when amount is zero or negative', async () => {
      const resultZero = await service.spendCredits('user-1', 0, CreditTransactionReason.SCENE_GENERATION);
      expect(resultZero).toBe(false);

      const resultNegative = await service.spendCredits('user-1', -1, CreditTransactionReason.SCENE_GENERATION);
      expect(resultNegative).toBe(false);
    });
  });

  describe('purchase idempotency', () => {
    it('should grant credits on first call with idempotency key', async () => {
      prisma.creditWallet.findUnique
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 0 })  // idempotency check
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 50 }); // post-purchase
      prisma.creditTransaction.findMany.mockResolvedValue([]);
      prisma.creditWallet.update.mockResolvedValue({});
      prisma.creditTransaction.create.mockResolvedValue({ id: 'tx-1', metadata: { idempotencyKey: 'key-1', packageId: 'starter' } });

      const result = await service.purchaseCredits('user-1', { packageId: 'starter', idempotencyKey: 'key-1' });
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(50);
    });

    it('should not grant credits twice with same idempotency key', async () => {
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 50 });
      prisma.creditTransaction.findMany.mockResolvedValue([{
        id: 'tx-1', reason: 'PURCHASE',
        metadata: { idempotencyKey: 'key-1', packageId: 'starter' },
      }]);

      const result = await service.purchaseCredits('user-1', { packageId: 'starter', idempotencyKey: 'key-1' });
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(50);
      expect(prisma.creditWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('getUsageStats', () => {
    beforeEach(() => {
      prisma.modelUsage.aggregate.mockResolvedValue({ _sum: { inputTokens: null, outputTokens: null } });
    });

    it('should return free daily limit when user has no active premium subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ type: SubscriptionType.FREE, status: 'ACTIVE' });
      prisma.dailyUsageLimit.findUnique.mockResolvedValue({ freeInteractionsUsed: 3, limit: 10 });

      const result = await service.getUsageStats('user-1');

      expect(result.dailyLimit).toBe(10);
      expect(result.dailyUsed).toBe(3);
      expect(result.dailyRemaining).toBe(7);
      expect(result.isLimited).toBe(false);
    });

    it('should return unlimited daily usage contract for active premium users', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ type: SubscriptionType.PREMIUM, status: 'ACTIVE' });
      prisma.dailyUsageLimit.findUnique.mockResolvedValue({ freeInteractionsUsed: 10, limit: 10 });

      const result = await service.getUsageStats('user-1');

      expect(result.dailyLimit).toBe(0);
      expect(result.dailyUsed).toBe(10);
      expect(result.dailyRemaining).toBe(0);
      expect(result.isLimited).toBe(false);
    });
  });

  describe('adminGrantCredits', () => {
    it('should grant credits and create an auditable transaction atomically', async () => {
      const updateOperation = { operation: 'wallet-update' };
      const transactionOperation = { operation: 'transaction-create' };

      prisma.creditWallet.findUnique
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 10 })
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 60 });
      prisma.creditWallet.update.mockReturnValue(updateOperation);
      prisma.creditTransaction.create.mockReturnValue(transactionOperation);

      const result = await service.adminGrantCredits('admin-1', 'user-1', { amount: 50, note: 'Bonus de boas-vindas' });

      expect(prisma.creditWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 50 } },
      });
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'EARN',
          amount: 50,
          reason: CreditTransactionReason.PROMO,
          metadata: {
            source: 'ADMIN_GRANT',
            adminUserId: 'admin-1',
            targetUserId: 'user-1',
            note: 'Bonus de boas-vindas',
          },
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([updateOperation, transactionOperation]);
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(60);
    });

    it('should reject non-positive amount', async () => {
      await expect(service.adminGrantCredits('admin-1', 'user-1', { amount: 0, note: 'test' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject missing note', async () => {
      await expect(service.adminGrantCredits('admin-1', 'user-1', { amount: 10, note: 'ab' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject non-integer amount', async () => {
      await expect(service.adminGrantCredits('admin-1', 'user-1', { amount: 10.5, note: 'Valid note' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should trim note before writing metadata', async () => {
      prisma.creditWallet.findUnique
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 10 })
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 15 });
      prisma.creditWallet.update.mockReturnValue({});
      prisma.creditTransaction.create.mockReturnValue({});

      await service.adminGrantCredits('admin-1', 'user-1', { amount: 5, note: '  Beta grant  ' });

      expect(prisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ note: 'Beta grant' }),
          }),
        }),
      );
    });

    it('should reject missing wallet', async () => {
      prisma.creditWallet.findUnique.mockResolvedValue(null);
      await expect(service.adminGrantCredits('admin-1', 'user-1', { amount: 10, note: 'Valid note' }))
        .rejects.toThrow(NotFoundException);
    });
  });
});
