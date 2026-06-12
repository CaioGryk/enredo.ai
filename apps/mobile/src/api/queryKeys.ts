export const queryKeys = {
  stories: ['stories'] as const,
  story: (storyId?: string) => ['story', storyId] as const,
  storyCharacters: (storyId?: string) => ['story-characters', storyId] as const,
  storyPremises: (storyId?: string) => ['story-premises', storyId] as const,
  premiseCharacters: (premiseId?: string) => ['premise-characters', premiseId] as const,
  sessions: (status: string = 'ALL') => ['sessions', status] as const,
  session: (sessionId?: string) => ['session', sessionId] as const,
  subscription: ['subscription'] as const,
};
