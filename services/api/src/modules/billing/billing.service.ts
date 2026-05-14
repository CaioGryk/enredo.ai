import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma.service';
import {
  GetUserSubscriptionDto,
  CreditWalletDto,
  CreditTransactionDto,
  PurchaseCreditsDto,
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
      '10 interações gratuitas por dia',
      'Acesso à biblioteca pública',
      'Modelo básico (GPT-4o-mini)',
      'Respostas curtas',
    ];

    const premiumBenefits = [
      'Interações ilimitadas',
      'Acesso à biblioteca completa',
      'Modelo premium (GPT-4o)',
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

  async purchaseCredits(userId: string, dto: PurchaseCreditsDto): Promise<{ success: boolean; newBalance: number }> {
    const pkg = CREDIT_PACKAGES.find((p: any) => p.id === dto.packageId);

    if (!pkg) {
      throw new NotFoundException('Credit package not found');
    }

    const wallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.prisma.$transaction([
      this.prisma.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: pkg.credits } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARN',
          amount: pkg.credits,
          reason: CreditTransactionReason.PURCHASE,
          metadata: { packageId: dto.packageId, price: pkg.price },
        },
      }),
    ]);

    const updatedWallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
    });

    return {
      success: true,
      newBalance: updatedWallet?.balance || 0,
    };
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

    return {
      dailyLimit: dailyLimit?.limit || 10,
      dailyUsed: dailyLimit?.freeInteractionsUsed || 0,
      dailyRemaining: (dailyLimit?.limit || 10) - (dailyLimit?.freeInteractionsUsed || 0),
      isLimited: (dailyLimit?.freeInteractionsUsed || 0) >= (dailyLimit?.limit || 10),
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
}