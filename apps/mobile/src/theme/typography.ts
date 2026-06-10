/**
 * Tipografia — Enredo.ai
 *
 * Fontes: Noto Serif (serif narrativa) + Inter (sans-serif UI)
 * Alinhada com o design de referência do Google AI Studio.
 */

export const typography = {
  /* ─── Títulos (Noto Serif) ─── */
  h1: {
    fontFamily: 'NotoSerifBlack',
    fontSize: 32,
    fontWeight: '900' as const,
    lineHeight: 40,
  },
  h2: {
    fontFamily: 'NotoSerifBold',
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontFamily: 'NotoSerifBold',
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },

  /* ─── Corpo (Inter) ─── */
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },

  /* ─── Texto narrativo (Noto Serif) ─── */
  narrative: {
    fontFamily: 'NotoSerif',
    fontSize: 18,
    lineHeight: 30,
  },
  narrativeDropCap: {
    fontFamily: 'NotoSerifBold',
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '700' as const,
  },

  /* ─── Labels / UI (Inter) ─── */
  label: {
    fontFamily: 'InterSemiBold',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontFamily: 'InterMedium',
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontFamily: 'InterBold',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  /* ─── Auxiliares ─── */
  caption: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 18,
  },
};
