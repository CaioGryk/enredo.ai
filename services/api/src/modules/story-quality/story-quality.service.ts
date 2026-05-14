import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { StoryOrigin, StoryVisibility, StoryModerationStatus, Story } from '@prisma/client';

@Injectable()
export class StoryQualityService {
  private readonly logger = new Logger(StoryQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate story quality for USER_GENERATED stories.
   * ADMIN stories and PUBLIC+APPROVED stories bypass validation.
   * Throws BadRequestException if validation fails.
   */
  async validateStoryQuality(storyId: string): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        origin: true,
        visibility: true,
        moderationStatus: true,
        title: true,
        synopsis: true,
        genres: true,
        openingScene: true,
        tone: true,
        styleGuide: true,
        worldRules: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story', storyId);
    }

    // Bypass validation for ADMIN or PUBLIC+APPROVED stories
    if (story.origin === StoryOrigin.ADMIN ||
        (story.visibility === StoryVisibility.PUBLIC && 
         story.moderationStatus === StoryModerationStatus.APPROVED)) {
      return; // Skip validation
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Blocking validation
    if (!story.title || story.title.length < 5) {
      issues.push('title must be at least 5 characters');
    }

    if (!story.synopsis || story.synopsis.length < 20) {
      issues.push('synopsis must be at least 20 characters');
    }

    if (!story.genres || story.genres.length === 0) {
      issues.push('at least one genre is required');
    }

    if (!story.openingScene || story.openingScene.length < 30) {
      issues.push('openingScene must be at least 30 characters');
    }

    // Non-blocking warnings
    if (!story.tone) {
      warnings.push('tone is recommended for better AI generation');
    }

    if (!story.styleGuide) {
      warnings.push('styleGuide is recommended for consistent writing');
    }

    if (!story.worldRules) {
      warnings.push('worldRules are recommended for story consistency');
    }

    // Log warnings
    if (warnings.length > 0) {
      this.logger.warn(`Story ${storyId} quality warnings: ${warnings.join('; ')}`);
    }

    // Throw if blocking issues exist
    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Story does not meet minimum quality requirements',
        issues,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }
  }
}
