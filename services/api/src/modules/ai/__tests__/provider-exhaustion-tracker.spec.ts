import { ProviderExhaustionTracker, isQuotaExhaustedError } from '../provider-exhaustion-tracker';

describe('ProviderExhaustionTracker', () => {
  let tracker: ProviderExhaustionTracker;

  beforeEach(() => {
    tracker = new ProviderExhaustionTracker(30);
  });

  describe('isQuotaExhaustedError', () => {
    it('detects HTTP 429', () => {
      expect(isQuotaExhaustedError('Groq API error: status 429')).toBe(true);
    });

    it('detects quota in message', () => {
      expect(isQuotaExhaustedError('You exceeded your current quota')).toBe(true);
    });

    it('detects RESOURCE_EXHAUSTED', () => {
      expect(isQuotaExhaustedError('Google text API error: status 429 RESOURCE_EXHAUSTED')).toBe(true);
    });

    it('detects rate limit', () => {
      expect(isQuotaExhaustedError('Rate limit exceeded')).toBe(true);
    });

    it('ignores HTTP 500', () => {
      expect(isQuotaExhaustedError('Groq API error: status 500')).toBe(false);
    });

    it('ignores missing API key', () => {
      expect(isQuotaExhaustedError('GROQ_API_KEY is not configured')).toBe(false);
    });

    it('detects billing error', () => {
      expect(isQuotaExhaustedError('Billing account not configured')).toBe(true);
    });
  });

  describe('markExhausted + isExhausted', () => {
    it('marks provider as exhausted on quota error', () => {
      tracker.markExhausted('groq', 'Groq API error: status 429');
      expect(tracker.isExhausted('groq')).toBe(true);
    });

    it('does NOT mark provider exhausted on non-quota error', () => {
      tracker.markExhausted('groq', 'Groq API error: status 500');
      expect(tracker.isExhausted('groq')).toBe(false);
    });

    it('returns true for case-insensitive provider names', () => {
      tracker.markExhausted('Groq', 'status 429');
      expect(tracker.isExhausted('groq')).toBe(true);
    });

    it('does not affect other providers', () => {
      tracker.markExhausted('groq', 'status 429');
      expect(tracker.isExhausted('google')).toBe(false);
    });
  });

  describe('cooldown behavior', () => {
    it('returns true within cooldown period', () => {
      tracker.markExhausted('groq', 'status 429');
      expect(tracker.isExhausted('groq')).toBe(true);
    });

    it('returns false after cooldown period (simulated)', async () => {
      // Create tracker with 1ms cooldown, wait 2ms
      const shortCooldown = new ProviderExhaustionTracker(0);
      shortCooldown.markExhausted('groq', 'status 429');
      await new Promise((r) => setTimeout(r, 2));
      expect(shortCooldown.isExhausted('groq')).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all exhaustion state', () => {
      tracker.markExhausted('groq', 'status 429');
      tracker.markExhausted('gemini', 'quota exceeded');
      tracker.reset();
      expect(tracker.isExhausted('groq')).toBe(false);
      expect(tracker.isExhausted('gemini')).toBe(false);
    });
  });
});
