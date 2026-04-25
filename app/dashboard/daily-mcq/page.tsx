'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [mcq, setMcq] = useState<MCQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [introCountdown, setIntroCountdown] = useState(15);

  const FIXED_QUESTION_COUNT = 10;
  const FIXED_TIME_LIMIT = 10;
  const FIXED_TOTAL_MARKS = 20;

  useEffect(() => {
    dailyMcqService.getToday()
      .then(res => setMcq(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || error || !mcq || mcq.attempted) return;
    if (introCountdown <= 0) {
      router.push('/dashboard/daily-mcq/challenge');
      return;
    }
    const t = setTimeout(() => setIntroCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [introCountdown, loading, error, mcq, router]);

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

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))', background: '#ffffff' }}>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {/* Intro Card */}
        <div className="card-elevated rounded-[16px] p-8 text-center" style={{ width: '605px', height: '630px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <img src="/icons/dashboard/daily-mcq.png" alt="Target Icon" className="w-[51px] h-[44px] object-contain" />
          </div>

          <h1 className="font-arimo font-bold text-[#101828] text-[24px] leading-[32px] mb-2">
            {displayTitle || mcq.title}
          </h1>

          <p className="font-arimo text-[#667085] text-[14px] leading-[20px] mb-6">
            Sharpen your knowledge with focused practice questions
          </p>

          <div className="flex flex-nowrap items-center justify-center gap-2 mb-8 overflow-x-auto">
            {mcq.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-[#EFF6FF] text-[#101828] rounded-full font-arimo text-[14px] leading-[20px] whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 w-[300px] mx-auto mb-8">
            <div className="flex flex-col items-center">
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{FIXED_QUESTION_COUNT}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Questions</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{FIXED_TIME_LIMIT}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Minutes</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{FIXED_TOTAL_MARKS}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Marks</div>
            </div>
          </div>

          {mcq.attempted ? (
            <Link href="/dashboard/daily-mcq/results">
              <button className="w-[232px] h-[52px] bg-green-600 text-white rounded-[10px] hover:bg-green-700 transition-all flex items-center justify-center gap-2 mx-auto font-arimo font-bold text-[20px] leading-[24px]">
                View Results
              </button>
            </Link>
          ) : (
            <Link href="/dashboard/daily-mcq/challenge">
              <button className="w-[232px] h-[52px] bg-[#101828] text-white rounded-[10px] hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-2 mx-auto font-arimo font-bold text-[20px] leading-[24px]">
                <img src="/icon-1.png" alt="" className="w-5 h-5 object-contain" />
                Start Now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white ml-1">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Link>
          )}

          {!mcq.attempted && (
            <button
              onClick={() => setIntroCountdown(0)}
              className="font-arimo text-[#9CA3AF] text-[12px] mt-4 cursor-pointer hover:text-gray-600"
            >
              Skip intro (auto-start in {introCountdown}s)
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
