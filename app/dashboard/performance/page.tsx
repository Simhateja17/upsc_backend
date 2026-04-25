'use client';

import React, { useState, useEffect } from 'react';
import { dashboardService } from '@/lib/services';
import { useAuth } from '@/contexts/AuthContext';

type TrendPoint = { label: string; value: number };
type DayActivity = { questionsAttempted: number; hours: number };

// ─── Circular Donut Chart ────────────────────────────────────────────────────
function DonutChart({ percentage, size = 140, stroke = 12, color = '#6366F1' }: {
  percentage: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percentage, 100) / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold leading-none" style={{ fontFamily: 'Inter', color: '#101828' }}>
          {Math.round(percentage)}%
        </span>
        <span className="text-[11px] uppercase tracking-[0.4px]" style={{ fontFamily: 'Inter', color: '#6A7282' }}>
          Accuracy
        </span>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
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
  const mains = data?.mains ?? {};
  const testSeries = data?.testSeries ?? {};
  const weeklyMcqTrend = analyticsData?.weeklyMcqTrend ?? [];
  const dailyActivity = analyticsData?.dailyActivity ?? [];

  const totalTests =
    data?.testsTaken ??
    ((mcq.totalAttempts ?? 0) +
      (mockTests.totalAttempts ?? 0) +
      (mains.totalAttempts ?? 0) +
      (testSeries.totalAttempts ?? 0));

  const avgAccuracy = mcq.avgAccuracy ?? 0;
  const bestPercentile = mcq.bestPercentile ?? 0;
  const currentStreak = streak.currentStreak ?? 0;
  const totalQuestions =
    data?.questionsAttempted ??
    ((mcq.totalCorrect ?? 0) + (mcq.totalWrong ?? 0) + (mcq.totalSkipped ?? 0));

  // Overall accuracy with negative marking (net)
  const totalMcqCorrect = mcq.totalCorrect ?? 0;
  const totalMcqWrong = mcq.totalWrong ?? 0;
  const totalMcqSkipped = mcq.totalSkipped ?? 0;
  const totalMcqAnswered = totalMcqCorrect + totalMcqWrong;
  const netAccuracy = totalMcqAnswered > 0
    ? Math.round(((totalMcqCorrect - totalMcqWrong * 0.33) / totalMcqAnswered) * 100)
    : 0;

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

  const maxQuestions = Math.max(...dailyBars.map((d) => d.questions), 1);
  const highlightedDay = dailyBars.reduce((top, current) => (
    current.questions > top.questions ? current : top
  ), dailyBars[0]).day;

  // Calendar heatmap data (last 28 days)
  const today = new Date();
  const calendarDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (27 - i));
    return d;
  });
  const calendarMap = new Map(
    dailyActivity.map((entry: any) => [
      String(entry.day),
      Number(entry.questionsAttempted ?? 0),
    ]),
  );

  const topStripCards = [
    { label: 'tests taken', value: String(totalTests), valueColor: '#D4AF37' },
    { label: 'avg accuracy', value: `${avgAccuracy}%`, valueColor: '#00D492' },
    { label: 'questions', value: totalQuestions.toLocaleString('en-IN'), valueColor: '#FFFFFF' },
    { label: 'best rank', value: bestPercentile > 0 ? `${bestPercentile}th %ile` : 'N/A', valueColor: '#FF8904' },
    { label: 'day\nstreak', value: String(currentStreak), valueColor: '#FFFFFF' },
  ];

  const moduleBreakdown = [
    {
      title: 'Daily MCQ',
      color: '#15803D',
      bg: '#F0FDF4',
      border: '#B9F8CF',
      stats: [
        { label: 'Tests', value: mcq.totalAttempts ?? 0 },
        { label: 'Questions', value: totalMcqCorrect + totalMcqWrong + totalMcqSkipped },
        { label: 'Accuracy', value: `${mcq.avgAccuracy ?? 0}%`, accent: '#15803D' },
      ],
    },
    {
      title: 'Daily Answer Writing',
      color: '#8200DB',
      bg: '#FAF5FF',
      border: '#E9D4FF',
      stats: [
        { label: 'Answers', value: mains.dailyAnswerAttempts ?? 0 },
        { label: 'Evaluated', value: mains.dailyAnswerAttempts ?? 0 },
      ],
    },
    {
      title: 'Mock Tests',
      color: '#1447E6',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      stats: [
        { label: 'Tests', value: mockTests.totalAttempts ?? 0 },
        { label: 'Mains', value: mains.mockTestMainsAttempts ?? 0 },
      ],
    },
    {
      title: 'Previous Year Questions',
      color: '#CA3500',
      bg: '#FEFCE8',
      border: '#FEF08A',
      stats: [
        { label: 'Mains', value: mains.pyqMainsAttempts ?? 0 },
        { label: 'Evaluated', value: mains.pyqMainsAttempts ?? 0 },
      ],
    },
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
      value: `${netAccuracy}%`,
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

          {/* ── Hero ── */}
          <div
            className="w-full rounded-[16px] px-10 pt-8 pb-6 mb-6 flex flex-col gap-6"
            style={{ background: 'linear-gradient(135deg, #0F172B 0%, #1E2939 100%)' }}
          >
            <div className="flex flex-col gap-3">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 uppercase tracking-[0.12em]"
                style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, lineHeight: '16px', letterSpacing: '1.2px', color: '#0B1120', background: '#00D5BE', alignSelf: 'flex-start' }}
              >
                Performance Tracker
              </span>
              <h1
                className="text-[40px] sm:text-[48px] leading-[48px] font-bold"
                style={{ color: '#FFFFFF', fontFamily: 'Inter, system-ui' }}
              >
                {user?.firstName ?? 'Your'}&apos;s{' '}
                <span style={{ fontFamily: 'Georgia, ui-serif', fontWeight: 700, fontStyle: 'italic' }}>
                  Progress.
                </span>
              </h1>
              <p
                className="max-w-[660px]"
                style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '22.75px', color: '#D1D5DC' }}
              >
                Your complete UPSC test analytics — score trends, subject mastery, rank history, time
                management and AI-powered next steps. For test-by-test score deep-dives, head to{' '}
                <a href="/dashboard/test-analytics" style={{ color: '#00D5BE', textDecoration: 'underline' }}>
                  Test Analytics
                </a>
                .
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-0 rounded-[14px] overflow-hidden mt-2">
              {topStripCards.map((card, index) => {
                const isFirst = index === 0;
                const isLast = index === topStripCards.length - 1;
                return (
                  <div
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
                    <div className="mb-1 text-[30px] font-bold leading-[36px]"
                      style={{ fontFamily: 'Inter', color: card.valueColor, whiteSpace: 'pre-line' }}>
                      {card.value}
                    </div>
                    <div className="uppercase text-[12px] tracking-[0.3px] text-center"
                      style={{ fontFamily: 'Inter', fontWeight: 400, lineHeight: '16px', color: '#6A7282', whiteSpace: 'pre-line' }}>
                      {card.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[14px] bg-white shadow-sm flex flex-col justify-between"
                style={{
                  borderTop: `4px solid ${card.accentColor}`,
                  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)',
                  minHeight: 168,
                }}
              >
                <div className="px-6 pt-7 pb-5">
                  <div className="mb-3 text-[36px] leading-[40px] font-bold" style={{ fontFamily: 'Inter', color: '#101828' }}>
                    {card.value}
                  </div>
                  <div className="uppercase text-[12px] tracking-[0.6px] mb-1" style={{ fontFamily: 'Inter', fontWeight: 600, lineHeight: '16px', color: '#6A7282' }}>
                    {card.title}
                  </div>
                  <p className="text-[12px]" style={{ fontFamily: 'Inter', fontWeight: 400, lineHeight: '16px', color: '#6A7282' }}>
                    {card.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Row 1: Circular Chart + Practice Module Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Overall Accuracy — Circular Donut */}
            <div className="rounded-[14px] bg-white" style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-8 pt-8 pb-6">
                <h2 className="text-[18px] leading-[26px] font-bold mb-6" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                  Overall Accuracy
                </h2>

                <div className="flex items-center gap-8">
                  <DonutChart percentage={netAccuracy} size={160} stroke={14} color="#6366F1" />
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Correct', value: totalMcqCorrect, color: '#22C55E' },
                      { label: 'Wrong', value: totalMcqWrong, color: '#EF4444' },
                      { label: 'Skipped', value: totalMcqSkipped, color: '#6B7280' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[13px] font-medium" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                          {item.value.toLocaleString('en-IN')} {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Practice Module Breakdown */}
            <div className="rounded-[14px] bg-white" style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-8 pt-8 pb-6">
                <h2 className="text-[18px] leading-[26px] font-bold mb-6" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                  Practice Module Breakdown
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {moduleBreakdown.map((mod) => (
                    <div key={mod.title} className="rounded-[10px] p-4" style={{ background: mod.bg, border: `1px solid ${mod.border}` }}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: mod.color }}>{mod.title}</div>
                      <div className="flex gap-4">
                        {mod.stats.map((s: any) => (
                          <div key={s.label}>
                            <div className="text-[22px] font-bold" style={{ color: s.accent ?? '#101828' }}>{s.value}</div>
                            <div className="text-[11px]" style={{ color: '#6A7282' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: Weekly Study Activity + Calendar Heatmap ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Weekly Study Activity */}
            <div className="rounded-[14px] bg-white" style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-8 pt-8 pb-6">
                <h2 className="text-[18px] leading-[26px] font-bold mb-6" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                  Weekly Study Activity
                </h2>

                <div className="flex flex-wrap gap-5 mb-6">
                  {[
                    { label: 'Correct', value: totalMcqCorrect, color: '#101828' },
                    { label: 'Wrong', value: totalMcqWrong, color: '#FB2C36' },
                    { label: 'Skipped', value: totalMcqSkipped, color: '#D1D5DC' },
                    { label: 'Net Accuracy', value: `${netAccuracy}%`, color: '#FF6900' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-[28px] leading-[34px] font-bold" style={{ fontFamily: 'Inter', color: item.color }}>
                        {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
                      </div>
                      <div className="uppercase text-[11px] tracking-[0.6px]" style={{ fontFamily: 'Inter', fontWeight: 600, color: '#99A1AF' }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] uppercase tracking-[0.6px] mb-3" style={{ color: '#6A7282', fontFamily: 'Inter' }}>
                  Questions attempted this week
                </div>
                <div className="flex items-end gap-2 h-[64px]">
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
                        <div className="w-full rounded-[4px]" style={{ height: barHeight, background: barColor }} />
                        <span className="text-[10px] text-[#6A7282]" style={{ fontFamily: 'Inter' }}>{item.day}</span>
                        <span className="text-[10px] text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>
                          {item.hours > 0 ? `${item.hours.toFixed(1)}h` : '0h'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Weekly Calendar Heatmap */}
            <div className="rounded-[14px] bg-white" style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-8 pt-8 pb-6">
                <h2 className="text-[18px] leading-[26px] font-bold mb-6" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                  Weekly Calendar Heatmap
                </h2>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((date, i) => {
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                    const monthLabel = i === 0 || date.getDate() === 1
                      ? date.toLocaleDateString('en-US', { month: 'short' })
                      : '';
                    const q = Number(calendarMap.get(dayLabel) ?? 0);
                    const intensity = q === 0 ? 0 : Math.min(q / 20, 1);
                    const bg = q === 0 ? '#F3F4F6' : `rgba(34, 197, 94, ${0.15 + intensity * 0.85})`;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full aspect-square rounded-[6px]"
                          style={{ background: bg }}
                          title={`${date.toDateString()}: ${q} questions`}
                        />
                        <span className="text-[9px] text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>{dayLabel}</span>
                        {monthLabel && (
                          <span className="text-[8px] text-[#6A7282]" style={{ fontFamily: 'Inter' }}>{monthLabel}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-[10px] text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>Less</span>
                  <div className="flex gap-1">
                    {['#F3F4F6', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E'].map((c) => (
                      <div key={c} className="w-3 h-3 rounded-[3px]" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#99A1AF]" style={{ fontFamily: 'Inter' }}>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Daily Goals ── */}
          <div className="rounded-[14px] bg-white mb-8" style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="px-8 pt-8 pb-6">
              <h2 className="text-[18px] leading-[26px] font-bold mb-6" style={{ fontFamily: 'Inter', color: '#1A1F36' }}>
                Daily Goals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Complete Daily MCQ', done: (mcq.totalAttempts ?? 0) > 0 },
                  { label: 'Write Daily Answer', done: (mains.dailyAnswerAttempts ?? 0) > 0 },
                  { label: 'Read Current Affairs', done: currentStreak > 0 },
                  { label: 'Revise Flashcards', done: currentStreak > 1 },
                  { label: 'Attempt Mock Test', done: (mockTests.totalAttempts ?? 0) > 0 },
                  { label: 'Study 2+ Hours', done: dailyBars.reduce((s, d) => s + d.hours, 0) >= 2 },
                  { label: 'Watch Video Lecture', done: false },
                  { label: 'Update Syllabus Tracker', done: false },
                ].map((goal) => (
                  <div key={goal.label} className="flex items-center gap-3 rounded-[10px] border px-4 py-3"
                    style={{ borderColor: goal.done ? '#BBF7D0' : '#E5E7EB', background: goal.done ? '#F0FDF4' : '#FFFFFF' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: goal.done ? '#22C55E' : '#E5E7EB' }}>
                      {goal.done && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'Inter', color: goal.done ? '#15803D' : '#6B7280' }}>
                      {goal.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
