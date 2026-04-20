'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyMcqService } from '@/lib/services';

interface MCQData {
  id: string;
  title: string;
  topic: string;
  tags: string[];
  questionCount: number;
  timeLimit: number;
  totalMarks: number;
  attempted: boolean;
}

export default function DailyMcqIntroPage() {
  const [mcq, setMcq] = useState<MCQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dailyMcqService.getToday()
      .then(res => setMcq(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen panel-recessed">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    );
  }

  if (error || !mcq) {
    return (
      <div className="flex flex-col min-h-screen panel-recessed">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">No MCQ Challenge Today</h2>
            <p className="text-gray-500">{error || 'Check back later for today\'s challenge.'}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  const displayTitle = mcq.title
    .replace(/\s*(?:-{1,3}|\u2013|\u2014)\s*[^-\u2013\u2014]+$/, '')
    .trim();

  const marksPerQuestion = mcq.totalMarks / mcq.questionCount;
  const negativeMarking = marksPerQuestion / 3;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%', background: '#ffffff' }}>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {/* Intro Card */}
        <div className="card-elevated rounded-[16px] p-6 md:p-8 text-center w-full max-w-[605px] mx-auto" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Icon */}
          <div className="flex justify-center mb-6" style={{ width: '51px', height: '44px' }}>
            <img src="/icons/dashboard/daily-mcq.png" alt="Target Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h1 className="font-arimo font-bold text-[#101828] text-[24px] leading-[32px] mb-2">
            Today's Daily MCQs
          </h1>

          <p className="font-arimo text-[#667085] text-[14px] leading-[20px] mb-6">
            Sharpen your knowledge with focused practice questions
          </p>

          {/* Topic & Focus Capsules */}
          <div className="flex flex-nowrap items-center justify-center gap-2 mb-6 w-full overflow-hidden">
            {mcq.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-[#EFF6FF] text-[#101828] rounded-full font-arimo text-[14px] leading-[20px] whitespace-nowrap truncate max-w-[140px]" title={tag}>
                {tag}
              </span>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-[340px] mx-auto mb-6">
            <div className="flex flex-col items-center p-3 rounded-[12px]" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="font-arimo font-bold text-[#101828] text-[28px] leading-tight">{mcq.questionCount}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Questions</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-[12px]" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="font-arimo font-bold text-[#101828] text-[28px] leading-tight">{mcq.timeLimit}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Minutes</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-[12px]" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="font-arimo font-bold text-[#101828] text-[28px] leading-tight">{mcq.totalMarks}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Max Marks</div>
            </div>
          </div>

          {/* Marking Pattern */}
          <div className="w-full max-w-[340px] mx-auto mb-6 rounded-[12px] p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="font-arimo font-bold text-[#166534] text-[14px] leading-[20px] mb-3 text-left">
              MARKING PATTERN
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: '#00A63E' }}></span>
                <span className="font-arimo text-[#166534] text-[14px]">Correct answer</span>
              </div>
              <span className="font-arimo font-bold text-[#00A63E] text-[14px]">+{marksPerQuestion.toFixed(2)} marks</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: '#E7000B' }}></span>
                <span className="font-arimo text-[#166534] text-[14px]">Wrong answer</span>
              </div>
              <span className="font-arimo font-bold text-[#E7000B] text-[14px]">-{negativeMarking.toFixed(2)} marks</span>
            </div>
          </div>

          {mcq.attempted ? (
            <Link href="/dashboard/daily-mcq/results">
              <button className="w-full max-w-[232px] h-[52px] bg-green-600 text-white rounded-[10px] hover:bg-green-700 transition-all flex items-center justify-center gap-2 mx-auto font-arimo font-bold text-[20px] leading-[24px]">
                View Results
              </button>
            </Link>
          ) : (
            <Link href="/dashboard/daily-mcq/challenge">
              <button className="w-full max-w-[232px] h-[52px] bg-[#101828] text-white rounded-[10px] hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-2 mx-auto font-arimo font-bold text-[20px] leading-[24px]">
                <img src="/icon-1.png" alt="" className="w-5 h-5 object-contain" />
                Start Now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white ml-1">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Link>
          )}

          <p className="font-arimo text-[#9CA3AF] text-[12px] mt-4 cursor-pointer hover:text-gray-600">
            Skip intro (auto-start in 5s)
          </p>
        </div>
      </main>
    </div>
  );
}
