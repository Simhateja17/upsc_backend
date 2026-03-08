'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyAnswerService } from '@/lib/services';

interface AnswerData {
  id: string;
  title: string;
  paper: string;
  subject: string;
  marks: number;
  wordLimit: number;
  timeLimit: number;
  attempted: boolean;
  attemptCount: number;
}

export default function DailyMainsChallengePage() {
  const [data, setData] = useState<AnswerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dailyAnswerService.getToday()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col bg-gray-50 font-arimo relative overflow-hidden" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col bg-gray-50 font-arimo relative overflow-hidden" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Mains Challenge Today</h2>
            <p className="text-gray-500">{error || 'Check back later for today\'s challenge.'}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 font-arimo relative overflow-hidden" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div
          className="relative bg-white rounded-[16px] flex flex-col items-center shadow-lg"
          style={{
            width: '605px',
            height: '630px',
            boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
            paddingTop: '32px'
          }}
        >
          {/* Top Icon */}
          <img
            src="/pen-circle.png"
            alt="Pen"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '26843500px',
              objectFit: 'contain',
              marginBottom: '24px',
            }}
          />

          {/* Title */}
          <h1
            className="font-bold text-[#101828] text-center mb-2"
            style={{
              fontSize: '32px',
              lineHeight: '40px',
            }}
          >
            Daily Mains Challenge
          </h1>

          {/* Subtitle */}
          <div
            className="text-[#4A5565] text-center mb-6 px-12"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
            }}
          >
            <p>Sharpen your answer writing skills with today&apos;s carefully crafted question.</p>
            <p>Develop structure, clarity, and depth in your answers.</p>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-3 mb-8">
            <span
              className="flex items-center justify-center bg-[#EFF6FF] text-[#101828] rounded-full font-medium"
              style={{
                padding: '6px 16px',
                fontSize: '14px',
              }}
            >
              {data.paper}
            </span>
            <span
              className="flex items-center justify-center bg-[#EFF6FF] text-[#101828] rounded-full font-medium"
              style={{
                padding: '6px 16px',
                fontSize: '14px',
              }}
            >
              {data.subject}
            </span>
            <span
              className="flex items-center justify-center bg-[#EFF6FF] text-[#101828] rounded-full font-medium"
              style={{
                padding: '6px 16px',
                fontSize: '14px',
              }}
            >
              {data.marks} Marks
            </span>
          </div>

          {/* Stats Grid */}
          <div
            className="flex items-center justify-center mb-10 w-full max-w-sm"
            style={{ gap: '48px' }}
          >
            {/* Minutes */}
            <div className="flex flex-col items-center" style={{ gap: '2px' }}>
              <span className="font-bold text-[#101828]" style={{ fontSize: '30px', lineHeight: '36px' }}>{data.timeLimit}</span>
              <span className="text-[#4A5565] font-normal" style={{ fontSize: '12px', lineHeight: '16px' }}>Minutes</span>
            </div>

            {/* Marks */}
            <div className="flex flex-col items-center" style={{ gap: '2px' }}>
              <span className="font-bold text-[#101828]" style={{ fontSize: '30px', lineHeight: '36px' }}>{data.marks}</span>
              <span className="text-[#4A5565] font-normal" style={{ fontSize: '12px', lineHeight: '16px' }}>Marks</span>
            </div>

            {/* Word Limit */}
            <div className="flex flex-col items-center" style={{ gap: '2px' }}>
              <span className="font-bold text-[#101828]" style={{ fontSize: '30px', lineHeight: '36px' }}>{data.wordLimit}</span>
              <span className="text-[#4A5565] font-normal" style={{ fontSize: '12px', lineHeight: '16px' }}>Word Limit</span>
            </div>
          </div>

          {/* Start Button */}
          {data.attempted ? (
            <Link href="/dashboard/daily-answer/challenge/attempt/results">
              <button
                className="flex items-center justify-center gap-3 bg-green-600 text-white rounded-[10px] hover:scale-105 transition-transform shadow-lg"
                style={{
                  width: '232px',
                  height: '52px',
                  marginTop: '10px'
                }}
              >
                <span className="font-bold text-[16px]">View Results</span>
              </button>
            </Link>
          ) : (
            <Link href="/dashboard/daily-answer/challenge">
              <button
                className="flex items-center justify-center gap-3 bg-[#101828] text-white rounded-[10px] hover:scale-105 transition-transform shadow-lg"
                style={{
                  width: '232px',
                  height: '52px',
                  marginTop: '10px'
                }}
              >
                <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center">
                     <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <span className="font-bold text-[16px]">Start Now</span>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Link>
          )}

          <p className="text-[#6A7282] mt-4 font-normal" style={{ fontSize: '12px' }}>
            Skip intro (auto-start in 5s)
          </p>
        </div>
      </main>
    </div>
  );
}
