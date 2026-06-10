import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { BillingService } from '../../billing/billing.service';
import { AdminGrantCreditsDto } from '../../billing/dto/billing.dto';

@ApiTags('admin-billing')
@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('users/:userId/credits/grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant credits to a user (admin only)' })
  @ApiResponse({ status: 200, description: 'Credits granted' })
  @ApiResponse({ status: 400, description: 'Invalid amount or note' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  @ApiResponse({ status: 404, description: 'Target user wallet not found' })
  async grantCredits(
    @CurrentUser('id') adminUserId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: AdminGrantCreditsDto,
  ) {
    return this.billingService.adminGrantCredits(adminUserId, targetUserId, dto);
  }
}
