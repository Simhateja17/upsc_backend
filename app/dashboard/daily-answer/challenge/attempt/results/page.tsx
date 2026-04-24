'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyAnswerService } from '@/lib/services';

interface MetricItem {
  id: string;
  label: string;
  value: string;
  icon: string;
  bg: string;
  borderColor: string;
  iconColor: string;
  valueColor: string;
}

interface ResultsData {
  score: number;
  maxScore: number;
  wordCount?: number;
  metrics?: MetricItem[];
  didWell?: string[];
  areasToImprove?: string[];
  valueAddIdeas?: string[];
  // Backend raw fields
  strengths?: string[];
  improvements?: string[];
  suggestions?: string[];
  detailedFeedback?: string;
}



export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

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
      .then(res => {
        const payload = res.data ?? res;
        setData(payload);
      })
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

  // If no data at all, show evaluation in progress state
  if (!data || (typeof data.score !== 'number' && typeof (data as any).score !== 'number')) {
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
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  // Map backend field names to frontend field names
  const didWell = data.didWell || data.strengths || [];
  const areasToImprove = data.areasToImprove || data.improvements || [];
  const valueAddIdeas = data.valueAddIdeas || data.suggestions || [];

  // Derive metrics from score if backend didn't provide them
  let metrics: MetricItem[] = data.metrics || [];
  if (metrics.length === 0) {
    const base = Math.max(4, Math.min(10, Math.round((score / maxScore) * 10)));
    metrics = [
      { id: 'structure', label: 'Structure', value: `${base}/10`, icon: '🏗️', bg: '#F0FDF4', borderColor: '#B9F8CF', iconColor: '#15803D', valueColor: '#0D542B' },
      { id: 'content', label: 'Content', value: `${Math.max(3, Math.min(10, base + 1))}/10`, icon: '📚', bg: '#EFF6FF', borderColor: '#BFDBFE', iconColor: '#1447E6', valueColor: '#1E3A5F' },
      { id: 'examples', label: 'Examples', value: `${Math.max(3, Math.min(10, base - 1))}/10`, icon: '💡', bg: '#FEFCE8', borderColor: '#FEF08A', iconColor: '#CA3500', valueColor: '#713F12' },
      { id: 'language', label: 'Language', value: `${base}/10`, icon: '✍️', bg: '#FAF5FF', borderColor: '#E9D4FF', iconColor: '#8200DB', valueColor: '#4C1D95' },
    ];
  }

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
            width: '100%', maxWidth: '988px',
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

        {/* Feedback Card */}
        <div
          style={{
            width: '100%', maxWidth: '988px',
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-bold text-[#101828] mb-1" style={{ fontSize: '24px', lineHeight: '32px' }}>
                Personalized Feedback
              </h2>
              <p className="text-[#6A7282]" style={{ fontSize: '14px', lineHeight: '20px' }}>
                Actionable insights to help you improve, not just a score
              </p>
            </div>
            {typeof data.wordCount === 'number' && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: data.wordCount >= 200 ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${data.wordCount >= 200 ? '#B9F8CF' : '#FECACA'}`,
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: data.wordCount >= 200 ? '#0D542B' : '#991B1B' }}>
                  Words Count: {data.wordCount}
                </span>
                <span style={{ fontSize: '14px', color: data.wordCount >= 200 ? '#15803D' : '#DC2626' }}>
                  {data.wordCount >= 200 ? '✓' : '✕'}
                </span>
              </div>
            )}
          </div>

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

          {/* Detailed Feedback */}
          {data.detailedFeedback && (
            <div
              className="rounded-[16px] p-6 space-y-4"
              style={{ background: '#1E293B' }}
            >
              <div className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#94A3B8' }}>
                DETAILED FEEDBACK
              </div>
              <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: '#E2E8F0', whiteSpace: 'pre-line' }}>
                {data.detailedFeedback}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
