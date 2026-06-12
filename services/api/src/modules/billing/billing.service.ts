import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma.service';
import {
  GetUserSubscriptionDto,
  CreditWalletDto,
  CreditTransactionDto,
  PurchaseCreditsDto,
  AdminGrantCreditsDto,
  CREDIT_PACKAGES,
  UserUsageDto,
  SubscriptionStatusDto,
} from './dto/billing.dto';
import { SubscriptionType, CreditTransactionReason } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSubscription(userId: string): Promise<GetUserSubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    return {
      hasActiveSubscription: subscription?.status === 'ACTIVE',
      type: subscription?.type || SubscriptionType.FREE,
      status: subscription?.status || 'ACTIVE',
      currentPeriodEnd: subscription?.currentPeriodEnd || undefined,
    };
  }

  async getSubscriptionDetails(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const type = subscription?.type || SubscriptionType.FREE;

    return {
      type,
      status: subscription?.status || 'ACTIVE',
      startedAt: subscription?.startedAt || new Date(),
      currentPeriodEnd: subscription?.currentPeriodEnd || undefined,
      benefits: this.getBenefits(type),
    };
  }

  private getBenefits(type: SubscriptionType): string[] {
    const freeBenefits = [
      'Interações narrativas ilimitadas',
      'Até 3 histórias ativas',
      'Acesso à biblioteca pública',
      'Modelo de IA gratuito',
      'Respostas curtas',
    ];

    const premiumBenefits = [
      'Interações ilimitadas',
      'Acesso à biblioteca completa',
      'Modelo premium (GPT-4.1 Nano)',
      'Respostas longas e literárias',
      'Sem anúncios',
      'Memória narrativa expandida',
    ];

    return type === SubscriptionType.PREMIUM ? premiumBenefits : freeBenefits;
  }

  async upgradeToPremium(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.type === SubscriptionType.PREMIUM) {
      return { success: true, message: 'Already subscribed to Premium' };
    }

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        type: SubscriptionType.PREMIUM,
        status: 'ACTIVE',
        startedAt: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        type: SubscriptionType.PREMIUM,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'Successfully upgraded to Premium',
    };
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.type === SubscriptionType.FREE) {
      return { success: false, message: 'No active subscription to cancel' };
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  }

  async getCreditWallet(userId: string): Promise<CreditWalletDto> {
    const wallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      const newWallet = await this.prisma.creditWallet.create({
        data: { userId, balance: 0 },
        include: { transactions: { take: 10 } },
      });
      return {
        balance: 0,
        recentTransactions: [],
      };
    }

    return {
      balance: wallet.balance,
      recentTransactions: wallet.transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.createdAt,
      })),
    };
  }

  async getCreditPackages() {
    return CREDIT_PACKAGES;
  }

  async purchaseCredits(userId: string, dto: PurchaseCreditsDto): Promise<{ success: boolean; newBalance: number; mock: boolean }> {
    const pkg = CREDIT_PACKAGES.find((p: any) => p.id === dto.packageId);
    if (!pkg) throw new NotFoundException('Credit package not found');

    const stripeEnabled = this.configService.get<string>('STRIPE_ENABLED') === 'true';
    const isMock = !stripeEnabled;

    if (stripeEnabled) {
      throw new ServiceUnavailableException('Stripe payment flow is not yet available. Purchase idempotency must be implemented first.');
    }

    let wallet = null as { id: string; balance: number } | null;

    // Idempotency: if same key was already used by this wallet, return the existing result.
    // This is a mock/dev guard. Production payment flows must use DB-level uniqueness.
    if (dto.idempotencyKey) {
      wallet = await this.prisma.creditWallet.findUnique({ where: { userId } });
      if (wallet) {
        const purchases = await this.prisma.creditTransaction.findMany({
          where: { walletId: wallet.id, reason: CreditTransactionReason.PURCHASE },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        const existing = purchases.find((purchase: any) => {
          const metadata = purchase?.metadata;
          return metadata
            && typeof metadata === 'object'
            && !Array.isArray(metadata)
            && (metadata as Record<string, unknown>).idempotencyKey === dto.idempotencyKey;
        });

        if (existing) {
          const meta = existing.metadata as Record<string, unknown>;
          if (meta.packageId !== dto.packageId) {
            throw new ConflictException('Idempotency key already used for a different credit package.');
          }
          return { success: true, newBalance: wallet.balance, mock: isMock };
        }
      }
    }

    wallet = wallet ?? await this.prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: pkg.credits } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          walletId: wallet.id, type: 'EARN', amount: pkg.credits,
          reason: CreditTransactionReason.PURCHASE,
          metadata: { packageId: dto.packageId, price: pkg.price, mock: isMock, ...(dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}) },
        },
      }),
    ]);

    const updatedWallet = await this.prisma.creditWallet.findUnique({ where: { userId } });

    return { success: true, newBalance: updatedWallet?.balance || 0, mock: isMock };
  }

  async spendCredits(
    userId: string,
    amount: number,
    reason: CreditTransactionReason,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    if (amount <= 0) return false;

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) return false;

      const { count } = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });

      if (count === 0) return false;

      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'SPEND',
          amount: -amount,
          reason,
          metadata: (metadata ?? undefined) as any,
        },
      });

      return true;
    });

    return result;
  }

  async getUsageStats(userId: string): Promise<UserUsageDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyLimit = await this.prisma.dailyUsageLimit.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthlyUsage = await this.prisma.modelUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
      _sum: { inputTokens: true, outputTokens: true },
    });

    const dailyUsed = dailyLimit?.freeInteractionsUsed || 0;

    return {
      dailyLimit: 0,
      dailyUsed,
      dailyRemaining: 0,
      isLimited: false,
      monthlyUsage: {
        totalInteractions: monthlyUsage._sum.inputTokens ? 1 : 0,
        totalCostUsd: 0,
      },
    };
  }

  async recordAdEvent(userId: string, sessionId: string | null, storyId: string): Promise<void> {
    await this.prisma.adEvent.create({
      data: {
        userId,
        sessionId,
        storyId,
        type: 'INTERSTITIAL',
        provider: 'MOCK',
      },
    });
  }

  async adminGrantCredits(adminUserId: string, targetUserId: string, dto: AdminGrantCreditsDto): Promise<{ success: boolean; newBalance: number }> {
    if (!dto.amount || dto.amount <= 0 || !Number.isInteger(dto.amount)) {
      throw new BadRequestException('Amount must be a positive integer.');
    }
    const note = dto.note?.trim();
    if (!note || note.length < 3) {
      throw new BadRequestException('Note must be at least 3 characters.');
    }
    if (note.length > 200) {
      throw new BadRequestException('Note must be at most 200 characters.');
    }

    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Target user wallet not found');

    await this.prisma.$transaction([
      this.prisma.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: dto.amount } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARN',
          amount: dto.amount,
          reason: CreditTransactionReason.PROMO,
          metadata: { source: 'ADMIN_GRANT', adminUserId, targetUserId, note },
        },
      }),
    ]);

    const updated = await this.prisma.creditWallet.findUnique({ where: { userId: targetUserId } });

    return { success: true, newBalance: updated?.balance || 0 };
  }
}
