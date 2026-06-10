import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetUserSubscriptionDto {
  hasActiveSubscription: boolean;
  type: 'FREE' | 'PREMIUM';
  status: string;
  currentPeriodEnd?: Date;
}

export class CreditWalletDto {
  balance: number;
  recentTransactions: CreditTransactionDto[];
}

export class CreditTransactionDto {
  id: string;
  type: 'EARN' | 'SPEND' | 'REFUND' | 'EXPIRE';
  amount: number;
  reason: string;
  createdAt: Date;
}

export class PurchaseCreditsDto {
  @ApiProperty({ example: 'starter' })
  @IsString()
  packageId: string;

  @ApiProperty({ required: false, example: 'txn_abc123' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class AdminGrantCreditsDto {
  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Bonus de boas-vindas', minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  note: string;
}

export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 50, price: 9.9 },
  { id: 'popular', name: 'Popular', credits: 150, price: 24.9 },
  { id: 'colecionador', name: 'Colecionador', credits: 500, price: 69.9 },
];

export class UpgradeSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class UserUsageDto {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  isLimited: boolean;
  monthlyUsage: {
    totalInteractions: number;
    totalCostUsd: number;
  };
}

export class SubscriptionStatusDto {
  type: 'FREE' | 'PREMIUM';
  status: string;
  startedAt: Date;
  currentPeriodEnd?: Date;
  benefits: string[];
}
