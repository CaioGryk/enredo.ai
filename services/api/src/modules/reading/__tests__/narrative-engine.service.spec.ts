import { Test, TestingModule } from '@nestjs/testing';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { AiService } from '@modules/ai/ai.service';
import { GenerateSceneInput } from '../narrative/narrative-response.types';
import { SubscriptionType } from '@prisma/client';

describe('NarrativeEngine', () => {
  let narrativeEngine: NarrativeEngine;
  let mockAiService: jest.Mocked<AiService>;

  beforeEach(async () => {
    mockAiService = {
      isMockMode: jest.fn(),
      generateScene: jest.fn(),
      generateFirstScene: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NarrativeEngine,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    narrativeEngine = module.get<NarrativeEngine>(NarrativeEngine);
  });

  describe('generateScene', () => {
    const baseInput: GenerateSceneInput = {
      userId: 'user-1',
      sessionId: 'session-1',
      story: {
        id: 'story-1',
        title: 'Test Story',
        synopsis: 'A test story',
        genres: ['adventure'],
      },
      session: {} as any,
      sceneIndex: 1,
    };

    it('should return mock content when AiService.isMockMode() is true', async () => {
      mockAiService.isMockMode.mockReturnValue(true);

      const result = await narrativeEngine.generateScene(baseInput);

      expect(result.sceneText).toContain('[mock LLM response]');
      expect(result.providerUsed).toBe('mock');
      expect(result.modelUsed).toBe('gpt-4o-mini');
      expect(mockAiService.generateScene).not.toHaveBeenCalled();
    });

    it('should call AiService when LLM_MOCK_MODE=false', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Real AI scene text',
        choices: ['Choice 1', 'Choice 2', 'Choice 3'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'tensa', pacing: 'rapida' },
      });

      const result = await narrativeEngine.generateScene(baseInput);

      expect(mockAiService.generateScene).toHaveBeenCalled();
      expect(result.sceneText).toBe('Real AI scene text');
      expect(result.suggestedActions).toEqual(['Choice 1', 'Choice 2', 'Choice 3']);
      expect(result.providerUsed).toBe('ai');
      expect(result.modelUsed).toBe('gpt-4o-mini');
      expect(result.tokenUsage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it('should parse sceneMetadata from AI response', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Scene with metadata',
        choices: ['A', 'B'],
        modelUsed: 'claude',
        inputTokens: 50,
        outputTokens: 30,
        costUsd: 0.0005,
        sceneMetadata: { emotion: 'misteriosa', pacing: 'lenta' },
      });

      const result = await narrativeEngine.generateScene(baseInput);

      expect(result.sceneMetadata).toEqual({ emotion: 'misteriosa', pacing: 'lenta' });
    });

    it('should throw error when provider fails (not silent mock)', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockRejectedValue(new Error('API timeout'));

      await expect(narrativeEngine.generateScene(baseInput)).rejects.toThrow('Scene generation failed');
    });

    it('should return default choices when AI returns empty array', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Valid scene',
        choices: [],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: undefined,
      });

      const result = await narrativeEngine.generateScene(baseInput);

      expect(result.suggestedActions).toEqual(['Continuar', 'Explorar', 'Voltar']);
    });

    it('should include memoryPatch in response', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Scene that updates memory',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      });

      const inputWithMemory: GenerateSceneInput = {
        ...baseInput,
        memory: {
          summary: 'Previous summary',
          worldState: 'World state info',
          characterState: 'Character states',
          importantChoices: 'Choice made',
          openThreads: 'Thread open',
          constraints: 'Constraints here',
          sceneCount: 5,
        },
      };

      const result = await narrativeEngine.generateScene(inputWithMemory);

      expect(result.memoryPatch).toBeDefined();
      expect(result.memoryPatch).toHaveProperty('summary');
      expect(result.memoryPatch).toHaveProperty('worldState');
      expect(result.memoryPatch).toHaveProperty('characterState');
      expect(result.memoryPatch).toHaveProperty('importantChoices');
      expect(result.memoryPatch).toHaveProperty('openThreads');
    });

    it('should pass plan: PREMIUM to AiService when input plan is Premium', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Premium scene',
        choices: ['Continue'],
        modelUsed: 'gpt-4.1-nano',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      });

      const premiumInput: GenerateSceneInput = {
        ...baseInput,
        plan: SubscriptionType.PREMIUM,
      };

      await narrativeEngine.generateScene(premiumInput);

      const callArgs = mockAiService.generateScene.mock.calls[0][0];
      expect(callArgs.plan).toBe(SubscriptionType.PREMIUM);
    });

    it('should pass walletBalance and isCinematic to AiService', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Cinematic scene',
        choices: ['Continue'],
        modelUsed: 'claude-sonnet',
        inputTokens: 200,
        outputTokens: 100,
        costUsd: 0.005,
        sceneMetadata: { emotion: 'epica', pacing: 'lenta' },
      });

      const cinematicInput: GenerateSceneInput = {
        ...baseInput,
        plan: SubscriptionType.PREMIUM,
        walletBalance: 50,
        isCinematic: true,
      };

      await narrativeEngine.generateScene(cinematicInput);

      const callArgs = mockAiService.generateScene.mock.calls[0][0];
      expect(callArgs.walletBalance).toBe(50);
      expect(callArgs.isCinematic).toBe(true);
      expect(callArgs.plan).toBe(SubscriptionType.PREMIUM);
    });

    it('should default plan to FREE when missing', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Free scene',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      });

      const inputWithoutPlan = { ...baseInput };
      delete (inputWithoutPlan as any).plan;

      await narrativeEngine.generateScene(inputWithoutPlan);

      const callArgs = mockAiService.generateScene.mock.calls[0][0];
      expect(callArgs.plan).toBe(SubscriptionType.FREE);
    });

    it('should use existing memory/action/sceneIndex instead of empty baseline in memory patch', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Scene continuing narrative',
        choices: ['Explore the corridor', 'Talk to the stranger'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 150,
        outputTokens: 75,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'tensa', pacing: 'media' },
      });

      const inputWithContext: GenerateSceneInput = {
        ...baseInput,
        action: 'enter the dark corridor',
        sceneIndex: 5,
        memory: {
          summary: 'Player entered the castle',
          worldState: 'At the castle entrance',
          characterState: 'Protagonist: brave but cautious',
          importantChoices: 'Chose the left path',
          openThreads: 'Mystery of the stranger',
          constraints: 'Maintain gothic tone',
          sceneCount: 4,
        },
      };

      const result = await narrativeEngine.generateScene(inputWithContext);

      expect(result.memoryPatch).toBeDefined();
      expect(result.memoryPatch).toHaveProperty('summary');
      expect(result.memoryPatch).toHaveProperty('worldState');
      expect(result.memoryPatch).toHaveProperty('characterState');
      expect(result.memoryPatch).toHaveProperty('importantChoices');
      expect(result.memoryPatch).toHaveProperty('openThreads');
      expect(result.memoryPatch).toHaveProperty('constraints');
      expect(result.memoryPatch?.constraints).toBe('Maintain gothic tone');
    });

    it('should preserve existing constraints in memory patch when no new constraints produced', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateScene.mockResolvedValue({
        sceneText: 'Another scene',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      });

      const inputWithConstraints: GenerateSceneInput = {
        ...baseInput,
        memory: {
          summary: 'Summary',
          worldState: 'World',
          characterState: 'Character',
          importantChoices: 'Choices',
          openThreads: 'Threads',
          constraints: 'Original constraints preserved',
          sceneCount: 1,
        },
      };

      const result = await narrativeEngine.generateScene(inputWithConstraints);

      expect(result.memoryPatch?.constraints).toBe('Original constraints preserved');
    });

    it('should use mock for first scene when AiService.isMockMode() is true', async () => {
      mockAiService.isMockMode.mockReturnValue(true);

      const firstSceneInput: GenerateSceneInput = {
        ...baseInput,
        isFirstScene: true,
      };

      const result = await narrativeEngine.generateScene(firstSceneInput);

      expect(result.sceneText).toContain('[mock first scene]');
      expect(result.providerUsed).toBe('mock');
      expect(mockAiService.generateFirstScene).not.toHaveBeenCalled();
    });

    it('should use real AI for first scene when LLM_MOCK_MODE=false', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateFirstScene.mockResolvedValue({
        sceneText: 'The story begins with a hook',
        choices: ['Begin your journey', 'Look around', 'Wait'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 150,
        outputTokens: 75,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'expectativa', pacing: 'lenta' },
      });

      const firstSceneInput: GenerateSceneInput = {
        ...baseInput,
        premise: {
          title: 'Adventure Begins',
          synopsis: 'A new adventure awaits',
          openingScene: 'You stand at the crossroads',
          tone: 'epic',
          styleGuide: 'cinematic',
          worldRules: 'Fantasy world',
        },
        playableCharacter: {
          name: 'Alex',
          roleLabel: 'The Hero',
          narrativeFunction: 'HERO',
          personality: 'Brave',
          motivation: 'Find treasure',
        },
        isFirstScene: true,
      };

      const result = await narrativeEngine.generateScene(firstSceneInput);

      expect(mockAiService.generateFirstScene).toHaveBeenCalled();
      expect(result.sceneText).toBe('The story begins with a hook');
      expect(result.suggestedActions).toEqual(['Begin your journey', 'Look around', 'Wait']);
      expect(result.providerUsed).toBe('ai');
      expect(result.sceneMetadata).toEqual({ emotion: 'expectativa', pacing: 'lenta' });
    });

    it('should pass premise and character context to generateFirstScene', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateFirstScene.mockResolvedValue({
        sceneText: 'First scene',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      });

      const inputWithContext: GenerateSceneInput = {
        ...baseInput,
        premise: {
          title: 'Premise Title',
          synopsis: 'Premise synopsis',
          openingScene: 'Opening scene text',
          tone: 'dramatic',
        },
        playableCharacter: {
          name: 'Hero',
          roleLabel: 'The Hero',
          narrativeFunction: 'HERO',
          personality: 'Brave',
          motivation: 'Save the day',
        },
        isFirstScene: true,
      };

      await narrativeEngine.generateScene(inputWithContext);

      const callArgs = mockAiService.generateFirstScene.mock.calls[0][0];
      expect(callArgs.premiseContext).toBeDefined();
      expect(callArgs.characterContext).toBeDefined();
    });

    it('should throw error when provider fails for first scene', async () => {
      mockAiService.isMockMode.mockReturnValue(false);
      mockAiService.generateFirstScene.mockRejectedValue(new Error('Provider unavailable'));

      const firstSceneInput: GenerateSceneInput = {
        ...baseInput,
        isFirstScene: true,
      };

      await expect(narrativeEngine.generateScene(firstSceneInput)).rejects.toThrow('Scene generation failed');
    });
  });
});