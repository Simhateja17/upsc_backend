'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyAnswerService } from '@/lib/services';

interface QuestionData {
  id: string;
  questionText: string;
  paper: string;
  subject: string;
  marks: number;
  wordLimit: number;
  timeLimit: number;
  attemptCount: number;
}

export default function DailyMainsChallengeContextPage() {
  const [data, setData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dailyAnswerService.getFullQuestion()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] font-arimo">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] font-arimo">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load question</h2>
            <p className="text-gray-500">{error || 'Please try again later.'}</p>
            <Link href="/dashboard/daily-answer" className="mt-4 inline-block text-blue-600 hover:underline">Back to Challenge</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] font-arimo">
      <div className="flex-1 flex flex-col items-center pt-16 pb-20 w-full max-w-[1440px] mx-auto">

        {/* Top Tag */}
        <div
            className="flex items-center justify-center gap-2 px-4 py-1.5 mb-8"
            style={{
                borderRadius: '26px',
                border: '0.8px solid #E9D4FF',
                background: '#FAF5FF',
                width: 'fit-content'
            }}
        >
            <img src="/Icon%20(5).png" alt="Star" style={{ width: '16px', height: '16px' }} />
            <span style={{ color: '#8200DB', fontSize: '14px', fontWeight: 500 }}>UPSC Mains Challenge</span>
        </div>

        {/* Main Title */}
        <h1
            className="text-center font-inter text-[#17223E] mb-6"
            style={{
                fontSize: '60px',
                lineHeight: '70px',
                fontWeight: 400
            }}
        >
            Daily Answer Writing <br/>
            with Instant Evaluation
        </h1>

        {/* Subtitle / Description */}
        <p
            className="text-center text-[#4A5565] mb-16 px-4"
            style={{
                fontSize: '20px',
                lineHeight: '26px',
                maxWidth: '900px'
            }}
        >
            Practice one UPSC–level question every day. Get structured feedback,
            personalized insights, model answers, and actionable improvement points to steadily boost your mains scores.
        </p>

        {/* Question Card Container */}
        <div
            className="relative rounded-[30px]"
            style={{
                width: '100%', maxWidth: '1091px',
                minHeight: '336px',
                boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                padding: '30px 40px',
                background: '#FFFFFF',
            }}
        >
            {/* Tags Row */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex gap-3">
                    {/* Tag 1 */}
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
                        style={{
                            background: '#FAF5FF',
                            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                        }}
                    >
                        <span style={{ fontSize: '14px', color: '#8200DB' }}>{data.paper}</span>
                    </div>
                    {/* Tag 2 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] rounded-[10px]"
                        style={{
                            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                        }}
                    >
                        <span style={{ fontSize: '14px', color: '#1447E6' }}>{data.subject}</span>
                    </div>
                </div>

                {/* Live Now Badge */}
                <div
                    className="flex items-center justify-center px-4 py-1 gap-2"
                    style={{
                        background: '#FEF2F2',
                        border: '0.8px solid #FFC9C9',
                        borderRadius: '20px',
                    }}
                >
                    <div className="w-2 h-2 rounded-full bg-[#DC2626]"></div>
                    <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 700 }}>LIVE NOW</span>
                </div>
            </div>

            {/* Question Text Box */}
            <div
                className="mb-8 p-8 rounded-[10px] bg-[#F9FAFB]"
                style={{
                    boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                }}
            >
                <p
                    className="text-[#101828] font-bold font-arimo"
                    style={{ fontSize: '18px', lineHeight: '29.25px' }}
                >
                    &quot;{data.questionText}&quot;
                </p>
            </div>

            {/* Meta Info and Actions Row Container */}
            <div className="flex flex-col gap-8">
                {/* Meta Info Row */}
                <div className="flex items-center gap-8 text-[#4A5565] font-arimo" style={{ fontSize: '14px' }}>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(8).png" alt="Time" style={{ width: '20px', height: '20px' }} />
                        <span>Time: {data.timeLimit} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(7).png" alt="Word limit" style={{ width: '20px', height: '20px' }} />
                        <span>Word limit: {data.wordLimit} words</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(6).png" alt="Marks" style={{ width: '20px', height: '20px' }} />
                        <span>Marks: {data.marks}</span>
                    </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-4">
                        {/* Begin Challenge Button */}
                        <Link href="/dashboard/daily-answer/challenge/attempt">
                            <button
                                className="bg-[#17223E] text-white flex items-center justify-center gap-2 transition-transform hover:scale-105"
                                style={{
                                    width: '195px',
                                    height: '56px',
                                    borderRadius: '14px',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                Begin Challenge
                            </button>
                        </Link>

                        {/* App Button */}
                        <button
                            className="bg-[#17223E] text-white flex items-center justify-center gap-2 transition-transform hover:scale-105"
                            style={{
                                width: '269px',
                                height: '56px',
                                borderRadius: '14px',
                                fontSize: '17px',
                                fontWeight: 700,
                                boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <img src="/Icon%20(9).png" alt="App" style={{ width: '24px', height: '24px' }} />
                            Attempt Challenge on App
                        </button>
                    </div>

                    {/* Social Proof */}
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                             {/* Mock avatars using simple circles if images fail, or existing assets */}
                             <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white"></div>
                             <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-white"></div>
                             <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-white"></div>
                        </div>
                        <span className="text-[#4A5565]" style={{ fontSize: '14px' }}>{data.attemptCount}+ Students already attempted</span>
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}
