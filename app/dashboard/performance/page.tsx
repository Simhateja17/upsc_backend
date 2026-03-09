'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';

const metricCards = [
  { label: 'DAY STREAK', icon: '🔥', value: '38', sub: '8 days this month', valueColor: '#FF6900' },
  { label: 'QS ATTEMPTED', icon: '📝', value: '847', sub: '162 this week', valueColor: '#2B7FFF' },
  { label: 'AVG ACCURACY', icon: '🎯', value: '72%', sub: '3% vs last week', valueColor: '#00C950' },
  { label: 'STUDY TIME', icon: '⏱️', value: '124h', sub: '18h this week', valueColor: '#AD46FF' },
  { label: 'MOCK TESTS', icon: '📄', value: '18', sub: '3 this month', valueColor: '#615FFF' },
  { label: 'BADGES EARNED', icon: '🏅', value: '8', sub: '2 new this week', valueColor: '#D08700' },
];

const studyDays = [
  { day: 'Mon', hours: 3, label: '3h' },
  { day: 'Tue', hours: 2.5, label: '2.5h' },
  { day: 'Wed', hours: 1, label: '1h' },
  { day: 'Thu', hours: 1.5, label: '1.5h' },
  { day: 'Fri', hours: 2.5, label: '2.5h' },
  { day: 'Sat', hours: 3, label: '3h' },
  { day: 'Sun', hours: 2.5, label: '2.5h' },
];

const timeDistribution = [
  { name: 'GS I', pct: 28, color: '#2B7FFF' },
  { name: 'GS II', pct: 23, color: '#FF6900' },
  { name: 'GS III', pct: 20, color: '#DC2626' },
  { name: 'GS IV', pct: 16, color: '#00C950' },
  { name: 'Essay', pct: 10, color: '#FBBF24' },
  { name: 'Current Affairs', pct: 3, color: '#AD46FF' },
];

const strongAreas = [
  { name: 'Polity & Governance', pct: 84, qs: 162, barColor: '#2B7FFF', dotColor: '#2B7FFF', accuracyColor: '#155DFC' },
  { name: 'Modern History', pct: 79, qs: 118, barColor: '#00BC7D', dotColor: '#00BC7D', accuracyColor: '#0A0A0A' },
  { name: 'Art & Culture', pct: 76, qs: 64, barColor: '#F0B100', dotColor: '#F0B100', accuracyColor: '#D08700' },
  { name: 'Science & Tech', pct: 73, qs: 88, barColor: '#AD46FF', dotColor: '#AD46FF', accuracyColor: '#0A0A0A' },
  { name: 'Intl. Relations', pct: 71, qs: 55, barColor: '#FF6900', dotColor: '#FF6900', accuracyColor: '#0A0A0A' },
];

const weakAreas = [
  { name: 'Geography', pct: 42, qs: 96, barColor: '#E7000B', accuracyColor: '#E7000B', tag: 'Needs Revision', dotColor: null },
  { name: 'Indian Economy', pct: 48, qs: 84, barColor: '#FF6900', accuracyColor: '#0A0A0A', tag: null, dotColor: '#FF6900' },
  { name: 'Environment', pct: 51, qs: 72, barColor: '#64748B', accuracyColor: '#0A0A0A', tag: null, dotColor: null },
  { name: 'Ancient History', pct: 54, qs: 48, barColor: '#F0B100', accuracyColor: '#D08700', tag: null, dotColor: '#F0B100' },
];

const badges = [
  { icon: '🔥', title: '30-Day Streak' },
  { icon: '⚡', title: 'Quick Learner' },
  { icon: '🧠', title: '1000 Qs Club' },
  { icon: '📚', title: 'Polity Master' },
  { icon: '🎯', title: '90% Accuracy' },
  { icon: '👑', title: 'Top 100 Rank' },
  { icon: '🎓', title: 'Syllabus Master' },
  { icon: '📜', title: 'Mock Test King' },
  { icon: '🏅', title: '5050 Club' },
  { icon: '🏆', title: 'Top 1%' },
  { icon: '⭐', title: 'All-Rounder' },
  { icon: '🥇', title: 'Test Champion' },
];

const leaderboard = [
  { rank: 1, name: 'John Doe', score: 980.5 },
  { rank: 2, name: 'Shubham Bharti', score: 948 },
  { rank: 3, name: 'Manish Singh', score: 931.5 },
  { rank: 4, name: 'Priya Sharma', score: 918 },
  { rank: 5, name: 'Arjun K.', score: 902 },
  { rank: 6, name: 'Neha Patel', score: 889 },
  { rank: 7, name: 'You', score: 872, isYou: true },
  { rank: 8, name: 'Rahul Verma', score: 865 },
  { rank: 9, name: 'Anita Singh', score: 858 },
  { rank: 10, name: 'Vikram Rao', score: 851 },
];

export default function PerformancePage() {
  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1180px] mx-auto px-6 py-5">
          {/* Dark banner - Analytics · Performance Dashboard */}
          <div
            className="w-full rounded-[16px] px-8 pt-8 pb-8 mb-6"
            style={{
              background: 'linear-gradient(135deg, #0F172B 0%, #1E2939 100%)',
              minHeight: 266,
            }}
          >
            <div
              className="mb-2 uppercase tracking-[0.55px]"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 11, lineHeight: '16.5px', color: '#F0B100' }}
            >
              Analytics · Performance Dashboard
            </div>
            <h1
              className="font-bold italic mb-2"
              style={{ fontFamily: 'Inter', fontSize: 36, lineHeight: '40px', letterSpacing: 0, color: '#FFFFFF' }}
            >
              Arjun&apos;s Progress.
            </h1>
            <p
              className="mb-6 max-w-[631px]"
              style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 16, lineHeight: '24px', color: '#D1D5DC' }}
            >
              Your complete UPSC preparation analytics — streaks, subject mastery, weak areas, spaced repetition & smart notes.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 max-w-[476px]"
              style={{
                border: '0.8px solid rgba(240,177,0,0.3)',
                background: 'rgba(49,65,88,0.5)',
              }}
            >
              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FDC700' }}>
                89 days to UPSC Prelims 2026 - Keep going, you&apos;re on track!
              </span>
            </div>
          </div>

          {/* 6 metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[14px] p-5 flex flex-col"
                style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 141 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="uppercase tracking-[0.5px]"
                    style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}
                  >
                    {card.label}
                  </span>
                  <span aria-hidden>{card.icon}</span>
                </div>
                <span
                  className="font-bold mb-1"
                  style={{ fontFamily: 'Inter', fontSize: 30, lineHeight: '36px', color: card.valueColor }}
                >
                  {card.value}
                </span>
                <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#4A5565' }}>
                  {card.sub}
                </span>
              </div>
            ))}
          </div>

          {/* Study Time & Time Distribution row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Study Time — This Week */}
            <div
              className="rounded-[10px] p-6 flex flex-col"
              style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 329 }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-[#101828]" />
                <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                  Study Time — This Week
                </h2>
              </div>
              <div className="flex justify-between gap-4 mb-6">
                <div>
                  <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>3h12m</div>
                  <div className="uppercase text-[10px] tracking-[0.25px]" style={{ fontFamily: 'Inter', color: '#99A1AF' }}>Today</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#D08700' }}>4h22m</div>
                  <div className="uppercase text-[10px] tracking-[0.25px]" style={{ fontFamily: 'Inter', color: '#99A1AF' }}>Best day</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#155DFC' }}>2h38m</div>
                  <div className="uppercase text-[10px] tracking-[0.25px]" style={{ fontFamily: 'Inter', color: '#99A1AF' }}>Daily avg</div>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto" style={{ height: 128 }}>
                {studyDays.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t min-w-[24px]"
                      style={{
                        height: Math.max(24, (d.hours / 4.5) * 80),
                        background: 'linear-gradient(180deg, #155DFC 0%, #2B7FFF 100%)',
                      }}
                    />
                    <span className="text-[10px] uppercase" style={{ fontFamily: 'Inter', color: '#99A1AF' }}>{d.day}</span>
                    <span className="text-[10px]" style={{ fontFamily: 'Inter', color: '#4A5565' }}>{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 uppercase text-[10px] tracking-[0.25px]" style={{ fontFamily: 'Inter', color: '#99A1AF' }}>
                Total study hours
              </div>
            </div>

            {/* Time Distribution — This Week */}
            <div
              className="rounded-[10px] p-6 flex flex-col"
              style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 329 }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-sm bg-[#101828]" style={{ transform: 'rotate(45deg)' }} />
                <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                  Time Distribution — This Week
                </h2>
              </div>
              <div className="flex items-center gap-8 flex-1">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {timeDistribution.map((item, i) => {
                      const start = timeDistribution.slice(0, i).reduce((s, x) => s + x.pct / 100, 0);
                      const pct = item.pct / 100;
                      const r = 40;
                      const circumference = 2 * Math.PI * r;
                      return (
                        <circle
                          key={item.name}
                          cx="50"
                          cy="50"
                          r={r}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="12"
                          strokeDasharray={`${circumference * pct} ${circumference}`}
                          strokeDashoffset={-circumference * start}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>18h</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>TOTAL</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {timeDistribution.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#364153' }}>{item.name}</span>
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#101828' }}>{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Strong & Weak Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Strong Areas - layout from screenshot */}
            <div
              className="rounded-[14px] flex flex-col"
              style={{
                width: '100%',
                maxWidth: 554,
                minHeight: 349.6,
                gap: 24,
                padding: '24.8px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
              }}
            >
              <div className="flex items-center justify-between flex-shrink-0" style={{ minHeight: 32 }}>
                <div className="flex items-center gap-2">
                  <span aria-hidden style={{ fontSize: 20 }}>💪</span>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: 0, color: '#101828' }}>
                    Strong Areas
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#155DFC' }} />
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>Accuracy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#E5E7EB' }} />
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>Qs attempted</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                {strongAreas.map((a) => (
                  <div key={a.name} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.dotColor }} />
                        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#101828' }}>{a.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: a.accuracyColor }}>{a.pct}%</span>
                        <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>{a.qs} Qs</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#F3F4F6' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${a.pct}%`, background: a.barColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Weak Areas - layout from screenshot */}
            <div
              className="rounded-[14px] flex flex-col"
              style={{
                width: '100%',
                maxWidth: 554,
                minHeight: 349.6,
                gap: 24,
                padding: '24.8px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
              }}
            >
              <div className="flex items-center justify-between flex-shrink-0" style={{ minHeight: 32 }}>
                <div className="flex items-center gap-2">
                  <span aria-hidden style={{ fontSize: 20 }}>⚠️</span>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: 0, color: '#101828' }}>
                    Weak Areas
                  </h3>
                </div>
                <button type="button" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>
                  View Tracker +
                </button>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                {weakAreas.map((a) => (
                  <div key={a.name} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full flex-wrap gap-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {a.dotColor && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.dotColor }} />
                        )}
                        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#101828' }}>{a.name}</span>
                        {a.tag && (
                          <span
                            className="rounded-full px-2 py-0.5 flex-shrink-0"
                            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', background: '#FEF2F2', color: '#B91C1C' }}
                          >
                            {a.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: a.accuracyColor }}>{a.pct}%</span>
                        <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>{a.qs} Qs</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#F3F4F6' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${a.pct}%`, background: a.barColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Study Streak & Daily Prep */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Study Streak — February 2026 - layout from screenshot */}
            <div
              className="rounded-[14px] flex flex-col overflow-hidden"
              style={{
                width: '100%',
                maxWidth: 554,
                minHeight: 537.16,
                padding: '24.8px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
              }}
            >
              <div className="flex items-center justify-between flex-shrink-0 mb-5" style={{ minHeight: 32 }}>
                <div className="flex items-center gap-2">
                  {/* Icon: copy Container (53).png from Downloads to public/Container-53.png */}
                  <img src="/Container-53.png" alt="" className="w-8 h-8 object-contain flex-shrink-0" onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; const next = t.nextElementSibling as HTMLElement; if (next) next.style.display = 'inline'; }} />
                  <span aria-hidden style={{ fontSize: 20, display: 'none' }}>📅</span>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: 0, color: '#101828' }}>
                    Study Streak — February 2026
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span aria-hidden>🔥</span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FF6900' }}>42 Days!</span>
                </div>
              </div>
              {/* Intensity legend */}
              <div className="mb-4">
                <div className="uppercase mb-2" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: '#6A7282' }}>Intensity</div>
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { label: 'None', bg: '#F3F4F6' },
                    { label: 'Light', bg: '#E5E7EB' },
                    { label: 'Medium', bg: '#DCFCE7' },
                    { label: 'Intense', bg: '#15803D' },
                  ].map(({ label, bg }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: bg }} />
                      <span className="uppercase" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: '#6A7282' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Calendar: Feb 2026 starts on Saturday */}
              <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center py-1" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, color: '#6A7282' }}>{d}</div>
                ))}
                {(() => {
                  const intense = [1,2,3,4,5,6,8,9,10,11,12,13,15,16,17,18,19,21,22];
                  const medium = [7, 14, 20];
                  const current = 23;
                  const days: (number | null)[] = [];
                  for (let i = 0; i < 6; i++) days.push(null);
                  for (let d = 1; d <= 28; d++) days.push(d);
                  days.push(null);
                  return days.map((d, i) => {
                    if (d === null) return <div key={`e-${i}`} className="rounded-[6px] aspect-square" style={{ background: 'transparent' }} />;
                    const isIntense = intense.includes(d);
                    const isMedium = medium.includes(d);
                    const isCurrent = d === current;
                    const bg = isCurrent ? '#FEF3C6' : isIntense ? '#15803D' : isMedium ? '#DCFCE7' : '#F3F4F6';
                    const color = isIntense ? '#FFFFFF' : '#101828';
                    return (
                      <div
                        key={d}
                        className="rounded-[6px] aspect-square flex items-center justify-center font-bold"
                        style={{
                          fontFamily: 'Inter',
                          fontSize: 12,
                          lineHeight: 1,
                          background: bg,
                          color,
                          border: isCurrent ? '2px solid #F0B100' : undefined,
                        }}
                      >
                        {d}
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Footer stats */}
              <div
                className="flex items-center justify-between flex-wrap gap-4 pt-5 mt-4 flex-shrink-0"
                style={{ borderTop: '0.8px solid #F3F4F6' }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>4h 32m</span>
                  <span className="uppercase tracking-[0.25px]" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: '#6A7282' }}>Avg Daily Study</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#F0B100' }}>26/28</span>
                  <span className="uppercase tracking-[0.25px]" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: '#6A7282' }}>Active Days Feb</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#00BBA7' }}>127h</span>
                  <span className="uppercase tracking-[0.25px]" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: '#6A7282' }}>Total Feb Hours</span>
                </div>
              </div>
            </div>
            {/* Daily Trio — This Week - layout from screenshot */}
            <div
              className="rounded-[14px] flex flex-col"
              style={{
                width: '100%',
                maxWidth: 563,
                minHeight: 537,
                gap: 24,
                padding: '24.8px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minHeight: 32 }}>
                <span aria-hidden style={{ fontSize: 22 }}>⚡</span>
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: 0, color: '#101828' }}>
                  Daily Trio — This Week
                </h3>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                {[
                  { title: 'Daily MCQ Challenge', sub: 'Polity, Economy, Geography', done: 6, total: 7, borderColor: '#00BC7D', barColor: '#00BC7D', icon: '📚' },
                  { title: 'Daily Mains Challenge', sub: 'Answer Writing, AI Evaluated', done: 5, total: 7, borderColor: '#101828', barColor: '#101828', icon: '✍️' },
                  { title: 'Daily News Analysis', sub: 'The Hindu, Indian Express', done: 4, total: 7, borderColor: '#F0B100', barColor: '#F0B100', icon: '📰' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[10px] p-4 flex flex-col min-h-0"
                    style={{
                      borderLeft: `4px solid ${item.borderColor}`,
                      background: 'linear-gradient(90deg, #F9FAFB 0%, #FFFFFF 100%)',
                      boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span aria-hidden style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>{item.title}</span>
                      </div>
                      <img src="/ArrowRight.png" alt="" className="flex-shrink-0 w-5 h-5 object-contain" style={{ color: '#64748B' }} onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; const next = t.nextElementSibling as HTMLElement; if (next) next.style.display = 'inline'; }} />
                      <span aria-hidden className="flex-shrink-0" style={{ display: 'none', color: '#64748B', fontSize: 14 }}>→</span>
                    </div>
                    <p className="mb-3" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>{item.sub}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0 rounded-full overflow-hidden" style={{ height: 8, background: '#E5E7EB', maxWidth: 345 }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(item.done / item.total) * 100}%`, background: item.barColor }}
                        />
                      </div>
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#101828', flexShrink: 0 }}>{item.done}/{item.total} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievement Badges & Weekly Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-[10px] p-6" style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                  Achievement Badges
                </h3>
                <button type="button" className="text-[14px] font-semibold" style={{ fontFamily: 'Inter', color: '#155DFC' }}>View All</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.title}
                    className="rounded-[10px] p-3 flex flex-col items-center justify-center text-center border border-[#E5E7EB]"
                  >
                    <span className="text-[20px] mb-1" aria-hidden>{b.icon}</span>
                    <span className="text-[11px] leading-tight" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#364153' }}>{b.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[10px] p-6" style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                  Weekly Leaderboard
                </h3>
                <button type="button" className="text-[14px] font-semibold" style={{ fontFamily: 'Inter', color: '#155DFC' }}>View All</button>
              </div>
              <div className="space-y-2">
                {leaderboard.map((row) => (
                  <div
                    key={row.rank}
                    className="flex items-center justify-between py-2 px-3 rounded-lg"
                    style={{ background: row.isYou ? '#EFF6FF' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: '#64748B', width: 24 }}>{row.rank}</span>
                      <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, color: row.isYou ? '#155DFC' : '#101828' }}>{row.name}</span>
                    </div>
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: '#101828' }}>{row.score}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[14px]" style={{ fontFamily: 'Inter', color: '#64748B' }}>
                <span>You - 7.2 avg - 14 streak</span>
                <span className="text-[#00C950] font-semibold">+2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
