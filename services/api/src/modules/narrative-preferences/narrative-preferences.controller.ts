import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { NarrativePreferencesService } from './narrative-preferences.service';
import {
  UpdateNarrativePreferencesDto,
  NarrativePreferencesResponseDto,
} from './dto/narrative-preferences.dto';

@ApiTags('narrative-preferences')
@Controller('narrative-preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NarrativePreferencesController {
  constructor(private readonly service: NarrativePreferencesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current narrative preferences' })
  @ApiResponse({ status: 200, type: NarrativePreferencesResponseDto })
  async getMyPreferences(@CurrentUser('id') userId: string) {
    return this.service.getPreferences(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update narrative preferences' })
  @ApiResponse({ status: 200, type: NarrativePreferencesResponseDto })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNarrativePreferencesDto,
  ) {
    return this.service.updatePreferences(userId, dto);
  }

  @Get('me/effective-policy')
  @ApiOperation({ summary: 'Get backend-computed effective narrative policy' })
  @ApiResponse({ status: 200, type: NarrativePreferencesResponseDto })
  async getEffectivePolicy(@CurrentUser('id') userId: string) {
    return this.service.getEffectivePolicy(userId);
  }
}
