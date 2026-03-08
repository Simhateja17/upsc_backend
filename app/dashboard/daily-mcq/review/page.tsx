'use client';

import React, { useEffect, useState } from 'react';
import { dailyMcqService } from '@/lib/services';

interface ReviewQuestion {
  id: string;
  questionNum: number;
  questionText: string;
  category: string;
  difficulty: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string | null;
  selectedOption: string | null;
  isCorrect: boolean;
}

export default function QuestionReviewPage() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dailyMcqService.getReview()
      .then(res => setQuestions(res.data.questions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen panel-recessed">
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    );
  }

  const q = questions[currentIndex];
  if (!q) return <div className="flex flex-col min-h-screen panel-recessed"><main className="flex-1 flex items-center justify-center"><p>No review data available.</p></main></div>;

  return (
    <div className="flex flex-col min-h-screen panel-recessed">
      <main className="flex-1 flex items-center justify-center py-[clamp(2rem,4vw,4rem)] px-[clamp(1rem,2vw,3rem)]">
        <div className="card-elevated rounded-[clamp(10px,0.52vw,10px)]"
          style={{ width: 'clamp(700px,50vw,962px)', padding: 'clamp(1.5rem,2vw,2.5rem)' }}>

          <div className="flex items-center justify-between mb-[clamp(1.5rem,2vw,2rem)]">
            <div className="flex items-center gap-[clamp(8px,0.625vw,12px)]">
              <img src="/question-review-icon.png" alt="Question Review"
                style={{ width: 'clamp(20px,1.46vw,28px)', height: 'clamp(20px,1.46vw,28px)' }} />
              <h1 className="font-arimo font-bold text-[#101828]"
                style={{ fontSize: 'clamp(16px,0.94vw,18px)', lineHeight: 'clamp(24px,1.46vw,28px)' }}>
                Question Review ({currentIndex + 1}/{questions.length})
              </h1>
            </div>
            <div className="flex gap-2">
              <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-30">Prev</button>
              <button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(i => i + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-30">Next</button>
            </div>
          </div>

          <div className="flex gap-[clamp(1rem,1.25vw,1.5rem)]">
            <div className="flex-shrink-0 rounded-full bg-[#F9FAFB] flex items-center justify-center font-arimo text-[#99A1AF]"
              style={{ width: 'clamp(28px,1.67vw,32px)', height: 'clamp(28px,1.67vw,32px)', fontSize: 'clamp(20px,1.25vw,24px)' }}>
              {q.questionNum}
            </div>

            <div className="flex-1">
              <div className="mb-[clamp(0.75rem,1vw,1.25rem)]">
                <p className="font-arimo text-[#364153]"
                  style={{ fontSize: 'clamp(13px,0.73vw,14px)', lineHeight: 'clamp(18px,1.19vw,22.75px)' }}>
                  {q.questionText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-[clamp(0.75rem,1vw,1.25rem)] mb-[clamp(1.25rem,1.5vw,2rem)]">
                {(q.options as any[]).map((option: any) => {
                  const isCorrect = option.id === q.correctOption;
                  const isSelected = option.id === q.selectedOption;
                  let bg = 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#364153]';
                  if (isCorrect) bg = 'text-white';
                  else if (isSelected && !isCorrect) bg = 'text-white';

                  return (
                    <div key={option.id}
                      className={`text-left rounded-[clamp(8px,0.52vw,10px)] ${bg}`}
                      style={{
                        padding: 'clamp(0.75rem,1vw,1.25rem)',
                        background: isCorrect ? '#00BBA7' : (isSelected && !isCorrect) ? '#FF3961' : undefined,
                      }}>
                      <div className="font-arimo" style={{ fontSize: 'clamp(13px,0.73vw,14px)', lineHeight: 'clamp(18px,1.19vw,22.75px)' }}>
                        <span className="font-bold">{option.id}</span> {option.text}
                        {isSelected && !isCorrect && ' (Your answer)'}
                        {isCorrect && ' (Correct)'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 font-arimo font-bold text-[#101828] hover:opacity-70 transition-opacity mb-[clamp(1rem,1.25vw,1.5rem)]"
                style={{ fontSize: 'clamp(13px,0.73vw,14px)' }}>
                {showExplanation ? 'Hide' : 'View'} Explanation
                <img src="/arrow-down-icon.png" alt="Arrow"
                  style={{ width: 'clamp(14px,0.83vw,16px)', height: 'clamp(14px,0.83vw,16px)', transform: showExplanation ? 'rotate(180deg)' : undefined }} />
              </button>

              {showExplanation && q.explanation && (
                <div className="bg-[#F9FAFB] rounded-[clamp(8px,0.52vw,10px)] border border-[#E5E7EB]"
                  style={{ padding: 'clamp(1rem,1.25vw,1.5rem)' }}>
                  <h3 className="font-arimo font-bold text-[#101828] mb-[clamp(0.75rem,1vw,1.25rem)]"
                    style={{ fontSize: 'clamp(14px,0.83vw,16px)' }}>Explanation</h3>
                  <p className="font-arimo text-[#364153]"
                    style={{ fontSize: 'clamp(13px,0.73vw,14px)', lineHeight: 'clamp(18px,1.19vw,22.75px)' }}>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
