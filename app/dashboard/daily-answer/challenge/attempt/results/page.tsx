'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dailyAnswerService } from '@/lib/services';

interface MarkupSegment {
  text: string;
  color?: string; // css color for highlight background
  note?: string;
}

interface ResultsData {
  score: number;
  maxScore: number;
  metrics: {
    id: string;
    label: string;
    value: string;
    icon: string;
    bg: string;
    borderColor: string;
    iconColor: string;
    valueColor: string;
  }[];
  didWell: string[];
  areasToImprove: string[];
  valueAddIdeas: string[];
  markup?: { segments: MarkupSegment[] };
  rubric?: { label: string; score: number; max: number }[];
  answerText?: string;
}

const BETA_DISCLAIMER =
  'Jeet AI is currently in beta and evolving every day alongside you. Our evaluation engine is built to deliver meaningful, structured, and exam-relevant feedback — but like any AI, it can make mistakes. Use it as a smart companion in your UPSC journey, strengthening your preparation alongside your mentors, notes, and instincts.';



export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [slide, setSlide] = useState<'feedback' | 'markup' | 'rubric' | 'next'>('feedback');

  // Get attemptId from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttemptId = sessionStorage.getItem('dailyAnswerAttemptId');
      if (storedAttemptId) {
        setAttemptId(storedAttemptId);
      }
    }
  }, []);

  useEffect(() => {
    dailyAnswerService.getResults(attemptId || undefined)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div
        className="min-h-screen font-arimo flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen font-arimo flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load results</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/dashboard/daily-answer" className="text-blue-600 hover:underline">Back to Challenge</Link>
        </div>
      </div>
    );
  }

  // If no data or evaluation not complete, show evaluation in progress state
  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div
        className="min-h-screen font-arimo flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
      >
        <div className="text-center px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">AI Evaluation in Progress</h2>
          <p className="text-gray-500 mb-4">Our AI is analyzing your answer. This usually takes 30-60 seconds.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  const score = data.score ?? 0;
  const maxScore = data.maxScore ?? 10;
  // Use only real AI evaluation data from API - no fallbacks
  const metrics = data.metrics || [];
  const didWell = data.didWell || [];
  const areasToImprove = data.areasToImprove || [];
  const valueAddIdeas = data.valueAddIdeas || [];
  const markupSegments = data.markup?.segments || [];
  const rubric = data.rubric || [];

  const slides: Array<{ key: typeof slide; label: string }> = [
    { key: 'feedback', label: 'Feedback' },
    { key: 'markup', label: "Examiner's Markup" },
    { key: 'rubric', label: 'Rubric Score' },
    { key: 'next', label: "What's Next" },
  ];

  return (
    <div
      className="min-h-screen font-arimo"
      style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
    >
      {/* Main Content */}
      <div className="flex flex-col items-center py-10 px-6 gap-6">

        {/* Score Card */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            width: '988px',
            height: '168px',
            borderRadius: '14px',
            background: 'linear-gradient(90deg, #101828 0%, #17223E 100%)',
          }}
        >
          <p
            style={{
              fontFamily: 'Arimo',
              fontWeight: 700,
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '0.35px',
              textTransform: 'uppercase',
              color: '#D1D5DC',
              marginBottom: '4px',
            }}
          >
            SCORE
          </p>
          <div className="flex items-baseline gap-1">
            <span
              style={{
                fontFamily: 'Arimo',
                fontWeight: 700,
                fontSize: '82px',
                lineHeight: '72px',
                color: '#FDC700',
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: 'Arimo',
                fontWeight: 700,
                fontSize: '35px',
                lineHeight: '48px',
                color: '#FDC70087',
              }}
            >
              /{maxScore}
            </span>
          </div>
        </div>

        {/* Slide tabs */}
        <div className="flex items-center gap-2" style={{ width: '988px' }}>
          {slides.map((s) => (
            <button
              key={s.key}
              onClick={() => setSlide(s.key)}
              className={`px-4 py-2 rounded-[8px] text-sm font-semibold transition-colors ${
                slide === s.key
                  ? 'bg-[#17223E] text-white'
                  : 'bg-white text-[#4A5565] border border-[#E5E7EB] hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Feedback Card */}
        {slide === 'feedback' && (
        <div
          style={{
            width: '988px',
            borderRadius: '14px',
            background: '#FFFFFF',
            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
            padding: '32px 32px 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Feedback Header Row */}
          <img
            src="/feedback-header.png"
            alt="Personalized Feedback"
            style={{
              width: '924px',
              objectFit: 'fill',
            }}
          />

          {/* Subtitle */}
          <img
            src="/feedback-subtitle.png"
            alt="Actionable insights to help you improve, not just a score"
            style={{
              width: '924px',
              objectFit: 'fill',
            }}
          />

          {/* 4 Metric Cards */}
          {metrics.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex flex-col items-center justify-center rounded-[10px] p-4"
                  style={{
                    background: metric.bg,
                    border: `1px solid ${metric.borderColor}`,
                  }}
                >
                  <span style={{ fontSize: '20px', color: metric.iconColor, marginBottom: '4px' }}>{metric.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6A7282', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{metric.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: metric.valueColor }}>{metric.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No metrics available. Please wait for AI evaluation to complete.</p>
            </div>
          )}

          {/* 3 Feedback Columns */}
          {(didWell.length > 0 || areasToImprove.length > 0 || valueAddIdeas.length > 0) ? (
            <div className="grid grid-cols-3 gap-6">
              {/* What You Did Well */}
              <div className="rounded-[10px] border border-[#B9F8CF] bg-[#F0FDF4] p-5">
                <h3 className="font-bold text-[#0D542B] mb-3" style={{ fontSize: '15px' }}>What You Did Well</h3>
                <ul className="space-y-2">
                  {didWell.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#0D542B]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="rounded-[10px] border border-[#FFF085] bg-[#FEFCE8] p-5">
                <h3 className="font-bold text-[#713F12] mb-3" style={{ fontSize: '15px' }}>Areas to Improve</h3>
                <ul className="space-y-2">
                  {areasToImprove.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#713F12]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#9888;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Value-Add Ideas */}
              <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <h3 className="font-bold text-[#101828] mb-3" style={{ fontSize: '15px' }}>Value-Add Ideas</h3>
                <ul className="space-y-2">
                  {valueAddIdeas.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#374151]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#128161;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No feedback available yet. AI evaluation is processing your answer.</p>
            </div>
          )}
        </div>
        )}

        {slide === 'markup' && (
          <div
            style={{
              width: '988px',
              borderRadius: '14px',
              background: '#FFFFFF',
              boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
              padding: '32px',
            }}
          >
            <h2 className="font-bold text-[#101828] mb-2" style={{ fontSize: '22px' }}>
              Examiner&apos;s Markup
            </h2>
            <p className="text-[#4A5565] mb-6" style={{ fontSize: '14px' }}>
              Color-coded notes directly on your answer — just like a real examiner would.
            </p>
            {markupSegments.length > 0 ? (
              <div className="bg-[#F9FAFB] rounded-[10px] p-6 leading-relaxed text-[#101828]" style={{ fontSize: '15px', lineHeight: '26px' }}>
                {markupSegments.map((seg, i) => (
                  <span
                    key={i}
                    style={{
                      background: seg.color || 'transparent',
                      padding: seg.color ? '2px 4px' : 0,
                      borderRadius: '3px',
                    }}
                    title={seg.note}
                  >
                    {seg.text}{' '}
                  </span>
                ))}
              </div>
            ) : (
              <div className="bg-[#F9FAFB] rounded-[10px] p-6 text-[#4A5565]" style={{ fontSize: '14px' }}>
                {data.answerText || 'Examiner markup will appear here once the AI finishes highlighting introductions, factual claims, analytical depth, and conclusions.'}
              </div>
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-[#4A5565]">
              <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#BBF7D0' }} /> Strong point</span>
              <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#FEF08A' }} /> Needs sharpening</span>
              <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#FECACA' }} /> Missing / incorrect</span>
            </div>
          </div>
        )}

        {slide === 'rubric' && (
          <div
            style={{
              width: '988px',
              borderRadius: '14px',
              background: '#FFFFFF',
              boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
              padding: '32px',
            }}
          >
            <h2 className="font-bold text-[#101828] mb-6" style={{ fontSize: '22px' }}>
              6-Pillar Rubric Score
            </h2>
            {rubric.length > 0 ? (
              <div className="space-y-4">
                {rubric.map((r, i) => {
                  const pct = r.max > 0 ? (r.score / r.max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm text-[#101828] mb-1">
                        <span className="font-semibold">{r.label}</span>
                        <span>{r.score}/{r.max}</span>
                      </div>
                      <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div className="h-full bg-[#17223E]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#4A5565]">Detailed rubric breakdown will appear once evaluation finalises. Overall: <strong>{score}/{maxScore}</strong></p>
            )}
          </div>
        )}

        {slide === 'next' && (
          <div
            style={{
              width: '988px',
              borderRadius: '14px',
              background: '#FFFFFF',
              boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
              padding: '32px',
            }}
          >
            <h2 className="font-bold text-[#101828] mb-6" style={{ fontSize: '22px' }}>
              What would you like to do next?
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => router.push('/dashboard/daily-answer')} className="rounded-[10px] border border-[#E5E7EB] p-6 text-left hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-bold text-[#101828] mb-1">Tomorrow&apos;s Challenge</div>
                <div className="text-sm text-[#4A5565]">Keep your writing streak going.</div>
              </button>
              <button onClick={() => router.push('/dashboard/pyq')} className="rounded-[10px] border border-[#E5E7EB] p-6 text-left hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">📚</div>
                <div className="font-bold text-[#101828] mb-1">Practice PYQs</div>
                <div className="text-sm text-[#4A5565]">Attempt similar past-year questions.</div>
              </button>
              <button onClick={() => router.push('/dashboard/mock-tests')} className="rounded-[10px] border border-[#E5E7EB] p-6 text-left hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-bold text-[#101828] mb-1">Generate a Mock Test</div>
                <div className="text-sm text-[#4A5565]">Convert weak areas into a quick quiz.</div>
              </button>
            </div>
          </div>
        )}

        {/* Beta Disclaimer */}
        <div
          style={{
            width: '988px',
            borderRadius: '10px',
            background: '#FEFCE8',
            borderLeft: '4px solid #FDC700',
            padding: '14px 20px',
          }}
        >
          <p style={{ fontSize: '12px', lineHeight: '18px', color: '#713F12' }}>
            <strong>Note:</strong> {BETA_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}
