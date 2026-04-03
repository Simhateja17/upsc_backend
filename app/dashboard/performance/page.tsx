'use client';

import React, { useState, useEffect } from 'react';
import { dashboardService } from '@/lib/services';
import { useAuth } from '@/contexts/AuthContext';

type TrendPoint = { label: string; value: number };
type DayActivity = { questionsAttempted: number; hours: number };

function MCQTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return null;

  const width = 620;
  const height = 180;
  const pad = { top: 20, right: 16, bottom: 34, left: 16 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(10, ...values);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + (1 - (d.value - minV) / range) * innerH,
  }));

  const linePath = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${points.at(-1)!.x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const lastPoint = points.at(-1)!;
  const lastValue = data.at(-1)?.value ?? 0;
  const badgeWidth = 54;
  const badgeX = Math.min(width - badgeWidth - 8, Math.max(8, lastPoint.x - badgeWidth / 2));
  const badgeY = Math.max(8, lastPoint.y - 34);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      style={{ display: 'block', background: 'transparent' }}
    >
      <defs>
        <linearGradient id="mcqTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#mcqTrendFill)" />
      <path d={linePath} fill="none" stroke="#8B7BF6" strokeWidth="3" strokeLinecap="round" />

      {points.map((point, i) => (
        <circle
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          cx={point.x}
          cy={point.y}
          r={3.5}
          fill="#8B7BF6"
          stroke="#C4B5FD"
          strokeWidth={1.2}
        />
      ))}

      <rect x={badgeX} y={badgeY} width={badgeWidth} height={20} rx={4} fill="#6D28D9" />
      <text
        x={badgeX + badgeWidth / 2}
        y={badgeY + 14}
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="10"
        fontWeight="700"
        fill="#FFFFFF"
      >
        {(lastValue / 10).toFixed(1)}/10
      </text>

      {data.map((point, i) => (
        <text
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          x={points[i].x}
          y={height - 8}
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="10"
          fill="#99A1AF"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}

export default function PerformancePage() {
  const [data, setData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      dashboardService.getPerformance(),
      dashboardService.getTestAnalytics(),
    ])
      .then(([performanceResult, analyticsResult]) => {
        if (!mounted) return;

        if (performanceResult.status === 'fulfilled') {
          setData(performanceResult.value.data);
        }

        if (analyticsResult.status === 'fulfilled') {
          setAnalyticsData(analyticsResult.value.data);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mcq = data?.mcq ?? {};
  const streak = data?.streak ?? {};
  const mockTests = data?.mockTests ?? {};
  const weeklyMcqTrend = analyticsData?.weeklyMcqTrend ?? [];
  const dailyActivity = analyticsData?.dailyActivity ?? [];

  const totalTests = (mcq.totalAttempts ?? 0) + (mockTests.totalAttempts ?? 0);
  const avgAccuracy = mcq.avgAccuracy ?? 0;
  const bestPercentile = mcq.bestPercentile ?? 0;
  const currentStreak = streak.currentStreak ?? 0;
  const totalQuestions = (mcq.totalCorrect ?? 0) + (mcq.totalWrong ?? 0) + (mcq.totalSkipped ?? 0);

  const chartTrendData: TrendPoint[] = weeklyMcqTrend.length > 0
    ? weeklyMcqTrend.slice(-8).map((week: any, index: number) => ({
      label: week.week ?? `W${index + 1}`,
      value: Number(week.score ?? 0),
    }))
    : Array.from({ length: 8 }, (_, index) => ({
      label: `W${index + 1}`,
      value: 0,
    }));

  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activityMap = new Map<string, DayActivity>(
    dailyActivity.map((entry: any) => [
      String(entry.day),
      {
        questionsAttempted: Number(entry.questionsAttempted ?? 0),
        hours: Number(entry.hours ?? 0),
      },
    ]),
  );

  const dailyBars = orderedDays.map((day) => ({
    day,
    questions: activityMap.get(day)?.questionsAttempted ?? 0,
    hours: activityMap.get(day)?.hours ?? 0,
  }));

  const maxQuestions = Math.max(...dailyBars.map((day) => day.questions), 1);
  const highlightedDay = dailyBars.reduce((top, current) => (
    current.questions > top.questions ? current : top
  ), dailyBars[0]).day;

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

                <div
                  className="overflow-hidden px-3 pt-3 pb-2 mb-5"
                  style={{ height: 244 }}
                >
                  <MCQTrendChart data={chartTrendData} />
                </div>

                <div className="text-[11px] uppercase tracking-[0.6px] mb-3 text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>
                  Questions attempted this week
                </div>

                <div className="flex items-end gap-2 h-[88px]">
                  {dailyBars.map((item) => {
                    const barHeight = item.questions > 0
                      ? Math.max((item.questions / maxQuestions) * 46, 8)
                      : 4;

                    const barColor = item.questions === 0
                      ? '#C7CDD7'
                      : item.day === highlightedDay
                        ? '#F4BC34'
                        : '#0E1830';

                    return (
                      <div key={item.day} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-[4px]"
                          style={{
                            height: barHeight,
                            background: barColor,
                          }}
                        />
                        <span className="text-[10px] text-[#6A7282]" style={{ fontFamily: 'Inter' }}>
                          {item.day}
                        </span>
                        <span className="text-[10px] text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>
                          {item.hours > 0 ? `${item.hours.toFixed(1)}h` : '0h'}
                        </span>
                      </div>
                    );
                  })}
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
