import { Body, Controller, Get, Post, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AiService } from './ai.service';
import { PrismaService } from '@common/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionType } from '@prisma/client';

class TestModelDto {
  @ApiProperty({ required: false, example: 'openrouter/free' })
  @IsOptional()
  @IsString()
  modelId?: string;
}

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('models')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available AI models' })
  @ApiResponse({ status: 200, description: 'List of available models' })
  async getModels(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, creditWallet: true },
    });

    const plan = user?.subscription?.type || SubscriptionType.FREE;
    const walletBalance = user?.creditWallet?.balance || 0;

    const catalog = this.aiService.getCatalog();
    const defaultModelId = this.aiService.getDefaultModelIdForPlan(plan);

    const models = catalog
      .filter(m => m.isActive)
      .map(model => {
        const { available, lockedReason, creditCost } = this.aiService.getModelEntitlement(
          model.id,
          plan,
          walletBalance,
        );

        return {
          id: model.id,
          displayName: model.displayName,
          description: model.description,
          tier: model.tier,
          priceLevel: model.priceLevel,
          costMode: model.costMode,
          maxTokens: model.maxTokens,
          supportsCinematic: model.supportsCinematic || false,
          creditCost: model.tier === 'CREDITS' ? model.creditCost : undefined,
          available,
          lockedReason,
          isDefault: model.id === defaultModelId,
        };
      });

    return {
      models,
      defaultModelId,
      userPlan: plan,
    };
  }

  @Post('test-model')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run a minimal fixed prompt against one configured model' })
  @ApiResponse({ status: 200, description: 'Model test result' })
  async testModel(@Request() req: any, @Body() dto: TestModelDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, creditWallet: true },
    });

    const plan = user?.subscription?.type || SubscriptionType.FREE;
    const walletBalance = user?.creditWallet?.balance || 0;

    return this.aiService.testModel({
      plan,
      walletBalance,
      modelId: dto.modelId,
    });
  }
}
