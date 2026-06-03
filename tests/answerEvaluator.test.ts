import { describe, it, expect, vi } from 'vitest';

// Mock modules that import prisma so we can test pure functions
vi.mock('../src/config/llm', () => ({ invokeModelJSON: vi.fn() }));
vi.mock('../src/config/gemini', () => ({ extractTextFromFile: vi.fn() }));
vi.mock('../src/config/storage', () => ({ downloadFile: vi.fn(), STORAGE_BUCKETS: {} }));
vi.mock('../src/config/database', () => ({ default: {} }));
vi.mock('../src/services/topperRag.service', () => ({
  buildTopperContext: vi.fn(() => 'No comparable topper answers were retrieved.'),
  retrieveTopperMatches: vi.fn(async () => []),
}));
vi.mock('../src/services/checkedCopyGenerator', () => ({
  generateCheckedCopy: vi.fn(async () => ({ status: 'failed', reason: 'mocked' })),
}));

import { normalizeOcrAnswerText, triviallyBadAnswer } from '../src/services/answerEvaluator';

const q15 = {
  questionText: 'Discuss the impact of climate change on Indian agriculture and suggest adaptation measures.',
  subject: 'Environment',
  marks: 15,
  paper: 'GS Paper III',
};

const q10 = {
  questionText: 'Examine the role of the Election Commission in ensuring free and fair elections in India.',
  subject: 'Polity',
  marks: 10,
  paper: 'GS Paper II',
};

describe('triviallyBadAnswer', () => {
  describe('too-short answers', () => {
    it('returns zero-score for empty string', () => {
      const r = triviallyBadAnswer('', q15);
      expect(r).not.toBeNull();
      expect(r!.score).toBe(0);
    });

    it('returns score-1 for 10-14 words', () => {
      const r = triviallyBadAnswer('Climate change affects Indian agriculture in many ways including rain patterns.', q15);
      expect(r).not.toBeNull();
      expect(r!.score).toBe(1);
    });
  });

  describe('gibberish detection', () => {
    it('flags mostly non-alphabetic text (longer than 15 words to bypass too-short check)', () => {
      const r = triviallyBadAnswer('===== !!!!! ///// ##### @@@@@ %%%%% &&&&& ***** ((((( ))))) ===== !!!!! ///// ##### @@@@@ %%%%% &&&&& *****', q15);
      expect(r).not.toBeNull();
      expect(r!.improvements[0]).toContain('unreadable');
    });
  });

  describe('off-topic detection', () => {
    it('flags answer about completely different topic', () => {
      const r = triviallyBadAnswer(
        'The Supreme Court of India is the highest judicial forum and final court of appeal under the Constitution of India. It consists of the Chief Justice and a maximum of 34 judges.',
        q15
      );
      expect(r).not.toBeNull();
      expect(r!.improvements.some(i => i.includes('does not address'))).toBe(true);
    });
  });

  describe('valid answers pass through', () => {
    it('returns null for legitimate UPSC answer', () => {
      const r = triviallyBadAnswer(
        'The Election Commission of India is a constitutional body established under Article 324. It plays a critical role in conducting free and fair elections through the Model Code of Conduct and monitoring campaign finance.',
        q10
      );
      expect(r).toBeNull();
    });

    it('returns null for short but valid answer (above 15 words)', () => {
      const r = triviallyBadAnswer(
        'Climate change causes unpredictable rainfall, droughts, and heat waves that reduce crop yields in India substantially.',
        q15
      );
      expect(r).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('gives structured feedback for bad answers', () => {
      const r = triviallyBadAnswer('', q15);
      expect(r!.improvements.length).toBeGreaterThanOrEqual(1);
      expect(r!.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(r!.detailedFeedback.length).toBeGreaterThan(0);
    });
  });
});

describe('normalizeOcrAnswerText', () => {
  it('removes answer-sheet chrome and rejoins fragmented OCR lines', () => {
    const normalized = normalizeOcrAnswerText([
      'Q. No.',
      'How far is it correct to say that the First World War',
      'Marks',
      '6.',
      'was fought essentially for the preservation of balance of power?',
      '15',
      'First World War was',
      'big',
      'war in which',
      'fought in 1914-18. It was a',
      'countries took part. It was',
      'many',
      'very',
      'Germany',
      'mainly fought for balance of power in Europe.',
      'Before the war,',
      'Britain, France and Russia were',
    ].join('\n'));

    expect(normalized).not.toContain('Q. No.');
    expect(normalized).not.toContain('\nMarks\n');
    expect(normalized).toContain(
      'First World War was big war in which fought in 1914-18. It was a countries took part. It was many very Germany mainly fought for balance of power in Europe.'
    );
    expect(normalized).toContain('Before the war, Britain, France and Russia were');
  });

  it('removes generic footer and header noise from scanned notes', () => {
    const normalized = normalizeOcrAnswerText([
      'Simla Agreement (1972) brought',
      'peace to Indo-Pak until the',
      'Kargil War 2 decades later.',
      'Cooperation in various field Call us : 8468022022, 9019066066 Visit us : www.visionias.in',
      'Page 7 of 50',
      '1417 SAMPLE ACADEMY™',
      'Lahore Declaration - Vajpayee wanted to make borders irrelevant',
      'through increased trade, common',
      'currency in South Asia and bus-travel & connectivity b/w the 2 countries.',
      'student@example.com',
    ].join('\n'));

    expect(normalized).not.toMatch(/call us|visit us|sample academy|page 7 of 50|student@example/i);
    expect(normalized).toContain('Simla Agreement (1972) brought peace to Indo-Pak until the Kargil War 2 decades later.');
    expect(normalized).toContain('Lahore Declaration - Vajpayee wanted to make borders irrelevant');
  });
});
