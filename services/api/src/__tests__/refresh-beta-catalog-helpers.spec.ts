import {
  ICP_SEEDS,
  BATCH_SLUG_PREFIX,
  slugify,
  makeBatchSlug,
  countAssets,
  hasPendingWithError,
  isLikelyEnglish,
  scanForEnglish,
  checkDistribution,
  allHaveUrls,
} from '../../scripts/refresh-beta-catalog-helpers';

describe('refresh-beta-catalog helpers', () => {
  describe('ICP_SEEDS', () => {
    it('has exactly 15 concepts', () => {
      expect(ICP_SEEDS).toHaveLength(15);
    });

    it('all concepts have 5 keywords each', () => {
      for (const seed of ICP_SEEDS) {
        expect(seed.keywords).toHaveLength(5);
      }
    });

    it('all concepts have metadata', () => {
      for (const seed of ICP_SEEDS) {
        expect(seed.genre).toBeTruthy();
        expect(seed.tone).toBeTruthy();
        expect(seed.targetAudience).toBeTruthy();
        expect(seed.constraints).toBeTruthy();
        expect(seed.constraints.length).toBeGreaterThan(10);
      }
    });
  });

  describe('BATCH_SLUG_PREFIX', () => {
    it('is non-empty', () => {
      expect(BATCH_SLUG_PREFIX.length).toBeGreaterThan(0);
    });
  });

  describe('slugify', () => {
    it('converts to kebab-case', () => {
      expect(slugify('CEO segredo poder')).toBe('ceo-segredo-poder');
    });

    it('strips leading/trailing dashes', () => {
      expect(slugify('-test-')).toBe('test');
    });
  });

  describe('makeBatchSlug', () => {
    it('produces deterministic slug with prefix and first 2 keywords', () => {
      expect(makeBatchSlug(0, ['CEO', 'segredo', 'poder'])).toBe('beta-icp-refresh-1-ceo-segredo');
    });
  });

  describe('countAssets', () => {
    it('counts success/failed/pending from imageUrl', () => {
      const r = countAssets([
        { imageUrl: 'x', imageGenerationStatus: 'SUCCESS', imageError: null },
        { imageUrl: null, imageGenerationStatus: 'FAILED', imageError: '429' },
        { imageUrl: null, imageGenerationStatus: 'PENDING', imageError: null },
      ]);
      expect(r).toEqual({ total: 3, success: 1, failed: 1, pending: 1 });
    });

    it('counts coverUrl for premises', () => {
      const r = countAssets([
        { coverUrl: 'x', coverGenerationStatus: 'SUCCESS', coverError: null },
        { coverUrl: null, coverGenerationStatus: 'FAILED', coverError: 'timeout' },
        { coverUrl: null, coverGenerationStatus: 'NOT_REQUESTED', coverError: null },
      ]);
      expect(r).toEqual({ total: 3, success: 1, failed: 2, pending: 0 });
    });

    it('returns zeros for empty array', () => {
      expect(countAssets([])).toEqual({ total: 0, success: 0, failed: 0, pending: 0 });
    });
  });

  describe('hasPendingWithError', () => {
    it('true when PENDING + error', () => {
      expect(hasPendingWithError([{ imageGenerationStatus: 'PENDING', imageError: '429' }])).toBe(true);
    });

    it('false when PENDING without error', () => {
      expect(hasPendingWithError([{ imageGenerationStatus: 'PENDING', imageError: null }])).toBe(false);
    });

    it('false for all SUCCESS', () => {
      expect(hasPendingWithError([{ imageGenerationStatus: 'SUCCESS', imageError: null }])).toBe(false);
    });
  });

  describe('isLikelyEnglish', () => {
    it('detects English text', () => {
      expect(isLikelyEnglish(
        'The young hacker discovers a hidden network of digital ghosts operating in the abandoned metro tunnels.',
      )).toBe(true);
    });

    it('accepts pt-BR text', () => {
      expect(isLikelyEnglish('Um jovem hacker descobre uma rede oculta de fantasmas digitais')).toBe(false);
    });

    it('returns false for short text', () => {
      expect(isLikelyEnglish('The cat')).toBe(false);
    });
  });

  describe('scanForEnglish', () => {
    const story = {
      id: 's1', title: 'O Segredo do CEO', genres: ['romance contemporâneo'], synopsis: 'Uma advogada descobre...', openingScene: 'Ela entrou na sala...', basePrompt: null, tone: null, styleGuide: null, worldRules: null,
      premises: [{
        id: 'p1', title: 'O Escritório', synopsis: 'Tudo começa...', openingScene: 'Ela recebeu uma ligação...', basePrompt: null, tone: null, styleGuide: null, worldRules: null,
        characters: [{ id: 'c1', name: 'Ana', roleLabel: 'Advogada', description: 'Ela sabia...', personality: 'Determinada', motivation: 'Justiça', secret: null, relationshipToPlayer: null, initialGoal: null, startingSituation: null, conflictPotential: null, visualPrompt: null }],
      }],
    };

    it('returns empty for pt-BR content', () => {
      expect(scanForEnglish([story])).toEqual([]);
    });

    it('finds English in story fields', () => {
      const eng = { ...story, title: 'The CEO Secret', synopsis: 'A young lawyer discovers the hidden truth behind the corporation.', openingScene: 'She walked into the dark room...' };
      const findings = scanForEnglish([eng]);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('story');
    });

    it('finds English in premise fields', () => {
      const eng = { ...story, premises: [{ ...story.premises[0], title: 'The Dark Office', synopsis: 'Everything begins when the young lawyer discovers the hidden truth behind the old corporation.', basePrompt: 'A noir thriller about corporate secrets and hidden agendas.', tone: 'dark and gritty' }] };
      const findings = scanForEnglish([eng]);
      const premFindings = findings.filter((f) => f.type === 'premise');
      expect(premFindings.length).toBeGreaterThan(0);
    });

    it('finds English in character fields', () => {
      const engStory = {
        ...story,
        premises: [{
          ...story.premises[0],
          characters: [{ ...story.premises[0].characters[0], roleLabel: 'The Lawyer', description: 'She knew the truth hidden in the old files.', personality: 'Determined and brave', motivation: 'Justice and revenge' }],
        }],
      };
      const findings = scanForEnglish([engStory]);
      const charFindings = findings.filter((f) => f.type === 'character');
      expect(charFindings.length).toBeGreaterThan(0);
    });

    it('scans story genres, premise openingScene, and character hidden fields', () => {
      const engStory = {
        ...story,
        genres: ['dark romance', 'corporate mystery'],
        premises: [{
          ...story.premises[0],
          openingScene: 'She walked into the old office and found the secret letter on the desk.',
          characters: [{
            ...story.premises[0].characters[0],
            secret: 'She knows the truth about the murder and will never tell anyone.',
            relationshipToPlayer: 'She is your rival and your only ally in the investigation.',
          }],
        }],
      };
      const findings = scanForEnglish([engStory]);
      expect(findings.some((f) => f.type === 'story' && f.fields.includes('genres'))).toBe(true);
      expect(findings.some((f) => f.type === 'premise' && f.fields.includes('openingScene'))).toBe(true);
      expect(findings.some((f) => f.type === 'character' && f.fields.includes('secret'))).toBe(true);
      expect(findings.some((f) => f.type === 'character' && f.fields.includes('relationshipToPlayer'))).toBe(true);
    });
  });

  describe('checkDistribution', () => {
    it('passes with ≥3 premises and ≥3 chars on first premise', () => {
      const stories = [{
        id: 's1', title: 'Test',
        premises: [
          { id: 'p1', sortOrder: 0, createdAt: '2025-01-01', characters: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] },
          { id: 'p2', sortOrder: 1, createdAt: '2025-01-02', characters: [] },
          { id: 'p3', sortOrder: 2, createdAt: '2025-01-03', characters: [] },
        ],
      }];
      const checks = checkDistribution(stories);
      expect(checks[0].ok).toBe(true);
      expect(checks[0].premiseCount).toBe(3);
      expect(checks[0].characterCount).toBe(3);
    });

    it('fails when < 3 premises', () => {
      const stories = [{
        id: 's1', title: 'Test',
        premises: [
          { id: 'p1', sortOrder: 0, createdAt: '2025-01-01', characters: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] },
        ],
      }];
      const checks = checkDistribution(stories);
      expect(checks[0].ok).toBe(false);
      expect(checks[0].premiseCount).toBe(1);
    });

    it('fails when < 3 chars on first premise', () => {
      const stories = [{
        id: 's1', title: 'Test',
        premises: [
          { id: 'p2', sortOrder: 2, createdAt: '2025-01-03', characters: [] },
          { id: 'p1', sortOrder: 0, createdAt: '2025-01-01', characters: [{ id: 'c1' }] },
          { id: 'p3', sortOrder: 1, createdAt: '2025-01-02', characters: [] },
        ],
      }];
      const checks = checkDistribution(stories);
      expect(checks[0].ok).toBe(false);
      expect(checks[0].characterCount).toBe(1);
    });

    it('selects first premise by sortOrder', () => {
      const stories = [{
        id: 's1', title: 'Test',
        premises: [
          { id: 'p_late', sortOrder: 5, createdAt: '2025-01-05', characters: [{ id: 'cx' }] },
          { id: 'p_first', sortOrder: 0, createdAt: '2025-01-01', characters: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
          { id: 'p_mid', sortOrder: 2, createdAt: '2025-01-02', characters: [] },
        ],
      }];
      const checks = checkDistribution(stories);
      expect(checks[0].characterCount).toBe(3);
    });
  });

  describe('allHaveUrls', () => {
    it('true when all have coverUrl', () => {
      expect(allHaveUrls([{ coverUrl: 'x' }, { coverUrl: 'y' }, { coverUrl: 'z' }])).toBe(true);
    });

    it('false when any is missing', () => {
      expect(allHaveUrls([{ coverUrl: 'x', imageUrl: null }, { coverUrl: null, imageUrl: null }, { coverUrl: 'z', imageUrl: null }])).toBe(false);
    });

    it('false for empty array', () => {
      expect(allHaveUrls([])).toBe(false);
    });

    it('uses imageUrl as fallback', () => {
      expect(allHaveUrls([{ coverUrl: null, imageUrl: 'x' }, { coverUrl: 'y', imageUrl: null }])).toBe(true);
    });
  });
});
