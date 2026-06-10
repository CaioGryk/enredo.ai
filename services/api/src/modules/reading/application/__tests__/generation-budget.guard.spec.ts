import { GenerationBudgetGuard } from '../generation-budget.guard';
import { SubscriptionType } from '@prisma/client';

describe('GenerationBudgetGuard', () => {
  let guard: GenerationBudgetGuard;

  beforeEach(() => {
    guard = new GenerationBudgetGuard();
  });

  describe('Free tier users', () => {
    it('should DENY free user requesting premium model (tier PREMIUM)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: 'gpt-4.1-nano', // Premium tier model
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('Requires Premium');
    });

    it('should DENY free user requesting credits model (tier CREDITS)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: 'claude-3-5-sonnet-20241022', // Credits tier model
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('Requires 2 credits');
    });

    it('should ALLOW free user under daily limit with default model', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: undefined, // use default (groq/free)
        dailyUsageCount: 10,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('groq/free');
      expect(decision.finalModel.tier).toBe('FREE');
    });

    it('should DENY free user at daily limit', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: undefined,
        dailyUsageCount: 50,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('Daily interaction limit reached');
    });

    it('should ALLOW free user at daily limit for first scene', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: undefined,
        dailyUsageCount: 50,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: true,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('groq/free');
    });

    it('should ALLOW free user requesting free model explicitly', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: 'openrouter/free',
        dailyUsageCount: 10,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('openrouter/free');
    });
  });

  describe('Premium tier users', () => {
    it('should ALLOW premium user with sufficient credits for credits model', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022', // CREDITS tier, cost 2
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: 10,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('claude-3-5-sonnet-20241022');
      expect(decision.finalModel.tier).toBe('CREDITS');
    });

    it('should DENY premium user with insufficient credits for credits model (non-cinematic)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022', // cost 2
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('Requires 2 credits');
    });

    it('should DENY premium user with insufficient credits for cinematic mode (cinematic is not sponsored)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022',
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: 0,
        isCinematicMode: true,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.estimatedCreditCost).toBe(2);
      expect(decision.requiresCredits).toBe(true);
    });

    it('should ALLOW premium user with no credits and no requested model (use default)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: undefined,
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('gpt-4.1-nano'); // default premium model
    });

    it('should ALLOW premium user with enough credits for exact cost', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022', // cost 2
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: 2, // exact cost
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown model gracefully', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: 'unknown-model',
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('not found in catalog');
    });

    it('should handle inactive model gracefully', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'gemini-2.5-flash-lite',
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 10,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('not currently available');
    });

    it('should allow when daily limit is 0 (no limit)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: undefined,
        dailyUsageCount: 100,
        dailyUsageLimit: 0, // 0 means no limit
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(true);
    });

    it('should deny when credit balance is undefined for premium credits model', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022',
        dailyUsageCount: 0,
        dailyUsageLimit: 0,
        creditBalance: undefined,
        isCinematicMode: false,
        isFirstScene: false,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('Requires 2 credits');
    });
  });

  describe('FREE_LLM_ONLY mode', () => {
    it('should deny premium model when freeLlmOnly=true', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'gpt-4.1-nano',
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 100,
        isCinematicMode: false,
        isFirstScene: false,
        freeLlmOnly: true,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('FREE_LLM_ONLY');
    });

    it('should deny credits model when freeLlmOnly=true', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'claude-3-5-sonnet-20241022',
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 100,
        isCinematicMode: false,
        isFirstScene: false,
        freeLlmOnly: true,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.blockReason).toContain('FREE_LLM_ONLY');
    });

    it('should allow free model when freeLlmOnly=true', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: 'openrouter/free',
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
        freeLlmOnly: true,
      });

      expect(decision.allowed).toBe(true);
    });

    it('should allow free model with freeLlmOnly=true (default model)', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.FREE,
        requestedModelId: undefined,
        dailyUsageCount: 5,
        dailyUsageLimit: 50,
        creditBalance: 0,
        isCinematicMode: false,
        isFirstScene: false,
        freeLlmOnly: true,
      });

      expect(decision.allowed).toBe(true);
    });

    it('should fallback premium users to the free default model when freeLlmOnly=true and no model is requested', () => {
      const decision = guard.decide({
        userId: 'user-1',
        subscriptionType: SubscriptionType.PREMIUM,
        requestedModelId: undefined,
        dailyUsageCount: 0,
        dailyUsageLimit: 50,
        creditBalance: 100,
        isCinematicMode: false,
        isFirstScene: true,
        freeLlmOnly: true,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.finalModel.id).toBe('groq/free');
      expect(decision.budgetTier).toBe('FREE');
    });
  });
});
