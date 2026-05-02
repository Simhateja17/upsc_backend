import { describe, it, expect } from 'vitest';
import { categorize, relevanceScore, isRelevant, extractTags, classifyArticle } from '../src/services/categorizer';

describe('categorizer', () => {
  describe('categorize', () => {
    it('returns "Polity & Governance" for parliament/constitution content', () => {
      expect(categorize('Parliament passes new bill')).toBe('Polity & Governance');
      expect(categorize('Supreme Court ruling on constitution')).toBe('Polity & Governance');
      expect(categorize('Election commission announces dates')).toBe('Polity & Governance');
    });

    it('returns "Economy" for economic content', () => {
      expect(categorize('RBI raises repo rate by 25bps')).toBe('Economy');
      expect(categorize('GDP growth slows to 6.5%')).toBe('Economy');
      expect(categorize('Budget 2026 highlights fiscal deficit')).toBe('Economy');
    });

    it('returns "Economy" for trade-focused content (economy checked before IR)', () => {
      // "trade" in Economy regex matches before "bilateral" in IR regex
      expect(categorize('India-USA bilateral trade deal signed')).toBe('Economy');
    });

    it('returns "International Relations" for purely diplomatic content', () => {
      expect(categorize('G20 summit concludes in Brazil')).toBe('International Relations');
      expect(categorize('BRICS expansion includes new members')).toBe('International Relations');
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

    it('returns "Security & Defence" for military content', () => {
      expect(categorize('Army conducts joint exercise')).toBe('Security & Defence');
      // ngt word boundary fix: "strengthened" no longer falsely matches "ngt"
      expect(categorize('Border security strengthened')).toBe('Security & Defence');
    });

    it('returns "Polity & Governance" for policy-related content (checked before Social Issues)', () => {
      // "policy" in Polity regex matches before "education" in Social Issues regex
      expect(categorize('New education policy implementation review')).toBe('Polity & Governance');
    });

    it('returns "Social Issues & Welfare" for welfare content', () => {
      expect(categorize('Welfare scheme reaches 10 million beneficiaries')).toBe('Social Issues & Welfare');
    });

    it('returns "History & Culture" for heritage content', () => {
      expect(categorize('UNESCO adds new heritage site')).toBe('History & Culture');
      expect(categorize('Ancient temple discovered during excavation')).toBe('History & Culture');
    });

    it('returns "Geography & Disasters" for disaster/geography content', () => {
      expect(categorize('Earthquake measuring 7.2 hits region')).toBe('Geography & Disasters');
      expect(categorize('Monsoon forecast predicts above-normal rainfall')).toBe('Geography & Disasters');
    });

    it('returns "Social Issues & Welfare" for farmer-related content (checked before Agriculture)', () => {
      // "farmer" in Social Issues regex matches before Agriculture regex
      expect(categorize('Farmers demand loan waivers')).toBe('Social Issues & Welfare');
    });

    it('returns "Agriculture" for agricultural policy content', () => {
      expect(categorize('MSP hike announced for wheat and paddy')).toBe('Agriculture');
    });

    it('returns fallback "Current Affairs" for non-matching content', () => {
      expect(categorize('Local festival celebrated in village')).toBe('Current Affairs');
      expect(categorize('Random text with no UPSC keywords')).toBe('Current Affairs');
    });

    it('handles null/undefined summary and content', () => {
      expect(categorize('Parliament session begins', null, null)).toBe('Polity & Governance');
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
