import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { StoryOrigin, StoryVisibility, StoryModerationStatus, SubscriptionType } from '@prisma/client';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';

@Injectable()
export class StoryLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStories(userId: string): Promise<any[]> {
    return this.prisma.story.findMany({
      where: {
        creatorUserId: userId,
        origin: StoryOrigin.USER_GENERATED,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoryStatus(userId: string, storyId: string): Promise<any> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Only creator can see status of private stories
    if (story.creatorUserId && story.creatorUserId !== userId) {
      throw new ForbiddenException('You do not have access to this story');
    }

    return {
      id: story.id,
      title: story.title,
      origin: story.origin,
      visibility: story.visibility,
      moderationStatus: story.moderationStatus,
      creatorUserId: story.creatorUserId,
      submittedAt: story.submittedAt,
      approvedAt: story.approvedAt,
      rejectedAt: story.rejectedAt,
      moderationReason: story.moderationReason,
    };
  }

  async submitStory(userId: string, storyId: string, note?: string): Promise<any> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Only creator can submit
    if (!story.creatorUserId || story.creatorUserId !== userId) {
      throw new ForbiddenException('Only the creator can submit this story');
    }

    // Only USER_GENERATED stories can be submitted
    if (story.origin !== StoryOrigin.USER_GENERATED) {
      throw new BadRequestException('Only user-generated stories can be submitted');
    }

    // Only PRIVATE stories can be submitted
    if (story.visibility !== StoryVisibility.PRIVATE) {
      throw new BadRequestException('Only private stories can be submitted');
    }

    // Only NOT_SUBMITTED stories can be submitted
    if (story.moderationStatus !== StoryModerationStatus.NOT_SUBMITTED) {
      throw new BadRequestException('Story is already submitted or processed');
    }

      return this.prisma.story.update({
        where: { id: storyId },
        data: {
          moderationStatus: StoryModerationStatus.PENDING,
          submittedAt: new Date(),
          moderationReason: note || null,
        },
      });
  }

  async createStory(userId: string, dto: CreateStoryDto): Promise<any> {
    // 0. Check story creation limits
    await this.checkStoryCreationLimit(userId);

    // 1. Generate unique slug from title
    const slug = await this.generateUniqueSlug(dto.title);

    // 2. Get user's name for authorName
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // 3. Create story with lifecycle defaults
    return this.prisma.story.create({
      data: {
        slug,
        title: dto.title,
        synopsis: dto.synopsis,
        genres: dto.genres,
        openingScene: dto.openingScene || null,
        language: dto.language || 'pt-BR',
        maturityRating: dto.maturityRating || '12+',
        basePrompt: dto.basePrompt || '',
        tone: dto.tone,
        styleGuide: dto.styleGuide,
        worldRules: dto.worldRules,

        // Lifecycle fields
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        creatorUserId: userId,
        authorName: user?.name || 'Usuário',

        isPremium: false,
        totalChapters: 1,
      },
    });
  }

  async updateStory(userId: string, storyId: string, dto: UpdateStoryDto): Promise<any> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Only creator can update
    if (story.creatorUserId !== userId) {
      throw new ForbiddenException('Only the creator can update this story');
    }

    // Only USER_GENERATED stories can be updated
    if (story.origin !== StoryOrigin.USER_GENERATED) {
      throw new BadRequestException('Only user-generated stories can be updated');
    }

    // Only PRIVATE stories can be updated
    if (story.visibility !== StoryVisibility.PRIVATE) {
      throw new BadRequestException('Only private stories can be updated');
    }

    // Only NOT_SUBMITTED stories can be updated
    if (story.moderationStatus !== StoryModerationStatus.NOT_SUBMITTED) {
      throw new BadRequestException('Story has already been submitted');
    }

    // Build update data (only allow specific fields)
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.synopsis !== undefined) updateData.synopsis = dto.synopsis;
    if (dto.genres !== undefined) updateData.genres = dto.genres;
    if (dto.openingScene !== undefined) updateData.openingScene = dto.openingScene;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.maturityRating !== undefined) updateData.maturityRating = dto.maturityRating;
    if (dto.basePrompt !== undefined) updateData.basePrompt = dto.basePrompt;
    if (dto.tone !== undefined) updateData.tone = dto.tone;
    if (dto.styleGuide !== undefined) updateData.styleGuide = dto.styleGuide;
    if (dto.worldRules !== undefined) updateData.worldRules = dto.worldRules;

    return this.prisma.story.update({
      where: { id: storyId },
      data: updateData,
    });
  }

  private async checkStoryCreationLimit(userId: string): Promise<void> {
    // 1. Get user with subscription
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // 2. Count USER_GENERATED stories (no filter on visibility/moderationStatus)
    const storyCount = await this.prisma.story.count({
      where: {
        creatorUserId: userId,
        origin: StoryOrigin.USER_GENERATED,
      },
    });

    // 3. Determine limit based on subscription
    const subscriptionType = user.subscription?.type || SubscriptionType.FREE;
    const limit = subscriptionType === SubscriptionType.PREMIUM ? 10 : 3;

    // 4. Check if limit exceeded
    if (storyCount >= limit) {
      throw new ForbiddenException('Story creation limit reached for your plan');
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    // Slugify: lowercase, remove accents, replace non-alphanumeric with hyphens
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ''); // Trim hyphens

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.story.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }
}
