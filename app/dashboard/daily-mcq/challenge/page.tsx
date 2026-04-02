'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dailyMcqService } from '@/lib/services';

interface Question {
  id: string;
  questionNum: number;
  questionText: string;
  category: string;
  difficulty: string;
  options: { id?: string; label?: string; text: string }[];
  correctOption: string;
  explanation: string | null;
}

export default function DailyMcqChallengePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mcqId, setMcqId] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    dailyMcqService.getQuestions()
      .then(res => {
        setQuestions(res.data.questions);
        setMcqId(res.data.mcqId);
        setTimeLimit(res.data.timeLimit);
        setTimeLeft(res.data.timeLimit * 60);
        startTimeRef.current = Date.now();
      })
      .catch(() => router.push('/dashboard/daily-mcq'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0 || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    // Once answered, don't allow changing
    if (answers[questionId]) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const answerArray = questions.map(q => ({
      questionId: q.id,
      selectedOption: answers[q.id] || null,
    }));

    try {
      await dailyMcqService.submit(answerArray, timeTaken);
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const q = questions[currentQuestion];
  if (!q) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const hasAnswered = !!answers[q.id];

  // Stats for submitted state
  const totalAnswered = Object.keys(answers).length;
  const correctCount = questions.filter(qu => answers[qu.id] && answers[qu.id] === qu.correctOption).length;
  const wrongCount = questions.filter(qu => answers[qu.id] && answers[qu.id] !== qu.correctOption).length;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#FFFFFF' }}>
      <main className="flex-1 px-[clamp(3rem,6.25vw,8rem)] py-8">
        <div className="max-w-[900px] mx-auto">
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 mb-6 hover:opacity-70 transition-opacity"
            style={{ width: '237px', height: '51px', borderRadius: '20px', background: '#1C50D40D', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '22px', color: '#17223E' }}>
            ← Back to dashboard
          </Link>

          <div style={{ maxWidth: '1050px', borderRadius: '10px', background: '#EAECEF40', boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A', padding: '24px' }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img src="/daily-challenge-icon.png" alt="MCQ" className="w-10 h-10" />
                  <h1 className="font-arimo font-bold text-black text-[26px] leading-[28px] whitespace-nowrap">
                    Daily MCQ Challenge
                    <span className="font-arimo font-normal text-[#94A3B8] text-[18px] leading-[28px]"> · ({new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })})</span>
                  </h1>
                </div>
                <div className="flex items-center">
                  {submitted ? (
                    <span className="text-xs font-bold text-[#00A63E] flex items-center gap-2 px-4 py-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 bg-[#00A63E] rounded-full"></span>
                      Submitted — {correctCount}/{questions.length} Correct
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#E7000B] flex items-center gap-2 px-4 py-2 bg-[#FEF2F2] border border-[#FFC9C9] rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 bg-[#E7000B] rounded-full"></span>
                      Todays Challenge is LIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full border-t border-[#99A1AFE5] mb-4"></div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-[#EFF6FF] px-4 rounded-full w-[170px] h-[38px]">
                  <img src="/tag-one.png" alt="Tag" className="w-4 h-4" />
                  <span className="font-arimo font-bold text-[#155DFC] text-[14px] leading-[16px]">{q.category} • {q.difficulty}</span>
                </div>
                {!submitted && (
                  <div className="flex items-center gap-2">
                    <img src="/timer-icon.png" alt="Timer" className="w-10 h-10" />
                    <div className="flex flex-col items-end">
                      <span className={`font-arimo font-bold text-xl leading-none ${timeLeft < 60 ? 'text-red-600' : 'text-[#101828]'}`}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">TIME LEFT</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="font-arimo font-bold text-[#101828] text-sm mb-6">
                <span className="font-bold">Question {q.questionNum}:</span> {q.questionText}
              </p>

              <div className="space-y-3">
                {q.options.map((option: any) => {
                  const optKey = option.id || option.label;
                  const isSelected = answers[q.id] === optKey;
                  const isCorrectOpt = optKey === q.correctOption;
                  const isWrongSelected = isSelected && !isCorrectOpt;

                  let bg = '#FFFFFF';
                  let border = '2px solid #E2E8F0';
                  let circleColor = '#CBD5E1';
                  let circleBg = 'transparent';
                  let circleText = '#64748B';
                  let circleIcon: string = optKey;
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
                      key={optKey}
                      onClick={() => handleSelectAnswer(q.id, optKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border,
                        background: bg,
                        cursor: hasAnswered ? 'default' : 'pointer',
                        textAlign: 'left' as const,
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
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation — shown after answering */}
              {hasAnswered && q.explanation && (
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
                    EXPLANATION
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 400, color: '#1C398E', lineHeight: '20px' }}>
                    {q.explanation}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-[#101828] hover:opacity-70 transition-opacity disabled:opacity-30"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(prev => prev - 1)}
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-arimo font-bold text-sm">Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {questions.map((qu, i) => {
                  const answered = !!answers[qu.id];
                  const isCorrect = answered && answers[qu.id] === qu.correctOption;
                  const isWrong = answered && answers[qu.id] !== qu.correctOption;

                  let bgColor = '';
                  let txtColor = '#6B7280';

                  if (currentQuestion === i) {
                    bgColor = '#00A63E';
                    txtColor = '#FFFFFF';
                  } else if (isCorrect) {
                    bgColor = '#DCFCE7';
                    txtColor = '#14532D';
                  } else if (isWrong) {
                    bgColor = '#FEE2E2';
                    txtColor = '#7F1D1D';
                  }

                  return (
                    <button key={i} onClick={() => setCurrentQuestion(i)}
                      className="w-8 h-8 rounded-full font-arimo font-bold text-sm transition-all"
                      style={{
                        background: bgColor || undefined,
                        color: txtColor,
                      }}
                      onMouseEnter={(e) => { if (!bgColor) e.currentTarget.style.background = '#F3F4F6'; }}
                      onMouseLeave={(e) => { if (!bgColor) e.currentTarget.style.background = ''; }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {submitted ? (
                <button
                  className="flex items-center gap-2 bg-[#17223E] text-white px-5 py-2 rounded-lg hover:bg-[#1E2875] transition-colors"
                  onClick={() => router.push('/dashboard/daily-mcq/results')}
                >
                  <span className="font-arimo font-bold text-sm">View Results</span>
                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ) : currentQuestion === questions.length - 1 ? (
                <button
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <span className="font-arimo font-bold text-sm">{submitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-2 bg-[#17223E] text-white px-5 py-2 rounded-lg hover:bg-[#1E2875] transition-colors"
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                >
                  <span className="font-arimo font-bold text-sm">Next</span>
                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
