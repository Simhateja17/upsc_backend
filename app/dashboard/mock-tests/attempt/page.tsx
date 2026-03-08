'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService } from '@/lib/services';

interface Question {
  id: number;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  text: string;
  options: { label: string; text: string }[];
  correct: string;
  explanation: string;
}

type QuestionStatus = 'unattempted' | 'answered' | 'marked' | 'current';

function MockTestAttemptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');

  /* ─── API / Loading State ─── */
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ─── Quiz State ─── */
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());

  /* ─── Load questions from API ─── */
  useEffect(() => {
    if (!testId) {
      setError('No test ID provided. Please generate a test first.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadQuestions() {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getQuestions(testId!);
        if (cancelled) return;

        const qs: Question[] = res.data?.questions || res.data || [];
        if (!qs.length) {
          throw new Error('No questions returned for this test.');
        }
        setQuestions(qs);
        // Initialize statuses
        const statuses: Record<number, QuestionStatus> = {};
        qs.forEach((_, i) => {
          statuses[i] = i === 0 ? 'current' : 'unattempted';
        });
        setQuestionStatuses(statuses);
        // Set timer based on question count (approx 1.6 min per question)
        const duration = res.data?.duration || Math.ceil(qs.length * 1.6) * 60;
        setTimeLeft(duration);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load questions:', err);
          setError(err.message || 'Failed to load test questions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, questions.length]);

  const totalQuestions = questions.length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const goToQuestion = useCallback((idx: number) => {
    setQuestionStatuses(prev => {
      const updated = { ...prev };
      // Only change current question status if it's still 'current' (not answered/marked)
      if (updated[currentIdx] === 'current') updated[currentIdx] = 'unattempted';
      if (updated[idx] !== 'answered' && updated[idx] !== 'marked') updated[idx] = 'current';
      return updated;
    });
    setCurrentIdx(idx);
  }, [currentIdx]);

  const handleSelectOption = (label: string) => {
    setSelectedOptions(prev => ({ ...prev, [currentIdx]: label }));
    setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'answered' }));
  };

  const handleMark = () => {
    setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'marked' }));
    handleNext();
  };

  const handleClear = () => {
    setSelectedOptions(prev => { const n = { ...prev }; delete n[currentIdx]; return n; });
    setQuestionStatuses(prev => ({
      ...prev,
      [currentIdx]: prev[currentIdx] === 'marked' ? 'unattempted' : prev[currentIdx] === 'answered' ? 'unattempted' : prev[currentIdx],
    }));
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) goToQuestion(currentIdx + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  };

  const handleSubmit = async () => {
    if (!testId) return;
    setSubmitting(true);
    setError(null);
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      // Build answers map: questionId -> selected option label
      const answersMap: Record<string, string> = {};
      Object.entries(selectedOptions).forEach(([idx, opt]) => {
        const q = questions[Number(idx)];
        if (q) {
          answersMap[String(q.id)] = opt;
        }
      });
      await mockTestService.submit(testId, answersMap, timeTaken);
      router.push(`/dashboard/mock-tests/attempt/results?testId=${testId}`);
    } catch (err: any) {
      console.error('Failed to submit test:', err);
      setError(err.message || 'Failed to submit test. Please try again.');
      setSubmitting(false);
    }
  };

  // Stats
  const answered = Object.values(questionStatuses).filter(s => s === 'answered').length;
  const marked = Object.values(questionStatuses).filter(s => s === 'marked').length;
  const correct = Object.entries(selectedOptions).filter(([idx, opt]) => questions[Number(idx)]?.correct === opt).length;
  const wrong = Object.keys(selectedOptions).length - correct;
  const netScore = correct * 2 - wrong * 0.67;

  const currentQ = questions[currentIdx];

  const statusColor: Record<QuestionStatus, string> = {
    answered: '#00C950',
    current: '#2B7FFF',
    marked: '#FDC700',
    unattempted: '#314158',
  };

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading test questions...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error && questions.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#101828', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '400px', textAlign: 'center' }}>{error}</p>
        <button
          onClick={() => router.push('/dashboard/mock-tests')}
          style={{
            background: '#0F172B',
            color: '#FFF',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Back to Mock Tests
        </button>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        width: '100%',
        height: '56px',
        background: '#0F172B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '32px',
        paddingRight: '32px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #1E293B',
        flexShrink: 0,
      }}>
        {/* Left – title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '16px', lineHeight: '24px', color: '#FDC700' }}>
            Prelims Practice
          </span>
        </div>

        {/* Centre – avatar */}
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: '#fff' }}>
          P
        </div>

        {/* Right – counter + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontWeight: 500, fontSize: '14px', color: '#D1D5DC' }}>
            Q {currentIdx + 1} of {totalQuestions}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E293B', borderRadius: '8px', padding: '6px 12px' }}>
            <span style={{ fontSize: '14px' }}>⏱</span>
            <span style={{ fontWeight: 700, fontSize: '16px', color: timeLeft < 300 ? '#EF4444' : '#FFFFFF', letterSpacing: '1px' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      {/* ── Submit Error Banner ── */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ fontSize: '14px', color: '#991B1B' }}>{error}</span>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, gap: '0', overflow: 'hidden' }}>

        {/* ── Question Panel ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#FFFFFF' }}>

          {/* Question Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            {/* Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ background: '#0F172B', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', borderRadius: '8px', padding: '4px 12px' }}>
                Q {currentIdx + 1}
              </span>
              <span style={{ background: 'none', color: '#155DFC', fontWeight: 500, fontSize: '13px', borderRadius: '8px', padding: '4px 12px' }}>
                {currentQ.subject}
              </span>
              <span style={{ background: '#F3F4F6', fontSize: '13px', borderRadius: '8px', padding: '4px 12px', fontWeight: 500, color: '#6A7282' }}>
                {currentQ.difficulty}
              </span>
            </div>

            {/* Question Text */}
            <p style={{ fontSize: '17px', fontWeight: 500, color: '#0F172A', lineHeight: '28px', marginBottom: '28px' }}>
              {currentQ.text}
            </p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map(opt => {
                const hasAnswered = !!selectedOptions[currentIdx];
                const isSelected = selectedOptions[currentIdx] === opt.label;
                const isCorrectOpt = opt.label === currentQ.correct;
                const isWrongSelected = isSelected && !isCorrectOpt;

                let bg = '#FFFFFF';
                let border = '2px solid #E2E8F0';
                let circleColor = '#CBD5E1';
                let circleBg = 'transparent';
                let circleText = '#64748B';
                let circleIcon: string = opt.label;
                let textColor = '#1E293B';
                let fontWeight = 400;

                if (hasAnswered) {
                  if (isCorrectOpt) {
                    bg = '#F0FDF4';
                    border = '2px solid #00C950';
                    circleColor = '#00C950';
                    circleBg = '#DCFCE7';
                    circleText = '#00C950';
                    circleIcon = '✓';
                    textColor = '#14532D';
                    fontWeight = 600;
                  } else if (isWrongSelected) {
                    bg = '#FEF2F2';
                    border = '2px solid #FB2C36';
                    circleColor = '#FB2C36';
                    circleBg = '#FEE2E2';
                    circleText = '#FB2C36';
                    circleIcon = '✕';
                    textColor = '#7F1D1D';
                    fontWeight = 600;
                  }
                } else if (isSelected) {
                  bg = '#EFF6FF';
                  border = '2px solid #2B7FFF';
                  circleColor = '#2B7FFF';
                  circleBg = '#DBEAFE';
                  circleText = '#2B7FFF';
                  fontWeight = 600;
                }

                return (
                  <button
                    key={opt.label}
                    onClick={() => !hasAnswered && handleSelectOption(opt.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border,
                      background: bg,
                      cursor: hasAnswered ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${circleColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: circleText,
                      flexShrink: 0,
                      background: circleBg,
                    }}>
                      {circleIcon}
                    </span>
                    <span style={{ fontSize: '15px', color: textColor, fontWeight }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation — shown after answering */}
            {selectedOptions[currentIdx] && currentQ.explanation && (
              <div style={{
                marginTop: '20px',
                background: '#EFF6FF',
                borderLeft: '4px solid #2B7FFF',
                borderRadius: '10px',
                padding: '16px 16px 16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#155DFC', lineHeight: '20px' }}>
                  💡 EXPLANATION
                </span>
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#1C398E', lineHeight: '20px' }}>
                  {currentQ.explanation}
                </span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 24px',
            border: '1px solid #E2E8F0',
          }}>
            {/* Left actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleMark}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#FB2C36',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                🚩 Mark
              </button>
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '52px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6A7282',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '0px',
                  padding: 0,
                }}
              >
                ✕ Clear
              </button>
              <button
                onClick={handleNext}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#155DFC',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                Skip
              </button>
            </div>

            {/* Right nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                style={{
                  background: 'none',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  color: currentIdx === 0 ? '#CBD5E1' : '#334155',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={currentIdx === totalQuestions - 1}
                style={{
                  background: currentIdx === totalQuestions - 1 ? '#1E293B' : '#2B7FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 22px',
                  color: '#FFFFFF',
                  cursor: currentIdx === totalQuestions - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar ── */}
        <aside style={{
          width: '360px',
          flexShrink: 0,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#060E1F',
        }}>

          {/* Live Stats */}
          <div style={{ background: '#0F172B', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.6px', color: '#FDC700', textTransform: 'uppercase', marginBottom: '16px' }}>
              Live Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderRadius: '12px', overflow: 'hidden' }}>
              {[
                { label: 'CORRECT', value: correct, color: '#00C950' },
                { label: 'WRONG', value: wrong, color: '#FF4444' },
                { label: 'MARKED', value: marked, color: '#FFFFFF' },
                { label: 'NET SCORE', value: netScore.toFixed(1), color: '#FFFFFF', big: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: '#0F172B',
                  }}
                >
                  <div style={{ fontSize: stat.big ? '30px' : '28px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#99A1AF', letterSpacing: '0.6px', marginTop: '6px', textTransform: 'uppercase' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ background: '#0F172B', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.6px', color: '#FDC700', textTransform: 'uppercase', marginBottom: '16px' }}>
              Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { color: '#00C950', label: 'Answered' },
                { color: '#2B7FFF', label: 'Current' },
                { color: '#FDC700', label: 'Marked' },
                { color: '#4A5565', label: 'Unattempted' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: '#D1D5DC' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question Navigator */}
          <div style={{ background: '#0F172B', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.6px', color: '#FDC700', textTransform: 'uppercase', marginBottom: '16px' }}>
              Question Navigator
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {questions.map((_, idx) => {
                const status = questionStatuses[idx] || 'unattempted';
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: statusColor[status],
                      border: 'none',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Test */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              height: '56px',
              background: submitting ? '#1E293B' : '#0F172B',
              border: 'none',
              borderRadius: '16px',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#1E293B'; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#0F172B'; }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Submitting...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              '🏁 Submit Test'
            )}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default function MockTestAttemptPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <MockTestAttemptInner />
    </Suspense>
  );
}
