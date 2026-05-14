import { Injectable, HttpException } from '@nestjs/common';
import { AiService } from '@modules/ai/ai.service';
import { NarrativeContextBuilder } from './narrative-context.builder';
import { GenerateSceneInput, GenerateSceneResult } from './narrative-response.types';
import { UserActionType, SubscriptionType } from '@prisma/client';

@Injectable()
export class NarrativeEngine {
  constructor(private readonly aiService: AiService) {}

  async generateScene(input: GenerateSceneInput): Promise<GenerateSceneResult> {
    if (this.aiService.isMockMode()) {
      return input.isFirstScene
        ? this.generateMockFirstScene(input)
        : this.generateMockScene(input);
    }

    try {
      return input.isFirstScene
        ? await this.generateAIFirstScene(input)
        : await this.generateAIScene(input);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new Error(`Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateAIFirstScene(input: GenerateSceneInput): Promise<GenerateSceneResult> {
    const premiseContext = NarrativeContextBuilder.buildPremiseContext(input.premise);
    const characterContext = NarrativeContextBuilder.buildCharacterContext(input.playableCharacter);
    const storyCharacters = NarrativeContextBuilder.buildStoryCharacters(input.story);

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
        }
      : null;

    const plan = input.plan || SubscriptionType.FREE;

    const result = await this.aiService.generateFirstScene({
      title: input.story.title,
      synopsis: input.story.synopsis || input.story.basePrompt,
      basePrompt: input.story.basePrompt,
      tone: input.story.tone || premiseContext?.tone,
      styleGuide: input.story.styleGuide || premiseContext?.styleGuide,
      worldRules: input.story.worldRules || premiseContext?.worldRules,
      openingScene: premiseContext?.openingScene || input.story.openingScene,
      genre: input.story.genres?.[0] || 'ficção',
      characters: storyCharacters,
      plan,
      isCinematic: input.isCinematic || false,
      modelId: input.selectedModelId,
      walletBalance: input.walletBalance,
      narrativeMemory: currentMemory,
      premiseContext: premiseContext ? {
        title: premiseContext.title,
        synopsis: premiseContext.synopsis,
        basePrompt: premiseContext.basePrompt,
        openingScene: premiseContext.openingScene,
        tone: premiseContext.tone,
        styleGuide: premiseContext.styleGuide,
        worldRules: premiseContext.worldRules,
      } : null,
      characterContext: characterContext ? {
        name: characterContext.name,
        roleLabel: characterContext.roleLabel,
        narrativeFunction: characterContext.narrativeFunction,
        personality: characterContext.personality,
        motivation: characterContext.motivation,
        secret: characterContext.secret,
        relationshipToPlayer: characterContext.relationshipToPlayer,
        initialGoal: characterContext.initialGoal,
        conflictPotential: characterContext.conflictPotential,
      } : null,
    });

    return this.parseFirstSceneResult(result, input);
  }

  private parseFirstSceneResult(result: any, input: GenerateSceneInput): GenerateSceneResult {
    const sceneText = result.sceneText || 'Cena não gerada corretamente.';
    const rawChoices = Array.isArray(result.choices) ? result.choices : [];
    const suggestedActions = rawChoices.length > 0
      ? rawChoices.map((c: string) => c.substring(0, 50))
      : ['Continuar', 'Explorar', 'Voltar'];

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
          sceneCount: input.memory.sceneCount || 0,
        }
      : {
          summary: '',
          worldState: '',
          characterState: '',
          importantChoices: '',
          openThreads: '',
          constraints: '',
          sceneCount: 0,
        };

    const memoryUpdate = NarrativeContextBuilder.computeUpdatedMemory(
      currentMemory,
      'primeira cena',
      sceneText,
      suggestedActions,
      NarrativeContextBuilder.buildStoryCharacters(input.story),
      0,
    );

    return {
      sceneText,
      suggestedActions,
      modelUsed: result.modelUsed || 'unknown',
      providerUsed: 'ai',
      tokenUsage: {
        inputTokens: result.inputTokens || 0,
        outputTokens: result.outputTokens || 0,
        totalTokens: (result.inputTokens || 0) + (result.outputTokens || 0),
      },
      sceneMetadata: result.sceneMetadata || {
        emotion: 'neutra',
        pacing: 'media',
      },
      memoryPatch: {
        summary: memoryUpdate.summary,
        worldState: memoryUpdate.worldState,
        characterState: memoryUpdate.characterState,
        importantChoices: memoryUpdate.importantChoices || [],
        openThreads: memoryUpdate.openThreads || [],
        constraints: currentMemory.constraints || '',
      },
    };
  }

  private generateMockFirstScene(input: GenerateSceneInput): GenerateSceneResult {
    const premiseContext = NarrativeContextBuilder.buildPremiseContext(input.premise);
    const characterContext = NarrativeContextBuilder.buildCharacterContext(input.playableCharacter);

    const openingText = premiseContext?.openingScene || input.story.openingScene
      ? `\n\nCena de abertura: ${premiseContext?.openingScene || input.story.openingScene}`
      : '';

    const characterNote = characterContext
      ? `\n\nProtagonista: ${characterContext.name || 'Personagem'} (${characterContext.roleLabel || 'jogável'})`
      : '';

    const sceneText = `Cena 0: ${input.story.title}${openingText}${characterNote}\n\nA história começa aqui... [mock first scene]`;

    const suggestedActions = ['Continuar', 'Explorar', 'Voltar'];

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
          sceneCount: input.memory.sceneCount || 0,
        }
      : {
          summary: '',
          worldState: '',
          characterState: '',
          importantChoices: '',
          openThreads: '',
          constraints: '',
          sceneCount: 0,
        };

    const memoryUpdate = NarrativeContextBuilder.computeUpdatedMemory(
      currentMemory,
      'início',
      sceneText,
      suggestedActions,
      NarrativeContextBuilder.buildStoryCharacters(input.story),
      0,
    );

    return {
      sceneText,
      suggestedActions,
      modelUsed: input.selectedModelId || 'gpt-4o-mini',
      providerUsed: 'mock',
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      sceneMetadata: {
        emotion: 'expectativa',
        pacing: 'lenta',
      },
      memoryPatch: {
        summary: memoryUpdate.summary,
        worldState: memoryUpdate.worldState,
        characterState: memoryUpdate.characterState,
        importantChoices: Array.isArray(memoryUpdate.importantChoices)
          ? memoryUpdate.importantChoices
          : String(memoryUpdate.importantChoices || '').split('\n').filter(Boolean),
        openThreads: Array.isArray(memoryUpdate.openThreads)
          ? memoryUpdate.openThreads
          : String(memoryUpdate.openThreads || '').split('\n').filter(Boolean),
        constraints: currentMemory.constraints,
      },
    };
  }

  private async generateAIScene(input: GenerateSceneInput): Promise<GenerateSceneResult> {
    const premiseContext = NarrativeContextBuilder.buildPremiseContext(input.premise);
    const characterContext = NarrativeContextBuilder.buildCharacterContext(input.playableCharacter);
    const storyCharacters = NarrativeContextBuilder.buildStoryCharacters(input.story);

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
        }
      : null;

    const previousSceneText = (() => {
      if (!input.previousEvents || input.previousEvents.length === 0) {
        return undefined;
      }
      const { trimmedText } = NarrativeContextBuilder.trimPreviousScenes(input.previousEvents);
      return trimmedText;
    })();

    const previousChoices = input.previousEvents && input.previousEvents.length > 0
      ? input.previousEvents[input.previousEvents.length - 1].choices
      : undefined;

    const memorySummary = input.memory?.summary || undefined;

    const plan = input.plan || SubscriptionType.FREE;

    const result = await this.aiService.generateScene({
      storyTitle: input.story.title,
      synopsis: input.story.synopsis,
      basePrompt: input.story.basePrompt,
      tone: input.story.tone,
      styleGuide: input.story.styleGuide,
      worldRules: input.story.worldRules,
      genre: input.story.genres?.[0] || 'ficção',
      characters: storyCharacters,
      premiseContext,
      characterContext,
      memorySummary,
      narrativeMemory: currentMemory,
      previousSceneText,
      previousChoices,
      userAction: input.action || 'continuar',
      userActionType: UserActionType.CHOICE,
      plan,
      isCinematic: input.isCinematic || false,
      modelId: input.selectedModelId,
      walletBalance: input.walletBalance,
    });

    return this.parseSceneResult(result, input);
  }

  private parseSceneResult(result: any, input: GenerateSceneInput): GenerateSceneResult {
    const sceneText = result.sceneText || 'Cena não gerada corretamente.';
    const rawChoices = Array.isArray(result.choices) ? result.choices : [];
    const suggestedActions = rawChoices.length > 0
      ? rawChoices.map((c: string) => c.substring(0, 50))
      : ['Continuar', 'Explorar', 'Voltar'];

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
          sceneCount: input.memory.sceneCount || 0,
        }
      : {
          summary: '',
          worldState: '',
          characterState: '',
          importantChoices: '',
          openThreads: '',
          constraints: '',
          sceneCount: 0,
        };

    const memoryUpdate = NarrativeContextBuilder.computeUpdatedMemory(
      currentMemory,
      input.action || 'continuar',
      sceneText,
      suggestedActions,
      NarrativeContextBuilder.buildStoryCharacters(input.story),
      input.sceneIndex,
    );

    return {
      sceneText,
      suggestedActions,
      modelUsed: result.modelUsed || 'unknown',
      providerUsed: 'ai',
      tokenUsage: {
        inputTokens: result.inputTokens || 0,
        outputTokens: result.outputTokens || 0,
        totalTokens: (result.inputTokens || 0) + (result.outputTokens || 0),
      },
      sceneMetadata: result.sceneMetadata || {
        emotion: 'neutra',
        pacing: 'media',
      },
      memoryPatch: {
        summary: memoryUpdate.summary,
        worldState: memoryUpdate.worldState,
        characterState: memoryUpdate.characterState,
        importantChoices: memoryUpdate.importantChoices || [],
        openThreads: memoryUpdate.openThreads || [],
        constraints: currentMemory.constraints || '',
      },
    };
  }

  private generateMockScene(input: GenerateSceneInput): GenerateSceneResult {
    const premiseContext = NarrativeContextBuilder.buildPremiseContext(input.premise);
    const characterContext = NarrativeContextBuilder.buildCharacterContext(input.playableCharacter);

    const currentMemory = input.memory
      ? {
          summary: input.memory.summary || '',
          worldState: input.memory.worldState || '',
          characterState: input.memory.characterState || '',
          importantChoices: input.memory.importantChoices || '',
          openThreads: input.memory.openThreads || '',
          constraints: input.memory.constraints || '',
          sceneCount: input.memory.sceneCount || 0,
        }
      : {
          summary: '',
          worldState: '',
          characterState: '',
          importantChoices: '',
          openThreads: '',
          constraints: '',
          sceneCount: 0,
        };

    const sceneText = `Cena ${input.sceneIndex}: A história continua... [mock LLM response]`;
    const suggestedActions = ['Continuar', 'Explorar', 'Voltar'];

    const memoryUpdate = NarrativeContextBuilder.computeUpdatedMemory(
      currentMemory,
      input.action || 'continuar',
      sceneText,
      suggestedActions,
      NarrativeContextBuilder.buildStoryCharacters(input.story),
      input.sceneIndex,
    );

    return {
      sceneText,
      suggestedActions,
      modelUsed: input.selectedModelId || 'gpt-4o-mini',
      providerUsed: 'mock',
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      sceneMetadata: {
        emotion: 'neutral',
        pacing: 'steady',
      },
      memoryPatch: {
        summary: memoryUpdate.summary,
        worldState: memoryUpdate.worldState,
        characterState: memoryUpdate.characterState,
        importantChoices: Array.isArray(memoryUpdate.importantChoices)
          ? memoryUpdate.importantChoices
          : String(memoryUpdate.importantChoices || '').split('\n').filter(Boolean),
        openThreads: Array.isArray(memoryUpdate.openThreads)
          ? memoryUpdate.openThreads
          : String(memoryUpdate.openThreads || '').split('\n').filter(Boolean),
        constraints: currentMemory.constraints,
      },
    };
  }
}