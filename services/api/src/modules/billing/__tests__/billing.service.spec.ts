import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../billing.service';
import { PrismaService } from '@common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreditTransactionReason } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let mockTx: any;

  const createMockPrisma = () => {
    mockTx = {
      creditWallet: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      creditTransaction: {
        create: jest.fn(),
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
            }),
          }),
        }),
      );
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
});
