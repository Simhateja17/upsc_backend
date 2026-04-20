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
      <div className="flex flex-col overflow-hidden" style={{ height: '100vh', background: '#E8EDF5' }}>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    );
  }

  const q = questions[currentIndex];
  if (!q) return <div className="flex flex-col overflow-hidden" style={{ height: '100vh', background: '#E8EDF5' }}><main className="flex-1 flex items-center justify-center"><p>No review data available.</p></main></div>;

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh', background: '#E8EDF5' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-[clamp(1rem,2vw,3rem)] py-4">
        <div className="card-elevated rounded-[clamp(10px,0.52vw,10px)] flex-1 flex flex-col"
          style={{ width: 'clamp(700px,50vw,962px)', maxHeight: 'calc(100vh - 2rem)' }}>

          <div className="flex items-center justify-between px-[clamp(1.5rem,2vw,2.5rem)] pt-[clamp(1.25rem,1.5vw,2rem)] pb-3 flex-shrink-0">
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
                className="px-3 py-1 rounded border text-sm disabled:opacity-30 font-arimo">Prev</button>
              <button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(i => i + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-30 font-arimo">Next</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-[clamp(1.5rem,2vw,2.5rem)] pb-4">
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

                <div className="grid grid-cols-2 gap-[clamp(0.75rem,1vw,1.25rem)] mb-[clamp(1rem,1.25vw,1.5rem)]">
                  {(q.options as any[]).map((option: any, idx: number) => {
                    const isCorrect = option.id === q.correctOption;
                    const isSelected = option.id === q.selectedOption;
                    const label = optionLabels[idx] || option.id;

                    let bg = '#F9FAFB';
                    let border = '1px solid #E5E7EB';
                    let textColor = '#364153';
                    let labelBg = '#F3F4F6';
                    let labelColor = '#6B7280';
                    let labelBorder = '1px solid #E5E7EB';
                    let badge = '';
                    let badgeColor = '';

                    if (isCorrect) {
                      bg = '#F0FDF4';
                      border = '2px solid #00C950';
                      textColor = '#14532D';
                      labelBg = '#DCFCE7';
                      labelColor = '#16A34A';
                      labelBorder = '1px solid #86EFAC';
                      badge = '✓ Correct';
                      badgeColor = '#16A34A';
                    } else if (isSelected && !isCorrect) {
                      bg = '#FEF2F2';
                      border = '2px solid #FB2C36';
                      textColor = '#7F1D1D';
                      labelBg = '#FEE2E2';
                      labelColor = '#DC2626';
                      labelBorder = '1px solid #FCA5A5';
                      badge = '✕ Your Answer';
                      badgeColor = '#DC2626';
                    }

                    return (
                      <div key={option.id}
                        className="rounded-[clamp(8px,0.52vw,10px)] flex items-center justify-between"
                        style={{
                          padding: 'clamp(0.75rem,1vw,1.25rem)',
                          background: bg,
                          border,
                        }}>
                        <div className="flex items-center gap-3">
                          <span className="font-arimo font-bold flex-shrink-0" style={{
                            width: 'clamp(24px,1.5vw,28px)',
                            height: 'clamp(24px,1.5vw,28px)',
                            borderRadius: '6px',
                            background: labelBg,
                            color: labelColor,
                            border: labelBorder,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'clamp(12px,0.73vw,14px)',
                          }}>
                            {label}
                          </span>
                          <span className="font-arimo" style={{ fontSize: 'clamp(13px,0.73vw,14px)', lineHeight: 'clamp(18px,1.19vw,22.75px)', color: textColor }}>
                            {option.text}
                          </span>
                        </div>
                        {badge && (
                          <span className="font-arimo font-bold flex-shrink-0 ml-2" style={{ fontSize: 'clamp(11px,0.65vw,13px)', color: badgeColor }}>
                            {badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 font-arimo font-bold text-[#101828] hover:opacity-70 transition-opacity mb-[clamp(0.75rem,1vw,1.25rem)]"
                  style={{ fontSize: 'clamp(13px,0.73vw,14px)' }}>
                  {showExplanation ? 'Hide' : 'View'} Explanation
                  <img src="/arrow-down-icon.png" alt="Arrow"
                    style={{ width: 'clamp(14px,0.83vw,16px)', height: 'clamp(14px,0.83vw,16px)', transform: showExplanation ? 'rotate(180deg)' : undefined }} />
                </button>

                {showExplanation && q.explanation && (
                  <div className="bg-[#F9FAFB] rounded-[clamp(8px,0.52vw,10px)] border border-[#E5E7EB]"
                    style={{ padding: 'clamp(1rem,1.25vw,1.5rem)' }}>
                    <h3 className="font-arimo font-bold text-[#101828] mb-[clamp(0.5rem,0.75vw,1rem)]"
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

          <div className="flex items-center justify-center gap-[clamp(1rem,1.25vw,1.5rem)] px-[clamp(1.5rem,2vw,2.5rem)] pb-[clamp(1.25rem,1.5vw,2rem)] flex-shrink-0">
            <a href="/dashboard">
              <button className="flex items-center justify-center gap-2 bg-white hover:opacity-70 transition-opacity font-arimo"
                style={{ height: '51.2px', borderRadius: '10px', border: '1.6px solid #2B7FFF', fontSize: '16px', fontWeight: 400, color: '#155DFC', padding: '0 20px', whiteSpace: 'nowrap' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="#155DFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to Dashboard
              </button>
            </a>
            <a href="/dashboard/daily-mcq/next-steps">
              <button className="bg-[#17223E] text-white rounded-[clamp(8px,0.52vw,10px)] hover:bg-[#1E2875] transition-colors"
                style={{ padding: 'clamp(10px,0.83vw,12px) clamp(1.5rem,1.67vw,2rem)', fontSize: 'clamp(14px,0.83vw,16px)', fontFamily: 'Arimo, sans-serif' }}>
                View Smart Next Steps
              </button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
