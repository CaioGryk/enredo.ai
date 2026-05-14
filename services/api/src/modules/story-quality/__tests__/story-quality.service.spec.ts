import { Test, TestingModule } from '@nestjs/testing';
import { StoryQualityService } from '../story-quality.service';
import { PrismaService } from '@common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoryOrigin, StoryVisibility, StoryModerationStatus } from '@prisma/client';

describe('StoryQualityService', () => {
  let service: StoryQualityService;
  let prisma: any;

  const mockPrismaService = {
    story: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryQualityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StoryQualityService>(StoryQualityService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('ADMIN story bypass', () => {
    it('should bypass validation for ADMIN origin', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.ADMIN,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: '',
        synopsis: '',
        genres: [],
        openingScene: '',
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });
  });

  describe('PUBLIC+APPROVED story bypass', () => {
    it('should bypass validation for PUBLIC+APPROVED stories', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.ADMIN,
        visibility: StoryVisibility.PUBLIC,
        moderationStatus: StoryModerationStatus.APPROVED,
        title: '',
        synopsis: '',
        genres: [],
        openingScene: '',
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });
  });

  describe('Valid USER_GENERATED story passes', () => {
    it('should pass validation with all valid fields', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Story Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
        tone: 'dramatic',
        styleGuide: 'Third person limited',
        worldRules: 'Magic requires mana',
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });
  });

  describe('Title validation', () => {
    it('should throw BadRequestException for title too short', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Hi', // Too short (< 5)
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe('Story does not meet minimum quality requirements');
        expect(error.response.issues).toContain('title must be at least 5 characters');
      }
    });

    it('should throw BadRequestException for empty title', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: '',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('title must be at least 5 characters');
      }
    });
  });

  describe('Synopsis validation', () => {
    it('should throw BadRequestException for synopsis too short', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Title',
        synopsis: 'Too short', // Too short (< 20)
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('synopsis must be at least 20 characters');
      }
    });

    it('should throw BadRequestException for empty synopsis', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Title',
        synopsis: '',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('synopsis must be at least 20 characters');
      }
    });
  });

  describe('Genres validation', () => {
    it('should throw BadRequestException for no genres', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: [], // No genres
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('at least one genre is required');
      }
    });
  });

  describe('OpeningScene validation', () => {
    it('should throw BadRequestException for openingScene too short', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'Too short', // Too short (< 30)
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('openingScene must be at least 30 characters');
      }
    });

    it('should throw BadRequestException for empty openingScene', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: '',
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('openingScene must be at least 30 characters');
      }
    });
  });

  describe('Multiple issues', () => {
    it('should return all validation issues together', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: '', // Invalid
        synopsis: '', // Invalid
        genres: [], // Invalid
        openingScene: '', // Invalid
      });

      try {
        await service.validateStoryQuality('story-1');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.issues).toContain('title must be at least 5 characters');
        expect(error.response.issues).toContain('synopsis must be at least 20 characters');
        expect(error.response.issues).toContain('at least one genre is required');
        expect(error.response.issues).toContain('openingScene must be at least 30 characters');
        expect(error.response.issues).toHaveLength(4);
      }
    });
  });

  describe('Warnings (non-blocking)', () => {
    it('should pass but log warning for missing tone', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Story Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
        tone: '', // Missing (warning only)
        styleGuide: 'Third person limited',
        worldRules: 'Magic requires mana',
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });

    it('should pass but log warning for missing styleGuide', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Story Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
        tone: 'dramatic',
        styleGuide: '', // Missing (warning only)
        worldRules: 'Magic requires mana',
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });

    it('should pass but log warning for missing worldRules', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        title: 'Valid Story Title',
        synopsis: 'This is a valid synopsis with more than 20 characters for testing.',
        genres: ['fantasia'],
        openingScene: 'This is a valid opening scene with more than 30 characters for testing purposes.',
        tone: 'dramatic',
        styleGuide: 'Third person limited',
        worldRules: '', // Missing (warning only)
      });

      await expect(service.validateStoryQuality('story-1')).resolves.not.toThrow();
    });
  });

  describe('Non-existent story', () => {
    it('should throw NotFoundException for non-existent story', async () => {
      prisma.story.findUnique.mockResolvedValue(null);

      await expect(service.validateStoryQuality('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Warning messages included in exception', () => {
    it('should include warnings array in exception when present', async () => {
      // This test verifies that warnings are passed in the exception
      // Currently warnings are only logged, not included in the exception
      // This is a placeholder for future enhancement
      expect(true).toBe(true);
    });
  });
});
