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
}

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
      conflictPotential: character.conflictPotential || undefined,
      visualPrompt: undefined,
    };
  }

  static buildStoryCharacters(story: { characters?: { name: string; role: string; description?: string }[] }): { name: string; role: string; description?: string }[] {
    return (story as any).characters?.map((c: any) => ({
      name: c.name,
      role: c.role,
      description: c.description,
    })) || [];
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

    // Update summary
    let newSummary = currentMemory.summary;
    if (sceneNumber % 5 === 0) {
      newSummary += `\n[Scene ${sceneNumber}] ${sceneText.substring(0, 200)}...`;
      if (newSummary.length > MAX_SUMMARY_LENGTH) {
        newSummary = newSummary.substring(newSummary.length - MAX_SUMMARY_LENGTH);
      }
    }

    // Update important choices
    let newImportantChoices = Array.isArray(currentMemory.importantChoices) 
      ? [...currentMemory.importantChoices] 
      : String(currentMemory.importantChoices || '').split('\n').filter(Boolean);
    
    const choiceEntry = `[Scene ${sceneNumber}] ${choices[0] || 'continuar'}${sceneNumber % 3 === 0 ? ' (em aberto)' : ''}`;
    newImportantChoices.push(choiceEntry);
    
    if (newImportantChoices.join('\n').length > MAX_IMPORTANT_CHOICES_LENGTH) {
      newImportantChoices = [newImportantChoices[newImportantChoices.length - 1]];
    }

    // Update open threads
    let newOpenThreads = Array.isArray(currentMemory.openThreads) 
      ? [...currentMemory.openThreads] 
      : String(currentMemory.openThreads || '').split('\n').filter(Boolean);
    
    const questionPatterns = [/\?/g, /onde/, /por que/, /como/, /quem/];
    const hasQuestion = questionPatterns.some(p => p.test(sceneText.toLowerCase()));
    const hasCliffhanger = /de repente|mas|de outro lado|continua/gi.test(sceneText);
    const newThreadEntry = `[Scene ${sceneNumber}] ${choices[0] || 'continuar'}${hasQuestion || hasCliffhanger ? ' (em aberto)' : ''}`;
    newOpenThreads.push(newThreadEntry);
    
    if (newOpenThreads.join('\n').length > MAX_OPEN_THREADS_LENGTH) {
      newOpenThreads = [newOpenThreads[newOpenThreads.length - 1]];
    }

    // Update character state
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

    // Update world state
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
