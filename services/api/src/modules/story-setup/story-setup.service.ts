import { Injectable, NotFoundException, HttpException, HttpStatus, Logger, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { AiService } from '@modules/ai/ai.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { isInlineImageDataUrl, parseInlineImageDataUrl, safeImageUrl } from '@common/safe-image-url';
import { ImageOptimizationService } from '@common/image-optimization.service';
import { PublicMediaStorageService } from '@common/public-media-storage.service';
import { SubscriptionType, NarrativeFunction, ReadingSessionStatus, StoryVisibility, StoryModerationStatus } from '@prisma/client';
import {
  PremiseResponseDto,
  CharacterResponseDto,
  ProceduralVisualDto,
} from './dto/story-setup.dto';

@Injectable()
export class StorySetupService {
  private readonly logger = new Logger(StorySetupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly storyQualityService: StoryQualityService,
    @Optional()
    private readonly imageOptimization: ImageOptimizationService = new ImageOptimizationService(),
    @Optional()
    private readonly publicMediaStorage?: PublicMediaStorageService,
  ) {}

  async getCachedPremises(storyId: string, userId?: string): Promise<PremiseResponseDto[]> {
    await this.assertCanAccessStory(storyId, userId);

    const premises = await this.prisma.storyPremise.findMany({
      where: { storyId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { characters: true } } },
    });

    this.backfillPremiseCovers(premises);

    return premises.map(p => this.mapPremiseToDto(p));
  }

  async getPremises(storyId: string, userId?: string) {
    return this.getCachedPremises(storyId, userId);
  }

  async generatePremises(storyId: string, userId?: string, force: boolean = false): Promise<PremiseResponseDto[]> {
    await this.assertCanAccessStory(storyId, userId);

    // Validate story quality before AI generation
    await this.storyQualityService.validateStoryQuality(storyId);

    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story', storyId);
    }

    if (!force) {
      const existing = await this.prisma.storyPremise.findMany({
        where: { storyId },
        include: { _count: { select: { characters: true } } },
      });
      if (existing.length > 0) {
        return existing.map(p => this.mapPremiseToDto(p));
      }
    }

    const generated = await this.aiService.generatePremises({
      storyTitle: story.title,
      storySynopsis: story.synopsis,
      genre: story.genres[0] || 'ficção',
      count: 3,
    });

    const premises = await this.prisma.$transaction(async (tx) => {
      if (force) {
        await tx.storyPlayableCharacter.deleteMany({
          where: { premise: { storyId } },
        });
        await tx.storyPremise.deleteMany({
          where: { storyId },
        });
      }

      const created = [];
      for (let i = 0; i < generated.length; i++) {
        const g = generated[i];
        const premise = await tx.storyPremise.create({
          data: {
            storyId,
            title: g.title,
            synopsis: g.synopsis,
            basePrompt: g.basePrompt,
            openingScene: g.openingScene,
            tone: g.tone,
            styleGuide: g.styleGuide,
            worldRules: g.worldRules,
            coverPrompt: g.coverPrompt,
            coverGenerationStatus: 'PENDING' as any,
            sortOrder: i,
            isAiGenerated: true,
          },
        });
        created.push(premise);
      }
      return created;
    });

    // Generate cover images if enabled (non-blocking)
    if (this.imageGenerationService.isEnabled()) {
      for (const premise of premises) {
        try {
          const imageResult = await this.imageGenerationService.generatePremiseCover(
            premise.title,
            premise.synopsis,
            premise.coverPrompt || undefined,
          );

          const generatedCoverUrl = await this.persistPublicCatalogImage(
            story,
            this.resolveGeneratedImageUrl(imageResult),
            `premises/${premise.id}/cover-720.webp`,
          );

          if (imageResult.success && generatedCoverUrl) {
            await this.prisma.storyPremise.update({
              where: { id: premise.id },
              data: {
                coverUrl: generatedCoverUrl,
                coverGenerationStatus: 'SUCCESS' as any,
                coverError: null,
              },
            });
          } else {
            await this.prisma.storyPremise.update({
              where: { id: premise.id },
              data: {
                coverGenerationStatus: 'FAILED' as any,
                coverError: imageResult.error || 'Image generation failed',
              },
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to generate cover for premise ${premise.id}: ${error.message}`);
          await this.prisma.storyPremise.update({
            where: { id: premise.id },
            data: {
              coverGenerationStatus: 'FAILED' as any,
              coverError: error.message,
            },
          }).catch(err => {
            this.logger.error(`Failed to update premise ${premise.id} status: ${err.message}`);
          });
        }
      }
    } else {
      // Mark as not requested if image generation is disabled
      for (const premise of premises) {
        await this.prisma.storyPremise.update({
          where: { id: premise.id },
          data: {
            coverGenerationStatus: 'NOT_REQUESTED' as any,
          },
        }).catch(err => {
          this.logger.error(`Failed to update premise ${premise.id} status: ${err.message}`);
        });
      }
    }

    // Return fresh data from DB to include updated image status/URLs
    const freshPremises = await this.prisma.storyPremise.findMany({
      where: { id: { in: premises.map(p => p.id) } },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { characters: true } } },
    });

    return freshPremises.map(p => this.mapPremiseToDto(p));
  }

  async getCachedCharacters(premiseId: string, userId?: string): Promise<CharacterResponseDto[]> {
    const premise = await this.prisma.storyPremise.findUnique({
      where: { id: premiseId },
      include: { story: true },
    });

    if (!premise) {
      throw new NotFoundException('StoryPremise', premiseId);
    }

    await this.assertCanAccessStory(premise.storyId, userId);

    const characters = await this.prisma.storyPlayableCharacter.findMany({
      where: { premiseId },
      orderBy: { sortOrder: 'asc' },
      include: { premise: { include: { story: true } } },
    });

    this.backfillCharacterPortraits(characters);

    return characters.map(c => this.mapCharacterToDto(c));
  }

  async getCharacters(premiseId: string, userId?: string) {
    return this.getCachedCharacters(premiseId, userId);
  }

  async getPremiseCoverImage(
    premiseId: string,
    userId?: string,
    width?: string,
  ): Promise<{ contentType: string; buffer: Buffer }> {
    const premise = await this.prisma.storyPremise.findUnique({
      where: { id: premiseId },
      select: { id: true, storyId: true, coverUrl: true },
    });

    if (!premise) {
      throw new NotFoundException('StoryPremise', premiseId);
    }

    await this.assertCanAccessStory(premise.storyId, userId);

    const image = premise.coverUrl ? parseInlineImageDataUrl(premise.coverUrl) : null;
    if (!image) {
      throw new NotFoundException('StoryPremise cover', premiseId);
    }

    return this.imageOptimization.resizeToWebp(image, `premise:${premiseId}`, width);
  }

  async getCharacterImage(
    characterId: string,
    userId?: string,
    width?: string,
  ): Promise<{ contentType: string; buffer: Buffer }> {
    const character = await this.prisma.storyPlayableCharacter.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        imageUrl: true,
        premise: { select: { storyId: true } },
      },
    });

    if (!character) {
      throw new NotFoundException('StoryPlayableCharacter', characterId);
    }

    if (!character.premise?.storyId) {
      throw new NotFoundException('StoryPlayableCharacter premise', characterId);
    }

    await this.assertCanAccessStory(character.premise.storyId, userId);

    const image = character.imageUrl ? parseInlineImageDataUrl(character.imageUrl) : null;
    if (!image) {
      throw new NotFoundException('StoryPlayableCharacter image', characterId);
    }

    return this.imageOptimization.resizeToWebp(image, `character:${characterId}`, width);
  }

  async generateCharacters(premiseId: string, userId?: string, force: boolean = false): Promise<CharacterResponseDto[]> {
    const premise = await this.prisma.storyPremise.findUnique({
      where: { id: premiseId },
      include: { story: true },
    });

    if (!premise) {
      throw new NotFoundException('StoryPremise', premiseId);
    }

    // Check access to parent story - only creator or public+approved stories allowed
    const story = premise.story;
    const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (!userId || story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    // Validate story quality before AI generation
    await this.storyQualityService.validateStoryQuality(story.id);

    if (!force) {
      const existing = await this.prisma.storyPlayableCharacter.findMany({
        where: { premiseId },
        include: { premise: { include: { story: true } } },
      });
      if (existing.length > 0) {
        return existing.map(c => this.mapCharacterToDto(c));
      }
    }

    const generated = await this.aiService.generatePlayableCharacters({
      storyTitle: premise.story.title,
      storySynopsis: premise.story.synopsis,
      premiseTitle: premise.title,
      premiseSynopsis: premise.synopsis,
      premiseBasePrompt: premise.basePrompt,
      premiseTone: premise.tone,
      premiseWorldRules: premise.worldRules,
      count: 3,
    });

    const characters = await this.prisma.$transaction(async (tx) => {
      if (force) {
        await tx.storyPlayableCharacter.deleteMany({
          where: { premiseId },
        });
      }

      const created = [];
      for (let i = 0; i < generated.length; i++) {
        const g = generated[i];
        const character = await tx.storyPlayableCharacter.create({
          data: {
            premiseId,
            name: g.name,
            roleLabel: g.roleLabel,
            narrativeFunction: g.narrativeFunction as NarrativeFunction,
            description: g.description,
            personality: g.personality,
            motivation: g.motivation,
            secret: g.secret,
            relationshipToPlayer: g.relationshipToPlayer,
            initialGoal: g.initialGoal,
            startingSituation: g.startingSituation,
            conflictPotential: g.conflictPotential,
            visualPrompt: g.visualPrompt,
            imageGenerationStatus: 'PENDING' as any,
            sortOrder: i,
            isAiGenerated: true,
          },
        });
        created.push(character);
      }

      // Re-fetch with premise.story included for DTO mapping
      const freshCharacters = await tx.storyPlayableCharacter.findMany({
        where: { premiseId },
        orderBy: { sortOrder: 'asc' },
        include: { premise: { include: { story: true } } },
      });
      return freshCharacters;
    });

    // Generate character portraits if enabled (non-blocking)
    if (this.imageGenerationService.isEnabled()) {
      for (const character of characters) {
        try {
          if (character.visualPrompt) {
            const imageResult = await this.imageGenerationService.generateCharacterPortrait(
              character.name,
              character.description || character.roleLabel,
              character.visualPrompt,
            );

            const generatedImageUrl = await this.persistPublicCatalogImage(
              story,
              this.resolveGeneratedImageUrl(imageResult),
              `characters/playable/${character.id}-720.webp`,
            );

            if (imageResult.success && generatedImageUrl) {
              await this.prisma.storyPlayableCharacter.update({
                where: { id: character.id },
                data: {
                  imageUrl: generatedImageUrl,
                  imageGenerationStatus: 'SUCCESS' as any,
                  imageError: null,
                },
              });
            } else {
              await this.prisma.storyPlayableCharacter.update({
                where: { id: character.id },
                data: {
                  imageGenerationStatus: 'FAILED' as any,
                  imageError: imageResult.error || 'Image generation failed',
                },
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to generate portrait for character ${character.id}: ${error.message}`);
          await this.prisma.storyPlayableCharacter.update({
            where: { id: character.id },
            data: {
              imageGenerationStatus: 'FAILED' as any,
              imageError: error.message,
            },
          }).catch(err => {
            this.logger.error(`Failed to update character ${character.id} status: ${err.message}`);
          });
        }
      }
    } else {
      // Mark as not requested if image generation is disabled
      for (const character of characters) {
        await this.prisma.storyPlayableCharacter.update({
          where: { id: character.id },
          data: {
            imageGenerationStatus: 'NOT_REQUESTED' as any,
          },
        }).catch(err => {
          this.logger.error(`Failed to update character ${character.id} status: ${err.message}`);
        });
      }
    }

    // Return fresh data from DB to include updated image status/URLs
    const freshCharacters = await this.prisma.storyPlayableCharacter.findMany({
      where: { id: { in: characters.map(c => c.id) } },
      orderBy: { sortOrder: 'asc' },
      include: { premise: { include: { story: true } } },
    });

    return freshCharacters.map(c => this.mapCharacterToDto(c));
  }

  async validatePremiseAccess(premiseId: string, userId: string): Promise<void> {
    const premise = await this.prisma.storyPremise.findUnique({
      where: { id: premiseId },
      include: {
        story: {
          include: {
            readingSessions: {
              where: { userId, status: ReadingSessionStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!premise) {
      throw new NotFoundException('StoryPremise', premiseId);
    }

    // Check story access inline (avoid extra DB call)
    const story = premise.story;
    const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (story.creatorUserId !== userId) {
        throw new ForbiddenException('You do not have access to this story');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (premise.isPremium && user?.subscription?.type === SubscriptionType.FREE) {
      throw new HttpException(
        'This premise requires a Premium subscription',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async validateCharacterAccess(characterId: string, userId: string): Promise<void> {
    const character = await this.prisma.storyPlayableCharacter.findUnique({
      where: { id: characterId },
      include: {
        premise: {
          include: {
            story: {
              select: { id: true, visibility: true, moderationStatus: true, creatorUserId: true },
            },
          },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('StoryPlayableCharacter', characterId);
    }

    // Check story access inline via premise -> story
    const story = character.premise?.story;

    if (story) {
      const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
        story.moderationStatus === StoryModerationStatus.APPROVED;

      if (!isPublicAndApproved) {
        if (story.creatorUserId !== userId) {
          throw new ForbiddenException('You do not have access to this story');
        }
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (character.isPremium && user?.subscription?.type === SubscriptionType.FREE) {
      throw new HttpException(
        'This character requires a Premium subscription',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  private async assertCanAccessStory(storyId: string, userId?: string): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, visibility: true, moderationStatus: true, creatorUserId: true },
    });

    if (!story) {
      throw new NotFoundException('Story', storyId);
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
  }

  private mapPremiseToDto(premise: any): PremiseResponseDto {
    return {
      id: premise.id,
      storyId: premise.storyId,
      title: premise.title,
      synopsis: premise.synopsis,
      basePrompt: premise.basePrompt,
      openingScene: premise.openingScene,
      tone: premise.tone,
      styleGuide: premise.styleGuide,
      worldRules: premise.worldRules,
      coverPrompt: premise.coverPrompt,
      coverUrl: safeImageUrl(premise.coverUrl) ??
        (isInlineImageDataUrl(premise.coverUrl)
          ? `/api/story-setup/premises/${premise.id}/cover`
          : null),
      coverGenerationStatus: premise.coverGenerationStatus || 'NOT_REQUESTED',
      coverError: premise.coverError ?? null,
      coverFallback: this.buildPremiseFallback(premise),
      playableCharacterCount: premise._count?.characters ?? 0,
      sortOrder: premise.sortOrder,
      isPremium: premise.isPremium,
      isAiGenerated: premise.isAiGenerated,
      createdAt: premise.createdAt,
      updatedAt: premise.updatedAt,
    };
  }

  private mapCharacterToDto(character: any): CharacterResponseDto {
    return {
      id: character.id,
      storyId: character.premise?.story?.id ?? null,
      premiseId: character.premiseId,
      name: character.name,
      roleLabel: character.roleLabel,
      narrativeFunction: character.narrativeFunction,
      description: character.description ?? null,
      personality: character.personality,
      motivation: character.motivation,
      secret: character.secret,
      relationshipToPlayer: character.relationshipToPlayer,
      initialGoal: character.initialGoal,
      startingSituation: character.startingSituation ?? null,
      conflictPotential: character.conflictPotential,
      visualPrompt: character.visualPrompt,
      imageUrl: safeImageUrl(character.imageUrl) ??
        (isInlineImageDataUrl(character.imageUrl)
          ? `/api/story-setup/characters/${character.id}/image`
          : null),
      imageGenerationStatus: character.imageGenerationStatus || 'NOT_REQUESTED',
      imageError: character.imageError ?? null,
      imageFallback: this.buildCharacterFallback(character),
      sortOrder: character.sortOrder,
      isPremium: character.isPremium,
      isAiGenerated: character.isAiGenerated,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  }

  private backfillPremiseCovers(premises: any[]): void {
    if (!this.imageGenerationService.isEnabled()) return;

    for (const premise of premises) {
      const needsCover =
        premise.coverPrompt &&
        !premise.coverUrl &&
        premise.coverGenerationStatus === 'NOT_REQUESTED';

      if (!needsCover) continue;

      premise.coverGenerationStatus = 'PENDING';

      this.prisma.storyPremise.update({
        where: { id: premise.id },
        data: { coverGenerationStatus: 'PENDING' },
      }).catch((err: Error) => {
        this.logger.error(`Failed to mark premise ${premise.id} cover as PENDING: ${err.message}`);
      });

      this.imageGenerationService.generatePremiseCover(premise.title, premise.synopsis || '', premise.coverPrompt)
        .then((result) => {
          const generatedCoverUrl = this.resolveGeneratedImageUrl(result);
          if (result.success && generatedCoverUrl) {
            return this.prisma.storyPremise.update({
              where: { id: premise.id },
              data: {
                coverUrl: generatedCoverUrl,
                coverGenerationStatus: 'SUCCESS',
                coverError: null,
              },
            });
          } else {
            return this.prisma.storyPremise.update({
              where: { id: premise.id },
              data: {
                coverGenerationStatus: 'FAILED',
                coverError: (result.error || 'Generation failed').substring(0, 500),
              },
            });
          }
        })
        .catch((err: Error) => {
          const safeError = (err.message || 'Unknown error').substring(0, 500);
          this.logger.error(`Premise cover generation failed for ${premise.id}: ${safeError}`);
          return this.prisma.storyPremise.update({
            where: { id: premise.id },
            data: {
              coverGenerationStatus: 'FAILED',
              coverError: safeError,
            },
          });
        });
    }
  }

  private backfillCharacterPortraits(characters: any[]): void {
    if (!this.imageGenerationService.isEnabled()) return;

    for (const character of characters) {
      const needsPortrait =
        character.visualPrompt &&
        !character.imageUrl &&
        character.imageGenerationStatus === 'NOT_REQUESTED';

      if (!needsPortrait) continue;

      character.imageGenerationStatus = 'PENDING';

      this.prisma.storyPlayableCharacter.update({
        where: { id: character.id },
        data: { imageGenerationStatus: 'PENDING' },
      }).catch((err: Error) => {
        this.logger.error(`Failed to mark character ${character.id} as PENDING: ${err.message}`);
      });

      const portraitPrompt =
        `Editorial character portrait of ${character.name}: ${character.visualPrompt}. ${character.narrativeFunction ? `${character.narrativeFunction} archetype.` : ''} Dramatic lighting, cinematic quality, no text, no logos.`;

      this.imageGenerationService.generateCharacterPortrait(character.name, character.visualPrompt, portraitPrompt)
        .then((result) => {
          const generatedImageUrl = this.resolveGeneratedImageUrl(result);

          if (result.success && generatedImageUrl) {
            return this.prisma.storyPlayableCharacter.update({
              where: { id: character.id },
              data: {
                imageUrl: generatedImageUrl,
                imageGenerationStatus: 'SUCCESS',
                imageError: null,
              },
            });
          } else {
            return this.prisma.storyPlayableCharacter.update({
              where: { id: character.id },
              data: {
                imageGenerationStatus: 'FAILED',
                imageError: (result.error || 'Generation failed').substring(0, 500),
              },
            });
          }
        })
        .catch((err: Error) => {
          const safeError = (err.message || 'Unknown error').substring(0, 500);
          this.logger.error(`Portrait generation failed for character ${character.id}: ${safeError}`);
          return this.prisma.storyPlayableCharacter.update({
            where: { id: character.id },
            data: {
              imageGenerationStatus: 'FAILED',
              imageError: safeError,
            },
          });
        });
    }
  }

  private resolveGeneratedImageUrl(result: { imageUrl?: string | null; base64Image?: string | null }): string | null {
    if (result.imageUrl) return result.imageUrl;
    if (!result.base64Image) return null;

    const mimeType = this.inferImageMimeType(result.base64Image);
    return `data:${mimeType};base64,${result.base64Image}`;
  }

  private async persistPublicCatalogImage(
    story: { isBetaVisible?: boolean; visibility?: StoryVisibility; moderationStatus?: StoryModerationStatus },
    source: string | null,
    objectPath: string,
  ): Promise<string | null> {
    if (!source || !this.publicMediaStorage?.isEnabled()) return source;

    const isPublicCatalog =
      story.isBetaVisible === true &&
      story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;
    if (!isPublicCatalog) return source;

    return await this.publicMediaStorage.persistPublicImage(source, objectPath) ?? source;
  }

  private inferImageMimeType(base64: string): string {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lG')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return 'image/png';
  }

  private buildPremiseFallback(premise: any): ProceduralVisualDto {
    const palette = this.paletteForText([
      premise.title,
      premise.synopsis,
      premise.tone,
      premise.worldRules,
    ].filter(Boolean).join(' '));

    return {
      kind: 'procedural',
      seed: premise.id,
      palette,
      symbol: this.symbolForText(`${premise.title} ${premise.synopsis}`),
      texture: 'paper',
      title: premise.title,
      subtitle: premise.tone || 'interactive story',
    };
  }

  private buildCharacterFallback(character: any): ProceduralVisualDto {
    return {
      kind: 'procedural',
      seed: character.id,
      palette: this.paletteForNarrativeFunction(character.narrativeFunction),
      symbol: this.symbolForNarrativeFunction(character.narrativeFunction),
      texture: 'portrait-grain',
      title: character.name,
      subtitle: character.roleLabel,
    };
  }

  private paletteForText(text: string): string[] {
    const lower = text.toLowerCase();

    if (this.includesAny(lower, ['terror', 'horror', 'gótico', 'gotico', 'sombra', 'medo'])) {
      return ['#0D0D0D', '#C8AD7F', '#4A1F2B'];
    }
    if (this.includesAny(lower, ['romance', 'amor', 'paixão', 'paixao'])) {
      return ['#1A1014', '#D7B98E', '#7A2E42'];
    }
    if (this.includesAny(lower, ['ficção', 'ficcao', 'sci-fi', 'cyber', 'neon', 'futuro'])) {
      return ['#071417', '#8AD7D1', '#3D4C8D'];
    }
    if (this.includesAny(lower, ['fantasia', 'magia', 'reino', 'dragão', 'dragao'])) {
      return ['#10120E', '#D0B36A', '#34583C'];
    }
    if (this.includesAny(lower, ['hot', 'sedução', 'seducao', 'desejo'])) {
      return ['#13090A', '#C49A6C', '#8B1E2D'];
    }

    return ['#11100E', '#C8AD7F', '#30343A'];
  }

  private paletteForNarrativeFunction(narrativeFunction: string): string[] {
    const palettes: Record<string, string[]> = {
      HERO: ['#101317', '#D7C08A', '#365C7D'],
      MENTOR: ['#11100E', '#C8AD7F', '#5C5341'],
      ALLY: ['#0F1714', '#BFCB9A', '#3B6B5A'],
      SKEPTIC: ['#161616', '#B8B8B8', '#4B4F56'],
      RIVAL: ['#150F13', '#D0A35E', '#71384B'],
      VILLAIN: ['#0D0A0B', '#B7895B', '#5E1625'],
      TRICKSTER: ['#111016', '#D2A85F', '#563C87'],
      SHADOW: ['#09090A', '#9C8B6E', '#2F3036'],
      HARBINGER: ['#10100C', '#C6B071', '#5A4B2D'],
      GUARDIAN: ['#0D1114', '#C4B17A', '#405260'],
    };

    return palettes[narrativeFunction] || ['#11100E', '#C8AD7F', '#30343A'];
  }

  private symbolForText(text: string): string {
    const lower = text.toLowerCase();

    if (this.includesAny(lower, ['chave', 'porta', 'segredo'])) return 'key';
    if (this.includesAny(lower, ['livro', 'biblioteca', 'manuscrito'])) return 'book';
    if (this.includesAny(lower, ['cidade', 'neon', 'cyber'])) return 'city';
    if (this.includesAny(lower, ['amor', 'carta', 'romance'])) return 'letter';
    if (this.includesAny(lower, ['coroa', 'reino', 'fantasia'])) return 'crown';
    if (this.includesAny(lower, ['sombra', 'terror', 'horror'])) return 'eye';

    return 'spark';
  }

  private symbolForNarrativeFunction(narrativeFunction: string): string {
    const symbols: Record<string, string> = {
      HERO: 'compass',
      MENTOR: 'lamp',
      ALLY: 'hand',
      SKEPTIC: 'scale',
      RIVAL: 'crossed-lines',
      VILLAIN: 'mask',
      TRICKSTER: 'cards',
      SHADOW: 'moon',
      HARBINGER: 'bell',
      GUARDIAN: 'shield',
    };

    return symbols[narrativeFunction] || 'person';
  }

  private includesAny(text: string, needles: string[]): boolean {
    return needles.some(needle => text.includes(needle));
  }
}
