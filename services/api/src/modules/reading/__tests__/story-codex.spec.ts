import { NarrativeContextBuilder, StoryCodex } from '../narrative/narrative-context.builder';

describe('NarrativeContextBuilder — Story Codex', () => {
  describe('createEmptyCodex', () => {
    it('returns a codex with all sections initialized', () => {
      const codex = NarrativeContextBuilder.createEmptyCodex();

      expect(codex.canonicalFacts).toEqual([]);
      expect(codex.characters).toEqual([]);
      expect(codex.relationships).toEqual([]);
      expect(codex.locations).toEqual([]);
      expect(codex.inventoryOrResources).toEqual([]);
      expect(codex.importantChoices).toEqual([]);
      expect(codex.openThreads).toEqual([]);
      expect(codex.resolvedThreads).toEqual([]);
      expect(codex.timeline).toEqual([]);
      expect(codex.doNotContradict).toEqual([]);
    });
  });

  describe('createInitialCodex', () => {
    it('creates a codex from story metadata', () => {
      const codex = NarrativeContextBuilder.createInitialCodex({
        story: {
          title: 'A Mansão Encantada',
          synopsis: 'Um detetive investiga mistérios',
          tone: 'suspense',
          styleGuide: 'terror gótico',
          worldRules: 'A mansão muda de layout a cada hora',
          characters: [
            { name: 'Detetive Silva', role: 'PROTAGONIST', description: 'Investigador habilidoso' },
            { name: 'Fantasma', role: 'SUPPORTING', description: 'Espírito inquieto' },
          ],
        },
        premise: null,
        character: null,
      });

      expect(codex.canonicalFacts).toContain('Título: A Mansão Encantada');
      expect(codex.canonicalFacts).toContain('Sinopse: Um detetive investiga mistérios');
      expect(codex.doNotContradict).toContain('Tom narrativo: suspense');
      expect(codex.doNotContradict).toContain('Guia de estilo: terror gótico');
      expect(codex.doNotContradict).toContain('Regras do mundo: A mansão muda de layout a cada hora');
      expect(codex.characters).toHaveLength(2);
      expect(codex.characters[0].name).toBe('Detetive Silva');
      expect(codex.characters[1].name).toBe('Fantasma');
    });

    it('includes playable character details when provided', () => {
      const codex = NarrativeContextBuilder.createInitialCodex({
        story: { title: 'Test', characters: [] },
        premise: { title: 'A Fuga' },
        character: {
          name: 'Lia',
          roleLabel: 'A fugitiva da torre norte',
          narrativeFunction: 'HERO',
          personality: 'Determinada mas ferida',
          motivation: 'Encontrar o irmão perdido',
          secret: 'Ela sabe quem começou o incêndio',
          initialGoal: 'Sair da torre antes do amanhecer',
          startingSituation: 'Lia acorda trancada na torre norte',
        },
      });

      expect(codex.canonicalFacts).toContain('Protagonista: Lia');
      expect(codex.canonicalFacts).toContain('Personalidade do protagonista: Determinada mas ferida');
      expect(codex.canonicalFacts).toContain('Objetivo inicial: Sair da torre antes do amanhecer');
      expect(codex.canonicalFacts).toContain('Ponto de partida: Lia acorda trancada na torre norte');
      expect(codex.canonicalFacts).toContain('Segredo do protagonista: Ela sabe quem começou o incêndio');

      const playerChar = codex.characters.find(c => c.name === 'Lia');
      expect(playerChar).toBeDefined();
      expect(playerChar?.role).toBe('A fugitiva da torre norte');
      expect(playerChar?.currentState).toContain('Determinada mas ferida');
    });

    it('works without character or premise', () => {
      const codex = NarrativeContextBuilder.createInitialCodex({
        story: { title: 'Minimal Story', characters: [] },
        premise: null,
        character: null,
      });

      expect(codex.canonicalFacts).toContain('Título: Minimal Story');
      expect(codex.characters).toHaveLength(0);
    });
  });

  describe('computeUpdatedCodex', () => {
    it('adds a timeline entry for each scene', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'entrar na sala',
        sceneText: 'Você entra na sala escura e sente um arrepio. O ambiente está silencioso, apenas o som do vento.',
        sceneIndex: 1,
        characters: [{ name: 'Detetive Silva', role: 'PROTAGONIST' }],
      });

      expect(codex.timeline).toHaveLength(1);
      expect(codex.timeline[0].scene).toBe(1);
      expect(codex.timeline[0].summary).toContain('Você entra na sala escura');
    });

    it('records the user action in important choices', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'abrir a porta misteriosa',
        sceneText: 'A porta range ao abrir. Você vê um corredor longo e escuro.',
        sceneIndex: 2,
        characters: [],
      });

      expect(codex.importantChoices).toHaveLength(1);
      expect(codex.importantChoices[0].scene).toBe(2);
      expect(codex.importantChoices[0].action).toBe('abrir a porta misteriosa');
    });

    it('keeps important choices across multiple scenes', () => {
      let codex: StoryCodex | undefined;

      codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
        userAction: 'explorar o salão',
        sceneText: 'O salão está em ruínas.',
        sceneIndex: 1,
        characters: [],
      });

      codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
        userAction: 'falar com o guarda',
        sceneText: 'O guarda revela um segredo.',
        sceneIndex: 2,
        characters: [],
      });

      codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
        userAction: 'fugir pela janela',
        sceneText: 'Você pula pela janela e cai no jardim.',
        sceneIndex: 3,
        characters: [],
      });

      expect(codex.importantChoices).toHaveLength(3);
      expect(codex.importantChoices[0].action).toBe('explorar o salão');
      expect(codex.importantChoices[1].action).toBe('falar com o guarda');
      expect(codex.importantChoices[2].action).toBe('fugir pela janela');
      expect(codex.timeline).toHaveLength(3);
    });

    it('detects location changes from scene text', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'seguir em frente',
        sceneText: 'Você entrou no castelo abandonado e sentiu o cheiro de mofo.',
        sceneIndex: 1,
        characters: [],
      });

      expect(codex.locations.length).toBeGreaterThanOrEqual(1);
      expect(codex.locations.some(l => l.includes('castelo'))).toBe(true);
    });

    it('adds characters mentioned in the scene', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'investigar',
        sceneText: 'O Detetive Silva examina a cena do crime enquanto o Fantasma observa.',
        sceneIndex: 1,
        characters: [
          { name: 'Detetive Silva', role: 'PROTAGONIST' },
          { name: 'Fantasma', role: 'SUPPORTING' },
        ],
      });

      expect(codex.characters.length).toBeGreaterThanOrEqual(1);
    });

    it('detects open threads from questions and cliffhangers', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'olhar ao redor',
        sceneText: 'De repente, uma sombra passou pela janela. Quem estaria ali?',
        sceneIndex: 1,
        characters: [],
      });

      expect(codex.openThreads.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts facts from discovery phrases', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'examinar o diário',
        sceneText: 'Você descobriu que o mordomo estava na biblioteca na noite do crime.',
        sceneIndex: 2,
        characters: [],
      });

      const factFound = codex.canonicalFacts.some(f => f.includes('mordomo') || f.includes('biblioteca'));
      expect(factFound).toBe(true);
    });

    it('tracks player intent across actions', () => {
      let codex: StoryCodex | undefined;

      codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
        userAction: 'procurar pistas sobre o desaparecimento',
        sceneText: 'Você encontra uma carta.',
        sceneIndex: 1,
        characters: [],
      });

      codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
        userAction: 'confrontar o suspeito',
        sceneText: 'O suspeito foge.',
        sceneIndex: 2,
        characters: [],
      });

      expect(codex.playerIntent).toBeDefined();
      expect(codex.playerIntent).toContain('confrontar');
    });

    it('trims timeline when exceeding max entries', () => {
      let codex: StoryCodex | undefined;

      for (let i = 1; i <= 20; i++) {
        codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
          userAction: `ação ${i}`,
          sceneText: `Cena número ${i} da história.`,
          sceneIndex: i,
          characters: [],
        });
      }

      expect(codex!.timeline.length).toBeLessThanOrEqual(15);
    });

    it('trims important choices when exceeding max', () => {
      let codex: StoryCodex | undefined;

      for (let i = 1; i <= 20; i++) {
        codex = NarrativeContextBuilder.computeUpdatedCodex(codex, {
          userAction: `escolha importante ${i}`,
          sceneText: `Resultado da escolha ${i}.`,
          sceneIndex: i,
          characters: [],
        });
      }

      expect(codex!.importantChoices.length).toBeLessThanOrEqual(15);
    });

    it('starts from empty codex when no existing codex is provided', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'começar',
        sceneText: 'Uma nova aventura.',
        sceneIndex: 0,
        characters: [],
      });

      expect(codex.timeline).toHaveLength(1);
      expect(codex.canonicalFacts).toHaveLength(0);
    });

    it('preserves existing codex content when updating', () => {
      const existing: StoryCodex = {
        canonicalFacts: ['O vilão é o mordomo'],
        characters: [{ name: 'Detetive', role: 'HERO', currentState: 'investigando' }],
        relationships: [],
        locations: ['Cena 1: biblioteca'],
        inventoryOrResources: [],
        importantChoices: [{ scene: 1, action: 'interrogar' }],
        openThreads: ['Quem apagou as luzes?'],
        resolvedThreads: [],
        timeline: [{ scene: 1, summary: 'O detetive chegou à mansão' }],
        doNotContradict: ['Tom: suspense'],
        playerIntent: 'investigar',
      };

      const updated = NarrativeContextBuilder.computeUpdatedCodex(existing, {
        userAction: 'examinar a arma',
        sceneText: 'A arma do crime estava escondida atrás do quadro. Você percebeu que era falsa.',
        sceneIndex: 2,
        characters: [],
      });

      expect(updated.canonicalFacts).toContain('O vilão é o mordomo');
      expect(updated.timeline).toHaveLength(2);
      expect(updated.importantChoices).toHaveLength(2);
      expect(updated.importantChoices[0].action).toBe('interrogar');
      expect(updated.importantChoices[1].action).toBe('examinar a arma');
    });
  });

  describe('serializeCodexForPrompt', () => {
    it('returns empty string for null/undefined codex', () => {
      expect(NarrativeContextBuilder.serializeCodexForPrompt(null)).toBe('');
      expect(NarrativeContextBuilder.serializeCodexForPrompt(undefined)).toBe('');
    });

    it('includes all populated sections', () => {
      const codex: StoryCodex = {
        canonicalFacts: ['O castelo é assombrado'],
        characters: [{ name: 'Lia', role: 'Protagonista', currentState: 'ferida' }],
        relationships: [],
        locations: ['Cena 1: torre norte'],
        inventoryOrResources: [],
        importantChoices: [{ scene: 1, action: 'abrir a porta' }],
        openThreads: ['O que há no porão?'],
        resolvedThreads: [],
        timeline: [{ scene: 1, summary: 'Lia acordou na torre' }],
        doNotContradict: ['Tom: suspense'],
        playerIntent: 'escapar da torre',
      };

      const serialized = NarrativeContextBuilder.serializeCodexForPrompt(codex);

      expect(serialized).toContain('--- CODEX NARRATIVO ---');
      expect(serialized).toContain('FATOS CANÔNICOS');
      expect(serialized).toContain('O castelo é assombrado');
      expect(serialized).toContain('PERSONAGENS');
      expect(serialized).toContain('Lia (Protagonista)');
      expect(serialized).toContain('LOCAIS CONHECIDOS');
      expect(serialized).toContain('ESCOLHAS IMPORTANTES DO JOGADOR');
      expect(serialized).toContain('abrir a porta');
      expect(serialized).toContain('TRILHAS EM ABERTO');
      expect(serialized).toContain('O que há no porão?');
      expect(serialized).toContain('LINHA DO TEMPO');
      expect(serialized).toContain('NÃO CONTRADIZER');
      expect(serialized).toContain('Tom: suspense');
      expect(serialized).toContain('INTENÇÃO ATUAL DO JOGADOR');
      expect(serialized).toContain('escapar da torre');
      expect(serialized).toContain('--- FIM CODEX ---');
    });

    it('omits empty sections', () => {
      const codex: StoryCodex = {
        canonicalFacts: [],
        characters: [],
        relationships: [],
        locations: [],
        inventoryOrResources: [],
        importantChoices: [],
        openThreads: [],
        resolvedThreads: [],
        timeline: [{ scene: 0, summary: 'Início' }],
        doNotContradict: [],
      };

      const serialized = NarrativeContextBuilder.serializeCodexForPrompt(codex);

      expect(serialized).toContain('LINHA DO TEMPO');
      expect(serialized).not.toContain('FATOS CANÔNICOS');
      expect(serialized).not.toContain('PERSONAGENS');
    });
  });

  describe('backward compatibility', () => {
    it('computeUpdatedCodex handles null existing codex without error', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(null, {
        userAction: 'teste',
        sceneText: 'Teste de compatibilidade',
        sceneIndex: 5,
        characters: [],
      });

      expect(codex).toBeDefined();
      expect(codex.timeline).toHaveLength(1);
      expect(codex.timeline[0].scene).toBe(5);
    });

    it('computeUpdatedCodex handles undefined existing codex without error', () => {
      const codex = NarrativeContextBuilder.computeUpdatedCodex(undefined, {
        userAction: 'teste',
        sceneText: 'Outro teste',
        sceneIndex: 10,
        characters: [],
      });

      expect(codex).toBeDefined();
      expect(codex.timeline).toHaveLength(1);
    });

    it('serializeCodexForPrompt handles null gracefully', () => {
      const result = NarrativeContextBuilder.serializeCodexForPrompt(null);
      expect(result).toBe('');
    });
  });
});
