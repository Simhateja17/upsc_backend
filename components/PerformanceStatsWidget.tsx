'use client';

import React, { useState, useEffect } from 'react';
import { dashboardService } from '@/lib/services';

interface PerformanceData {
  studyTimeToday?: string;
  testsTaken?: number;
  rank?: number;
  rankPercentile?: number;
  jeetCoins?: number;
  syllabusCoverage?: number;
}

interface StreakData {
  currentStreak?: number;
  weekDays?: boolean[];
  longestStreak?: number;
  streakLabel?: string;
}

const PerformanceStatsWidget = () => {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const [perfRes, streakRes] = await Promise.allSettled([
          dashboardService.getPerformance(),
          dashboardService.getStreak(),
        ]);
        if (mounted) {
          if (perfRes.status === 'fulfilled' && perfRes.value?.data) {
            setPerformance(perfRes.value.data);
          }
          if (streakRes.status === 'fulfilled' && streakRes.value?.data) {
            setStreak(streakRes.value.data);
          }
        }
      } catch {
        // Graceful degradation
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  // Display values — null/undefined when API hasn't returned data
  const currentStreak = streak?.currentStreak ?? (loading ? null : 0);
  const weekDays = streak?.weekDays ?? [false, false, false, false, false, false, false];
  const streakLabel = streak?.streakLabel ?? '';
  const syllabusCoverage = performance?.syllabusCoverage ?? (loading ? null : 0);
  const studyTimeToday = performance?.studyTimeToday ?? (loading ? null : '0h 0m');
  const testsTaken = performance?.testsTaken ?? (loading ? null : 0);
  const rank = performance?.rank ?? null;
  const rankPercentile = performance?.rankPercentile ?? null;
  const jeetCoins = performance?.jeetCoins ?? (loading ? null : 0);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="w-full space-y-[clamp(12px,0.83vw,16px)]">
      {/* Performance Stats Card */}
      <div
        className="rounded-[clamp(16px,1.04vw,20px)]"
        style={{
          background: '#ffffff',
          border: '0.8px solid #E5E7EB',
          boxShadow: '0px 4px 12px 0px #00000026',
          padding: 'clamp(20px,1.29vw,24.8px) clamp(20px,1.25vw,24px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-[clamp(6px,0.42vw,8px)] mb-[clamp(16px,1.04vw,20px)]">
          <img
            src="/image-removebg-preview (41) 1.png"
            alt="Performance Stats"
            className="w-[clamp(18px,1.25vw,24px)] h-[clamp(18px,1.25vw,24px)]"
          />
          <h2
            className="font-arimo text-[#101828]"
            style={{
              fontWeight: 700,
              fontSize: '17px',
              lineHeight: '24px',
              letterSpacing: '0px',
              whiteSpace: 'nowrap',
            }}
          >
            Your Performance Stats
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A1172]"></div>
          </div>
        ) : (
          <>
            {/* Day Study Streak */}
            <div className="flex items-start justify-between mb-[clamp(12px,0.83vw,16px)]">
              <div>
                <div className="font-outfit font-bold text-[#0A1172] leading-none" style={{ fontSize: 'clamp(36px,2.19vw,42px)' }}>
                  {currentStreak ?? 0}
                </div>
                <p className="font-arimo text-[#6B7280] mt-[clamp(4px,0.31vw,6px)]" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.2' }}>
                  Day Study Streak
                </p>
              </div>
              <div
                className="rounded-full flex items-center gap-[clamp(4px,0.31vw,6px)]"
                style={{
                  background: '#D1FAE5',
                  padding: 'clamp(4px,0.31vw,6px) clamp(8px,0.52vw,10px)',
                }}
              >
                <svg className="w-[clamp(14px,0.83vw,16px)] h-[clamp(14px,0.83vw,16px)] text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C11.5 2 8 5.5 8 10c0 3 2 5 4 7 2-2 4-4 4-7 0-4.5-3.5-8-4-8z"/>
                  <path d="M12 22c-1 0-2-1-2-2s1-3 2-3 2 2 2 3-1 2-2 2z" opacity="0.7"/>
                </svg>
                <span className="font-inter font-semibold text-green-700" style={{ fontSize: 'clamp(11px,0.68vw,13px)' }}>
                  {streakLabel}
                </span>
              </div>
            </div>

            {/* Week Days */}
            <div className="flex gap-[clamp(4px,0.31vw,6px)] mb-[clamp(16px,1.04vw,20px)]">
              {dayLabels.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 aspect-square rounded-lg flex items-center justify-center font-inter font-semibold ${
                    weekDays[index] ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                  style={{ fontSize: 'clamp(11px,0.68vw,13px)' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Syllabus Coverage */}
            <div className="mb-[clamp(12px,0.83vw,16px)]">
              <div className="flex items-center justify-between mb-[clamp(6px,0.42vw,8px)]">
                <span className="font-arimo text-[#4A5565]" style={{ fontSize: 'clamp(11px,0.68vw,13px)' }}>
                  Syllabus Coverage
                </span>
                <span className="font-arimo font-bold text-[#0A1172]" style={{ fontSize: 'clamp(13px,0.83vw,16px)' }}>
                  {syllabusCoverage !== null ? `${syllabusCoverage}%` : '--'}
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 'clamp(6px,0.42vw,8px)', background: '#E5E7EB' }}>
                <div
                  className="h-full bg-[#0A1172] rounded-full transition-all duration-300"
                  style={{ width: `${syllabusCoverage ?? 0}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-[clamp(10px,0.73vw,14px)]">
              {/* Study Time Today */}
              <div
                className="rounded-[14px] flex flex-col items-center justify-center text-center"
                style={{
                  background: '#EEF2FF',
                  padding: '16px 12px',
                }}
              >
                <div className="font-outfit font-bold text-[#17223E] leading-none" style={{ fontSize: '20px', marginBottom: '6px' }}>
                  {studyTimeToday ?? '--'}
                </div>
                <p className="font-arimo text-[#6B7280]" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                  Study Time Today
                </p>
              </div>

              {/* Tests Taken */}
              <div
                className="rounded-[14px] flex flex-col items-center justify-center text-center"
                style={{
                  background: '#EEF2FF',
                  padding: '16px 12px',
                }}
              >
                <div className="font-outfit font-bold text-[#17223E] leading-none" style={{ fontSize: '20px', marginBottom: '6px' }}>
                  {testsTaken ?? '--'}
                </div>
                <p className="font-arimo text-[#6B7280]" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                  Tests Taken
                </p>
              </div>

              {/* Your Rank */}
              <div
                className="rounded-[14px] flex flex-col items-center justify-center text-center"
                style={{
                  background: '#EEF2FF',
                  padding: '16px 12px',
                }}
              >
                <div className="font-outfit font-bold text-[#17223E] leading-none" style={{ fontSize: '20px', marginBottom: '6px' }}>
                  {rank !== null ? `#${rank}` : '--'}
                </div>
                <p className="font-arimo text-[#6B7280]" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                  Your Rank: <span className="text-green-600 font-arimo">{rankPercentile !== null ? `Top ${rankPercentile}%` : '--'}</span>
                </p>
              </div>

              {/* Jeet Coins */}
              <div
                className="rounded-[14px] flex flex-col items-center justify-center text-center"
                style={{
                  background: '#EEF2FF',
                  padding: '16px 12px',
                }}
              >
                <div className="flex items-center justify-center" style={{ gap: '4px', marginBottom: '6px' }}>
                  <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="#FFD700"/>
                    <text x="12" y="16" fontSize="10" fill="#000" textAnchor="middle" fontWeight="bold">&#x20B9;</text>
                  </svg>
                  <span className="font-outfit font-bold text-[#17223E] leading-none" style={{ fontSize: '20px' }}>
                    {jeetCoins ?? '--'}
                  </span>
                </div>
                <p className="font-arimo text-[#6B7280]" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                  Jeet Coins
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Weekly Leaderboard */}
      <div
        className="cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center"
        style={{
          background: '#74A0FF30',
          height: '50px',
          borderRadius: '16px',
        }}
      >
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span className="font-outfit font-semibold whitespace-nowrap" style={{ fontSize: '18px', lineHeight: '1', color: '#1E2875' }}>
            Weekly Leaderboard
          </span>
          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none">
            <path d="M4 12h16M14 6l6 6-6 6" stroke="#1E2875" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Achievement Badges */}
      <div
        className="rounded-[clamp(16px,1.04vw,20px)]"
        style={{
          border: '0.8px solid #E5E7EB',
          boxShadow: '0px 4px 12px 0px #00000026',
          padding: 'clamp(20px,1.29vw,24.8px) clamp(20px,1.25vw,24px)',
        }}
      >
        <div className="flex items-center gap-[clamp(6px,0.42vw,8px)] mb-[clamp(16px,1.25vw,24px)]">
          <img
            src="/ach.png"
            alt="Achievement Badges"
            className="w-[clamp(18px,1.25vw,24px)] h-[clamp(18px,1.25vw,24px)]"
          />
          <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(16px,1.04vw,20px)', lineHeight: '1.2' }}>
            Achievement Badges
          </h3>
        </div>
        <div className="flex justify-between items-start gap-[clamp(8px,0.52vw,12px)]">
          <div className="flex-1 flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 'clamp(52px,3.33vw,64px)',
                height: 'clamp(52px,3.33vw,64px)',
                background: '#FFF5E6',
              }}
            >
              <img
                src="/image-removebg-preview (24) 1.png"
                alt="30-Day Streak"
                style={{ width: '70%', height: 'auto' }}
              />
            </div>
            <p className="font-arimo font-bold text-[#101828] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>30-Day Streak</p>
            <p className="font-arimo text-[#F97316] text-center" style={{ fontSize: 'clamp(9px,0.52vw,10px)', lineHeight: '1.2' }}>Earned</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 'clamp(52px,3.33vw,64px)',
                height: 'clamp(52px,3.33vw,64px)',
                background: '#FFF9E6',
              }}
            >
              <img
                src="/image-removebg-preview (40) 1.png"
                alt="Quick Learner"
                style={{ width: '70%', height: 'auto' }}
              />
            </div>
            <p className="font-arimo font-bold text-[#101828] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>Quick Learner</p>
            <p className="font-arimo text-[#F97316] text-center" style={{ fontSize: 'clamp(9px,0.52vw,10px)', lineHeight: '1.2' }}>Earned</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 'clamp(52px,3.33vw,64px)',
                height: 'clamp(52px,3.33vw,64px)',
                background: '#FFF5F5',
              }}
            >
              <img
                src="/image-removebg-preview (22) 1 (1).png"
                alt="95% Accuracy"
                style={{ width: '70%', height: 'auto' }}
              />
            </div>
            <p className="font-arimo font-bold text-[#101828] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>95% Accuracy</p>
            <p className="font-arimo text-[#6B7280] text-center" style={{ fontSize: 'clamp(9px,0.52vw,10px)', lineHeight: '1.2' }}>In Progress</p>
          </div>
        </div>
      </div>

      {/* Smart Revision Tools */}
      <div
        className="rounded-[clamp(16px,1.04vw,20px)]"
        style={{
          border: '0.8px solid #E5E7EB',
          boxShadow: '0px 4px 12px 0px #00000026',
          padding: 'clamp(20px,1.29vw,24.8px) clamp(20px,1.25vw,24px)',
        }}
      >
        <div className="flex items-center gap-[clamp(6px,0.42vw,8px)] mb-[clamp(16px,1.04vw,20px)]">
          <img
            src="/smart.png"
            alt="Smart Revision Tools"
            className="w-[clamp(18px,1.25vw,24px)] h-[clamp(18px,1.25vw,24px)]"
          />
          <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(16px,1.04vw,20px)', lineHeight: '1.4' }}>
            Smart Revision Tools
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-[clamp(12px,0.83vw,16px)]">
          <button
            className="border border-[#E5E7EB] bg-white rounded-[clamp(12px,0.73vw,14px)] hover:shadow-md transition-shadow flex flex-col items-center gap-[clamp(8px,0.63vw,12px)]"
            style={{
              padding: 'clamp(12px,0.83vw,16px)',
            }}
          >
            <img
              src="/icon-folder.png"
              alt="Flashcards"
              style={{ width: 'clamp(32px,2.08vw,40px)', height: 'auto' }}
            />
            <p className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.43' }}>Flashcards</p>
            <p className="font-arimo text-[#00A63E]" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>Earned</p>
          </button>
          <button
            className="border border-[#E5E7EB] bg-white rounded-[clamp(12px,0.73vw,14px)] hover:shadow-md transition-shadow flex flex-col items-center gap-[clamp(8px,0.63vw,12px)]"
            style={{
              padding: 'clamp(12px,0.83vw,16px)',
            }}
          >
            <img
              src="/list-fail.png"
              alt="Wrong Attempts"
              style={{ width: 'clamp(32px,2.08vw,40px)', height: 'auto' }}
            />
            <p className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.43' }}>Wrong Attempts</p>
            <p className="font-arimo text-[#00A63E]" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>Earned</p>
          </button>
          <button
            className="border border-[#E5E7EB] bg-white rounded-[clamp(12px,0.73vw,14px)] hover:shadow-md transition-shadow flex flex-col items-center gap-[clamp(8px,0.63vw,12px)]"
            style={{
              padding: 'clamp(12px,0.83vw,16px)',
            }}
          >
            <img
              src="/mindmap.png"
              alt="Mindmaps"
              style={{ width: 'clamp(32px,2.08vw,40px)', height: 'auto' }}
            />
            <p className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.43' }}>Mindmaps</p>
            <p className="font-arimo text-[#00A63E]" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>Earned</p>
          </button>
          <button
            className="border border-[#E5E7EB] bg-white rounded-[clamp(12px,0.73vw,14px)] hover:shadow-md transition-shadow flex flex-col items-center gap-[clamp(8px,0.63vw,12px)]"
            style={{
              padding: 'clamp(12px,0.83vw,16px)',
            }}
          >
            <img
              src="/news.png"
              alt="Quick Notes"
              style={{ width: 'clamp(32px,2.08vw,40px)', height: 'auto' }}
            />
            <p className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.43' }}>Quick Notes</p>
            <p className="font-arimo text-[#00A63E]" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.33' }}>Earned</p>
          </button>
        </div>
      </div>

      {/* Quick Settings */}
      <div
        className="rounded-[clamp(16px,1.04vw,20px)]"
        style={{
          border: '0.8px solid #E5E7EB',
          boxShadow: '0px 4px 12px 0px #00000026',
          padding: 'clamp(20px,1.29vw,24.8px) clamp(20px,1.25vw,24px)',
        }}
      >
        <div className="flex items-center gap-[clamp(6px,0.42vw,8px)] mb-[clamp(16px,1.04vw,20px)]">
          <img
            src="/settings.png"
            alt="Quick Settings"
            className="w-[clamp(18px,1.25vw,24px)] h-[clamp(18px,1.25vw,24px)]"
          />
          <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: 'clamp(16px,1.04vw,20px)', lineHeight: '1.2' }}>
            Quick Settings
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-[clamp(12px,0.83vw,16px)]">
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#DBEAFE',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#3B82F6]" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>Dark Mode</p>
          </button>
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#D1FAE5',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#10B981]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>Notifications</p>
          </button>
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#FED7AA',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#F97316]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>Study Timer</p>
          </button>
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#E9D5FF',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#A855F7]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>Downloads</p>
          </button>
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#FECACA',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#EF4444]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>Profile</p>
          </button>
          <button className="flex flex-col items-center gap-[clamp(6px,0.42vw,8px)]">
            <div
              className="rounded-[clamp(12px,0.73vw,14px)] flex items-center justify-center"
              style={{
                width: 'clamp(48px,2.92vw,56px)',
                height: 'clamp(48px,2.92vw,56px)',
                background: '#E9D5FF',
              }}
            >
              <svg className="w-[clamp(20px,1.25vw,24px)] h-[clamp(20px,1.25vw,24px)] text-[#A855F7]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </div>
            <p className="font-arimo text-[#364153] text-center" style={{ fontSize: 'clamp(10px,0.63vw,12px)', lineHeight: '1.25' }}>All Settings</p>
          </button>
        </div>
      </div>

      {/* Upcoming Test */}
      <div
        className="rounded-[clamp(16px,1.04vw,20px)] overflow-hidden"
        style={{
          background: 'linear-gradient(179.87deg, #0E182D 0.11%, #17223E 97.85%)',
          padding: 'clamp(20px,1.46vw,28px) clamp(20px,1.25vw,24px)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-[clamp(8px,0.52vw,10px)] mb-[clamp(12px,0.83vw,16px)]">
          <img src="/calendar.png" alt="Calendar" className="w-[clamp(28px,1.82vw,35px)] h-[clamp(28px,1.82vw,35px)]" style={{ objectFit: 'contain', opacity: 1, filter: 'brightness(0) invert(1)' }} />
          <h3 className="font-inter font-bold text-white" style={{ fontSize: 'clamp(18px,1.35vw,26px)', lineHeight: '1.2' }}>
            Upcoming Test
          </h3>
        </div>
        <div className="flex items-center justify-between mb-[clamp(12px,0.83vw,16px)]">
          <p className="font-inter text-white" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.2' }}>
            UPSC Prelims Mock
          </p>
          <p className="font-inter text-white" style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: '1.2' }}>
            Tomorrow, 10AM
          </p>
        </div>
        <button
          className="w-full rounded-[clamp(8px,0.52vw,10px)] bg-white hover:bg-gray-100 transition-colors cursor-pointer"
          style={{ height: 'clamp(28px,1.72vw,33px)' }}
          onClick={() => {
            // Tomorrow at 10AM local time
            const start = new Date();
            start.setDate(start.getDate() + 1);
            start.setHours(10, 0, 0, 0);
            const end = new Date(start);
            end.setHours(12, 0, 0, 0); // 2-hour window

            const fmt = (d: Date) =>
              d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            const url = new URL('https://calendar.google.com/calendar/render');
            url.searchParams.set('action', 'TEMPLATE');
            url.searchParams.set('text', 'UPSC Prelims Mock Test');
            url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
            url.searchParams.set('details', 'UPSC Prelims Mock Test — RiseWithJeet');
            url.searchParams.set('sf', 'true');
            url.searchParams.set('output', 'xml');

            window.open(url.toString(), '_blank');
          }}
        >
          <span className="font-inter font-semibold text-[#0E182D]" style={{ fontSize: 'clamp(13px,0.78vw,15px)', lineHeight: '1.2' }}>
            Set Reminder
          </span>
        </button>
      </div>
    </div>
  );
};

export default PerformanceStatsWidget;
