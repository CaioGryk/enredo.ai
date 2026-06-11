import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
  ForbiddenException,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@modules/auth/guards/optional-jwt-auth.guard';
import { StorySetupService } from './story-setup.service';
import { GenerateDto } from './dto/story-setup.dto';
import { Request } from 'express';
import { User } from '@prisma/client';
import { Response } from 'express';

@ApiTags('story-setup')
@Controller('story-setup')
export class StorySetupController {
  constructor(
    private readonly storySetupService: StorySetupService,
    private readonly configService: ConfigService,
  ) {}

  @Get('stories/:storyId/premises')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get premises for a story (cached only)' })
  @ApiResponse({ status: 200, description: 'Returns cached premises only' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPremises(
    @Param('storyId') storyId: string,
    @Req() req: Request & { user?: User },
  ) {
    const userId = req.user?.id;
    const premises = await this.storySetupService.getCachedPremises(storyId, userId);
    if (premises.length === 0) {
      throw new NotFoundException('No premises found. Use POST to generate.');
    }
    return premises;
  }

  @Get('premises/:premiseId/characters')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get playable characters for a premise (cached only)' })
  @ApiResponse({ status: 200, description: 'Returns cached characters only' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getCharacters(
    @Param('premiseId') premiseId: string,
    @Req() req: Request & { user?: User },
  ) {
    const userId = req.user?.id;
    const characters = await this.storySetupService.getCachedCharacters(premiseId, userId);
    if (characters.length === 0) {
      throw new NotFoundException('No characters found. Use POST to generate.');
    }
    return characters;
  }

  @Get('premises/:premiseId/cover')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Header('Cache-Control', 'private, max-age=86400')
  @ApiOperation({ summary: 'Get a generated premise cover image' })
  @ApiResponse({ status: 200, description: 'Premise cover image' })
  @ApiResponse({ status: 404, description: 'Premise cover not found' })
  async getPremiseCover(
    @Param('premiseId') premiseId: string,
    @Req() req: Request & { user?: User },
    @Res() res: Response,
  ) {
    const image = await this.storySetupService.getPremiseCoverImage(premiseId, req.user?.id);
    res.type(image.contentType);
    res.send(image.buffer);
  }

  @Get('characters/:characterId/image')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Header('Cache-Control', 'private, max-age=86400')
  @ApiOperation({ summary: 'Get a generated playable character image' })
  @ApiResponse({ status: 200, description: 'Playable character image' })
  @ApiResponse({ status: 404, description: 'Playable character image not found' })
  async getCharacterImage(
    @Param('characterId') characterId: string,
    @Req() req: Request & { user?: User },
    @Res() res: Response,
  ) {
    const image = await this.storySetupService.getCharacterImage(characterId, req.user?.id);
    res.type(image.contentType);
    res.send(image.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('stories/:storyId/premises/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate premises for a story (creator or admin/dev)' })
  @ApiResponse({ status: 201, description: 'Premises generated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @HttpCode(HttpStatus.CREATED)
  async generatePremises(
    @Req() req: Request & { user?: User },
    @Param('storyId') storyId: string,
    @Body() dto: GenerateDto,
  ) {
    this.checkDevOrAdminAccess(req.user, storyId);
    const userId = req.user?.id;
    return this.storySetupService.generatePremises(storyId, userId, dto.force || false);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('premises/:premiseId/characters/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate playable characters for a premise (creator or admin/dev)' })
  @ApiResponse({ status: 201, description: 'Characters generated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @HttpCode(HttpStatus.CREATED)
  async generateCharacters(
    @Req() req: Request & { user?: User },
    @Param('premiseId') premiseId: string,
    @Body() dto: GenerateDto,
  ) {
    this.checkDevOrAdminAccess(req.user, undefined, premiseId);
    const userId = req.user?.id;
    return this.storySetupService.generateCharacters(premiseId, userId, dto.force || false);
  }

  private checkDevOrAdminAccess(user?: User, storyId?: string, premiseId?: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const generationEnabled = this.configService.get('STORY_SETUP_GENERATION_ENABLED') === 'true';

    if (isProduction && !generationEnabled) {
      throw new ForbiddenException('Generation endpoints are disabled in production. Set STORY_SETUP_GENERATION_ENABLED=true to enable.');
    }

    if (!user) {
      throw new ForbiddenException('Authentication required for generation endpoints');
    }

    // Check admin email allowlist from env (comma-separated)
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS');
    if (adminEmails) {
      const allowedEmails = adminEmails.split(',').map(e => e.trim().toLowerCase());
      if (allowedEmails.includes(user.email.toLowerCase())) {
        return; // Admin access granted
      }
      // Not in admin list - check if user is creator of the story
    } else if (isProduction) {
      throw new ForbiddenException('Admin access required. Configure ADMIN_EMAILS environment variable.');
    }

    // For non-admin users, check if they are the creator of the story
    // This allows story creators to generate premises/characters for their own stories
    if (storyId) {
      // Will be checked in the service layer via assertCanAccessStory
      return;
    }

    if (premiseId) {
      // Will be checked in the service layer via generateCharacters
      return;
    }

    // In non-production without ADMIN_EMAILS set, allow any authenticated user
  }
}
