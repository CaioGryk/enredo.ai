/**
 * ProviderExhaustionTracker — Marks providers as exhausted when quota/rate-limit
 * errors are detected. Exhausted providers are skipped for a cooldown period.
 *
 * Process-local (in-memory), resets on restart. Thread-safe for the NestJS event loop.
 */

const QUOTA_PATTERNS = [
  'status 429',
  'status 403',
  'quota',
  'rate limit',
  'RESOURCE_EXHAUSTED',
  'exceeded your current quota',
  'usageLimits',
  'rateLimitExceeded',
  'too many requests',
  'try again later',
  'billing',
  'insufficient_quota',
];

export function isQuotaExhaustedError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return QUOTA_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export class ProviderExhaustionTracker {
  private exhausted: Map<string, number> = new Map();
  private cooldownMs: number;

  constructor(cooldownMinutes: number = 30) {
    this.cooldownMs = cooldownMinutes * 60 * 1000;
  }

  /** Mark a provider as exhausted after a quota/rate-limit error. */
  markExhausted(providerName: string, errorMessage: string): void {
    if (isQuotaExhaustedError(errorMessage)) {
      this.exhausted.set(providerName.toLowerCase(), Date.now());
    }
  }

  /** Check if a provider is currently exhausted (within cooldown window). */
  isExhausted(providerName: string): boolean {
    const exhaustedAt = this.exhausted.get(providerName.toLowerCase());
    if (!exhaustedAt) return false;
    if (Date.now() - exhaustedAt > this.cooldownMs) {
      this.exhausted.delete(providerName.toLowerCase());
      return false;
    }
    return true;
  }

  /** Get a human-readable status for logging. */
  getCooldownRemaining(providerName: string): string {
    const exhaustedAt = this.exhausted.get(providerName.toLowerCase());
    if (!exhaustedAt) return 'ready';
    const remaining = this.cooldownMs - (Date.now() - exhaustedAt);
    if (remaining <= 0) return 'ready';
    return `${Math.ceil(remaining / 60000)}min`;
  }

  /** Reset all exhaustion state (for testing). */
  reset(): void {
    this.exhausted.clear();
  }
}
