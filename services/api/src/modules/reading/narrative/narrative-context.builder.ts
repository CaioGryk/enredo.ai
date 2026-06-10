import { StoryPremise, StoryPlayableCharacter } from '@prisma/client';

export interface SessionSetupData {
  selectedPremiseId?: string;
  selectedCharacterId?: string;
  protagonistName?: string;
  protagonistRole?: string;
  protagonistContext?: string;
}

export interface PremiseContext {
  title?: string;
  synopsis?: string;
  basePrompt?: string;
  openingScene?: string;
  tone?: string;
  styleGuide?: string;
  worldRules?: string;
  coverPrompt?: string;
  visualPrompt?: string;
}

export interface CharacterContext {
  name?: string;
  roleLabel?: string;
  narrativeFunction?: string;
  personality?: string;
  motivation?: string;
  secret?: string;
  relationshipToPlayer?: string;
  initialGoal?: string;
  startingSituation?: string;
  conflictPotential?: string;
  visualPrompt?: string;
}

export interface CurrentMemory {
  summary: string;
  worldState: string;
  characterState: string;
  importantChoices: string;
  openThreads: string;
  constraints: string;
  sceneCount: number;
}

export interface MemoryUpdate {
  summary?: string;
  worldState?: string;
  characterState?: string;
  importantChoices?: string[];
  openThreads?: string[];
  sceneCount?: number;
  codex?: StoryCodex;
}

export interface CodexChoice {
  scene: number;
  action: string;
  consequence?: string;
}

export interface CodexTimelineEntry {
  scene: number;
  summary: string;
}

export interface CodexCharacter {
  name: string;
  role: string;
  currentState?: string;
}

export interface NarrativeCharacterContext {
  id?: string;
  name: string;
  role: string;
  description?: string;
  personality?: string;
  motivation?: string;
  secret?: string;
  relationshipToPlayer?: string;
  initialGoal?: string;
  startingSituation?: string;
  conflictPotential?: string;
}

export interface StoryCodex {
  canonicalFacts: string[];
  characters: CodexCharacter[];
  relationships: string[];
  locations: string[];
  inventoryOrResources: string[];
  importantChoices: CodexChoice[];
  openThreads: string[];
  resolvedThreads: string[];
  timeline: CodexTimelineEntry[];
  doNotContradict: string[];
  playerIntent?: string;
}

const CODEX_LIMITS = {
  MAX_CANONICAL_FACTS: 20,
  MAX_CHARACTERS: 10,
  MAX_RELATIONSHIPS: 15,
  MAX_LOCATIONS: 10,
  MAX_INVENTORY: 10,
  MAX_IMPORTANT_CHOICES: 15,
  MAX_OPEN_THREADS: 10,
  MAX_RESOLVED_THREADS: 15,
  MAX_TIMELINE_ENTRIES: 15,
  MAX_DO_NOT_CONTRADICT: 10,
  MAX_PLAYER_INTENT_LENGTH: 200,
};

export class NarrativeContextBuilder {
  static buildSessionSetupData(
    premise?: StoryPremise | null,
    character?: StoryPlayableCharacter | null,
  ): SessionSetupData {
    const data: SessionSetupData = {};

    if (premise) {
      data.selectedPremiseId = premise.id;
    }

    if (character) {
      data.selectedCharacterId = character.id;
      data.protagonistName = character.name;
      data.protagonistRole = character.roleLabel;
      data.protagonistContext = JSON.stringify(this.buildCharacterContext(character));
    }

    return data;
  }

  static buildPremiseContext(premise?: StoryPremise | null): PremiseContext | null {
    if (!premise) return null;

    return {
      title: premise.title || undefined,
      synopsis: premise.synopsis || undefined,
      basePrompt: premise.basePrompt || undefined,
      openingScene: premise.openingScene || undefined,
      tone: premise.tone || undefined,
      styleGuide: premise.styleGuide || undefined,
      worldRules: premise.worldRules || undefined,
      coverPrompt: undefined,
      visualPrompt: undefined,
    };
  }

  static buildCharacterContext(character?: StoryPlayableCharacter | null): CharacterContext | null {
    if (!character) return null;

    return {
      name: character.name || undefined,
      roleLabel: character.roleLabel || undefined,
      narrativeFunction: character.narrativeFunction || undefined,
      personality: character.personality || undefined,
      motivation: character.motivation || undefined,
      secret: character.secret || undefined,
      relationshipToPlayer: character.relationshipToPlayer || undefined,
      initialGoal: character.initialGoal || undefined,
      startingSituation: character.startingSituation || undefined,
      conflictPotential: character.conflictPotential || undefined,
      visualPrompt: undefined,
    };
  }

  static buildStoryCharacters(
    story: { characters?: { name: string; role: string; description?: string }[] },
    premise?: { characters?: StoryPlayableCharacter[] } | null,
    selectedCharacter?: StoryPlayableCharacter | null,
  ): NarrativeCharacterContext[] {
    const characters: NarrativeCharacterContext[] = [];

    for (const c of (story as any).characters || []) {
      if (!c?.name) continue;
      characters.push({
        id: c.id,
        name: c.name,
        role: c.role || c.roleLabel || 'Personagem',
        description: c.description,
      });
    }

    const playableCharacters = [
      ...((premise as any)?.characters || []),
      selectedCharacter,
    ].filter(Boolean);

    for (const c of playableCharacters as any[]) {
      if (!c?.name) continue;
      characters.push({
        id: c.id,
        name: c.name,
        role: c.roleLabel || c.narrativeFunction || 'Personagem jogavel',
        description: c.description,
        personality: c.personality,
        motivation: c.motivation,
        secret: c.secret,
        relationshipToPlayer: c.relationshipToPlayer,
        initialGoal: c.initialGoal,
        startingSituation: c.startingSituation,
        conflictPotential: c.conflictPotential,
      });
    }

    const unique = new Map<string, NarrativeCharacterContext>();
    for (const character of characters) {
      const key = character.id || character.name.toLowerCase();
      const previous = unique.get(key);
      unique.set(key, { ...previous, ...character });
    }

    return Array.from(unique.values());
  }

  static createEmptyCodex(): StoryCodex {
    return {
      canonicalFacts: [],
      characters: [],
      relationships: [],
      locations: [],
      inventoryOrResources: [],
      importantChoices: [],
      openThreads: [],
      resolvedThreads: [],
      timeline: [],
      doNotContradict: [],
    };
  }

  static createInitialCodex(params: {
    story?: { title?: string; synopsis?: string; tone?: string; styleGuide?: string; worldRules?: string; characters?: { name: string; role: string; description?: string }[] };
    premise?: PremiseContext | null;
    character?: CharacterContext | null;
  }): StoryCodex {
    const codex = this.createEmptyCodex();
    const { story, premise, character } = params;

    if (story?.title) {
      codex.canonicalFacts.push(`Título: ${story.title}`);
    }
    if (story?.synopsis || premise?.synopsis) {
      codex.canonicalFacts.push(`Sinopse: ${premise?.synopsis || story?.synopsis}`);
    }

    if (premise?.title) {
      codex.canonicalFacts.push(`Premissa: ${premise.title}`);
    }

    if (story?.tone || premise?.tone) {
      codex.doNotContradict.push(`Tom narrativo: ${premise?.tone || story?.tone}`);
    }
    if (story?.styleGuide || premise?.styleGuide) {
      codex.doNotContradict.push(`Guia de estilo: ${premise?.styleGuide || story?.styleGuide}`);
    }
    if (story?.worldRules || premise?.worldRules) {
      codex.doNotContradict.push(`Regras do mundo: ${premise?.worldRules || story?.worldRules}`);
    }

    const storyChars = story?.characters || [];
    for (const char of storyChars) {
      codex.characters.push({ name: char.name, role: char.role, currentState: char.description });
    }

    if (character?.name) {
      const playerChar: CodexCharacter = {
        name: character.name,
        role: character.roleLabel || character.narrativeFunction || 'Protagonista',
        currentState: [
          character.personality ? `Personalidade: ${character.personality}` : '',
          character.motivation ? `Motivação: ${character.motivation}` : '',
          character.initialGoal ? `Objetivo inicial: ${character.initialGoal}` : '',
          character.startingSituation ? `Ponto de partida: ${character.startingSituation}` : '',
        ].filter(Boolean).join('; ') || undefined,
      };
      const existingIdx = codex.characters.findIndex(c => c.name === character.name);
      if (existingIdx >= 0) {
        codex.characters[existingIdx] = playerChar;
      } else {
        codex.characters.push(playerChar);
      }

      codex.canonicalFacts.push(`Protagonista: ${character.name}`);
      if (character.personality) {
        codex.canonicalFacts.push(`Personalidade do protagonista: ${character.personality}`);
      }
      if (character.initialGoal) {
        codex.canonicalFacts.push(`Objetivo inicial: ${character.initialGoal}`);
      }
      if (character.startingSituation) {
        codex.canonicalFacts.push(`Ponto de partida: ${character.startingSituation}`);
      }
      if (character.secret) {
        codex.canonicalFacts.push(`Segredo do protagonista: ${character.secret}`);
      }
    }

    return codex;
  }

  static computeUpdatedCodex(
    existingCodex: StoryCodex | null | undefined,
    params: {
      userAction: string;
      sceneText: string;
      sceneIndex: number;
      characters: { name: string; role: string; description?: string }[];
    },
  ): StoryCodex {
    const codex = existingCodex
      ? this.cloneCodex(existingCodex)
      : this.createEmptyCodex();

    const { userAction, sceneText, sceneIndex, characters } = params;

    codex.timeline.push({
      scene: sceneIndex,
      summary: sceneText.substring(0, 120).replace(/\n/g, ' '),
    });
    if (codex.timeline.length > CODEX_LIMITS.MAX_TIMELINE_ENTRIES) {
      codex.timeline = codex.timeline.slice(-CODEX_LIMITS.MAX_TIMELINE_ENTRIES);
    }

    const choiceEntry: CodexChoice = { scene: sceneIndex, action: userAction };
    const consequenceMatch = sceneText.match(/(?:como resultado|em consequência|isso (?:fez|levou|provocou|causou)|por causa disso)/i);
    if (consequenceMatch) {
      const afterConsequence = sceneText.substring(sceneText.indexOf(consequenceMatch[0]) + consequenceMatch[0].length).trim();
      if (afterConsequence.length > 0) {
        choiceEntry.consequence = afterConsequence.substring(0, 100);
      }
    }
    codex.importantChoices.push(choiceEntry);
    if (codex.importantChoices.length > CODEX_LIMITS.MAX_IMPORTANT_CHOICES) {
      codex.importantChoices = codex.importantChoices.slice(-CODEX_LIMITS.MAX_IMPORTANT_CHOICES);
    }

    const locationIndicators = ['entrou em', 'saiu de', 'foi para', 'chegou a', 'chegou em', 'caminhou até', 'entrou no', 'entrou na', 'estava em', 'estava no', 'estava na'];
    for (const indicator of locationIndicators) {
      const idx = sceneText.toLowerCase().indexOf(indicator);
      if (idx >= 0) {
        const after = sceneText.substring(idx + indicator.length).trim();
        const locationEnd = after.search(/[.,;:!?\n]/);
        const location = locationEnd >= 0 ? after.substring(0, locationEnd).trim() : after.substring(0, 60).trim();
        if (location.length > 1 && location.length < 60) {
          const foundLoc = `Cena ${sceneIndex}: ${location}`;
          if (!codex.locations.includes(foundLoc)) {
            codex.locations.push(foundLoc);
            if (codex.locations.length > CODEX_LIMITS.MAX_LOCATIONS) {
              codex.locations.shift();
            }
          }
        }
        break;
      }
    }

    for (const char of characters) {
      if (sceneText.toLowerCase().includes(char.name.toLowerCase())) {
        const existing = codex.characters.find(c => c.name === char.name);
        if (!existing) {
          codex.characters.push({
            name: char.name,
            role: char.role,
            currentState: `Mencionado na cena ${sceneIndex}`,
          });
        } else {
          existing.currentState = `Ativo na cena ${sceneIndex}`;
        }
        if (codex.characters.length > CODEX_LIMITS.MAX_CHARACTERS) {
          codex.characters = codex.characters.slice(-CODEX_LIMITS.MAX_CHARACTERS);
        }
      }
    }

    const questionPatterns = /[?]/;
    const cliffhangerPatterns = /de repente|então|subitamente|naquele momento|mas então|no entanto/i;
    const hasQuestion = questionPatterns.test(sceneText);
    const hasCliffhanger = cliffhangerPatterns.test(sceneText);

    if (hasQuestion || hasCliffhanger) {
      const thread = `Cena ${sceneIndex}: ${sceneText.substring(0, 100).replace(/\n/g, ' ')}...`;
      if (!codex.openThreads.includes(thread)) {
        codex.openThreads.push(thread);
        if (codex.openThreads.length > CODEX_LIMITS.MAX_OPEN_THREADS) {
          const resolved = codex.openThreads.shift();
          if (resolved) {
            codex.resolvedThreads.push(resolved);
            if (codex.resolvedThreads.length > CODEX_LIMITS.MAX_RESOLVED_THREADS) {
              codex.resolvedThreads = codex.resolvedThreads.slice(-CODEX_LIMITS.MAX_RESOLVED_THREADS);
            }
          }
        }
      }
    }

    const factIndicators = ['descobriu que', 'revelou que', 'lembrou que', 'percebeu que', 'confirmou que', 'sabia que'];
    for (const indicator of factIndicators) {
      const idx = sceneText.toLowerCase().indexOf(indicator);
      if (idx >= 0) {
        const factStart = sceneText.substring(idx);
        const factEnd = factStart.search(/[.!?\n]/);
        const fact = factEnd >= 0 ? factStart.substring(0, factEnd).trim() : factStart.substring(0, 120).trim();
        if (fact.length > 5 && fact.length < 150) {
          codex.canonicalFacts.push(fact);
          if (codex.canonicalFacts.length > CODEX_LIMITS.MAX_CANONICAL_FACTS) {
            codex.canonicalFacts = codex.canonicalFacts.slice(-CODEX_LIMITS.MAX_CANONICAL_FACTS);
          }
          break;
        }
      }
    }

    if (userAction && userAction !== 'continuar' && userAction !== 'início' && userAction !== 'primeira cena' && userAction !== 'Início da história') {
      const prevIntent = codex.playerIntent;
      codex.playerIntent = userAction.length > CODEX_LIMITS.MAX_PLAYER_INTENT_LENGTH
        ? userAction.substring(0, CODEX_LIMITS.MAX_PLAYER_INTENT_LENGTH)
        : userAction;
      if (prevIntent && prevIntent !== codex.playerIntent) {
        const combined = `${prevIntent}; ${codex.playerIntent}`;
        codex.playerIntent = combined.length > CODEX_LIMITS.MAX_PLAYER_INTENT_LENGTH
          ? combined.substring(0, CODEX_LIMITS.MAX_PLAYER_INTENT_LENGTH)
          : combined;
      }
    }

    return codex;
  }

  static serializeCodexForPrompt(codex: StoryCodex | null | undefined): string {
    if (!codex) return '';

    const parts: string[] = [];
    parts.push('--- CODEX NARRATIVO ---');

    if (codex.canonicalFacts.length > 0) {
      parts.push('FATOS CANÔNICOS (NÃO CONTRADIZER):');
      for (const fact of codex.canonicalFacts) {
        parts.push(`  - ${fact}`);
      }
    }

    if (codex.characters.length > 0) {
      parts.push('PERSONAGENS:');
      for (const char of codex.characters) {
        const state = char.currentState ? ` [${char.currentState}]` : '';
        parts.push(`  - ${char.name} (${char.role})${state}`);
      }
    }

    if (codex.relationships.length > 0) {
      parts.push('RELACIONAMENTOS:');
      for (const rel of codex.relationships) {
        parts.push(`  - ${rel}`);
      }
    }

    if (codex.locations.length > 0) {
      parts.push('LOCAIS CONHECIDOS:');
      for (const loc of codex.locations) {
        parts.push(`  - ${loc}`);
      }
    }

    if (codex.importantChoices.length > 0) {
      parts.push('ESCOLHAS IMPORTANTES DO JOGADOR:');
      for (const choice of codex.importantChoices) {
        const suffix = choice.consequence ? ` → ${choice.consequence}` : '';
        parts.push(`  - [Cena ${choice.scene}] ${choice.action}${suffix}`);
      }
    }

    if (codex.openThreads.length > 0) {
      parts.push('TRILHAS EM ABERTO (MANTER COERÊNCIA):');
      for (const thread of codex.openThreads) {
        parts.push(`  - ${thread}`);
      }
    }

    if (codex.resolvedThreads.length > 0) {
      parts.push('TRILHAS RESOLVIDAS:');
      for (const thread of codex.resolvedThreads) {
        parts.push(`  - ${thread}`);
      }
    }

    if (codex.timeline.length > 0) {
      parts.push('LINHA DO TEMPO:');
      for (const entry of codex.timeline) {
        parts.push(`  - Cena ${entry.scene}: ${entry.summary}`);
      }
    }

    if (codex.doNotContradict.length > 0) {
      parts.push('NÃO CONTRADIZER:');
      for (const rule of codex.doNotContradict) {
        parts.push(`  - ${rule}`);
      }
    }

    if (codex.playerIntent) {
      parts.push(`INTENÇÃO ATUAL DO JOGADOR: ${codex.playerIntent}`);
    }

    parts.push('--- FIM CODEX ---');
    return parts.join('\n');
  }

  private static cloneCodex(codex: StoryCodex): StoryCodex {
    return {
      canonicalFacts: [...codex.canonicalFacts],
      characters: codex.characters.map(c => ({ ...c })),
      relationships: [...codex.relationships],
      locations: [...codex.locations],
      inventoryOrResources: [...codex.inventoryOrResources],
      importantChoices: codex.importantChoices.map(c => ({ ...c })),
      openThreads: [...codex.openThreads],
      resolvedThreads: [...codex.resolvedThreads],
      timeline: codex.timeline.map(t => ({ ...t })),
      doNotContradict: [...codex.doNotContradict],
      playerIntent: codex.playerIntent,
    };
  }

  static computeUpdatedMemory(
    currentMemory: CurrentMemory,
    userAction: string,
    sceneText: string,
    choices: string[],
    characters: { name: string; role: string; description?: string }[],
    sceneNumber: number,
  ): MemoryUpdate {
    const MAX_SUMMARY_LENGTH = 2000;
    const MAX_IMPORTANT_CHOICES_LENGTH = 1500;
    const MAX_OPEN_THREADS_LENGTH = 1500;
    const MAX_CHARACTER_STATE_LENGTH = 2000;
    const MAX_WORLD_STATE_LENGTH = 2000;

    let newSummary = currentMemory.summary;
    if (sceneNumber % 5 === 0) {
      newSummary += `\n[Scene ${sceneNumber}] ${sceneText.substring(0, 200)}...`;
      if (newSummary.length > MAX_SUMMARY_LENGTH) {
        newSummary = newSummary.substring(newSummary.length - MAX_SUMMARY_LENGTH);
      }
    }

    let newImportantChoices = Array.isArray(currentMemory.importantChoices) 
      ? [...currentMemory.importantChoices] 
      : String(currentMemory.importantChoices || '').split('\n').filter(Boolean);
    
    const choiceEntry = `[Cena ${sceneNumber}] Usuário: "${userAction.substring(0, 80)}"`;
    newImportantChoices.push(choiceEntry);
    
    if (newImportantChoices.join('\n').length > MAX_IMPORTANT_CHOICES_LENGTH) {
      newImportantChoices = [newImportantChoices[newImportantChoices.length - 1]];
    }

    let newOpenThreads = Array.isArray(currentMemory.openThreads) 
      ? [...currentMemory.openThreads] 
      : String(currentMemory.openThreads || '').split('\n').filter(Boolean);
    
    const questionPatterns = [/\?/g, /onde/, /por que/, /como/, /quem/];
    const hasQuestion = questionPatterns.some(p => p.test(sceneText.toLowerCase()));
    const hasCliffhanger = /de repente|mas|de outro lado|continua/gi.test(sceneText);
    const newThreadEntry = `[Cena ${sceneNumber}] ${choices[0] || 'continuar'}${hasQuestion || hasCliffhanger ? ' (em aberto)' : ''}`;
    newOpenThreads.push(newThreadEntry);
    
    if (newOpenThreads.join('\n').length > MAX_OPEN_THREADS_LENGTH) {
      newOpenThreads = [newOpenThreads[newOpenThreads.length - 1]];
    }

    let newCharacterState = currentMemory.characterState;
    for (const char of characters) {
      if (sceneText.toLowerCase().includes(char.name.toLowerCase())) {
        const charMention = `${char.name}: mencionado na cena.\n`;
        if (!currentMemory.characterState.includes(charMention)) {
          newCharacterState += charMention;
        }
      }
    }
    if (newCharacterState.length > MAX_CHARACTER_STATE_LENGTH) {
      newCharacterState = newCharacterState.substring(newCharacterState.length - MAX_CHARACTER_STATE_LENGTH);
    }

    let newWorldState = currentMemory.worldState;
    const locationIndicators = ['entrou', 'saiu', 'foi para', 'chegou', 'encontrou', 'caminhou'];
    const hasLocationChange = locationIndicators.some(ind => sceneText.toLowerCase().includes(ind));
    if (hasLocationChange) {
      const worldNote = `[Cena ${sceneNumber}] ambiente/acao mencionada.\n`;
      newWorldState += worldNote;
    }
    if (newWorldState.length > MAX_WORLD_STATE_LENGTH) {
      newWorldState = newWorldState.substring(newWorldState.length - MAX_WORLD_STATE_LENGTH);
    }

    return {
      summary: newSummary,
      worldState: newWorldState,
      characterState: newCharacterState,
      importantChoices: newImportantChoices,
      openThreads: newOpenThreads,
    };
  }

  static trimPreviousScenes(
    events: { sceneText: string; choices?: string[] }[],
    maxEvents: number = 3,
    maxCharsPerScene: number = 1200,
    maxTotalChars: number = 4000,
  ): { trimmedText: string | undefined; eventCount: number } {
    if (!events || events.length === 0) {
      return { trimmedText: undefined, eventCount: 0 };
    }

    const limited = events.slice(-maxEvents);
    const withLengthLimit = limited.map(e => ({
      sceneText: e.sceneText.length > maxCharsPerScene
        ? e.sceneText.substring(0, maxCharsPerScene) + '...'
        : e.sceneText,
      choices: e.choices,
    }));

    let joined = withLengthLimit.map(e => e.sceneText).join('\n\n---\n\n');

    if (joined.length > maxTotalChars) {
      joined = joined.substring(0, maxTotalChars - 15) + '... [contexto truncado]';
    }

    return { trimmedText: joined, eventCount: limited.length };
  }
}
