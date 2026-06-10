/**
 * Pure helpers for beta catalog refresh.
 * Extracted for testability — no DB, no HTTP, no side effects.
 */

export interface IcPSeed {
  keywords: string[];
  genre: string;
  tone: string;
  targetAudience: string;
  constraints: string;
}

/** Batch prefix for idempotency — all story slugs start with this. */
export const BATCH_SLUG_PREFIX = 'beta-icp-refresh-';

export const ICP_SEEDS: IcPSeed[] = [
  // ── 10 Romance / Dark Romance Soft ICP ──
  { keywords: ['CEO', 'segredo', 'poder', 'herança', 'advogada'], genre: 'romance contemporâneo', tone: 'tenso e sensual', targetAudience: 'feminina adulta', constraints: 'Sem cenas explícitas. Tensão romântica forte, fade-to-black. Play Store safe.' },
  { keywords: ['máfia', 'segredo', 'proteção', 'acordo', 'vingança'], genre: 'romance sombrio', tone: 'perigoso e envolvente', targetAudience: 'feminina adulta', constraints: 'Sem glorificação de crime real. Foco em tensão emocional e escolhas difíceis. Play Store safe.' },
  { keywords: ['ilha', 'desaparecimento', 'jornalista', 'herdeiro', 'investigação'], genre: 'mistério romântico', tone: 'atmosférico e sedutor', targetAudience: 'feminina adulta', constraints: 'Tensão entre atração e desconfiança. Fade-to-black. Play Store safe.' },
  { keywords: ['vinícola', 'família', 'dívida', 'rival', 'redenção'], genre: 'drama romântico', tone: 'emocional e sensual', targetAudience: 'feminina adulta', constraints: 'Conflito familiar e química irresistível entre rivais.' },
  { keywords: ['hotel', 'passado', 'recomeço', 'proprietário', 'segredo'], genre: 'romance contemporâneo', tone: 'envolvente e misterioso', targetAudience: 'feminina adulta', constraints: 'Hotel antigo na serra. Mistério e atração.' },
  { keywords: ['joia', 'roubo', 'detetive', 'suspeita', 'intriga'], genre: 'suspense romântico', tone: 'elegante e perigoso', targetAudience: 'feminina adulta', constraints: 'Alta sociedade. Crime e sedução.' },
  { keywords: ['fazenda', 'herança', 'pecuarista', 'veterinária', 'conflito'], genre: 'romance rural', tone: 'rústico e apaixonante', targetAudience: 'feminina adulta', constraints: 'Brasil profundo. Orgulho e amor.' },
  { keywords: ['cartas', 'amante', 'segunda guerra', 'bisneta', 'descoberta'], genre: 'romance histórico', tone: 'nostálgico e intenso', targetAudience: 'feminina adulta', constraints: 'Duas linhas do tempo. Cartas revelam amor proibido.' },
  { keywords: ['livraria', 'escritor', 'bloqueio', 'musa', 'anonimato'], genre: 'comédia romântica', tone: 'leve e inteligente', targetAudience: 'feminina jovem adulta', constraints: 'Escritor famoso se apaixona pela dona da livraria sem revelar identidade.' },
  { keywords: ['restaurante', 'chef', 'crítica', 'competição', 'parceria'], genre: 'romance gastronômico', tone: 'sensual e vibrante', targetAudience: 'feminina adulta', constraints: 'Dois chefs rivais forçados a trabalhar juntos.' },

  // ── 5 Fantasy / Romantasy ICP ──
  { keywords: ['corte', 'fada', 'maldição', 'herdeira', 'lua'], genre: 'fantasia romântica', tone: 'mágico e sombrio', targetAudience: 'feminina jovem adulta', constraints: 'Corte das Sombras. Príncipe amaldiçoado e herdeira humana.' },
  { keywords: ['dragão', 'vínculo', 'guerreira', 'reino', 'profecia'], genre: 'fantasia épica romântica', tone: 'épico e emocional', targetAudience: 'feminina adulta', constraints: 'Vínculo proibido entre cavaleira e dragão ancestral.' },
  { keywords: ['biblioteca', 'portal', 'guardiã', 'demônio', 'acordo'], genre: 'fantasia urbana', tone: 'misterioso e sedutor', targetAudience: 'feminina adulta', constraints: 'Bibliotecária descobre portal para submundo. Acordo perigoso com guardião.' },
  { keywords: ['runas', 'sacerdotisa', 'deus', 'sacrifício', 'tempo'], genre: 'fantasia mitológica', tone: 'sagrado e proibido', targetAudience: 'feminina adulta', constraints: 'Sacerdotisa e deus caído. Amor que desafia o panteão.' },
  { keywords: ['clã', 'lobo', 'lua', 'rival', 'marca'], genre: 'fantasia sobrenatural', tone: 'selvagem e intenso', targetAudience: 'feminina jovem adulta', constraints: 'Dois clãs rivais. Marcas lunares unem herdeiros.' },
];

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function makeBatchSlug(index: number, keywords: string[]): string {
  return `${BATCH_SLUG_PREFIX}${index + 1}-${slugify(keywords.slice(0, 2).join('-'))}`;
}

export interface AssetCounts {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

export function countAssets(items: Array<{
  coverUrl?: string | null;
  imageUrl?: string | null;
  coverGenerationStatus?: string | null;
  imageGenerationStatus?: string | null;
  coverError?: string | null;
  imageError?: string | null;
}>): AssetCounts {
  let success = 0;
  let failed = 0;
  let pending = 0;
  for (const item of items) {
    const url = item.coverUrl ?? item.imageUrl;
    const status = item.coverGenerationStatus ?? item.imageGenerationStatus;
    const error = item.coverError ?? item.imageError;
    if (url) { success++; continue; }
    if (status === 'FAILED' || error) { failed++; continue; }
    if (status === 'PENDING') { pending++; continue; }
    failed++;
  }
  return { total: items.length, success, failed, pending };
}

export function hasPendingWithError(items: Array<{
  coverGenerationStatus?: string | null;
  imageGenerationStatus?: string | null;
  coverError?: string | null;
  imageError?: string | null;
}>): boolean {
  return items.some((item) => {
    const status = item.coverGenerationStatus ?? item.imageGenerationStatus;
    const error = item.coverError ?? item.imageError;
    return status === 'PENDING' && !!error;
  });
}

// ── PT-BR language validation ─────────────────────────────────────────────

const ENGLISH_MARKERS: RegExp[] = [
  /\bthe\b/i, /\bis\b/i, /\bare\b/i, /\bwas\b/i, /\bwere\b/i,
  /\bthey\b/i, /\btheir\b/i, /\bthem\b/i, /\bthis\b/i, /\bthat\b/i,
  /\byou\b/i, /\byour\b/i, /\bwith\b/i, /\bfrom\b/i, /\bhave\b/i,
  /\bit\b/i, /\bhas\b/i, /\bbeen\b/i, /\bwill\b/i, /\bcan\b/i,
  /\bwho\b/i, /\bwhich\b/i, /\bwhere\b/i, /\bwhen\b/i, /\bwhat\b/i,
  /\bhow\b/i, /\ball\b/i, /\bmust\b/i, /\bshould\b/i, /\bcould\b/i,
  /\band\b/i, /\bthe\b/i,
  /\ba\b/i, /\ban\b/i,
  /\bin\b/i, /\bof\b/i, /\bto\b/i, /\bfor\b/i,
  /\bhe\b/i, /\bshe\b/i, /\bhis\b/i, /\bher\b/i, /\bhim\b/i,
  /\bbut\b/i, /\bnot\b/i, /\bjust\b/i, /\bonly\b/i, /\bstill\b/i,
  /\bvery\b/i, /\breally\b/i, /\balways\b/i, /\bnever\b/i,
  /\bthere\b/i, /\bhere\b/i, /\bthen\b/i, /\bnow\b/i, /\bever\b/i,
  /\babout\b/i, /\binto\b/i, /\bout\b/i, /\bup\b/i, /\bdown\b/i,
  /\bover\b/i, /\bunder\b/i, /\bbetween\b/i, /\bthrough\b/i,
  /\balso\b/i, /\btoo\b/i, /\bmore\b/i, /\bmuch\b/i, /\bmany\b/i,
  /\bthese\b/i, /\bthose\b/i, /\bother\b/i,
  /\bdoes\b/i, /\bdid\b/i, /\bdone\b/i, /\bdoing\b/i,
];

const ENGLISH_GENRE_MARKERS: RegExp[] = [
  /\bdark romance\b/i,
  /\bcontemporary romance\b/i,
  /\bromantic fantasy\b/i,
  /\burban fantasy\b/i,
  /\bepic fantasy\b/i,
  /\bhistorical romance\b/i,
  /\bromantic suspense\b/i,
  /\bcorporate mystery\b/i,
];

export function isLikelyEnglish(...texts: (string | undefined | null)[]): boolean {
  const combined = texts.filter(Boolean).join(' ').toLowerCase();
  if (ENGLISH_GENRE_MARKERS.some((r) => r.test(combined))) return true;
  if (combined.length < 30) return false;
  const matchCount = ENGLISH_MARKERS.filter((r) => r.test(combined)).length;
  return matchCount >= 4;
}

export interface EnglishFinding {
  type: 'story' | 'premise' | 'character';
  id: string;
  title: string;
  fields: string[];
}

export function scanForEnglish(
  stories: Array<{
    id: string;
    title: string;
    genres?: string[] | null;
    synopsis?: string | null;
    openingScene?: string | null;
    basePrompt?: string | null;
    tone?: string | null;
    styleGuide?: string | null;
    worldRules?: string | null;
    premises?: Array<{
      id: string;
      title?: string | null;
      synopsis?: string | null;
      openingScene?: string | null;
      basePrompt?: string | null;
      tone?: string | null;
      styleGuide?: string | null;
      worldRules?: string | null;
      characters?: Array<{
        id: string;
        name?: string | null;
        roleLabel?: string | null;
        description?: string | null;
        personality?: string | null;
        motivation?: string | null;
        secret?: string | null;
        relationshipToPlayer?: string | null;
        initialGoal?: string | null;
        startingSituation?: string | null;
        conflictPotential?: string | null;
        visualPrompt?: string | null;
      }>;
    }>;
  }>,
): EnglishFinding[] {
  const findings: EnglishFinding[] = [];

  for (const story of stories) {
    const storyText = [
      story.title,
      ...(story.genres || []),
      story.synopsis,
      story.openingScene,
      story.basePrompt,
      story.tone,
      story.styleGuide,
      story.worldRules,
    ].filter(Boolean).join(' ');

    if (isLikelyEnglish(storyText)) {
      const suspect: string[] = [];
      for (const [k, v] of [
        ['title', story.title],
        ['genres', (story.genres || []).join(' ')],
        ['synopsis', story.synopsis],
        ['openingScene', story.openingScene],
        ['basePrompt', story.basePrompt],
        ['tone', story.tone],
        ['styleGuide', story.styleGuide],
        ['worldRules', story.worldRules],
      ] as [string, string | null | undefined][]) {
        if (v && isLikelyEnglish(v)) suspect.push(k);
      }
      findings.push({ type: 'story', id: story.id, title: story.title || story.id, fields: suspect });
    }

    for (const premise of (story.premises || [])) {
      const premText = [
        premise.title,
        premise.synopsis,
        premise.openingScene,
        premise.basePrompt,
        premise.tone,
        premise.styleGuide,
        premise.worldRules,
      ].filter(Boolean).join(' ');
      if (isLikelyEnglish(premText)) {
        const suspect: string[] = [];
        for (const [k, v] of [
          ['title', premise.title],
          ['synopsis', premise.synopsis],
          ['openingScene', premise.openingScene],
          ['basePrompt', premise.basePrompt],
          ['tone', premise.tone],
          ['styleGuide', premise.styleGuide],
          ['worldRules', premise.worldRules],
        ] as [string, string | null | undefined][]) {
          if (v && isLikelyEnglish(v)) suspect.push(k);
        }
        findings.push({ type: 'premise', id: premise.id, title: premise.title || premise.id, fields: suspect });
      }

      for (const char of (premise.characters || [])) {
        const charText = [
          char.roleLabel,
          char.description,
          char.personality,
          char.motivation,
          char.secret,
          char.relationshipToPlayer,
          char.initialGoal,
          char.startingSituation,
          char.conflictPotential,
          char.visualPrompt,
        ].filter(Boolean).join(' ');
        if (isLikelyEnglish(charText)) {
          const suspect: string[] = [];
          for (const [k, v] of [
            ['roleLabel', char.roleLabel],
            ['description', char.description],
            ['personality', char.personality],
            ['motivation', char.motivation],
            ['secret', char.secret],
            ['relationshipToPlayer', char.relationshipToPlayer],
            ['initialGoal', char.initialGoal],
            ['startingSituation', char.startingSituation],
            ['conflictPotential', char.conflictPotential],
            ['visualPrompt', char.visualPrompt],
          ] as [string, string | null | undefined][]) {
            if (v && isLikelyEnglish(v)) suspect.push(k);
          }
          findings.push({ type: 'character', id: char.id, title: char.name || char.id, fields: suspect });
        }
      }
    }
  }

  return findings;
}

// ── Distribution + image gates ────────────────────────────────────────────

export interface DistributionCheck {
  storyId: string;
  storyTitle: string;
  premiseCount: number;
  characterCount: number;
  ok: boolean;
}

export function checkDistribution(
  stories: Array<{
    id: string;
    title: string;
    premises: Array<{
      id: string;
      sortOrder?: number | null;
      createdAt?: Date | string | null;
      characters: Array<{ id: string }>;
    }>;
  }>,
): DistributionCheck[] {
  return stories.map((story) => {
    const sorted = [...story.premises].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
    );
    const premiseCount = story.premises.length;
    const firstPremise = sorted[0];
    const characterCount = firstPremise?.characters?.length ?? 0;
    return {
      storyId: story.id,
      storyTitle: story.title,
      premiseCount,
      characterCount,
      ok: premiseCount >= 3 && characterCount >= 3,
    };
  });
}

export function allHaveUrls(items: Array<{
  coverUrl?: string | null;
  imageUrl?: string | null;
}>): boolean {
  return items.length > 0 && items.every((item) => !!(item.coverUrl ?? item.imageUrl));
}
