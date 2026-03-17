'use client';

import React, { useState, useEffect } from 'react';
import { dashboardService } from '@/lib/services';
import { useAuth } from '@/contexts/AuthContext';

export default function PerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    dashboardService.getPerformance()
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const mcq = data?.mcq ?? {};
  const streak = data?.streak ?? {};
  const mockTests = data?.mockTests ?? {};

  const totalTests = (mcq.totalAttempts ?? 0) + (mockTests.totalAttempts ?? 0);
  const avgAccuracy = mcq.avgAccuracy ?? 0;
  const bestPercentile = mcq.bestPercentile ?? 0;
  const currentStreak = streak.currentStreak ?? 0;
  const totalQuestions = (mcq.totalCorrect ?? 0) + (mcq.totalWrong ?? 0) + (mcq.totalSkipped ?? 0);

  const topStripCards = [
    { label: 'test taken', value: String(totalTests), valueColor: '#D4AF37' },
    { label: 'avg score', value: `${avgAccuracy}%`, valueColor: '#00D492' },
    { label: 'accuracy', value: `${avgAccuracy}%`, valueColor: '#FFFFFF' },
    { label: 'best rank', value: bestPercentile > 0 ? `${bestPercentile}th %ile` : 'N/A', valueColor: '#FF8904' },
    { label: 'day \nstreak', value: String(currentStreak), valueColor: '#FFFFFF' },
  ];

  const summaryCards = [
    {
      title: 'Overall Percentile Score',
      value: bestPercentile > 0 ? String(bestPercentile) : 'N/A',
      accentColor: '#00BBA7',
      subtitle: 'Outperforming aspirants',
    },
    {
      title: 'Tests Attempted',
      value: String(totalTests),
      accentColor: '#FF6900',
      subtitle: 'Full length + sectional mock tests',
    },
    {
      title: 'Questions Attempted',
      value: totalQuestions.toLocaleString('en-IN'),
      accentColor: '#155DFC',
      subtitle: 'Across MCQs, PYQs and mock tests',
    },
    {
      title: 'Overall Accuracy',
      value: `${avgAccuracy}%`,
      accentColor: '#22C55E',
      subtitle: 'Net accuracy after negative marking',
    },
  ];

  return (
    <div
      className="flex overflow-hidden"
      style={{ background: '#FFFFFF', minHeight: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className={`w-full max-w-[1180px] mx-auto px-6 py-8 ${loading ? 'opacity-50 animate-pulse' : ''}`}>
          {/* Hero section */}
          <div
            className="w-full rounded-[16px] px-10 pt-8 pb-6 mb-6 flex flex-col gap-6"
            style={{
              background: 'linear-gradient(135deg, #0F172B 0%, #1E2939 100%)',
            }}
          >
            <div className="flex flex-col gap-3">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 uppercase tracking-[0.12em]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: 12,
                  lineHeight: '16px',
                  letterSpacing: '1.2px',
                  color: '#0B1120',
                  background: '#00D5BE',
                  alignSelf: 'flex-start',
                }}
              >
                Analytics - Performance Dashboard
              </span>

              <h1
                className="text-[40px] sm:text-[48px] leading-[48px] font-bold"
                style={{ color: '#FFFFFF', fontFamily: 'Inter, system-ui' }}
              >
                {user?.firstName ?? 'Your'}&apos;s{' '}
                <span
                  style={{
                    fontFamily: 'Georgia, ui-serif',
                    fontWeight: 700,
                    fontStyle: 'italic',
                  }}
                >
                  Progress.
                </span>
              </h1>

              <p
                className="max-w-[660px]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '22.75px',
                  color: '#D1D5DC',
                }}
              >
                Your complete UPSC test analytics — score trends, subject mastery, rank history, time
                management and AI-powered next steps.
              </p>
            </div>

            {/* Dark strip with key metrics */}
            <div className="flex flex-wrap gap-0 rounded-[14px] overflow-hidden mt-2">
              {topStripCards.map((card, index) => {
                const isFirst = index === 0;
                const isLast = index === topStripCards.length - 1;

                return (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="flex-1 min-w-[140px] flex flex-col items-center justify-center px-8 py-5"
                    style={{
                      background: '#1C273B',
                      borderTop: '0.8px solid #364153',
                      borderBottom: '0.8px solid #364153',
                      borderLeft: index > 0 ? '0.8px solid #364153' : undefined,
                      borderRight: index < topStripCards.length - 1 ? '0.8px solid #364153' : undefined,
                      borderTopLeftRadius: isFirst ? 14 : 0,
                      borderBottomLeftRadius: isFirst ? 14 : 0,
                      borderTopRightRadius: isLast ? 14 : 0,
                      borderBottomRightRadius: isLast ? 14 : 0,
                    }}
                  >
                    <div
                      className="mb-1 text-[30px] font-bold leading-[36px]"
                      style={{
                        fontFamily: 'Inter',
                        color: card.valueColor,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {card.value}
                    </div>
                    <div
                      className="uppercase text-[12px] tracking-[0.3px] text-center"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        lineHeight: '16px',
                        color: '#6A7282',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {card.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* White metric cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[14px] bg-white shadow-sm flex flex-col justify-between"
                style={{
                  borderTop: `4px solid ${card.accentColor}`,
                  boxShadow:
                    '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)',
                  minHeight: 168,
                }}
              >
                <div className="px-6 pt-7 pb-5">
                  <div
                    className="mb-3 text-[36px] leading-[40px] font-bold"
                    style={{
                      fontFamily: 'Inter',
                      color: '#101828',
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    className="uppercase text-[12px] tracking-[0.6px] mb-1"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      lineHeight: '16px',
                      color: '#6A7282',
                    }}
                  >
                    {card.title}
                  </div>
                  <p
                    className="text-[12px]"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      lineHeight: '16px',
                      color: '#6A7282',
                    }}
                  >
                    {card.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* MCQ Performance Trend card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div
              className="rounded-[14px] bg-white"
              style={{
                boxShadow:
                  '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className="text-[20px] leading-[28px] font-bold"
                    style={{ fontFamily: 'Inter', color: '#1A1F36' }}
                  >
                    MCQ Performance Trend
                  </h2>
                </div>

                <div className="flex flex-wrap gap-6 mb-6">
                  <div>
                    <div
                      className="text-[36px] leading-[40px] font-bold"
                      style={{
                        fontFamily: 'Inter',
                        color: '#101828',
                      }}
                    >
                      {(mcq.totalCorrect ?? 0).toLocaleString('en-IN')}
                    </div>
                    <div
                      className="uppercase text-[12px] tracking-[0.6px]"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        color: '#99A1AF',
                      }}
                    >
                      Correct
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-[36px] leading-[40px] font-bold"
                      style={{
                        fontFamily: 'Inter',
                        color: '#FB2C36',
                      }}
                    >
                      {(mcq.totalWrong ?? 0).toLocaleString('en-IN')}
                    </div>
                    <div
                      className="uppercase text-[12px] tracking-[0.6px]"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        color: '#99A1AF',
                      }}
                    >
                      Wrong
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-[36px] leading-[40px] font-bold"
                      style={{
                        fontFamily: 'Inter',
                        color: '#D1D5DC',
                      }}
                    >
                      {(mcq.totalSkipped ?? 0).toLocaleString('en-IN')}
                    </div>
                    <div
                      className="uppercase text-[12px] tracking-[0.6px]"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        color: '#99A1AF',
                      }}
                    >
                      Skipped
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-[36px] leading-[40px] font-bold"
                      style={{
                        fontFamily: 'Inter',
                        color: '#FF6900',
                      }}
                    >
                      {avgAccuracy}%
                    </div>
                    <div
                      className="uppercase text-[12px] tracking-[0.6px]"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        color: '#99A1AF',
                      }}
                    >
                      Net Accuracy
                    </div>
                  </div>
                </div>

                {/* Chart placeholder - replace `/mcq-trend.png` with your asset */}
                <div className="mb-4">
                  <div
                    className="w-full rounded-[12px] overflow-hidden bg-[#0E182D] flex items-center justify-center"
                    style={{ height: 192 }}
                  >
                    <img
                      src="/mcq-trend.png"
                      alt="MCQ performance chart"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.6px] text-[#99A1AF]">
                  <span style={{ fontFamily: 'Inter' }}>Questions attempted this week</span>
                  <div className="flex gap-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <span key={d} style={{ fontFamily: 'Inter' }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder right column */}
            <div className="flex items-center justify-center rounded-[14px] border border-dashed border-[#E5E7EB] text-center px-6">
              <p
                className="text-[14px]"
                style={{
                  fontFamily: 'Inter',
                  color: '#6A7282',
                }}
              >
                Add Subject Accuracy, Time per Question and Complete Test History cards here to fully
                match the Figma layout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
