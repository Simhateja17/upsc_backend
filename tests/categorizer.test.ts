import { describe, it, expect } from 'vitest';
import { categorize, relevanceScore, isRelevant, extractTags, classifyArticle } from '../src/services/categorizer';

describe('categorizer', () => {
  describe('categorize', () => {
    it('returns "Polity" for parliament/constitution content', () => {
      expect(categorize('Parliament passes new bill')).toBe('Polity');
      expect(categorize('Supreme Court ruling on constitution')).toBe('Polity');
      expect(categorize('Election commission announces dates')).toBe('Polity');
    });

    it('returns "Economy" for economic content', () => {
      expect(categorize('RBI raises repo rate by 25bps')).toBe('Economy');
      expect(categorize('GDP growth slows to 6.5%')).toBe('Economy');
      expect(categorize('Budget 2026 highlights fiscal deficit')).toBe('Economy');
    });

    it('maps bilateral trade content into canonical "Polity"', () => {
      expect(categorize('India-USA bilateral trade deal signed')).toBe('Polity');
    });

    it('maps diplomatic content into canonical "Polity"', () => {
      expect(categorize('G20 summit concludes in Brazil')).toBe('Polity');
      expect(categorize('BRICS expansion includes new members')).toBe('Polity');
    });

    it('returns "Environment & Ecology" for climate content', () => {
      expect(categorize('Climate change report warns of rising temperatures')).toBe('Environment & Ecology');
      expect(categorize('Forest cover increases by 2%')).toBe('Environment & Ecology');
      expect(categorize('Renewable energy targets met ahead of schedule')).toBe('Environment & Ecology');
    });

    it('returns "Science & Technology" for ISRO/tech content', () => {
      expect(categorize('ISRO launches new satellite')).toBe('Science & Technology');
      expect(categorize('Quantum computing breakthrough announced')).toBe('Science & Technology');
    });

    it('maps military content into canonical "Science & Technology"', () => {
      expect(categorize('Army conducts joint exercise')).toBe('Science & Technology');
      // ngt word boundary fix: "strengthened" no longer falsely matches "ngt"
      expect(categorize('Border security strengthened')).toBe('Science & Technology');
    });

    it('returns "Polity" for policy-related content', () => {
      expect(categorize('New education policy implementation review')).toBe('Polity');
    });

    it('returns fallback for welfare content outside the six canonical subjects', () => {
      expect(categorize('Welfare scheme reaches 10 million beneficiaries')).toBe('Current Affairs');
    });

    it('returns "History" for heritage content', () => {
      expect(categorize('UNESCO adds new heritage site')).toBe('History');
      expect(categorize('Ancient temple discovered during excavation')).toBe('History');
    });

    it('returns "Geography" for disaster/geography content', () => {
      expect(categorize('Earthquake measuring 7.2 hits region')).toBe('Geography');
      expect(categorize('Monsoon forecast predicts above-normal rainfall')).toBe('Geography');
    });

    it('maps farmer-related content into canonical "Economy"', () => {
      expect(categorize('Farmers demand loan waivers')).toBe('Economy');
    });

    it('maps agricultural policy content into canonical "Economy"', () => {
      expect(categorize('MSP hike announced for wheat and paddy')).toBe('Economy');
    });

    it('returns fallback "Current Affairs" for non-matching content', () => {
      expect(categorize('Local festival celebrated in village')).toBe('Current Affairs');
      expect(categorize('Random text with no UPSC keywords')).toBe('Current Affairs');
    });

    it('handles null/undefined summary and content', () => {
      expect(categorize('Parliament session begins', null, null)).toBe('Polity');
      expect(categorize('Random text', null, null)).toBe('Current Affairs');
    });
  });

  describe('isRelevant', () => {
    it('returns true for UPSC-relevant text', () => {
      expect(isRelevant('Supreme Court judgment on Article 370')).toBe(true);
      expect(isRelevant('RBI monetary policy review')).toBe(true);
    });

    it('returns false for non-UPSC text', () => {
      expect(isRelevant('Cricket match results today')).toBe(false);
      expect(isRelevant('Random unrelated text')).toBe(false);
    });
  });

  describe('relevanceScore', () => {
    it('scores UPSC keywords positively', () => {
      const score = relevanceScore('Parliament passes constitution amendment bill');
      expect(score).toBeGreaterThan(0);
    });

    it('penalizes noise keywords', () => {
      const score = relevanceScore('IPL cricket match Bollywood celebrity');
      expect(score).toBeLessThan(0);
    });

    it('returns 0 for neutral text', () => {
      const score = relevanceScore('The weather is nice today');
      expect(score).toBe(0);
    });
  });

  describe('extractTags', () => {
    it('extracts matching UPSC tags', () => {
      const tags = extractTags('RBI raises repo rate, GDP growth slows, inflation concerns');
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(t => t.toLowerCase().includes('rbi') || t.toLowerCase().includes('gdp') || t.toLowerCase().includes('inflation'))).toBe(true);
    });

    it('returns at most 5 tags', () => {
      const tags = extractTags('Economy RBI GDP inflation trade polity parliament security defence environment climate agriculture education health judiciary supreme court');
      expect(tags.length).toBeLessThanOrEqual(5);
    });

    it('returns tags for text with UPSC keywords only', () => {
      const tags = extractTags('Random filler words with no relevant terms');
      expect(tags).toEqual([]);
    });
  });

  describe('classifyArticle', () => {
    it('returns category, tags, and relevanceScore in one call', () => {
      const result = classifyArticle('ISRO successfully launches Chandrayaan-4 mission to the moon');
      expect(result.category).toBe('Science & Technology');
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });
  });
});
