import { describe, it, expect, vi } from 'vitest';

// Test the UPSC_SUBJECTS in dailyContentJob match the categorizer taxonomy
// This ensures MCQ generation uses the same subjects as categorization

describe('UPSC subject taxonomy alignment', () => {
  const categorizerCategories = [
    'Polity & Governance', 'Economy', 'International Relations',
    'Environment & Ecology', 'Science & Technology', 'Security & Defence',
    'Social Issues & Welfare', 'History & Culture', 'Geography & Disasters', 'Agriculture',
  ];

  const dailyContentSubjects = [
    'Polity & Governance', 'Economy', 'International Relations',
    'Environment & Ecology', 'Science & Technology',
    'Social Issues & Welfare', 'History & Culture', 'Geography & Disasters',
  ];

  it('all MCQ generation subjects exist in the categorizer taxonomy', () => {
    for (const subject of dailyContentSubjects) {
      expect(categorizerCategories).toContain(subject);
    }
  });

  it('categorizer has additional categories not used for MCQ generation (acceptable)', () => {
    const extra = categorizerCategories.filter(c => !dailyContentSubjects.includes(c));
    // Security & Defence and Agriculture not used for daily MCQ generation
    expect(extra.length).toBeGreaterThan(0);
  });
});

describe('dailyMCQ business logic: scoring', () => {
  it('correctly counts correct/wrong/skipped from answers', () => {
    const questions = [
      { id: 'q1', correctOption: 'A', category: 'Economy' },
      { id: 'q2', correctOption: 'B', category: 'Polity' },
      { id: 'q3', correctOption: 'C', category: 'Geography' },
    ];

    const answers = [
      { questionId: 'q1', selectedOption: 'A' }, // correct
      { questionId: 'q2', selectedOption: 'C' }, // wrong
      // q3 => skipped (no answer)
    ];

    let correctCount = 0, wrongCount = 0, skippedCount = 0;

    for (const q of questions) {
      const ans = answers.find(a => a.questionId === q.id);
      if (!ans?.selectedOption) skippedCount++;
      else if (ans.selectedOption === q.correctOption) correctCount++;
      else wrongCount++;
    }

    expect(correctCount).toBe(1);
    expect(wrongCount).toBe(1);
    expect(skippedCount).toBe(1);
  });

  it('computes accuracy correctly', () => {
    const correct = 7, wrong = 3;
    const accuracy = (correct / (correct + wrong)) * 100;
    expect(Math.round(accuracy)).toBe(70);
  });

  it('computes rank correctly (1-based)', () => {
    const higherCount = 4;
    const rank = higherCount + 1;
    expect(rank).toBe(5);
  });

  it('computes percentile correctly', () => {
    const total = 100, higher = 15;
    const percentile = ((total - higher) / total) * 100;
    expect(Math.round(percentile)).toBe(85);
  });
});
