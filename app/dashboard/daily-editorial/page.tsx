'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { editorialService } from '@/lib/services';
import { UPSC_SUBJECTS } from '@/lib/upscSubjects';

interface EditorialCard {
  id: string;
  title: string;
  summary: string | null;
  aiSummary?: string | null;
  source: string;
  sourceUrl?: string;
  category: string;
  tags: string[];
  publishedAt?: string;
  isRead: boolean;
  isSaved: boolean;
}

const categoryColors: Record<string, { color: string; bg: string }> = {
  'Polity': { color: '#7C3AED', bg: '#EDE9FE' },
  'Economy': { color: '#EA580C', bg: '#FFF7ED' },
  'Environment': { color: '#16A34A', bg: '#F0FDF4' },
  'Technology': { color: '#7C3AED', bg: '#EDE9FE' },
  'Judiciary': { color: '#DC2626', bg: '#FEF2F2' },
  'International Relations': { color: '#EA580C', bg: '#FFF7ED' },
};

const subjects = UPSC_SUBJECTS.map((s) => ({
  id: s.id,
  emoji: s.emoji,
  label: s.label,
  bg: s.bg,
  border: s.border,
})) as Array<{ id: string; emoji: string; label: string; bg: string; border: string; icon?: string }>;

const defaultLearningStats = [
  { icon: '/dark.png', label: 'Editorials read', value: '0', color: '#047857' },
  { icon: '/tatal.png', label: 'Total reading time', value: '0 hrs', color: '#1D4ED8' },
  { icon: '/light.png', label: "This week's target", value: '0%', color: '#16A34A' },
  { icon: '/longeset.png', label: 'Longest streak', value: '0 days', color: '#7C3AED' },
];

/* ------------------------------------------------------------------ */
/*  Calendar helper                                                    */
/* ------------------------------------------------------------------ */
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DailyEditorialPage() {
  const router = useRouter();
  const [activeNewspaper, setActiveNewspaper] = useState<'hindu' | 'express'>('hindu');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [editorials, setEditorials] = useState<EditorialCard[]>([]);
  const [learningStats, setLearningStats] = useState(defaultLearningStats);
  const [glanceStats, setGlanceStats] = useState({ hindu: 0, express: 0, read: 0, ai: 0 });
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  // Streak data pulled from /editorials/stats
  const [streakData, setStreakData] = useState<{ streak: number; weekChecks: boolean[]; readToday: number; targetToday: number }>({
    streak: 0,
    weekChecks: [false, false, false, false, false, false, false],
    readToday: 0,
    targetToday: 7,
  });
  const PAGE_SIZE = 10;
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summaryModal, setSummaryModal] = useState<{
    open: boolean;
    loading: boolean;
    editorial: EditorialCard | null;
    summary: string | null;
    loadStep: number;
  }>({ open: false, loading: false, editorial: null, summary: null, loadStep: 0 });

  useEffect(() => {
    const source = activeNewspaper === 'hindu' ? 'The Hindu' : 'Indian Express';
    setLoading(true);
    setCurrentPage(1);
    editorialService.getToday(source, selectedDate)
      .then(res => {
        const articles = res.data && Array.isArray(res.data) ? res.data : [];
        if (articles.length > 0) {
          setEditorials(articles);
          setLastFetched(new Date());
        } else {
          // DB empty — fall back to live News API (only for today)
          const isToday = selectedDate === new Date().toISOString().slice(0, 10);
          if (isToday) {
            return editorialService.getLiveNews(source).then(liveRes => {
              if (liveRes.data && Array.isArray(liveRes.data)) {
                setEditorials(liveRes.data);
                setLastFetched(new Date());
              }
            });
          } else {
            setEditorials([]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeNewspaper, selectedDate]);

  useEffect(() => {
    editorialService.getStats()
      .then(res => {
        if (res.data) {
          const d = res.data;
          setLearningStats([
            { icon: '/dark.png', label: 'Editorials read', value: `${d.totalRead || 0}`, color: '#047857' },
            { icon: '/tatal.png', label: 'Total saved', value: `${d.totalSaved || 0}`, color: '#1D4ED8' },
            { icon: '/light.png', label: "This week's target", value: `${d.weeklyTarget ? Math.round((d.weeklyRead / d.weeklyTarget) * 100) : 0}%`, color: '#16A34A' },
            { icon: '/longeset.png', label: 'Current streak', value: `${d.streak || 0} days`, color: '#7C3AED' },
          ]);
          // Derive 7-day checklist: fill from the left for each day read in current streak
          const streakLen = d.streak || 0;
          const weekChecks = Array.from({ length: 7 }, (_, i) => i < streakLen);
          setStreakData({
            streak: streakLen,
            weekChecks,
            readToday: d.readToday || 0,
            targetToday: d.dailyTarget || 7,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (id: string) => {
    try {
      const res = await editorialService.toggleSave(id);
      setEditorials(prev => prev.map(e => e.id === id ? { ...e, isSaved: res.data?.saved ?? !e.isSaved } : e));
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await editorialService.markRead(id);
      setEditorials(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
    } catch {}
  };

  const handleSummarize = async (card: EditorialCard) => {
    // Use cached summary if available — no AI call needed
    if (card.aiSummary) {
      setSummaryModal({ open: true, loading: false, editorial: card, summary: card.aiSummary, loadStep: 4 });
      return;
    }

    setSummarizing(card.id);
    setSummaryModal({ open: true, loading: true, editorial: card, summary: null, loadStep: 0 });

    // Animate loading steps
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setSummaryModal(prev => ({ ...prev, loadStep: step }));
      if (step >= 3) clearInterval(interval);
    }, 900);

    try {
      const res = await editorialService.summarize(card.id);
      clearInterval(interval);
      const summary = res.data?.summary || null;
      // Cache in local state so re-opening is instant
      setEditorials(prev => prev.map(e => e.id === card.id ? { ...e, aiSummary: summary } : e));
      setSummaryModal(prev => ({ ...prev, loading: false, summary, loadStep: 4 }));
    } catch {
      clearInterval(interval);
      setSummaryModal(prev => ({ ...prev, open: false }));
    }
    setSummarizing(null);
  };


  const calDays = getCalendarDays(calYear, calMonth);
  const now = new Date();
  const today = now.getMonth() === calMonth && now.getFullYear() === calYear ? now.getDate() : -1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  return (
    <div
      className="font-arimo w-full min-h-screen"
      style={{ background: '#F9FAFB' }}
    >
      {/* ============================================================ */}
      {/*  BACK TO DASHBOARD BUTTON                                     */}
      {/* ============================================================ */}
      <div style={{ padding: 'clamp(12px, 1.27vw, 17px) clamp(20px, 2.25vw, 30px)' }}>
        <Link href="/dashboard">
          <button
            className="flex items-center gap-2 font-arimo font-semibold"
            style={{
              height: 'clamp(40px, 3.81vw, 51px)',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
              border: '1px solid #E5E7EB',
              padding: '0 clamp(16px, 1.5vw, 20px)',
              fontSize: 'clamp(13px, 1.05vw, 14px)',
              color: '#17223E',
              backgroundColor: '#FFFFFF',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Arrow left */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#17223E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to dashboard
          </button>
        </Link>
      </div>

      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <div className="flex flex-col items-center" style={{ paddingTop: 'clamp(8px, 1vw, 16px)', paddingBottom: 'clamp(24px, 2.5vw, 40px)' }}>
        {/* Tag pill */}
        <div
          className="flex items-center gap-2 font-arimo font-semibold text-white"
          style={{
            background: '#101828',
            borderRadius: '26843500px',
            padding: 'clamp(6px, 0.6vw, 8px) clamp(14px, 1.5vw, 20px)',
            fontSize: 'clamp(11px, 0.9vw, 13px)',
            letterSpacing: '0.5px',
            marginBottom: 'clamp(14px, 1.5vw, 20px)',
          }}
        >
          {/* Sparkle icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#FFD273" stroke="#FFD273" strokeWidth="1"/>
          </svg>
          DAILY NEWS ANALYSIS
        </div>

        {/* Main heading */}
        <h1
          className="font-tinos italic text-center"
          style={{
            fontSize: 'clamp(32px, 3.59vw, 48px)',
            lineHeight: 'clamp(36px, 3.59vw, 48px)',
            color: '#17223E',
            marginBottom: 'clamp(10px, 1vw, 16px)',
          }}
        >
          Where{' '}
          <span style={{ color: '#FFD273' }}>news</span>{' '}
          meets
          <br />
          the{' '}
          <span style={{ color: '#FFD273' }}>syllabus</span>
        </h1>

        {/* Description */}
        <p
          className="font-arimo text-center"
          style={{
            fontSize: 'clamp(14px, 1.35vw, 18px)',
            lineHeight: 'clamp(22px, 2.1vw, 28px)',
            color: '#4A5565',
            maxWidth: '524px',
          }}
        >
          Every editorial, every perspective &mdash; mapped to what UPSC asks.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  MAIN TWO-COLUMN LAYOUT                                      */}
      {/* ============================================================ */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: 'clamp(960px, 75vw, 1020px)',
          padding: '0 clamp(16px, 2vw, 30px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) clamp(260px, 23.05vw, 308px)',
          gap: 'clamp(16px, 2vw, 28px)',
          paddingBottom: 'clamp(40px, 5vw, 80px)',
        }}
      >
        {/* ========================================================== */}
        {/*  LEFT COLUMN — News Cards                                   */}
        {/* ========================================================== */}
        <div>
          {/* Top controls row */}
          <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
            {/* Newspaper toggles */}
            <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
              <button
                onClick={() => setActiveNewspaper('hindu')}
                className="flex items-center gap-2 font-fahkwang"
                style={{
                  height: 'clamp(32px, 2.77vw, 37px)',
                  padding: '0 clamp(12px, 1.2vw, 16px)',
                  borderRadius: '20px',
                  border: '0.8px solid #E5E7EB',
                  background: activeNewspaper === 'hindu' ? '#101828' : '#FFFFFF',
                  color: activeNewspaper === 'hindu' ? '#FFFFFF' : '#101828',
                  fontSize: 'clamp(12px, 1.05vw, 14px)',
                  fontWeight: 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/hindu.png" alt="Hindu" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                The Hindu
              </button>

              <button
                onClick={() => setActiveNewspaper('express')}
                className="flex items-center gap-2 font-fahkwang"
                style={{
                  height: 'clamp(32px, 2.77vw, 37px)',
                  padding: '0 clamp(12px, 1.2vw, 16px)',
                  borderRadius: '20px',
                  border: '0.8px solid #E5E7EB',
                  background: activeNewspaper === 'express' ? '#101828' : '#FFFFFF',
                  color: activeNewspaper === 'express' ? '#FFFFFF' : '#101828',
                  fontSize: 'clamp(12px, 1.05vw, 14px)',
                  fontWeight: 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/indian.png" alt="Indian Express" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                Indian Express
              </button>
            </div>

            {/* View mode toggles */}
            <div className="flex items-center" style={{ gap: '0' }}>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2 font-arimo font-medium"
                style={{
                  height: 'clamp(30px, 2.69vw, 36px)',
                  padding: '0 clamp(10px, 1.1vw, 14px)',
                  borderRadius: '10px',
                  background: viewMode === 'list' ? '#162456' : '#F3F4F6',
                  color: viewMode === 'list' ? '#FFFFFF' : '#4A5565',
                  fontSize: 'clamp(12px, 1.05vw, 14px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/list.png" alt="List" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                List View
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-2 font-arimo font-medium"
                style={{
                  height: 'clamp(30px, 2.69vw, 36px)',
                  padding: '0 clamp(10px, 1.1vw, 14px)',
                  borderRadius: '10px',
                  background: viewMode === 'grid' ? '#162456' : '#F3F4F6',
                  color: viewMode === 'grid' ? '#FFFFFF' : '#4A5565',
                  fontSize: 'clamp(12px, 1.05vw, 14px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Grid View
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderBottom: '1px solid #D1D5DC', marginBottom: 'clamp(14px, 1.5vw, 20px)' }} />

          {/* Last updated + article count */}
          {!loading && editorials.length > 0 && (
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <span className="font-arimo" style={{ fontSize: '13px', color: '#6A7282' }}>
                🕐 Updated {lastFetched ? lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'just now'} &nbsp;·&nbsp; {editorials.length} articles (last 24 hrs)
              </span>
              <span className="font-arimo" style={{ fontSize: '13px', color: '#6A7282' }}>
                Page {currentPage} of {Math.ceil(editorials.length / PAGE_SIZE)}
              </span>
            </div>
          )}

          {/* News cards */}
          <div className="flex flex-col" style={{ gap: 'clamp(14px, 1.5vw, 20px)' }}>
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div></div>
            ) : (() => {
              const filtered = selectedSubject
                ? editorials.filter((e) => {
                    const cat = (e.category || '').toLowerCase();
                    const tags = (e.tags || []).map((t) => t.toLowerCase());
                    const needle = selectedSubject.toLowerCase();
                    return cat.includes(needle) || tags.some((t) => t.includes(needle));
                  })
                : editorials;
              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    {selectedSubject ? 'No articles for this subject on this date.' : 'No articles in the last 24 hours. Check back later.'}
                  </div>
                );
              }
              return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((card) => {
              const tagList = card.tags?.length > 0 ? card.tags : [card.category];
              return (
              <div
                key={card.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  padding: 'clamp(18px, 2vw, 28px)',
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
                  opacity: card.isRead ? 0.7 : 1,
                }}
              >
                {/* Tags row + source */}
                <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(8px, 0.9vw, 12px)' }}>
                  <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
                    {tagList.map((tag) => {
                      const colors = categoryColors[tag] || { color: '#1E40AF', bg: '#DBEAFE' };
                      return (
                      <span
                        key={tag}
                        className="font-arimo font-medium"
                        style={{
                          fontSize: 'clamp(11px, 0.9vw, 13px)',
                          lineHeight: '1',
                          padding: 'clamp(4px, 0.45vw, 6px) clamp(8px, 0.9vw, 12px)',
                          borderRadius: '6px',
                          background: colors.bg,
                          color: colors.color,
                        }}
                      >
                        {tag}
                      </span>
                      );
                    })}
                  </div>
                  <div
                    className="flex items-center gap-1 font-arimo shrink-0"
                    style={{ color: '#6A7282', fontSize: 'clamp(12px, 0.97vw, 13px)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#6A7282" strokeWidth="1.5"/>
                      <path d="M12 6V12L16 14" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {card.source}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="font-arimo font-bold"
                  style={{
                    fontSize: 'clamp(16px, 1.5vw, 20px)',
                    lineHeight: 'clamp(22px, 2.06vw, 27.5px)',
                    color: '#101828',
                    marginBottom: 'clamp(6px, 0.75vw, 10px)',
                  }}
                >
                  {card.title}
                </h3>

                {/* Description */}
                <p
                  className="font-arimo"
                  style={{
                    fontSize: 'clamp(12px, 1.05vw, 14px)',
                    lineHeight: 'clamp(18px, 1.7vw, 22.75px)',
                    color: '#4A5565',
                    marginBottom: 'clamp(10px, 1.2vw, 16px)',
                  }}
                >
                  {card.summary || 'Click to read the full editorial analysis.'}
                </p>

                {/* Divider */}
                <div style={{ borderBottom: '1px solid #D1D5DC', marginBottom: 'clamp(10px, 1.2vw, 16px)' }} />

                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: 'clamp(6px, 0.75vw, 10px)' }}>
                    <button
                      onClick={() => handleSave(card.id)}
                      className="flex items-center gap-2 font-arimo"
                      style={{
                        padding: 'clamp(6px, 0.75vw, 10px) clamp(12px, 1.2vw, 16px)',
                        borderRadius: '26843500px',
                        border: '0.8px solid #DBEAFE',
                        background: card.isSaved ? '#DBEAFE' : '#EFF6FF',
                        color: '#1C398E',
                        fontSize: 'clamp(12px, 1.05vw, 14px)',
                        cursor: 'pointer',
                      }}
                    >
                      <img src="/paper.png" alt="Save" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                      {card.isSaved ? 'Saved' : 'Save'}
                    </button>

                    <button
                      onClick={() => handleMarkRead(card.id)}
                      className="flex items-center gap-2 font-arimo"
                      style={{
                        padding: 'clamp(6px, 0.75vw, 10px) clamp(12px, 1.2vw, 16px)',
                        borderRadius: '26843500px',
                        border: '0.8px solid #DBEAFE',
                        background: card.isRead ? '#F0FDF4' : '#EFF6FF',
                        color: card.isRead ? '#16A34A' : '#1C398E',
                        fontSize: 'clamp(12px, 1.05vw, 14px)',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        {card.isRead ? (
                          <path d="M20 6L9 17L4 12" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        ) : (
                          <circle cx="12" cy="12" r="10" stroke="#1C398E" strokeWidth="1.5"/>
                        )}
                      </svg>
                      {card.isRead ? 'Read' : 'Mark read'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleSummarize(card)}
                    disabled={summarizing === card.id}
                    className="flex items-center gap-2 font-arimo font-bold"
                    style={{
                      padding: 'clamp(8px, 0.75vw, 10px) clamp(14px, 1.5vw, 20px)',
                      borderRadius: '26843500px',
                      background: '#162456',
                      color: '#FFD272',
                      fontSize: 'clamp(12px, 1.05vw, 14px)',
                      cursor: 'pointer',
                      opacity: summarizing === card.id ? 0.6 : 1,
                    }}
                  >
                    <img src="/summaruze.png" alt="Summarize" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                    {summarizing === card.id ? 'Summarizing...' : 'Summarize with Jeet AI'}
                  </button>
                </div>
              </div>
              );
            });
            })()}
          </div>

          {/* Pagination controls */}
          {!loading && editorials.length > PAGE_SIZE && (
            <div className="flex items-center justify-center" style={{ gap: '8px', marginTop: '8px', paddingBottom: '8px' }}>
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                className="font-arimo font-medium"
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
                  background: currentPage === 1 ? '#F9FAFB' : '#FFFFFF',
                  color: currentPage === 1 ? '#9CA3AF' : '#101828',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >← Prev</button>

              {Array.from({ length: Math.ceil(editorials.length / PAGE_SIZE) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="font-arimo font-medium"
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    border: page === currentPage ? 'none' : '1px solid #E5E7EB',
                    background: page === currentPage ? '#101828' : '#FFFFFF',
                    color: page === currentPage ? '#FFFFFF' : '#101828',
                    cursor: 'pointer', fontSize: '13px',
                  }}
                >{page}</button>
              ))}

              <button
                onClick={() => { setCurrentPage(p => Math.min(Math.ceil(editorials.length / PAGE_SIZE), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === Math.ceil(editorials.length / PAGE_SIZE)}
                className="font-arimo font-medium"
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
                  background: currentPage === Math.ceil(editorials.length / PAGE_SIZE) ? '#F9FAFB' : '#FFFFFF',
                  color: currentPage === Math.ceil(editorials.length / PAGE_SIZE) ? '#9CA3AF' : '#101828',
                  cursor: currentPage === Math.ceil(editorials.length / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >Next →</button>
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/*  RIGHT COLUMN — Sidebar Widgets                             */}
        {/* ========================================================== */}
        <div className="flex flex-col" style={{ gap: 'clamp(14px, 1.5vw, 20px)' }}>
          {/* -------------------------------------------------------- */}
          {/*  Calendar Widget                                          */}
          {/* -------------------------------------------------------- */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '0.8px solid #E5E7EB',
              padding: 'clamp(14px, 1.5vw, 20px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
            }}
          >
            {/* Calendar header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(10px, 1vw, 14px)' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>&#x1F4C5;</span>
                <span className="font-arimo font-bold" style={{ fontSize: 'clamp(13px, 1.12vw, 15px)', color: '#101828' }}>
                  {monthNames[calMonth]} {calYear === 2024 ? '2024' : calYear.toString()}
                </span>
              </div>
              <span
                className="font-arimo font-medium"
                style={{
                  fontSize: 'clamp(11px, 0.9vw, 12px)',
                  background: '#FFF7ED',
                  color: '#101828',
                  padding: '3px 10px',
                  borderRadius: '26843500px',
                }}
              >
                {today} {monthNames[calMonth]}
              </span>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(8px, 0.75vw, 10px)' }}>
              <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 cursor-pointer" style={{ fontSize: '18px' }}>&lt;</button>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#101828' }}>
                {monthNames[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 cursor-pointer" style={{ fontSize: '18px' }}>&gt;</button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 text-center" style={{ marginBottom: 'clamp(4px, 0.5vw, 6px)' }}>
              {dayLabels.map((d) => (
                <span key={d} className="font-arimo font-medium" style={{ fontSize: 'clamp(10px, 0.82vw, 11px)', color: '#6A7282', padding: '4px 0' }}>
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 text-center">
              {calDays.map((day, idx) => {
                if (!day) {
                  return <div key={idx} />;
                }
                const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isFuture = new Date(iso) > new Date();
                const isSelected = iso === selectedDate;
                const isToday = day === today;
                return (
                  <button
                    key={idx}
                    disabled={isFuture}
                    onClick={() => !isFuture && setSelectedDate(iso)}
                    className="flex items-center justify-center font-arimo"
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      maxHeight: '36px',
                      fontSize: 'clamp(11px, 0.9vw, 13px)',
                      borderRadius: '50%',
                      background: isSelected ? '#101828' : isToday ? '#FEF3C7' : 'transparent',
                      color: isSelected ? '#FFFFFF' : isFuture ? '#D1D5DB' : '#364153',
                      fontWeight: isSelected || isToday ? 700 : 400,
                      cursor: isFuture ? 'not-allowed' : 'pointer',
                      border: 'none',
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  Filter by Subject                                        */}
          {/* -------------------------------------------------------- */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '0.8px solid #E5E7EB',
              padding: 'clamp(16px, 1.86vw, 24.8px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
              <span style={{ fontSize: '16px' }}>&#x1F50D;</span>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#101828', letterSpacing: '0.5px' }}>
                FILTER BY SUBJECT
              </span>
            </div>
            <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 0.9vw, 12px)' }}>
              <button
                onClick={() => setSelectedSubject(null)}
                className="flex items-center gap-2 font-arimo font-medium col-span-2"
                style={{
                  padding: 'clamp(8px, 0.9vw, 12px) clamp(10px, 1.1vw, 14px)',
                  borderRadius: '12px',
                  background: selectedSubject === null ? '#101828' : '#F3F4F6',
                  color: selectedSubject === null ? '#FFFFFF' : '#101828',
                  border: '1px solid #E5E7EB',
                  fontSize: 'clamp(12px, 1.05vw, 14px)',
                  cursor: 'pointer',
                }}
              >
                All subjects
              </button>
              {subjects.map((s) => {
                const active = selectedSubject === s.id;
                return (
                  <button
                    key={s.label}
                    onClick={() => setSelectedSubject(active ? null : s.id)}
                    className="flex items-center gap-2 font-arimo font-medium"
                    style={{
                      padding: 'clamp(8px, 0.9vw, 12px) clamp(10px, 1.1vw, 14px)',
                      borderRadius: '12px',
                      background: active ? '#17223E' : s.bg,
                      border: `1px solid ${active ? '#17223E' : s.border}`,
                      color: active ? '#FFFFFF' : '#101828',
                      fontSize: 'clamp(12px, 1.05vw, 14px)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {s.icon
                      ? <img src={s.icon} alt={s.label} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      : <span>{s.emoji}</span>
                    }
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  Today at a Glance                                        */}
          {/* -------------------------------------------------------- */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '0.8px solid #E5E7EB',
              padding: 'clamp(16px, 1.86vw, 24px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(12px, 1.5vw, 20px)' }}>
              <span style={{ fontSize: '16px' }}>&#x1F4CA;</span>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#101828' }}>
                Today at a Glance
              </span>
            </div>

            {/* 2x2 stats grid */}
            <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 0.9vw, 12px)', marginBottom: 'clamp(12px, 1.5vw, 20px)' }}>
              {[
                { num: '8', label: 'The Hindu' },
                { num: '6', label: 'Indian Express' },
                { num: '4', label: 'Read so far' },
                { num: '2', label: 'AI Summaries' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: '#EFF6FF',
                    borderRadius: '12px',
                    padding: 'clamp(10px, 1.2vw, 16px)',
                  }}
                >
                  <div className="font-arimo font-bold" style={{ fontSize: 'clamp(22px, 2.25vw, 30px)', color: '#101828' }}>
                    {item.num}
                  </div>
                  <div className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#4A5565' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Reading progress circle */}
            <div
              className="flex flex-col items-center"
              style={{
                background: '#EFF6FF',
                borderRadius: '12px',
                padding: 'clamp(14px, 1.5vw, 20px)',
              }}
            >
              {/* SVG circular progress */}
              <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '8px' }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#E5E7EB" strokeWidth="4"/>
                  <circle
                    cx="30" cy="30" r="26"
                    fill="none" stroke="#16A34A" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26 * 0.29} ${2 * Math.PI * 26 * 0.71}`}
                    transform="rotate(-90 30 30)"
                  />
                </svg>
                <div
                  className="absolute inset-0 flex items-center justify-center font-arimo font-bold"
                  style={{ fontSize: '11px', color: '#101828' }}
                >
                  29%
                </div>
              </div>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(13px, 1.12vw, 15px)', color: '#101828' }}>
                Reading complete
              </span>
              <span className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#4A5565' }}>
                4 / 14 articles
              </span>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  14-Day Streak                                            */}
          {/* -------------------------------------------------------- */}
          <div
            style={{
              background: '#0E182D',
              borderRadius: '16px',
              border: '1.6px solid #193CB8',
              padding: 'clamp(16px, 1.86vw, 24px)',
              boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(6px, 0.6vw, 8px)' }}>
              <span style={{ fontSize: '20px' }}>&#x1F525;</span>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(16px, 1.5vw, 20px)', color: '#FFD273' }}>
                {streakData.streak}-Day Streak
              </span>
            </div>

            <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#9CA3AF', marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
              Keep it up! Read {streakData.readToday} today
            </p>

            {/* Check boxes row */}
            <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)', marginBottom: 'clamp(10px, 1vw, 14px)' }}>
              {streakData.weekChecks.map((checked, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center"
                  style={{
                    width: 'clamp(32px, 3vw, 40px)',
                    height: 'clamp(32px, 3vw, 40px)',
                    borderRadius: '10px',
                    background: checked ? '#F3BB4B' : 'rgba(255,255,255,0.08)',
                    border: checked ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {checked && (
                    <img src="/blue tick.png" alt="tick" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  )}
                </div>
              ))}
            </div>

            <p className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#6B7280' }}>
              {streakData.readToday} of {streakData.targetToday} articles read today
            </p>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  Your Learning Streak                                     */}
          {/* -------------------------------------------------------- */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: 'clamp(16px, 1.8vw, 24px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
              <span style={{ fontSize: '16px', color: '#DC2626' }}>&#x1F4C8;</span>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#101828' }}>
                Your Learning Streak
              </span>
            </div>

            {/* Streak banner */}
            <div
              className="flex items-center justify-between"
              style={{
                background: 'linear-gradient(90deg, #FF6900 0%, #FB2C36 100%)',
                borderRadius: '12px',
                padding: 'clamp(12px, 1.2vw, 16px) clamp(14px, 1.5vw, 20px)',
                marginBottom: 'clamp(14px, 1.5vw, 20px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '20px' }}>&#x1F525;</span>
                <span className="font-arimo font-bold" style={{ fontSize: 'clamp(20px, 1.95vw, 26px)', color: '#FFFFFF' }}>
                  12 days
                </span>
                <span className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: 'rgba(255,255,255,0.8)' }}>
                  &middot; current streak
                </span>
              </div>
              <span style={{ fontSize: '20px' }}>&#x1F525;</span>
            </div>

            {/* Stats list */}
            <div className="flex flex-col" style={{ gap: 'clamp(10px, 1.1vw, 14px)', marginBottom: 'clamp(14px, 1.5vw, 20px)' }}>
              {learningStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={stat.icon} alt={stat.label} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#4A5565' }}>
                      {stat.label}
                    </span>
                  </div>
                  <span className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#101828' }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: 'clamp(10px, 1.1vw, 14px)' }} />

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '14px' }}>&#x1F4C5;</span>
                <span className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#4A5565' }}>
                  Next: 16 Oct
                </span>
              </div>
              <span className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#DC2626' }}>
                +3 articles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  JEET AI SUMMARY MODAL                                        */}
      {/* ============================================================ */}
      {summaryModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSummaryModal(prev => ({ ...prev, open: false })); }}
        >
          <div
            style={{
              background: '#151C2C',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSummaryModal(prev => ({ ...prev, open: false }))}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none', color: '#fff', fontSize: '18px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>

            {/* Header */}
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#1E2A40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🧠</div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                <span style={{ color: '#FFD273' }}>Jeet AI</span> Summary
              </span>
            </div>

            {/* Source badge */}
            {summaryModal.editorial && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: summaryModal.editorial.source.includes('Hindu') ? '#DC2626' : '#1E3A5F',
                  color: '#fff', borderRadius: '8px',
                  padding: '5px 12px', fontSize: '13px', fontWeight: 600,
                }}>
                  🗞️ {summaryModal.editorial.source}
                </span>
              </div>
            )}

            {/* Title */}
            {summaryModal.editorial && (
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, lineHeight: '1.4', marginBottom: '12px' }}>
                {summaryModal.editorial.title}
              </h2>
            )}

            {/* Tags */}
            {summaryModal.editorial && (
              <div className="flex flex-wrap" style={{ gap: '8px', marginBottom: '20px' }}>
                {(summaryModal.editorial.tags?.length > 0 ? summaryModal.editorial.tags : [summaryModal.editorial.category]).map(t => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            )}

            {/* Loading state */}
            {summaryModal.loading && (
              <div>
                <div className="flex flex-col items-center" style={{ padding: '20px 0 28px', gap: '8px' }}>
                  <span style={{ fontSize: '40px' }}>🧠</span>
                  <span style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>Analyzing editorial...</span>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>UPSC lens activated</span>
                </div>
                <div className="flex flex-col" style={{ gap: '12px' }}>
                  {[
                    { icon: '📄', label: 'Reading full article', color: '#3B82F6' },
                    { icon: '🔍', label: 'Extracting key arguments', color: '#06B6D4' },
                    { icon: '🎯', label: 'Mapping to UPSC syllabus', color: '#EC4899' },
                    { icon: '✏️', label: 'Generating practice questions', color: '#F97316' },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 16px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: step.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                          {step.icon}
                        </div>
                        <span style={{ color: i <= summaryModal.loadStep ? '#fff' : '#475569', fontSize: '14px', fontWeight: 500 }}>{step.label}</span>
                      </div>
                      {i < summaryModal.loadStep && <span style={{ color: '#22C55E', fontSize: '18px' }}>✓</span>}
                      {i === summaryModal.loadStep && (
                        <div style={{ width: '18px', height: '18px', border: '2px solid #64748B', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary result */}
            {!summaryModal.loading && summaryModal.summary && (
              <div className="flex flex-col" style={{ gap: '16px' }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '14px',
                    padding: '20px',
                    color: '#CBD5E1',
                    fontSize: '14px',
                    lineHeight: '1.8',
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 style={{ color: '#FFD273', fontSize: '17px', fontWeight: 700, marginBottom: '4px', marginTop: '0' }}>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{ color: '#F97316', fontSize: '15px', fontWeight: 700, marginTop: '18px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{ color: '#60A5FA', fontSize: '14px', fontWeight: 600, marginTop: '14px', marginBottom: '6px' }}>{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p style={{ color: '#CBD5E1', marginBottom: '10px', marginTop: '0' }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: '#fff', fontWeight: 700 }}>{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ paddingLeft: '18px', marginBottom: '10px', marginTop: '4px' }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ paddingLeft: '18px', marginBottom: '10px', marginTop: '4px' }}>{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ color: '#CBD5E1', marginBottom: '6px' }}>{children}</li>
                      ),
                      hr: () => (
                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '14px 0' }} />
                      ),
                      blockquote: ({ children }) => (
                        <blockquote style={{ borderLeft: '3px solid #3B82F6', paddingLeft: '12px', margin: '10px 0', background: 'rgba(59,130,246,0.08)', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>{children}</blockquote>
                      ),
                      code: ({ children }) => (
                        <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px 6px', fontSize: '13px', color: '#FACC15' }}>{children}</code>
                      ),
                      table: ({ children }) => (
                        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>{children}</thead>
                      ),
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th style={{ padding: '8px 14px', textAlign: 'left', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</th>
                      ),
                      td: ({ children }) => (
                        <td style={{ padding: '8px 14px', color: '#CBD5E1', verticalAlign: 'top' }}>{children}</td>
                      ),
                    }}
                  >
                    {summaryModal.summary}
                  </ReactMarkdown>
                </div>

                {/* Action buttons */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '8px' }}>
                  {[
                    {
                      emoji: summaryModal.editorial?.isSaved ? '✅' : '📌',
                      label: summaryModal.editorial?.isSaved ? 'Saved · View in Profile' : 'Save Note',
                      action: async () => {
                        if (!summaryModal.editorial) return;
                        if (summaryModal.editorial.isSaved) {
                          // Already saved — jump to bookmarks
                          router.push('/dashboard/profile?tab=bookmarks');
                          return;
                        }
                        await handleSave(summaryModal.editorial.id);
                        setSummaryModal(prev => prev.editorial ? { ...prev, editorial: { ...prev.editorial!, isSaved: !prev.editorial!.isSaved } } : prev);
                      },
                    },
                    {
                      emoji: '✏️',
                      label: 'Practice MCQ (Pro)',
                      premium: true,
                      action: () => {
                        if (!summaryModal.editorial) return;
                        setSummaryModal(prev => ({ ...prev, open: false }));
                        router.push(`/dashboard/mock-tests?from=editorial&editorialId=${summaryModal.editorial.id}&mode=prelims`);
                      },
                    },
                    {
                      emoji: '📝',
                      label: 'Practice Potential Exam Qs (Pro)',
                      premium: true,
                      action: () => {
                        if (!summaryModal.editorial) return;
                        setSummaryModal(prev => ({ ...prev, open: false }));
                        router.push(`/dashboard/mock-tests?from=editorial&editorialId=${summaryModal.editorial.id}&mode=mains&intent=potential-questions`);
                      },
                    },
                    {
                      emoji: '🔗',
                      label: 'Source',
                      action: () => summaryModal.editorial?.sourceUrl && window.open(summaryModal.editorial.sourceUrl, '_blank'),
                    },
                  ].map((btn: any) => (
                    <button
                      key={btn.label}
                      onClick={btn.action}
                      style={{
                        background: btn.premium ? 'linear-gradient(90deg, rgba(253,199,0,0.12), rgba(255,255,255,0.06))' : 'rgba(255,255,255,0.06)',
                        border: btn.premium ? '1px solid rgba(253,199,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px 8px',
                        color: '#CBD5E1',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        position: 'relative',
                      }}
                    >
                      {btn.premium && (
                        <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '10px', color: '#FDC700' }}>★</span>
                      )}
                      <span style={{ fontSize: '22px' }}>{btn.emoji}</span>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
