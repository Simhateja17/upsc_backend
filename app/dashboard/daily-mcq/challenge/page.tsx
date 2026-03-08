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
  options: { id: string; text: string }[];
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

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const answerArray = questions.map(q => ({
      questionId: q.id,
      selectedOption: answers[q.id] || null,
    }));

    try {
      await dailyMcqService.submit(answerArray, timeTaken);
      router.push('/dashboard/daily-mcq/results');
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
                  <span className="text-xs font-bold text-[#E7000B] flex items-center gap-2 px-4 py-2 bg-[#FEF2F2] border border-[#FFC9C9] rounded-full whitespace-nowrap">
                    <span className="w-1.5 h-1.5 bg-[#E7000B] rounded-full"></span>
                    Todays Challenge is LIVE
                  </span>
                </div>
              </div>

              <div className="w-full border-t border-[#99A1AFE5] mb-4"></div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-[#EFF6FF] px-4 rounded-full w-[170px] h-[38px]">
                  <img src="/tag-one.png" alt="Tag" className="w-4 h-4" />
                  <span className="font-arimo font-bold text-[#155DFC] text-[14px] leading-[16px]">{q.category} • {q.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="/timer-icon.png" alt="Timer" className="w-10 h-10" />
                  <div className="flex flex-col items-end">
                    <span className={`font-arimo font-bold text-xl leading-none ${timeLeft < 60 ? 'text-red-600' : 'text-[#101828]'}`}>
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">TIME LEFT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="font-arimo font-bold text-[#101828] text-sm mb-3">
                <span className="font-bold">Question {q.questionNum}:</span> {q.questionText}
              </p>

              <p className="font-arimo text-[#101828] text-sm mb-6">
                Which of the statements given above are correct?
              </p>

              <div className="space-y-3">
                {q.options.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    className={`w-full flex items-center gap-4 p-4 border rounded-lg transition-colors bg-white text-left ${
                      answers[q.id] === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-arimo font-bold text-[#101828] text-base">{option.id}</span>
                    <span className="font-arimo text-[#101828] text-sm">{option.text}</span>
                  </button>
                ))}
              </div>
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
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQuestion(i)}
                    className={`w-8 h-8 rounded-full font-arimo font-bold text-sm transition-all ${
                      currentQuestion === i ? 'bg-[#00A63E] text-white'
                        : answers[questions[i].id] ? 'bg-blue-100 text-blue-700'
                        : 'text-[#6B7280] hover:bg-gray-100'
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>

              {currentQuestion === questions.length - 1 ? (
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
