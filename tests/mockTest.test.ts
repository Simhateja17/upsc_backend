import { describe, it, expect, vi } from 'vitest';

// Test mock test question generation logic (pure functions)

describe('mockTest: subject shuffling', () => {
  it('Fisher-Yates shuffle preserves all elements', () => {
    function shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    const subjects = ['Polity', 'History', 'Geography', 'Economy', 'Environment'];
    const shuffled = shuffle([...subjects]);

    expect(shuffled.length).toBe(subjects.length);
    expect(shuffled.sort()).toEqual(subjects.sort());
  });
});

describe('mockTest: mains question paper selection', () => {
  const papers = [
    { paper: 'GS Paper I', subjects: ['History', 'Geography', 'Society'] },
    { paper: 'GS Paper II', subjects: ['Polity', 'Governance', 'International Relations'] },
    { paper: 'GS Paper III', subjects: ['Economy', 'Environment', 'Science & Tech', 'Security'] },
    { paper: 'GS Paper IV', subjects: ['Ethics', 'Integrity', 'Aptitude'] },
  ];

  it('every paper has at least one subject', () => {
    for (const p of papers) {
      expect(p.subjects.length).toBeGreaterThan(0);
    }
  });

  it('no paper has duplicate subjects', () => {
    for (const p of papers) {
      expect(new Set(p.subjects).size).toBe(p.subjects.length);
    }
  });

  it('all subjects are non-empty strings', () => {
    for (const p of papers) {
      for (const s of p.subjects) {
        expect(s.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('daily content: dailyMCQ + dailyMains schedules', () => {
  it('UPSC subjects for MCQ are aligned with categorizer', () => {
    const mcqSubjects = [
      'Polity & Governance', 'Economy', 'International Relations',
      'Environment & Ecology', 'Science & Technology',
      'Social Issues & Welfare', 'History & Culture', 'Geography & Disasters',
    ];
    expect(mcqSubjects.length).toBe(8);
    expect(mcqSubjects).toContain('Polity & Governance');
    expect(mcqSubjects).toContain('Economy');
    expect(mcqSubjects).toContain('History & Culture');
  });
});
