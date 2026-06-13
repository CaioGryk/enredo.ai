import { NarrativeContextBuilder } from '../narrative/narrative-context.builder';
import { Test, TestingModule } from '@nestjs/testing';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { AiService } from '@modules/ai/ai.service';
import { GenerateSceneInput } from '../narrative/narrative-response.types';

describe('NarrativeContextBuilder - Context Window Safety', () => {
  describe('trimPreviousScenes', () => {
    it('should return undefined when events array is empty', () => {
      const result = NarrativeContextBuilder.trimPreviousScenes([]);
      expect(result.trimmedText).toBeUndefined();
      expect(result.eventCount).toBe(0);
    });

    it('should return undefined when events array is null', () => {
      const result = NarrativeContextBuilder.trimPreviousScenes(null as any);
      expect(result.trimmedText).toBeUndefined();
      expect(result.eventCount).toBe(0);
    });

    it('should include only the last 3 events when more than 3 provided', () => {
      const events = [
        { sceneText: 'Scene 1 text that is quite long and contains many characters' },
        { sceneText: 'Scene 2 text that is also quite long' },
        { sceneText: 'Scene 3 text' },
        { sceneText: 'Scene 4 text' },
        { sceneText: 'Scene 5 text' },
      ];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 3, 1200, 4000);
      expect(result.eventCount).toBe(3);
      expect(result.trimmedText).toContain('Scene 3');
      expect(result.trimmedText).toContain('Scene 4');
      expect(result.trimmedText).toContain('Scene 5');
      expect(result.trimmedText).not.toContain('Scene 1');
      expect(result.trimmedText).not.toContain('Scene 2');
    });

    it('should truncate individual scenes longer than maxCharsPerScene', () => {
      const longScene = 'A'.repeat(2000);
      const events = [{ sceneText: longScene }];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 3, 1200, 4000);
      expect(result.trimmedText).toContain('...');
      expect(result.trimmedText!.length).toBeLessThanOrEqual(1200 + 15);
    });

    it('should truncate total context when exceeding maxTotalChars', () => {
      const scene = 'B'.repeat(2000);
      const events = [
        { sceneText: scene },
        { sceneText: scene },
        { sceneText: scene },
      ];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 3, 1200, 3000);
      expect(result.trimmedText).toContain('... [contexto truncado]');
      expect(result.trimmedText!.length).toBeLessThanOrEqual(3015);
    });

    it('should use custom limits when provided', () => {
      const events = [
        { sceneText: 'Short scene 1' },
        { sceneText: 'Short scene 2' },
        { sceneText: 'Short scene 3' },
        { sceneText: 'Short scene 4' },
        { sceneText: 'Short scene 5' },
      ];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 2, 100, 200);
      expect(result.eventCount).toBe(2);
      expect(result.trimmedText!.length).toBeLessThanOrEqual(215);
    });

    it('should include choices when present in events', () => {
      const events = [
        { sceneText: 'First scene', choices: ['Choice A', 'Choice B'] },
        { sceneText: 'Second scene', choices: ['Choice C'] },
      ];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 3, 1200, 4000);
      expect(result.eventCount).toBe(2);
      expect(result.trimmedText).toBeDefined();
    });

    it('should preserve scene ordering with separator', () => {
      const events = [
        { sceneText: 'Scene A' },
        { sceneText: 'Scene B' },
      ];

      const result = NarrativeContextBuilder.trimPreviousScenes(events, 3, 1200, 4000);
      expect(result.trimmedText).toContain('Scene A');
      expect(result.trimmedText).toContain('Scene B');
      expect(result.trimmedText).toContain('\n\n---\n\n');
    });
  });
});

describe('NarrativeEngine - Context Window Safety Integration', () => {
  let narrativeEngine: NarrativeEngine;
  let mockAiService: jest.Mocked<AiService>;

  beforeEach(async () => {
    mockAiService = {
      isMockMode: jest.fn(),
      isReadingProviderFailureEnabled: jest.fn().mockReturnValue(false),
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

  it('should trim old events and preserve memory when calling AiService', async () => {
    mockAiService.isMockMode.mockReturnValue(false);

    let capturedParams: any;
    mockAiService.generateScene.mockImplementation(async (params: any) => {
      capturedParams = params;
      return {
        sceneText: 'Continuation scene',
        choices: ['Choice 1'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      };
    });

    const OLD_EVENT_SHOULD_NOT_APPEAR = 'OLD_EVENT_SHOULD_NOT_APPEAR_12345';
    const LONG_TAIL_SHOULD_NOT_APPEAR = 'LONG_TAIL_SHOULD_NOT_APPEAR_67890';
    const MEMORY_MARKER_MUST_REMAIN = 'MEMORY_MARKER_MUST_REMAIN_ABCDE';
    const RECENT_EVENT_SHOULD_REMAIN = 'RECENT_EVENT_SHOULD_REMAIN_FGHIJ';

    const longScene = 'X'.repeat(1500) + LONG_TAIL_SHOULD_NOT_APPEAR;

    const input: GenerateSceneInput = {
      userId: 'user-1',
      sessionId: 'session-1',
      story: {
        id: 'story-1',
        title: 'Test Story',
        synopsis: 'A test story',
        genres: ['adventure'],
      },
      session: {} as any,
      sceneIndex: 5,
      previousEvents: [
        { sceneText: 'First scene ' + OLD_EVENT_SHOULD_NOT_APPEAR },
        { sceneText: 'Second scene with some content' },
        { sceneText: 'Third scene ' + OLD_EVENT_SHOULD_NOT_APPEAR + ' again' },
        { sceneText: 'Fourth scene without the marker' },
        { sceneText: 'Fifth scene ' + RECENT_EVENT_SHOULD_REMAIN },
        { sceneText: longScene },
      ],
      memory: {
        sessionId: 'session-1',
        summary: 'Summary of the story ' + MEMORY_MARKER_MUST_REMAIN,
        worldState: 'In a small town',
        characterState: 'Protagonist is determined',
        importantChoices: 'Made a key decision',
        openThreads: 'What will happen next?',
        constraints: 'Tone: mysterious',
        sceneCount: 5,
      },
      action: 'continue',
      isFirstScene: false,
    };

    await narrativeEngine.generateScene(input);

    expect(capturedParams).toBeDefined();
    expect(capturedParams.previousSceneText).toBeDefined();

    expect(capturedParams.previousSceneText).not.toContain(OLD_EVENT_SHOULD_NOT_APPEAR);
    expect(capturedParams.previousSceneText).not.toContain(LONG_TAIL_SHOULD_NOT_APPEAR);
    expect(capturedParams.previousSceneText).toContain(RECENT_EVENT_SHOULD_REMAIN);

    expect(capturedParams.narrativeMemory?.summary).toContain(MEMORY_MARKER_MUST_REMAIN);
    expect(capturedParams.memorySummary).toContain(MEMORY_MARKER_MUST_REMAIN);
  });

  it('should handle empty previousEvents while preserving memory', async () => {
    mockAiService.isMockMode.mockReturnValue(false);

    let capturedParams: any;
    mockAiService.generateScene.mockImplementation(async (params: any) => {
      capturedParams = params;
      return {
        sceneText: 'First continuation',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      };
    });

    const MEMORY_MARKER_MUST_REMAIN = 'MEMORY_MARKER_PRESERVED_xyz';

    const input: GenerateSceneInput = {
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
      previousEvents: [],
      memory: {
        sessionId: 'session-1',
        summary: 'Story started ' + MEMORY_MARKER_MUST_REMAIN,
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 1,
      },
      action: 'continue',
      isFirstScene: false,
    };

    await narrativeEngine.generateScene(input);

    expect(capturedParams.previousSceneText).toBeUndefined();
    expect(capturedParams.narrativeMemory?.summary).toContain(MEMORY_MARKER_MUST_REMAIN);
    expect(capturedParams.memorySummary).toContain(MEMORY_MARKER_MUST_REMAIN);
  });

  it('should keep only the 2 most recent raw events for faster continuation prompts', async () => {
    mockAiService.isMockMode.mockReturnValue(false);

    let capturedParams: any;
    mockAiService.generateScene.mockImplementation(async (params: any) => {
      capturedParams = params;
      return {
        sceneText: 'Continuation',
        choices: ['Continue'],
        modelUsed: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      };
    });

    const EVENT_1_MARKER = 'EVENT_1_MARKER_SHOULD_NOT_APPEAR';
    const EVENT_2_MARKER = 'EVENT_2_MARKER_SHOULD_NOT_APPEAR';
    const EVENT_3_MARKER = 'EVENT_3_MARKER_SHOULD_REMAIN';
    const EVENT_4_MARKER = 'EVENT_4_MARKER_SHOULD_REMAIN';
    const EVENT_5_MARKER = 'EVENT_5_MARKER_SHOULD_REMAIN';

    const input: GenerateSceneInput = {
      userId: 'user-1',
      sessionId: 'session-1',
      story: {
        id: 'story-1',
        title: 'Test Story',
        synopsis: 'A test story',
        genres: ['adventure'],
      },
      session: {} as any,
      sceneIndex: 5,
      previousEvents: [
        { sceneText: 'Scene 1 ' + EVENT_1_MARKER },
        { sceneText: 'Scene 2 ' + EVENT_2_MARKER },
        { sceneText: 'Scene 3 ' + EVENT_3_MARKER },
        { sceneText: 'Scene 4 ' + EVENT_4_MARKER },
        { sceneText: 'Scene 5 ' + EVENT_5_MARKER },
      ],
      memory: {
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 5,
      },
      action: 'continue',
      isFirstScene: false,
    };

    await narrativeEngine.generateScene(input);

    expect(capturedParams.previousSceneText).not.toContain(EVENT_1_MARKER);
    expect(capturedParams.previousSceneText).not.toContain(EVENT_2_MARKER);
    expect(capturedParams.previousSceneText).not.toContain(EVENT_3_MARKER);
    expect(capturedParams.previousSceneText).toContain(EVENT_4_MARKER);
    expect(capturedParams.previousSceneText).toContain(EVENT_5_MARKER);
  });
});
