'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { videoService } from '@/lib/services';

/* ------------------------------------------------------------------ */
/*  YouTube embed helper                                               */
/* ------------------------------------------------------------------ */
function getYouTubeEmbedUrl(url: string): string {
  let videoId = '';
  try {
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
      const u = new URL(url);
      videoId = u.searchParams.get('v') || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1].split('?')[0];
    }
  } catch {}
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : url;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const SUBJECT_EMOJIS: Record<string, string> = {
  'polity': '⚖️', 'history': '📜', 'geography': '🌍', 'economy': '📊',
  'environment': '🌿', 'science': '🔬', 'ethics': '💎', 'current': '📰',
  'ir': '🌐', 'essay': '✍️', 'security': '🛡️',
};

function subjectEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '📚';
}

/* Subject card background colors — one per subject, cycling */
const SUBJECT_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  'Indian Polity': { bg: '#FFF5E6', border: '#FDE8C8', accent: '#F59E0B' },
  'Polity': { bg: '#FFF5E6', border: '#FDE8C8', accent: '#F59E0B' },
  'Indian Economy': { bg: '#EDE9FE', border: '#DDD6FE', accent: '#8B5CF6' },
  'Economy': { bg: '#EDE9FE', border: '#DDD6FE', accent: '#8B5CF6' },
  'Geography': { bg: '#FEF3C7', border: '#FDE68A', accent: '#D97706' },
  'History': { bg: '#FFF7ED', border: '#FFEDD5', accent: '#EA580C' },
  'Environment': { bg: '#ECFDF5', border: '#D1FAE5', accent: '#059669' },
  'Ethics': { bg: '#EFF6FF', border: '#DBEAFE', accent: '#2563EB' },
  'Ethics GS4': { bg: '#EFF6FF', border: '#DBEAFE', accent: '#2563EB' },
  'Essay Writing': { bg: '#FFF7ED', border: '#FFEDD5', accent: '#EA580C' },
  'Essay': { bg: '#FFF7ED', border: '#FFEDD5', accent: '#EA580C' },
  'Internal Security': { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
  'Security': { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
  "Int'l Relations": { bg: '#EDE9FE', border: '#DDD6FE', accent: '#7C3AED' },
  'IR': { bg: '#EDE9FE', border: '#DDD6FE', accent: '#7C3AED' },
  'Science & Tech': { bg: '#DBEAFE', border: '#BFDBFE', accent: '#3B82F6' },
  'Science': { bg: '#DBEAFE', border: '#BFDBFE', accent: '#3B82F6' },
  'Current Affairs': { bg: '#FEF3C7', border: '#FDE68A', accent: '#D97706' },
};

function getSubjectColor(name: string) {
  return SUBJECT_COLORS[name] || { bg: '#F3F4F6', border: '#E5E7EB', accent: '#6B7280' };
}

function formatViews(count: number): string {
  if (count >= 100000) return `${(count / 100000).toFixed(1)}L`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function VideoLecturesPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [apiSubjects, setApiSubjects] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<{ totalLectures: number; totalSubjects: number; totalHours: number } | null>(null);
  const [apiVideos, setApiVideos] = useState<any[]>([]);
  const [featuredSubjectName, setFeaturedSubjectName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjectVideos, setSubjectVideos] = useState<any[]>([]);
  const [subjectVideosLoading, setSubjectVideosLoading] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState('');
  const [mentorSubmitting, setMentorSubmitting] = useState(false);
  const [mentorSuccess, setMentorSuccess] = useState(false);

  // Watch + Quiz modal state
  const [watchVideo, setWatchVideo] = useState<any>(null);
  const [videoQuestions, setVideoQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    videoService.getSubjects()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setApiSubjects(res.data);
          if (res.data.length > 0) {
            const first = res.data[0];
            setFeaturedSubjectName(first.name);
            videoService.getVideosBySubject(first.name)
              .then(vRes => { if (vRes.data?.videos) setApiVideos(vRes.data.videos); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
    videoService.getStats()
      .then(res => { if (res.data) setApiStats(res.data); })
      .catch(() => {});
  }, []);

  const handleSubjectClick = (subjectName: string) => {
    if (selectedSubject === subjectName) {
      setSelectedSubject(null);
      setSubjectVideos([]);
      return;
    }
    setSelectedSubject(subjectName);
    setSubjectVideosLoading(true);
    setSubjectVideos([]);
    videoService.getVideosBySubject(subjectName)
      .then(vRes => { if (vRes.data?.videos) setSubjectVideos(vRes.data.videos); })
      .catch(() => {})
      .finally(() => setSubjectVideosLoading(false));
  };

  const handleWatchVideo = (video: any) => {
    setWatchVideo(video);
    setVideoQuestions([]);
    setQuizAnswers({});
    setQuizResults(null);
    videoService.getVideoQuestions(video.id)
      .then(res => setVideoQuestions(res.data || []))
      .catch(() => {});
  };

  const handleQuizSubmit = async () => {
    if (!watchVideo) return;
    setQuizLoading(true);
    try {
      const res = await videoService.submitVideoQuiz(watchVideo.id, quizAnswers);
      setQuizResults(res.data);
    } catch {}
    setQuizLoading(false);
  };

  const handleAskMentor = async () => {
    if (!mentorQuestion.trim() || mentorSubmitting) return;
    setMentorSubmitting(true);
    try {
      await videoService.askMentor(mentorQuestion);
      setMentorSuccess(true);
      setMentorQuestion('');
      setTimeout(() => setMentorSuccess(false), 3000);
    } catch {}
    setMentorSubmitting(false);
  };

  return (
    <div className="font-arimo w-full min-h-screen" style={{ background: '#F9FAFB' }}>

      {/* ============================================================ */}
      {/*  HERO SECTION — Dark background like Figma                    */}
      {/* ============================================================ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d1e38 40%, #112347 70%, #0d1d3a 100%)',
          padding: 'clamp(24px, 3vw, 40px) clamp(20px, 4vw, 60px) clamp(40px, 5vw, 64px)',
        }}
      >
        {/* Background grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top bar: Back to Dashboard + Badge + @RiseWithJeet */}
        <div className="relative z-10 flex items-center justify-between" style={{ marginBottom: 'clamp(28px, 3.5vw, 48px)' }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-arimo font-medium text-white/60 hover:text-white transition-colors"
            style={{ fontSize: 'clamp(12px, 1vw, 14px)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </Link>

          <div
            className="flex items-center gap-2 font-arimo font-semibold text-[#e8a820]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '26843500px',
              padding: 'clamp(6px, 0.6vw, 8px) clamp(14px, 1.5vw, 20px)',
              fontSize: 'clamp(11px, 0.9vw, 13px)',
              letterSpacing: '0.5px',
            }}
          >
            <img src="/cap.png" alt="cap" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
            SIMPLIFIED VIDEO LECTURES
          </div>

          <a
            href="https://www.youtube.com/@RiseWithJeet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-arimo font-semibold text-white"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '26843500px',
              padding: 'clamp(8px, 0.75vw, 10px) clamp(16px, 1.5vw, 20px)',
              fontSize: 'clamp(12px, 1.05vw, 14px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" fill="#FF0000"/>
              <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" fill="white"/>
            </svg>
            @RiseWithJeet
          </a>
        </div>

        {/* Centered hero content */}
        <div className="relative z-10 flex flex-col items-center" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h1
            className="font-arimo font-bold text-center"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 48px)',
              lineHeight: 'clamp(34px, 4.2vw, 56px)',
              color: '#FFFFFF',
              marginBottom: 'clamp(10px, 1vw, 16px)',
              fontFamily: "'Playfair Display', 'Times New Roman', serif",
            }}
          >
            Master Your{' '}
            <em className="not-italic" style={{ color: '#e8a820', fontStyle: 'italic' }}>UPSC Journey</em>
            <br />
            with Expert Video Lectures
          </h1>

          <p
            className="font-arimo text-center"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              lineHeight: 'clamp(20px, 1.8vw, 24px)',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '520px',
              marginBottom: 'clamp(20px, 2.5vw, 32px)',
            }}
          >
            Every editorial, every perspective mapped to what UPSC asks.
          </p>

          {/* Stats strip — dark boxes like Figma */}
          <div className="flex gap-0 rounded-[12px] overflow-hidden" style={{ border: '0.8px solid rgba(255,255,255,0.1)' }}>
            <div className="flex-1 p-[10px_16px] text-center" style={{ background: 'rgba(255,255,255,0.05)', borderRight: '0.8px solid rgba(255,255,255,0.08)' }}>
              <div className="font-arimo font-bold leading-none" style={{ fontSize: 'clamp(20px, 2vw, 28px)', color: '#FDC700' }}>
                {apiStats?.totalLectures ?? '100'}+
              </div>
              <div className="font-arimo text-[9px] font-bold tracking-[0.8px] uppercase mt-[3px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Video Lectures</div>
            </div>
            <div className="flex-1 p-[10px_16px] text-center" style={{ background: 'rgba(255,255,255,0.05)', borderRight: '0.8px solid rgba(255,255,255,0.08)' }}>
              <div className="font-arimo font-bold leading-none" style={{ fontSize: 'clamp(20px, 2vw, 28px)', color: '#F87171' }}>
                {apiStats?.totalSubjects ?? '12'}+
              </div>
              <div className="font-arimo text-[9px] font-bold tracking-[0.8px] uppercase mt-[3px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Core Subjects</div>
            </div>
            <div className="flex-1 p-[10px_16px] text-center" style={{ background: 'rgba(255,255,255,0.05)', borderRight: '0.8px solid rgba(255,255,255,0.08)' }}>
              <div className="font-arimo font-bold leading-none" style={{ fontSize: 'clamp(20px, 2vw, 28px)', color: '#4ADE80' }}>
                {apiStats?.totalHours ?? '15'}K+
              </div>
              <div className="font-arimo text-[9px] font-bold tracking-[0.8px] uppercase mt-[3px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Subscribers</div>
            </div>
            <div className="flex-1 p-[10px_16px] text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="font-arimo font-bold leading-none" style={{ fontSize: 'clamp(20px, 2vw, 28px)', color: '#FFFFFF' }}>
                ∞
              </div>
              <div className="font-arimo text-[9px] font-bold tracking-[0.8px] uppercase mt-[3px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Always Free</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BROWSE BY SUBJECT — White background, shifted up             */}
      {/* ============================================================ */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: 'clamp(960px, 80vw, 1200px)',
          padding: 'clamp(32px, 4vw, 56px) clamp(16px, 2vw, 30px)',
        }}
      >
        {/* Super heading + Heading on same line */}
        <div className="text-center" style={{ marginBottom: 'clamp(28px, 3vw, 40px)' }}>
          <div
            className="font-arimo font-bold"
            style={{
              color: '#FDC700',
              fontSize: 'clamp(11px, 0.95vw, 13px)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: 'clamp(4px, 0.5vw, 8px)',
            }}
          >
            BROWSE BY SUBJECT
          </div>
          <h2
            className="font-arimo font-bold"
            style={{
              fontSize: 'clamp(22px, 2.5vw, 34px)',
              color: '#17223E',
              lineHeight: 1.3,
            }}
          >
            Pick Your Subject,{' '}
            <em style={{ color: '#C68A0B', fontStyle: 'italic' }}>Start Learning.</em>
          </h2>
        </div>

        {/* Subject grid — colored cards */}
        {apiSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: 'clamp(32px, 4vw, 56px) 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p className="font-arimo font-medium" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)' }}>
              Loading subjects...
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
              gap: 'clamp(14px, 1.5vw, 20px)',
              marginBottom: selectedSubject ? 'clamp(24px, 2.5vw, 36px)' : '0',
            }}
          >
            {apiSubjects.map((subject) => {
              const colors = getSubjectColor(subject.name);
              const isSelected = selectedSubject === subject.name;
              return (
                <div
                  key={subject.name}
                  onClick={() => handleSubjectClick(subject.name)}
                  style={{
                    background: colors.bg,
                    borderRadius: '16px',
                    padding: 'clamp(18px, 2vw, 24px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? `2px solid ${colors.accent}` : `1.5px solid ${colors.border}`,
                    boxShadow: isSelected ? `0 4px 16px ${colors.accent}22` : '0px 1px 3px 0px rgba(0,0,0,0.06)',
                    position: 'relative',
                  }}
                >
                  {/* NEW badge if needed */}
                  {subject.isNew && (
                    <div
                      className="font-arimo font-bold"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#FDC700',
                        color: '#17223E',
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      NEW
                    </div>
                  )}

                  <div style={{ fontSize: 'clamp(24px, 2.5vw, 32px)', marginBottom: 'clamp(8px, 0.8vw, 12px)' }}>
                    {subjectEmoji(subject.name)}
                  </div>
                  <div
                    className="font-arimo font-bold"
                    style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#17223E', marginBottom: 'clamp(2px, 0.3vw, 4px)' }}
                  >
                    {subject.name}
                  </div>
                  <div className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#6A7282', marginBottom: 'clamp(8px, 0.8vw, 12px)' }}>
                    {subject.videoCount ?? 0} videos{subject.totalDuration ? ` · ${subject.totalDuration}` : ''}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: `${colors.accent}22` }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((subject.viewCount || 0) / 50, 100)}%`,
                        background: colors.accent,
                      }}
                    />
                  </div>
                  <div className="font-arimo" style={{ fontSize: 'clamp(10px, 0.8vw, 11px)', color: '#9CA3AF', marginTop: '4px' }}>
                    {subject.viewCount ? formatViews(subject.viewCount) : '0'} views
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline videos for selected subject */}
        {selectedSubject && (
          <div style={{ marginTop: 'clamp(24px, 2.5vw, 36px)' }}>
            {/* Subject header */}
            <div style={{ marginBottom: 'clamp(20px, 2vw, 28px)' }}>
              <div className="flex items-center" style={{ marginBottom: 'clamp(4px, 0.4vw, 6px)' }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FF6900 0%, #FB2C36 100%)',
                    borderRadius: '12px',
                    width: 'clamp(40px, 3.5vw, 48px)',
                    height: 'clamp(40px, 3.5vw, 48px)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 'clamp(22px, 2vw, 26px)' }}>{subjectEmoji(selectedSubject)}</span>
                </div>
                <div>
                  <h2
                    className="font-arimo font-bold"
                    style={{ fontSize: 'clamp(20px, 1.88vw, 26px)', color: '#101828', lineHeight: 1.2 }}
                  >
                    {selectedSubject} Simplified
                  </h2>
                  <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#4A5565' }}>
                    📺 {subjectVideos.length} Video{subjectVideos.length !== 1 ? 's' : ''}
                    {(() => {
                      const matched = apiSubjects.find(s => s.name === selectedSubject);
                      return matched?.totalDuration ? ` · ${matched.totalDuration}` : '';
                    })()}
                  </p>
                </div>
              </div>
              {(() => {
                const matched = apiSubjects.find(s => s.name === selectedSubject);
                return matched?.description ? (
                  <p className="font-arimo" style={{ fontSize: 'clamp(13px, 1.12vw, 15px)', color: '#4A5565', marginTop: 'clamp(8px, 0.8vw, 12px)', lineHeight: 1.5 }}>
                    {matched.description}
                  </p>
                ) : null;
              })()}
            </div>

            {subjectVideosLoading ? (
              <div className="flex flex-col items-center justify-center" style={{ padding: 'clamp(32px, 4vw, 56px) 0', color: '#9CA3AF' }}>
                <p className="font-arimo font-medium" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)' }}>
                  Loading videos...
                </p>
              </div>
            ) : subjectVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center" style={{ padding: 'clamp(32px, 4vw, 56px) 0', color: '#9CA3AF' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p className="font-arimo font-medium" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)' }}>
                  No videos available for {selectedSubject}
                </p>
              </div>
            ) : (
              <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                  gap: 'clamp(16px, 1.8vw, 24px)',
                }}
              >
                {subjectVideos.map((video) => (
                  <div
                    key={video.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="flex items-center justify-center"
                      style={{ background: '#EFF6FF', height: 'clamp(150px, 14vw, 190px)', position: 'relative' }}
                    >
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 'clamp(48px, 5vw, 64px)' }}>{subjectEmoji(selectedSubject)}</span>
                      )}
                      <div
                        className="font-arimo font-bold"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: '#DC2626',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        🔥 HOT
                      </div>
                    </div>

                    {/* Card content */}
                    <div style={{ padding: 'clamp(14px, 1.5vw, 20px)' }}>
                      <p
                        className="font-arimo font-bold"
                        style={{ fontSize: 'clamp(10px, 0.85vw, 12px)', color: '#C68A0B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'clamp(4px, 0.4vw, 6px)' }}
                      >
                        {selectedSubject}
                      </p>
                      <h3
                        className="font-arimo font-bold"
                        style={{ fontSize: 'clamp(14px, 1.15vw, 15px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)', lineHeight: 1.35 }}
                      >
                        {video.title}
                      </h3>
                      <p className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 12px)', color: '#6A7282', marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
                        👀 {video.viewCount ? formatViews(video.viewCount) : '—'}
                        {video.createdAt ? ` · 📅 ${timeAgo(video.createdAt)}` : video.publishedAt ? ` · 📅 ${timeAgo(video.publishedAt)}` : ''}
                      </p>

                      <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
                        <button
                          onClick={() => setShowLoginModal(true)}
                          className="flex items-center gap-1 font-arimo font-medium"
                          style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                        >
                          <img src="/pdf.png" alt="pdf" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          PDF
                        </button>
                        <button
                          onClick={() => setShowMentorModal(true)}
                          className="flex items-center gap-1 font-arimo font-medium"
                          style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                        >
                          <img src="/think.png" alt="ask mentor" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          Ask Mentor
                        </button>
                        <button
                          onClick={() => { const u = video.youtubeUrl || video.url || ''; window.open(u.startsWith('http') ? u : `https://${u}`, '_blank'); }}
                          className="flex items-center gap-1 font-arimo font-bold text-white"
                          style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#162456', border: 'none', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                        >
                          <img src="/yt.png" alt="watch" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          Watch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* YouTube CTA Banner — inside playlist */}
              <div style={{ marginTop: 'clamp(28px, 3vw, 40px)' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0E182D, #172240)',
                    borderRadius: '24px',
                    padding: 'clamp(28px, 3vw, 44px) clamp(32px, 3.5vw, 48px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'clamp(24px, 3vw, 40px)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left content */}
                  <div style={{ flex: 1, zIndex: 1 }}>
                    <h3
                      className="font-tinos font-bold"
                      style={{
                        fontSize: 'clamp(28px, 2.7vw, 36px)',
                        lineHeight: 1.2,
                        color: '#FFFFFF',
                        marginBottom: 'clamp(4px, 0.4vw, 6px)',
                      }}
                    >
                      Never Miss a<br />
                      <span style={{ color: '#F0B100' }}>Lecture Again.</span>
                    </h3>

                    <p
                      className="font-tinos"
                      style={{
                        fontSize: 'clamp(18px, 1.88vw, 25px)',
                        color: '#FFFFFF',
                        marginBottom: 'clamp(12px, 1.2vw, 16px)',
                      }}
                    >
                      Stay Consistent. Stay Ahead.
                    </p>

                    <p
                      className="font-arimo"
                      style={{
                        fontSize: 'clamp(13px, 1.12vw, 15px)',
                        lineHeight: 'clamp(20px, 1.88vw, 25px)',
                        color: '#FFFFFF',
                        marginBottom: 'clamp(20px, 2vw, 28px)',
                        maxWidth: '480px',
                      }}
                    >
                      Subscribe to Rise with Jeet on YouTube and get instant notifications for new lectures, current affairs drops, and live sessions &mdash; completely free.
                    </p>

                    {/* YouTube button */}
                    <a
                      href="https://www.youtube.com/@RiseWithJeet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-arimo font-bold text-white"
                      style={{
                        background: '#E7000B',
                        borderRadius: '26843500px',
                        padding: 'clamp(12px, 1.2vw, 14px) clamp(24px, 2.25vw, 30px)',
                        fontSize: 'clamp(13px, 1.12vw, 15px)',
                        marginBottom: 'clamp(12px, 1.2vw, 16px)',
                      }}
                    >
                      {/* YouTube icon */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" fill="#FFFFFF"/>
                        <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" fill="#E7000B"/>
                      </svg>
                      Join Our YouTube Family
                    </a>

                    <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#FFFFFF' }}>
                      15,000+ Join our YouTube Family
                    </p>
                  </div>

                  {/* Right - Bell icon */}
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 'clamp(100px, 10vw, 140px)',
                      height: 'clamp(100px, 10vw, 140px)',
                      borderRadius: '50%',
                      background: 'rgba(25,60,184,0.3)',
                      flexShrink: 0,
                      opacity: 0.4,
                    }}
                  >
                    <span style={{ fontSize: 'clamp(48px, 5vw, 68px)' }}>{'\uD83D\uDD14'}</span>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* Featured videos section (when no subject selected) */}
        {!selectedSubject && apiVideos.length > 0 && (
          <div style={{ marginTop: 'clamp(40px, 4vw, 56px)' }}>
            <div style={{ marginBottom: 'clamp(20px, 2vw, 28px)' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 'clamp(4px, 0.4vw, 6px)' }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FF6900 0%, #FB2C36 100%)',
                    borderRadius: '12px',
                    width: 'clamp(40px, 3.5vw, 48px)',
                    height: 'clamp(40px, 3.5vw, 48px)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 'clamp(22px, 2vw, 26px)' }}>{subjectEmoji(featuredSubjectName)}</span>
                </div>
                <div>
                  <h2
                    className="font-arimo font-bold"
                    style={{ fontSize: 'clamp(20px, 1.88vw, 26px)', color: '#101828', lineHeight: 1.2 }}
                  >
                    {featuredSubjectName}
                  </h2>
                  <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#4A5565' }}>
                    📺 {apiVideos.length} Video{apiVideos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                gap: 'clamp(16px, 1.8vw, 24px)',
              }}
            >
              {apiVideos.map((video) => (
                <div
                  key={video.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ background: '#EFF6FF', height: 'clamp(150px, 14vw, 190px)', position: 'relative' }}
                  >
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 'clamp(48px, 5vw, 64px)' }}>{subjectEmoji(featuredSubjectName)}</span>
                    )}
                    <div
                      className="font-arimo font-bold"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      🔥 HOT
                    </div>
                  </div>

                  <div style={{ padding: 'clamp(14px, 1.5vw, 20px)' }}>
                    <p
                      className="font-arimo font-bold"
                      style={{ fontSize: 'clamp(10px, 0.85vw, 12px)', color: '#C68A0B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'clamp(4px, 0.4vw, 6px)' }}
                    >
                      {featuredSubjectName}
                    </p>
                    <h3
                      className="font-arimo font-bold"
                      style={{ fontSize: 'clamp(14px, 1.15vw, 15px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)', lineHeight: 1.35 }}
                    >
                      {video.title}
                    </h3>
                    <p className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 12px)', color: '#6A7282', marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
                      👀 {video.viewCount ? formatViews(video.viewCount) : '—'}
                      {video.createdAt ? ` · 📅 ${timeAgo(video.createdAt)}` : video.publishedAt ? ` · 📅 ${timeAgo(video.publishedAt)}` : ''}
                    </p>

                    <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="flex items-center gap-1 font-arimo font-medium"
                        style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                      >
                        <img src="/pdf.png" alt="pdf" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        PDF
                      </button>
                      <button
                        onClick={() => setShowMentorModal(true)}
                        className="flex items-center gap-1 font-arimo font-medium"
                        style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                      >
                        <img src="/think.png" alt="ask mentor" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        Ask Mentor
                      </button>
                      {video.videoUrl ? (
                        <a
                          href={video.videoUrl.startsWith('http') ? video.videoUrl : `https://${video.videoUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-arimo font-bold text-white"
                          style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#162456', fontSize: 'clamp(11px, 0.9vw, 13px)', textDecoration: 'none' }}
                        >
                          <img src="/yt.png" alt="watch" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          Watch
                        </a>
                      ) : (
                        <button
                          onClick={() => { const u = video.youtubeUrl || video.url || ''; window.open(u.startsWith('http') ? u : `https://${u}`, '_blank'); }}
                          className="flex items-center gap-1 font-arimo font-bold text-white"
                          style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#162456', border: 'none', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                        >
                          <img src="/yt.png" alt="watch" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          Watch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Watch Video + Quiz Modal ── */}
      {watchVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setWatchVideo(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              overflowY: 'auto',
              margin: '0 16px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between" style={{ padding: '20px 24px 16px' }}>
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <p className="font-arimo font-bold" style={{ fontSize: '18px', color: '#101828', lineHeight: 1.3 }}>
                  {watchVideo.title}
                </p>
                {watchVideo.instructor && (
                  <p className="font-arimo" style={{ fontSize: '13px', color: '#6A7282', marginTop: '4px' }}>
                    by {watchVideo.instructor}
                  </p>
                )}
              </div>
              <button
                onClick={() => setWatchVideo(null)}
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#4A5565" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: '0 24px', marginBottom: '24px' }}>
              {watchVideo.videoUrl ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '14px', overflow: 'hidden', background: '#000' }}>
                  <iframe
                    src={getYouTubeEmbedUrl(watchVideo.videoUrl)}
                    title={watchVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center font-arimo"
                  style={{ background: '#F3F4F6', borderRadius: '14px', height: '240px', color: '#9CA3AF', fontSize: '14px' }}
                >
                  <span style={{ fontSize: '36px', marginBottom: '8px' }}>🎬</span>
                  Video URL not set yet
                </div>
              )}
            </div>

            <div style={{ padding: '0 24px 28px' }}>
              {quizResults ? (
                <div>
                  <div
                    className="flex items-center gap-3"
                    style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px' }}
                  >
                    <span style={{ fontSize: '28px' }}>🎯</span>
                    <div>
                      <p className="font-arimo font-bold" style={{ fontSize: '18px', color: '#065F46' }}>
                        You scored {quizResults.score} / {quizResults.total}
                      </p>
                      <p className="font-arimo" style={{ fontSize: '13px', color: '#047857' }}>
                        {quizResults.total > 0 ? `${Math.round((quizResults.score / quizResults.total) * 100)}% correct` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {quizResults.results.map((r: any, idx: number) => (
                      <div key={r.id} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px' }}>
                        <p className="font-arimo font-semibold" style={{ fontSize: '14px', color: '#101828', marginBottom: '10px' }}>
                          Q{idx + 1}. {r.question}
                        </p>
                        <div className="space-y-2">
                          {(r.options as string[]).map((opt: string, i: number) => {
                            const isCorrect = i === r.correctOption;
                            const isSelected = i === r.selected;
                            let bg = '#FFFFFF', border = '#E5E7EB', color = '#374151';
                            if (isCorrect) { bg = '#ECFDF5'; border = '#6EE7B7'; color = '#065F46'; }
                            else if (isSelected && !isCorrect) { bg = '#FEF2F2'; border = '#FECACA'; color = '#991B1B'; }
                            return (
                              <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 12px', color, fontSize: '13px' }}
                                className="font-arimo flex items-center gap-2">
                                <span style={{ fontWeight: 600 }}>{['A', 'B', 'C', 'D'][i]}.</span>
                                {opt}
                                {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                                {isSelected && !isCorrect && <span style={{ marginLeft: 'auto' }}>✗</span>}
                              </div>
                            );
                          })}
                        </div>
                        {r.explanation && (
                          <p className="font-arimo" style={{ fontSize: '12px', color: '#6A7282', marginTop: '8px', padding: '8px 12px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                            💡 {r.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setQuizAnswers({}); setQuizResults(null); }}
                    className="font-arimo font-semibold"
                    style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '10px', background: '#162456', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Retake Quiz
                  </button>
                </div>
              ) : videoQuestions.length === 0 ? (
                <p className="font-arimo text-center" style={{ fontSize: '14px', color: '#9CA3AF', padding: '12px 0' }}>
                  No quiz questions for this video yet.
                </p>
              ) : (
                <div>
                  <h3 className="font-arimo font-bold" style={{ fontSize: '16px', color: '#101828', marginBottom: '16px' }}>
                    📝 Test Your Understanding ({videoQuestions.length} question{videoQuestions.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="space-y-5">
                    {videoQuestions.map((q: any, idx: number) => (
                      <div key={q.id} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px' }}>
                        <p className="font-arimo font-semibold" style={{ fontSize: '14px', color: '#101828', marginBottom: '10px' }}>
                          Q{idx + 1}. {q.question}
                        </p>
                        <div className="space-y-2">
                          {(q.options as string[]).map((opt: string, i: number) => {
                            const selected = quizAnswers[q.id] === i;
                            return (
                              <button
                                key={i}
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: i }))}
                                className="w-full text-left font-arimo flex items-center gap-2"
                                style={{
                                  background: selected ? '#EFF6FF' : '#FFFFFF',
                                  border: `1.5px solid ${selected ? '#3B82F6' : '#E5E7EB'}`,
                                  borderRadius: '8px',
                                  padding: '9px 12px',
                                  fontSize: '13px',
                                  color: selected ? '#1D4ED8' : '#374151',
                                  fontWeight: selected ? 600 : 400,
                                  cursor: 'pointer',
                                }}
                              >
                                <span style={{ fontWeight: 700, minWidth: '18px' }}>{['A', 'B', 'C', 'D'][i]}.</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleQuizSubmit}
                    disabled={quizLoading || Object.keys(quizAnswers).length === 0}
                    className="font-arimo font-bold text-white"
                    style={{
                      marginTop: '20px',
                      padding: '12px 32px',
                      borderRadius: '12px',
                      background: quizLoading || Object.keys(quizAnswers).length === 0 ? '#9CA3AF' : '#162456',
                      border: 'none',
                      cursor: quizLoading || Object.keys(quizAnswers).length === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {quizLoading ? 'Submitting...' : `Submit Answers (${Object.keys(quizAnswers).length}/${videoQuestions.length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ask the Mentor Modal ── */}
      {showMentorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMentorModal(false)}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: '24px', border: '1.6px solid #6A7282', padding: '28px', width: '100%', maxWidth: '480px', margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mentor-icon.png" alt="Ask Mentor" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <button onClick={() => setShowMentorModal(false)}
                className="flex items-center justify-center"
                style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#4A5565" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <h3 className="font-arimo font-bold" style={{ fontSize: '20px', color: '#101828', marginBottom: '8px' }}>
              Ask the Mentor
            </h3>
            <p className="font-arimo" style={{ fontSize: '14px', color: '#6A7282', marginBottom: '20px' }}>
              Got a doubt? Ask our AI mentor and get instant answers.
            </p>

            {mentorSuccess && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span className="font-arimo font-medium" style={{ fontSize: '14px', color: '#065F46' }}>
                  Question submitted successfully!
                </span>
              </div>
            )}

            <textarea
              value={mentorQuestion}
              onChange={(e) => setMentorQuestion(e.target.value)}
              placeholder="Type your question here..."
              className="w-full font-arimo outline-none resize-none"
              style={{
                height: '120px',
                borderRadius: '12px',
                border: '1.6px solid #E5E7EB',
                padding: '14px 16px',
                fontSize: '14px',
                color: '#101828',
                marginBottom: '16px',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#4F78F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
            />

            <button
              onClick={handleAskMentor}
              disabled={mentorSubmitting || !mentorQuestion.trim()}
              className="w-full font-arimo font-bold text-white"
              style={{
                height: '48px',
                borderRadius: '12px',
                background: mentorSubmitting || !mentorQuestion.trim() ? '#9CA3AF' : '#162456',
                border: 'none',
                cursor: mentorSubmitting || !mentorQuestion.trim() ? 'not-allowed' : 'pointer',
                fontSize: '15px',
              }}
            >
              {mentorSubmitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </div>
      )}

      {/* ── Login Modal placeholder ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', margin: '0 16px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h3 className="font-arimo font-bold" style={{ fontSize: '20px', color: '#101828', marginBottom: '8px' }}>
              PDF Access
            </h3>
            <p className="font-arimo" style={{ fontSize: '14px', color: '#6A7282', marginBottom: '24px' }}>
              Please subscribe to access downloadable PDFs.
            </p>
            <button
              onClick={() => setShowLoginModal(false)}
              className="font-arimo font-bold text-white"
              style={{ height: '44px', borderRadius: '12px', background: '#162456', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 32px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
