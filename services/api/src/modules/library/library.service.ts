import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { GetStoriesDto, StoryResponseDto, StoryWithCharactersDto, StoryListResponseDto } from './dto/library.dto';
import { paginate } from '@common/utils/pagination';
import { Prisma, StoryVisibility, StoryModerationStatus } from '@prisma/client';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStories(query: GetStoriesDto): Promise<StoryListResponseDto> {
    const { page = 1, limit = 20, genre, author, search, isPremium } = query;

    const where: Prisma.StoryWhereInput = {
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
    };

    if (genre) {
      where.genres = { has: genre.toLowerCase() };
    }

    if (author) {
      where.authorName = { contains: author, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { synopsis: { contains: search, mode: 'insensitive' } },
      ];
    }

    const isPremiumFilter =
      isPremium === true || isPremium === 'true'
        ? true
        : isPremium === false || isPremium === 'false'
          ? false
          : undefined;

    if (isPremiumFilter !== undefined) {
      where.isPremium = isPremiumFilter;
    }

    const [stories, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.story.count({ where }),
    ]);

    const result = paginate(
      stories as StoryResponseDto[],
      total,
      { page, limit },
    );

    return {
      stories: result.data,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
    };
  }

  async getStoryById(id: string, userId?: string): Promise<StoryWithCharactersDto> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        characters: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story', id);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    // Private or non-approved stories require creator access
    const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (!userId || story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    return story as StoryWithCharactersDto;
  }

  async getStoryCharacters(storyId: string, userId?: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, title: true, visibility: true, moderationStatus: true, creatorUserId: true },
    });

    if (!story) {
      throw new NotFoundException('Story', storyId);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (!userId || story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    const characters = await this.prisma.storyCharacter.findMany({
      where: { storyId },
      orderBy: { role: 'asc' },
    });

    return {
      storyId: story.id,
      storyTitle: story.title,
      characters,
    };
  }

  async getGenres(): Promise<string[]> {
    const stories = await this.prisma.story.findMany({
      select: { genres: true },
      distinct: ['genres'],
    });

    const genresSet = new Set<string>();
    stories.forEach((story: any) => {
      story.genres.forEach((genre: string) => genresSet.add(genre));
    });

    return Array.from(genresSet).sort();
  }
}
