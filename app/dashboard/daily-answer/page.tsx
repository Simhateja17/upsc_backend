'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const attemptRef = useRef<HTMLDivElement>(null);

  // API data state
  const [data, setData] = useState<AnswerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Challenge state
  const [challengeStarted, setChallengeStarted] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    dailyAnswerService.getToday()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      if (interval) clearInterval(interval);
      setIsActive(false);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(a => !a);
  const resetTimer = () => { setIsActive(false); setTimeLeft(15 * 60); };
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleBeginChallenge = () => {
    setChallengeStarted(true);
    setIsActive(true);
    setTimeout(() => {
      attemptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
    <div className="flex flex-col bg-gray-50 font-arimo relative min-h-screen overflow-y-auto">
      {/* Intro Card Section */}
      <main className="flex items-center justify-center p-6 relative z-10" style={{ minHeight: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
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

      {/* Challenge Section — visible on scroll */}
      <section className="flex flex-col items-center pt-16 pb-20 w-full max-w-[1440px] mx-auto">
        
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
                width: '1091px',
                minHeight: '336px',
                boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                padding: '30px 40px',
                background: '#FFFFFF',
            }}
        >
            {/* Tags Row */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex gap-3">
                    <div 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
                        style={{
                            background: '#FAF5FF',
                            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                        }}
                    >
                        <span style={{ fontSize: '14px', color: '#8200DB' }}>📄 GS Paper II</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] rounded-[10px]"
                        style={{
                            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                        }}
                    >
                        <span style={{ fontSize: '14px', color: '#1447E6' }}>🏛️ Governance & Social Justice</span>
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
                    &quot;Evaluate the role of local self-government institutions in strengthening democracy in India. Illustrate with constitutional provisions and recent initiatives.&quot;
                </p>
            </div>

            {/* Meta Info and Actions Row Container */}
            <div className="flex flex-col gap-8">
                {/* Meta Info Row */}
                <div className="flex items-center gap-8 text-[#4A5565] font-arimo" style={{ fontSize: '14px' }}>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(8).png" alt="Time" style={{ width: '20px', height: '20px' }} />
                        <span>Time: 15 minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(7).png" alt="Word limit" style={{ width: '20px', height: '20px' }} />
                        <span>Word limit: 250-300 words</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/Icon%20(6).png" alt="Marks" style={{ width: '20px', height: '20px' }} />
                        <span>Marks: 15</span>
                    </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-4">
                        {/* Begin Challenge Button */}
                        <button 
                            onClick={handleBeginChallenge}
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
                            🚀 Begin Challenge
                        </button>

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
                            <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white"></div>
                            <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-white"></div>
                            <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-white"></div>
                        </div>
                        <span className="text-[#4A5565]" style={{ fontSize: '14px' }}>101+ Students already attempted</span>
                    </div>
                </div>
            </div>

        </div>

        {/* Attempt Section — appears inline when Begin Challenge is clicked */}
        {challengeStarted && (
          <div ref={attemptRef} className="flex flex-col items-center w-full mt-10 pb-20">

            {/* Timer Card */}
            <div
              className="bg-white rounded-[16px] flex flex-col items-center justify-center mb-6"
              style={{
                width: '1091px',
                minHeight: '263px',
                boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A',
                padding: '30px'
              }}
            >
              <div style={{ fontFamily: 'Arimo', fontSize: '20px', fontWeight: 400, letterSpacing: '0.3px', color: '#6A7282', textTransform: 'uppercase', marginBottom: '20px' }}>
                WRITING TIMER
              </div>
              <div
                className="rounded-full border-4 border-[#101828] flex items-center justify-center mb-4"
                style={{ width: '112px', height: '112px' }}
              >
                <span style={{ fontFamily: 'Arimo', fontWeight: 700, fontSize: '24px', color: '#101828' }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div style={{ fontFamily: 'Arimo', fontSize: '20px', fontWeight: 400, letterSpacing: '0.3px', color: '#6A7282', textTransform: 'uppercase', marginBottom: '24px' }}>
                WRITING IN PROGRESS
              </div>
              <div className="flex gap-4">
                <button
                  onClick={toggleTimer}
                  className="flex items-center justify-center gap-2 text-white font-bold transition-transform hover:scale-105"
                  style={{
                    width: '136px',
                    height: '48px',
                    background: isActive ? '#dc2626' : '#00BC7D',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                >
                  <img src="/Icon%20(11).png" alt="" style={{ width: '24px', height: '24px', filter: 'brightness(0) invert(1)' }} />
                  {isActive ? 'Pause' : 'Start Timer'}
                </button>
                <button
                  onClick={resetTimer}
                  className="flex items-center justify-center gap-2 bg-white border border-[#D1D5DB] text-[#374151] font-bold transition-transform hover:scale-105"
                  style={{ width: '96px', height: '48px', borderRadius: '10px', fontSize: '16px' }}
                >
                  <img src="/Icon%20(10).png" alt="Reset" style={{ width: '20px', height: '20px' }} />
                  Reset
                </button>
              </div>
            </div>

            {/* Upload Card */}
            <div
              className="bg-white rounded-[16px] flex flex-col items-center pt-[68px] pb-8"
              style={{
                width: '1091px',
                minHeight: '600px',
                boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A'
              }}
            >
              <div
                className="bg-[#F9FAFB] rounded-[16px] flex flex-col items-center justify-center mb-8"
                style={{ width: '639.81px', height: '427.2px', border: '1px dashed #17223E' }}
              >
                <div className="mb-4">
                  <img src="/upload-icon.png" alt="Upload" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontFamily: 'Arimo', fontWeight: 700, fontSize: '20px', textAlign: 'center', color: '#101828', marginBottom: '8px' }}>
                  Drop your answer script here
                </h3>
                <p style={{ fontFamily: 'Arimo', fontWeight: 400, fontSize: '14px', textAlign: 'center', color: '#4A5565', marginBottom: '24px' }}>
                  Upload handwritten answers for AI evaluation
                </p>
                <div className="flex gap-3 mb-8">
                  {['JPG', 'PNG', 'PDF', 'DOCX'].map((fmt) => (
                    <span key={fmt} className="px-3 py-1 bg-[#E5E7EB] rounded text-[#374151] font-arimo" style={{ fontSize: '14px' }}>{fmt}</span>
                  ))}
                  <span className="px-3 py-1 bg-[#E5E7EB] rounded text-[#374151] font-arimo" style={{ fontSize: '14px' }}>Max 10MB</span>
                </div>
                <button
                  className="bg-white border border-[#D1D5DB] text-[#111827] font-bold rounded-[10px] hover:bg-gray-50 transition-colors"
                  style={{ width: '156px', height: '48px', fontSize: '16px' }}
                >
                  Browse Files
                </button>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => router.push('/dashboard/daily-answer/challenge/attempt/evaluating')}
                className="flex items-center justify-center gap-2 text-white font-bold transition-transform hover:scale-105 mb-4"
                style={{
                  width: '640px',
                  height: '56px',
                  background: '#17223E',
                  borderRadius: '14px',
                  fontSize: '16px',
                  boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)'
                }}
              >
                <img src="/Icon%20(13).png" alt="" style={{ width: '24px', height: '24px' }} />
                Submit Answer for Evaluation
              </button>

              <div className="flex items-center gap-2">
                <img src="/Text%20(8).png" alt="Flash" style={{ height: '20px' }} />
                <span style={{ fontFamily: 'Arimo', fontWeight: 700, fontSize: '14px', color: '#364153' }}>
                  Get detailed feedback in 60 seconds
                </span>
              </div>
            </div>

          </div>
        )}

      </section>
    </div>
  );
}
