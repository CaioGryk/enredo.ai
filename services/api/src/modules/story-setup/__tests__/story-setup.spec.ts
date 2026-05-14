import { StorySetupService } from '../story-setup.service';
import { PrismaService } from '@common/prisma.service';
import { AiService } from '@modules/ai/ai.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionType, ReadingSessionStatus, NarrativeFunction } from '@prisma/client';

describe('StorySetupService', () => {
  let storySetupService: StorySetupService;
  let prismaService: any;
  let aiService: any;
  let imageGenerationService: any;
  let storyQualityService: any;
  let configService: any;

  beforeEach(() => {
    prismaService = {
      story: {
        findUnique: jest.fn(),
      },
      storyPremise: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(() => Promise.resolve({}).catch(() => {})),
      },
      storyPlayableCharacter: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(() => Promise.resolve({}).catch(() => {})),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaService)),
    };

    aiService = {
      generatePremises: jest.fn(),
      generatePlayableCharacters: jest.fn(),
      isMockMode: jest.fn().mockReturnValue(true),
    };

    imageGenerationService = {
      isEnabled: jest.fn().mockReturnValue(false),
    };

    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    };

    configService = {
      get: jest.fn(),
    };

    storySetupService = new StorySetupService(
      prismaService,
      aiService,
      imageGenerationService,
      storyQualityService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPremises', () => {
    it('should return cached premises if they exist', async () => {
      const storyId = 'story-1';
      const premises = [
        { id: 'premise-1', storyId, title: 'Premise 1', synopsis: 'Synopsis 1', basePrompt: 'Prompt 1', coverGenerationStatus: 'SUCCESS', coverError: null, sortOrder: 0, isPremium: false, isAiGenerated: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'premise-2', storyId, title: 'Premise 2', synopsis: 'Synopsis 2', basePrompt: 'Prompt 2', coverGenerationStatus: 'SUCCESS', coverError: null, sortOrder: 1, isPremium: false, isAiGenerated: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaService.story.findUnique.mockResolvedValue({ id: storyId, title: 'Test Story', synopsis: 'Test', genres: ['ficção'], visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null });
      prismaService.storyPremise.findMany.mockResolvedValue(premises);

      const result = await storySetupService.getPremises(storyId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Premise 1');
      expect(result[0].coverFallback).toEqual(expect.objectContaining({
        kind: 'procedural',
        seed: 'premise-1',
        palette: expect.any(Array),
        symbol: expect.any(String),
      }));
      expect(prismaService.storyPremise.findMany).toHaveBeenCalled();
    });

    it('should return an empty list if no cached premises exist', async () => {
      const storyId = 'story-1';

      prismaService.story.findUnique.mockResolvedValue({ id: storyId, title: 'Test Story', synopsis: 'Test', genres: ['ficção'], visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null });
      prismaService.storyPremise.findMany.mockResolvedValue([]);
      const result = await storySetupService.getPremises(storyId);

      expect(result).toHaveLength(0);
      expect(aiService.generatePremises).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if story does not exist', async () => {
      prismaService.story.findUnique.mockResolvedValue(null);

      await expect(storySetupService.getPremises('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCharacters', () => {
    it('should return cached characters if they exist', async () => {
      const premiseId = 'premise-1';
      const characters = [
        { id: 'char-1', premiseId, name: 'Character 1', roleLabel: 'Hero', narrativeFunction: 'HERO' as NarrativeFunction, imageGenerationStatus: 'SUCCESS', imageError: null, sortOrder: 0, isPremium: false, isAiGenerated: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'char-2', premiseId, name: 'Character 2', roleLabel: 'Villain', narrativeFunction: 'VILLAIN' as NarrativeFunction, imageGenerationStatus: 'SUCCESS', imageError: null, sortOrder: 1, isPremium: false, isAiGenerated: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaService.storyPremise.findUnique.mockResolvedValue({ 
        id: premiseId, 
        storyId: 'story-1',
      });
      prismaService.story.findUnique.mockResolvedValue({ 
        id: 'story-1', 
        visibility: 'PUBLIC', 
        moderationStatus: 'APPROVED', 
        creatorUserId: null 
      });
      prismaService.storyPlayableCharacter.findMany.mockResolvedValue(characters);

      const result = await storySetupService.getCharacters(premiseId, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Character 1');
      expect(result[0].imageFallback).toEqual(expect.objectContaining({
        kind: 'procedural',
        seed: 'char-1',
        palette: expect.any(Array),
        symbol: expect.any(String),
      }));
    });

    it('should return an empty list if no cached characters exist', async () => {
      const premiseId = 'premise-1';

      prismaService.storyPremise.findUnique.mockResolvedValue({ 
        id: premiseId, 
        storyId: 'story-1',
      });
      prismaService.story.findUnique.mockResolvedValue({ 
        id: 'story-1', 
        visibility: 'PUBLIC', 
        moderationStatus: 'APPROVED', 
        creatorUserId: null 
      });
      prismaService.storyPlayableCharacter.findMany.mockResolvedValue([]);
      const result = await storySetupService.getCharacters(premiseId, 'user-1');

      expect(result).toHaveLength(0);
      expect(aiService.generatePlayableCharacters).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if premise does not exist', async () => {
      prismaService.storyPremise.findUnique.mockResolvedValue(null);

      await expect(storySetupService.getCharacters('invalid-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePremiseAccess', () => {
    it('should throw HttpException if premise is premium and user is free', async () => {
      const premiseId = 'premise-premium';
      const userId = 'user-free';

      prismaService.storyPremise.findUnique.mockResolvedValue({
        id: premiseId,
        isPremium: true,
        story: { id: 'story-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null, readingSessions: [] },
      });
      prismaService.user.findUnique.mockResolvedValue({
        id: userId,
        subscription: { type: SubscriptionType.FREE },
      });

      await expect(storySetupService.validatePremiseAccess(premiseId, userId)).rejects.toThrow(HttpException);
    });

    it('should not throw if premise is free', async () => {
      const premiseId = 'premise-free';
      const userId = 'user-free';

      prismaService.storyPremise.findUnique.mockResolvedValue({
        id: premiseId,
        isPremium: false,
        story: { id: 'story-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null, readingSessions: [] },
      });
      prismaService.user.findUnique.mockResolvedValue({
        id: userId,
        subscription: { type: SubscriptionType.FREE },
      });

      await expect(storySetupService.validatePremiseAccess(premiseId, userId)).resolves.not.toThrow();
    });
  });

  describe('validateCharacterAccess', () => {
    it('should throw HttpException if character is premium and user is free', async () => {
      const characterId = 'char-premium';
      const userId = 'user-free';

      prismaService.storyPlayableCharacter.findUnique.mockResolvedValue({
        id: characterId,
        isPremium: true,
        premise: {
          isPremium: false,
          story: {
            id: 'story-1',
            visibility: 'PUBLIC',
            moderationStatus: 'APPROVED',
            creatorUserId: null,
          },
        },
      });
      prismaService.story.findUnique.mockResolvedValue({
        id: 'story-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        creatorUserId: null,
      });
      prismaService.user.findUnique.mockResolvedValue({
        id: userId,
        subscription: { type: SubscriptionType.FREE },
      });

      await expect(storySetupService.validateCharacterAccess(characterId, userId)).rejects.toThrow(HttpException);
    });

    it('should not throw if character is free', async () => {
      const characterId = 'char-free';
      const userId = 'user-free';

      prismaService.storyPlayableCharacter.findUnique.mockResolvedValue({
        id: characterId,
        isPremium: false,
        premise: {
          isPremium: false,
          story: {
            id: 'story-1',
            visibility: 'PUBLIC',
            moderationStatus: 'APPROVED',
            creatorUserId: null,
          },
        },
      });
      prismaService.story.findUnique.mockResolvedValue({
        id: 'story-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        creatorUserId: null,
      });
      prismaService.user.findUnique.mockResolvedValue({
        id: userId,
        subscription: { type: SubscriptionType.FREE },
      });

      await expect(storySetupService.validateCharacterAccess(characterId, userId)).resolves.not.toThrow();
    });
  });

  describe('Regression - Character DTO Contract (Step 27)', () => {
    const charactersWithPremiseStory = [
      {
        id: 'char-1',
        premiseId: 'premise-1',
        premise: {
          storyId: 'story-1',
          story: { id: 'story-1' },
        },
      },
      {
        id: 'char-2',
        premiseId: 'premise-2',
        premise: {
          storyId: 'story-2',
          story: { id: 'story-2' },
        },
      },
    ];

    it('getCachedCharacters() should return characters with storyId resolved via premise.story', async () => {
      prismaService.storyPremise.findUnique.mockResolvedValue({
        id: 'premise-1',
        storyId: 'story-1',
        story: { id: 'story-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });
      prismaService.story.findUnique.mockResolvedValue({
        id: 'story-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        creatorUserId: null,
      });
      prismaService.storyPlayableCharacter.findMany.mockResolvedValue(charactersWithPremiseStory);

      const result = await storySetupService.getCachedCharacters('premise-1', 'user-1');

      expect(result[0].storyId).toBe('story-1');
      expect(result[1].storyId).toBe('story-2');
    });

    it('generateCharacters() should return fresh characters with storyId via premise.story', async () => {
      prismaService.storyPremise.findUnique.mockResolvedValue({
        id: 'premise-1',
        storyId: 'story-1',
        story: { id: 'story-1', title: 'Test Story', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });
      prismaService.story.findUnique.mockResolvedValue({
        id: 'story-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        creatorUserId: null,
      });
      prismaService.user.findUnique.mockResolvedValue({
        subscription: { type: 'FREE' },
      });
      // First findMany call: check existing (returns empty = needs generation)
      // Second findMany call: after transaction (line 332), returns characters with premise.story
      prismaService.storyPlayableCharacter.findMany
        .mockResolvedValueOnce([]) // Line 218: check existing
        .mockResolvedValueOnce(charactersWithPremiseStory); // Line 332: after transaction

      // Mock AI generation
      aiService.generatePlayableCharacters.mockResolvedValue([
        { name: 'Char1', premiseId: 'premise-1', roleLabel: 'Hero', narrativeFunction: 'HERO' },
        { name: 'Char2', premiseId: 'premise-2', roleLabel: 'Villain', narrativeFunction: 'VILLAIN' },
      ]);

      // Mock transaction - returns characters with premise.story included
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          storyPlayableCharacter: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue(charactersWithPremiseStory[0]),
            // Re-fetch inside transaction includes premise.story
            findMany: jest.fn().mockResolvedValue(charactersWithPremiseStory),
          },
        };
        return callback(tx);
      });

      const result = await storySetupService.generateCharacters('premise-1', 'user-1');

      // The result should have storyId from premise.story traversal
      result.forEach((char: any) => {
        expect(char.storyId).toBeDefined();
        expect(typeof char.storyId).toBe('string');
      });
    });

    it('should FAIL if service query omits premise.story and mapCharacterToDto receives plain character', () => {
      const plainCharacter = {
        id: 'char-plain',
        premiseId: 'premise-1',
        // NO premise.story included
      };

      const dto = storySetupService['mapCharacterToDto'](plainCharacter);

      // Without premise.story, storyId should be null
      expect(dto.storyId).toBeNull();
    });
  });
});
