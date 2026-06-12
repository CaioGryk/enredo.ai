/**
 * Centralized reading limits — single source of truth for Free tier thresholds.
 *
 * Formerly hardcoded across reading-orchestrator.service.ts,
 * generation-budget.guard.ts, billing.service.ts, and benefits copy.
 */

/**
 * Daily interaction counters remain available for analytics and ad cadence,
 * but zero means narrative interactions are unlimited for every plan.
 */
export const FREE_DAILY_INTERACTION_LIMIT = 0;

/** Max concurrent ACTIVE reading sessions for Free users. */
export const FREE_ACTIVE_SESSION_LIMIT = 3;
