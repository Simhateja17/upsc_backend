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

  return (
    <div className="flex flex-col overflow-hidden panel-recessed" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[448px] card-elevated rounded-[16px] p-8 text-center">
          <div className="flex justify-center mb-6">
            <img src="/image-removebg-preview (22) 1.png" alt="Target Icon" className="w-[51px] h-[44px] object-contain" />
          </div>

          <h1 className="font-arimo font-bold text-[#101828] text-[24px] leading-[32px] mb-2">
            {mcq.title}
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
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{mcq.questionCount}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Questions</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{mcq.timeLimit}</div>
              <div className="font-arimo text-[#667085] text-[12px] mt-1">Minutes</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-arimo font-bold text-[#101828] text-[32px] leading-tight max-md:text-[24px]">{mcq.totalMarks}</div>
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

          <p className="font-arimo text-[#9CA3AF] text-[12px] mt-4 cursor-pointer hover:text-gray-600">
            Skip intro (auto-start in 5s)
          </p>
        </div>
      </main>
    </div>
  );
}
