import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { StoryLifecycleService } from '@modules/story-lifecycle/story-lifecycle.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { AiGenerationContext, AiService } from '@modules/ai/ai.service';
import { StoryGenerationBudgetGuard, StoryGenerationBudgetDecision } from './story-generation-budget.guard';
import { StoryGenerationInputGuard, SafeStoryGenerationInput } from './story-generation-input.guard';
import { StoryGenerationObservabilityService } from './services/story-generation-observability.service';
import { CreateStoryGenerationDto } from './dto/create-story-generation.dto';
import { StoryGenerationResponseDto, GenerationMetadataDto, NextActionsDto } from './dto/story-generation-response.dto';
import { SubscriptionType, UserRole } from '@prisma/client';
import { StoryGenerationUsageStatus } from '@prisma/client';
import { getProviderForModelId } from '@modules/ai/model-catalog';

@Injectable()
export class StoryGenerationService {
  private readonly logger = new Logger(StoryGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storyLifecycleService: StoryLifecycleService,
    private readonly storyQualityService: StoryQualityService,
    private readonly aiService: AiService,
    private readonly budgetGuard: StoryGenerationBudgetGuard,
    private readonly inputGuard: StoryGenerationInputGuard,
    private readonly observabilityService: StoryGenerationObservabilityService,
  ) {}

  async generateStory(userId: string, dto: CreateStoryGenerationDto): Promise<StoryGenerationResponseDto> {
    let usageRecorded = false;
    let modelId = 'unknown';
    let isMock = true;
    let storyId: string | undefined = undefined;
    let provider: string | undefined = undefined;

    try {
      // 0.5. Validate and normalize input (BEFORE budget/generation)
      const safeInput: SafeStoryGenerationInput = this.inputGuard.validate(dto);

      // 1. Get user with subscription for budget decision
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const subscriptionType = user.subscription?.type || SubscriptionType.FREE;

      // 2. Budget decision (model selection)
      const budgetDecision: StoryGenerationBudgetDecision = this.budgetGuard.decide(subscriptionType);
      modelId = budgetDecision.finalModel.id;
      isMock = this.aiService.isMockMode();
      provider = this.getProviderFromModelId(modelId) || undefined;

      if (!budgetDecision.allowed) {
        // Create BLOCKED usage record
        await this.observabilityService.createUsageRecord({
          userId,
          modelId,
          isMock,
          status: StoryGenerationUsageStatus.BLOCKED,
          failureReason: budgetDecision.blockReason || 'Budget limit reached',
          provider,
        });
        usageRecorded = true;
        throw new ForbiddenException(budgetDecision.blockReason || 'Budget limit reached');
      }

      // 3. Generate story draft (AI or mock) using safeInput
      const generationContext: AiGenerationContext = user.role === UserRole.ADMIN ? 'ADMIN_CATALOG' : 'USER_STORY';
      const draft = await this.generateDraft(safeInput, modelId, generationContext);

      // 4. Validate draft in memory BEFORE save
      this.validateDraft(draft);

      // 5. Persist via StoryLifecycleService (enforces creation limits internally)
      const story = await this.storyLifecycleService.createStory(userId, {
        title: draft.title,
        synopsis: draft.synopsis,
        genres: draft.genres,
        openingScene: draft.openingScene,
        basePrompt: draft.basePrompt,
        tone: draft.tone,
        styleGuide: draft.styleGuide,
        worldRules: draft.worldRules,
        language: draft.language,
        maturityRating: draft.maturityRating,
      }, { skipCreationLimit: user.role === UserRole.ADMIN });

      storyId = story.id;

      // 6. Final sanity check after save
      try {
        await this.storyQualityService.validateStoryQuality(story.id);
      } catch (error) {
        // Log but don't fail - story is already created
        this.logger.warn(`StoryQualityService validation failed for story ${story.id}:`, error.message);

        // Create FAILED usage record (quality check failed)
        await this.observabilityService.createUsageRecord({
          userId,
          storyId,
          modelId,
          isMock,
          status: StoryGenerationUsageStatus.FAILED,
          failureReason: `Quality check failed: ${error.message}`,
          provider,
        });
        usageRecorded = true;
        throw error;
      }

       // 7. Create SUCCESS usage record (only after full flow succeeds)
      const usageMeta = await this.observabilityService.createUsageRecord({
        userId,
        storyId,
        modelId,
        isMock,
        status: StoryGenerationUsageStatus.SUCCESS,
        provider,
      });
      usageRecorded = true;

      // 8. Return standardized response DTO
      return this.mapToResponseDto(
        story,
        modelId,
        isMock,
        StoryGenerationUsageStatus.SUCCESS,
        usageMeta,
        budgetDecision.budgetTier,
      );

    } catch (error) {
      // Create usage record if not already recorded
      if (!usageRecorded) {
        let status: StoryGenerationUsageStatus = StoryGenerationUsageStatus.FAILED;
        if (error instanceof ForbiddenException) {
          status = StoryGenerationUsageStatus.BLOCKED;
        }

        const sanitizedMessage = this.extractSanitizedErrorMessage(error);
        await this.observabilityService.createUsageRecord({
          userId,
          storyId,
          modelId,
          isMock,
          status,
          failureReason: sanitizedMessage,
          provider,
        });
        usageRecorded = true;
      }

      throw error;
    }
  }

  private extractSanitizedErrorMessage(error: any): string {
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    return 'Unknown error';
  }

  private async generateDraft(
    safeInput: SafeStoryGenerationInput,
    modelId: string,
    context: AiGenerationContext,
  ): Promise<GeneratedStoryDraft> {
    if (this.aiService.isMockMode()) {
      return this.generateMockDraft(safeInput);
    }

    return this.aiService.generateStoryDraft({
      keywords: safeInput.keywords,
      genre: safeInput.genre,
      tone: safeInput.tone,
      targetAudience: safeInput.targetAudience,
      constraints: safeInput.constraints,
      modelId,
      maxTokens: 1500,
      context,
    });
  }

  private generateMockDraft(safeInput: SafeStoryGenerationInput): GeneratedStoryDraft {
    const keywords = safeInput.keywords.join(', ');
    const genre = safeInput.genre || 'adventure';
    const tone = safeInput.tone;

    return {
      title: `Story: ${keywords}`,
      synopsis: `An engaging story based on ${keywords} with at least 20 characters for validation.`,
      genres: [genre],
      openingScene: `Once upon a time, in a magical world based on ${keywords}, the adventure began with at least 30 characters for validation.`,
      basePrompt: `Story based on: ${keywords}`,
      tone: tone || 'cinematic',
      styleGuide: 'Immersive and descriptive narrative',
      worldRules: `Consistent world based on provided keywords: ${keywords}`,
      language: 'pt-BR',
      maturityRating: '12+',
    };
  }

  private validateDraft(draft: GeneratedStoryDraft): void {
    const issues: string[] = [];

    if (!draft.title || draft.title.length < 5) {
      issues.push('title must be at least 5 characters');
    }

    if (!draft.synopsis || draft.synopsis.length < 20) {
      issues.push('synopsis must be at least 20 characters');
    }

    if (!draft.genres || draft.genres.length < 1) {
      issues.push('at least one genre is required');
    }

    if (!draft.openingScene || draft.openingScene.length < 30) {
      issues.push('opening scene must be at least 30 characters');
    }

    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Generated story draft is invalid',
        issues,
      });
    }
  }

  private mapToResponseDto(
    story: any,
    modelId: string,
    isMock: boolean,
    usageStatus: StoryGenerationUsageStatus,
    usageMeta?: {
      tracked: boolean;
      estimatedCost?: number | null;
      inputTokens?: number | null;
      outputTokens?: number | null;
      totalTokens?: number | null;
    },
    budgetTier?: 'FREE' | 'PREMIUM',
  ): any {
    const generationMetadata: GenerationMetadataDto = {
      mode: isMock ? 'MOCK' : 'AI',
      modelId: modelId || null,
      provider: isMock ? null : this.getProviderFromModelId(modelId),
      budgetTier: budgetTier || 'FREE',
      usageStatus,
      tracked: usageMeta?.tracked ?? false,
      estimatedCost: usageMeta?.estimatedCost,
      inputTokens: usageMeta?.inputTokens,
      outputTokens: usageMeta?.outputTokens,
      totalTokens: usageMeta?.totalTokens,
    };

    const nextActions: NextActionsDto = {
      canEdit: story.visibility === 'PRIVATE' && story.moderationStatus === 'NOT_SUBMITTED',
      canSubmit: story.visibility === 'PRIVATE' && story.moderationStatus === 'NOT_SUBMITTED',
      canGeneratePremises: true,
      canStartReading: false, // Need premise + character first
    };

    return {
      story: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        synopsis: story.synopsis,
        genres: story.genres,
        coverUrl: story.coverUrl,
        openingScene: story.openingScene,
        origin: story.origin,
        visibility: story.visibility,
        moderationStatus: story.moderationStatus,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
      },
      generation: generationMetadata,
      nextActions,
    };
  }

  private getProviderFromModelId(modelId: string): string | null {
    return getProviderForModelId(modelId) || null;
  }
}

export interface GeneratedStoryDraft {
  title: string;
  synopsis: string;
  genres: string[];
  openingScene: string;
  basePrompt?: string;
  tone?: string;
  styleGuide?: string;
  worldRules?: string;
  language?: string;
  maturityRating?: string;
}
