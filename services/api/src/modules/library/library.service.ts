import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import {
  CharacterResponseDto,
  GetStoriesDto,
  StoryResponseDto,
  StoryWithCharactersDto,
  StoryListResponseDto,
} from './dto/library.dto';
import { paginate } from '@common/utils/pagination';
import { safeImageUrl } from '@common/safe-image-url';
import { Prisma, StoryVisibility, StoryModerationStatus } from '@prisma/client';

const SAFE_STORY_SELECT = {
  id: true,
  slug: true,
  title: true,
  synopsis: true,
  coverUrl: true,
  genres: true,
  authorName: true,
  isPremium: true,
  totalChapters: true,
  publishedAt: true,
  language: true,
  maturityRating: true,
} as const;

const SAFE_CHARACTER_SELECT = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  role: true,
} as const;

interface SafeStoryRow {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  coverUrl: string | null;
  genres: string[];
  authorName: string | null;
  isPremium: boolean;
  totalChapters: number;
  publishedAt: Date | null;
  language: string | null;
  maturityRating: string | null;
}

function mapToStoryDto(row: SafeStoryRow, premiseCoverUrl?: string | null): StoryResponseDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    coverUrl: safeImageUrl(row.coverUrl) ?? safeImageUrl(premiseCoverUrl) ?? undefined,
    genres: row.genres,
    authorName: row.authorName ?? undefined,
    isPremium: row.isPremium,
    totalChapters: row.totalChapters,
    publishedAt: row.publishedAt ?? undefined,
    language: row.language ?? undefined,
    maturityRating: row.maturityRating ?? undefined,
  };
}

function mapToCharacterDto(character: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: string;
}): CharacterResponseDto {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    description: character.description ?? undefined,
    imageUrl: safeImageUrl(character.imageUrl) ?? undefined,
  };
}

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStories(query: GetStoriesDto): Promise<StoryListResponseDto> {
    const { page = 1, limit = 20, genre, author, search, isPremium } = query;

    const where: Prisma.StoryWhereInput = {
      isBetaVisible: true,
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
        select: {
          ...SAFE_STORY_SELECT,
          premises: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { coverUrl: true },
          },
        },
      }),
      this.prisma.story.count({ where }),
    ]);

    const safeStories = stories.map((row: any) =>
      mapToStoryDto(row, row.premises?.[0]?.coverUrl),
    );

    const result = paginate(safeStories, total, { page, limit });

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
      select: {
        ...SAFE_STORY_SELECT,
        visibility: true,
        moderationStatus: true,
        creatorUserId: true,
        characters: {
          select: SAFE_CHARACTER_SELECT,
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story', id);
    }

    const isPublicAndApproved =
      story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (!userId || story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    return {
      ...mapToStoryDto(story),
      characters: story.characters.map(mapToCharacterDto),
    };
  }

  async getStoryCharacters(storyId: string, userId?: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, title: true, visibility: true, moderationStatus: true, creatorUserId: true },
    });

    if (!story) {
      throw new NotFoundException('Story', storyId);
    }

    const isPublicAndApproved =
      story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (!userId || story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    const characters = await this.prisma.storyCharacter.findMany({
      where: { storyId },
      orderBy: { role: 'asc' },
      select: SAFE_CHARACTER_SELECT,
    });

    return {
      storyId: story.id,
      storyTitle: story.title,
      characters: characters.map(mapToCharacterDto),
    };
  }

  async getGenres(): Promise<string[]> {
    const stories = await this.prisma.story.findMany({
      where: {
        isBetaVisible: true,
        visibility: StoryVisibility.PUBLIC,
        moderationStatus: StoryModerationStatus.APPROVED,
      },
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
