import { describe, expect, it } from 'vitest';
import { defaultEntitlementsForTier } from '../src/services/entitlements.service';

describe('subscription entitlement policy', () => {
  it('keeps all mains entry points on the shared evaluation quota', () => {
    expect(defaultEntitlementsForTier('free').limits.mains_evaluation).toEqual({ period: 'lifetime', limit: 3 });
    expect(defaultEntitlementsForTier('aspire').limits.mains_evaluation).toEqual({ period: 'day', limit: 5 });
    expect(defaultEntitlementsForTier('rise').limits.mains_evaluation).toEqual({ period: 'day', limit: 25 });
    expect(defaultEntitlementsForTier('ascent').limits.mains_evaluation).toEqual({ period: 'unlimited', limit: null });
  });

  it('matches the public AI and custom mock-test limits', () => {
    expect(defaultEntitlementsForTier('free').limits.jeet_ai_message).toEqual({ period: 'day', limit: 2 });
    expect(defaultEntitlementsForTier('aspire').limits.jeet_ai_message).toEqual({ period: 'day', limit: 10 });
    expect(defaultEntitlementsForTier('rise').limits.jeet_ai_message).toEqual({ period: 'day', limit: 100 });
    expect(defaultEntitlementsForTier('free').limits.prelims_mock_attempt).toEqual({ period: 'lifetime', limit: 1 });
    expect(defaultEntitlementsForTier('aspire').limits.prelims_mock_attempt).toEqual({ period: 'day', limit: 5 });
    expect(defaultEntitlementsForTier('rise').limits.prelims_mock_attempt).toEqual({ period: 'day', limit: 50 });
  });

  it('gives Free and Aspire two revision subjects and five spaced-repetition questions', () => {
    for (const tier of ['free', 'aspire'] as const) {
      const policy = defaultEntitlementsForTier(tier);
      expect(policy.preview.flashcard_subjects).toBe(2);
      expect(policy.preview.mindmaps).toBe(2);
      expect(policy.preview.spaced_repetition_questions).toBe(5);
      expect(policy.access.spaced_repetition).toBe('limited');
    }
  });
});
