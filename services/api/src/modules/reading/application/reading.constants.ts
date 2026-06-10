/**
 * Centralized reading limits — single source of truth for Free tier thresholds.
 *
 * Formerly hardcoded across reading-orchestrator.service.ts,
 * generation-budget.guard.ts, billing.service.ts, and benefits copy.
 */

/** Max daily interactions for Free users (scene continuations). First scene is exempt. */
export const FREE_DAILY_INTERACTION_LIMIT = 10;

/** Max concurrent ACTIVE reading sessions for Free users. */
export const FREE_ACTIVE_SESSION_LIMIT = 3;
