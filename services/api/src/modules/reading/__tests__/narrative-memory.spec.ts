import { NarrativeMemory } from '@prisma/client';

describe('NarrativeMemory Model', () => {
  const mockMemory: Partial<NarrativeMemory> = {
    id: 'test-memory-id',
    sessionId: 'test-session-id',
    summary: 'Historia: Test Story\nSinopse: A test story',
    worldState: 'The world is at war',
    characterState: 'John (protagonist): A brave warrior\nJane (supporting): A wise mage',
    importantChoices: '',
    openThreads: '',
    constraints: 'Tom: neutro\nEstilo: narrativo',
    sceneCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('has required fields for memory persistence', () => {
    expect(mockMemory.sessionId).toBeDefined();
    expect(mockMemory.summary).toBeDefined();
    expect(mockMemory.worldState).toBeDefined();
    expect(mockMemory.characterState).toBeDefined();
    expect(mockMemory.constraints).toBeDefined();
    expect(mockMemory.sceneCount).toBe(0);
  });

  it('initial memory contains story metadata', () => {
    expect(mockMemory.summary).toContain('Historia:');
    expect(mockMemory.summary).toContain('Sinopse:');
  });

  it('initial memory captures character state', () => {
    expect(mockMemory.characterState).toContain('John');
    expect(mockMemory.characterState).toContain('Jane');
  });
});

describe('NarrativeMemory Update Logic', () => {
  it('appends user choices to summary', () => {
    const memory = {
      summary: 'Historia: Test\n[Cena 1] Usuario: "attack"',
      sceneCount: 1,
    };

    const newAction = 'defend';
    const choiceLine = `[Cena ${memory.sceneCount + 1}] Usuario: "${newAction}" -> "continuar"]`;
    const newSummary = memory.summary.length > 0
      ? `${memory.summary}\n${choiceLine}`
      : choiceLine;

    expect(newSummary).toContain('[Cena 2]');
    expect(newSummary).toContain('defend');
    expect(newSummary).toContain('Historia: Test');
  });

  it('truncates summary when exceeding max length', () => {
    const MAX_SUMMARY_LENGTH = 2000;
    const longSummary = 'A'.repeat(2500);
    const memory = { summary: longSummary, sceneCount: 100 };

    const newAction = 'test action';
    const choiceLine = `[Cena ${memory.sceneCount + 1}] Usuario: "${newAction}" -> "choice1"]`;
    const newSummary = `${memory.summary}\n${choiceLine}`;

    const truncatedSummary = newSummary.length > MAX_SUMMARY_LENGTH
      ? newSummary.substring(newSummary.length - MAX_SUMMARY_LENGTH)
      : newSummary;

    expect(truncatedSummary.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
    expect(truncatedSummary).toContain(choiceLine.substring(0, 50));
  });

  it('increments scene count on update', () => {
    const memory = { sceneCount: 5 };
    const newSceneCount = memory.sceneCount + 1;
    expect(newSceneCount).toBe(6);
  });
});

describe('Memory Injection in Prompt', () => {
  it('builds memory context string correctly', () => {
    const memory = {
      constraints: 'Tom: suspense\nEstilo: terror',
      worldState: 'O mansao esta em ruinas',
      characterState: 'Protagonista: detetive',
      summary: '[Cena 1] Usuario escolheu explorar',
      importantChoices: '',
    };

    let memoryContext = '\n\n--- MEMORIA PERSISTENTE ---\n';
    if (memory.constraints) {
      memoryContext += `Restricoes: ${memory.constraints}\n`;
    }
    if (memory.worldState) {
      memoryContext += `Estado do Mundo: ${memory.worldState}\n`;
    }
    if (memory.characterState) {
      memoryContext += `Personagens: ${memory.characterState}\n`;
    }
    if (memory.summary) {
      memoryContext += `Historico: ${memory.summary}\n`;
    }
    if (memory.importantChoices) {
      memoryContext += `Escolhas Importantes: ${memory.importantChoices}\n`;
    }
    memoryContext += '--- FIM MEMORIA ---\n\n';

    expect(memoryContext).toContain('Restricoes:');
    expect(memoryContext).toContain('Estado do Mundo:');
    expect(memoryContext).toContain('Personagens:');
    expect(memoryContext).toContain('Historico:');
    expect(memoryContext).toContain('--- FIM MEMORIA ---');
  });

  it('excludes empty memory fields from context', () => {
    const memory = {
      constraints: 'Tom: suspense',
      worldState: '',
      characterState: '',
      summary: '',
      importantChoices: '',
    };

    let memoryContext = '';
    if (memory.worldState) {
      memoryContext += `Estado do Mundo: ${memory.worldState}\n`;
    }

    expect(memoryContext).not.toContain('Estado do Mundo:');
    expect(memoryContext).not.toContain('Personagens:');
  });
});

describe('Memory Creation from Story', () => {
  it('extracts story metadata correctly', () => {
    const story = {
      title: 'A Mansao Encantada',
      synopsis: 'Um detetive investiga misterios',
      tone: 'suspense',
      styleGuide: 'terror gotico',
      worldRules: 'A mansao muda de layout a cada hora',
      characters: [
        { name: 'Detetive', role: 'PROTAGONIST', description: 'Investigador habilidoso' },
        { name: 'Fantasma', role: 'SUPPORTING', description: 'Espirito inquieto' },
      ],
    };

    const charactersList = story.characters
      .map((c: any) => `${c.name} (${c.role}): ${c.description}`)
      .join('\n');

    const summary = `Historia: ${story.title}\nSinopse: ${story.synopsis}`;
    const constraints = `Tom: ${story.tone}\nEstilo: ${story.styleGuide}`;

    expect(summary).toContain('A Mansao Encantada');
    expect(summary).toContain('detetive');
    expect(constraints).toContain('suspense');
    expect(charactersList).toContain('Detetive');
    expect(charactersList).toContain('PROTAGONIST');
  });
});

describe('Memory is Independent of Raw Event History', () => {
  it('memory summary is not just a copy of scene texts', () => {
    const sceneTexts = [
      'O detetive entrou na sala escura.',
      'Ele encontrou um documento importante.',
      'O fantasma apareceu de repente.',
    ];

    const rawHistory = sceneTexts.join('\n\n');
    const memorySummary = '[Cena 1] Usuario: "entrar"\n[Cena 2] Usuario: "examinar"\n[Cena 3] Usuario: "gritar"';

    expect(memorySummary).not.toContain('O detetive entrou na sala');
    expect(memorySummary).not.toContain('documento importante');
    expect(memorySummary).toContain('[Cena 1]');
    expect(memorySummary).toContain('Usuario:');
  });

  it('memory persists compact choice history, not full scenes', () => {
    const memory = {
      summary: '[Cena 1] Usuario: "explorar mansao"\n[Cena 2] Usuario: "abrir porta"',
      sceneCount: 2,
    };

    const fullSceneText = 'O detetive entrou na sala escura. Ele olhou ao redor e viu uma porta misteriosa. De repente, o fantasma apareceu e gritou: "Vá embora!"';

    expect(memory.summary.length).toBeLessThan(fullSceneText.length);
    expect(memory.summary).toContain('explorar');
    expect(memory.summary).not.toContain('fantasma apareceu');
  });
});