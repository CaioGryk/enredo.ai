import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
  GetUserSubscriptionDto,
  CreditWalletDto,
  PurchaseCreditsDto,
  UpgradeSubscriptionDto,
  UserUsageDto,
  SubscriptionStatusDto,
} from './dto/billing.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription details', type: GetUserSubscriptionDto })
  async getSubscription(@CurrentUser('id') userId: string): Promise<GetUserSubscriptionDto> {
    return this.billingService.getSubscription(userId);
  }

  @Get('subscription/details')
  @ApiOperation({ summary: 'Get detailed subscription with benefits' })
  @ApiResponse({ status: 200, description: 'Subscription details', type: SubscriptionStatusDto })
  async getSubscriptionDetails(@CurrentUser('id') userId: string): Promise<SubscriptionStatusDto> {
    return this.billingService.getSubscriptionDetails(userId);
  }

  @Post('subscription/upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade to Premium subscription (mock)' })
  @ApiResponse({ status: 200, description: 'Upgrade successful' })
  async upgradeToPremium(
    @CurrentUser('id') userId: string,
    @Body() _dto: UpgradeSubscriptionDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.billingService.upgradeToPremium(userId);
  }

  @Post('subscription/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel Premium subscription' })
  @ApiResponse({ status: 200, description: 'Cancellation successful' })
  async cancelSubscription(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.billingService.cancelSubscription(userId);
  }

  @Get('credits')
  @ApiOperation({ summary: 'Get credit wallet balance and recent transactions' })
  @ApiResponse({ status: 200, description: 'Credit wallet', type: CreditWalletDto })
  async getCreditWallet(@CurrentUser('id') userId: string): Promise<CreditWalletDto> {
    return this.billingService.getCreditWallet(userId);
  }

  @Get('credits/packages')
  @ApiOperation({ summary: 'Get available credit packages' })
  @ApiResponse({ status: 200, description: 'Credit packages' })
  async getCreditPackages() {
    return this.billingService.getCreditPackages();
  }

  @Post('credits/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase credits (mock payment)' })
  @ApiResponse({ status: 200, description: 'Purchase successful' })
  async purchaseCredits(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseCreditsDto,
  ): Promise<{ success: boolean; newBalance: number }> {
    return this.billingService.purchaseCredits(userId, dto);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get user usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics', type: UserUsageDto })
  async getUsageStats(@CurrentUser('id') userId: string): Promise<UserUsageDto> {
    return this.billingService.getUsageStats(userId);
  }
}