'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { videoService } from '@/lib/services';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const SUBJECT_EMOJIS: Record<string, string> = {
  'polity': '🏛️', 'history': '📜', 'geography': '🌍', 'economy': '📊',
  'environment': '🌿', 'science': '🔬', 'ethics': '⚖️', 'current': '📰',
};

function subjectEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '📚';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
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

  const categories = ['All Categories', ...apiSubjects.map(s => s.name)];
  const filteredSubjects = selectedCategory === 'All Categories'
    ? apiSubjects
    : apiSubjects.filter(s => s.name === selectedCategory);

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
    <div
      className="font-arimo w-full min-h-screen"
      style={{ background: '#F9FAFB' }}
    >
      {/* @RiseWithJeet button - top right */}
      <div className="w-full flex justify-end" style={{ padding: 'clamp(12px, 1.27vw, 17px) clamp(20px, 2.25vw, 30px)' }}>
        <a
          href="https://www.youtube.com/@RiseWithJeet"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-arimo font-semibold text-white"
          style={{
            background: '#17223E',
            borderRadius: '26843500px',
            padding: 'clamp(8px, 0.75vw, 10px) clamp(16px, 1.5vw, 20px)',
            fontSize: 'clamp(12px, 1.05vw, 14px)',
          }}
        >
          {/* YouTube icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" fill="#FF0000"/>
            <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" fill="white"/>
          </svg>
          @RiseWithJeet
        </a>
      </div>

      {/* Centered content wrapper — Section 1 */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: 'clamp(960px, 75vw, 1200px)',
          padding: '0 clamp(16px, 2vw, 30px)',
        }}
      >
        {/* ============================================================ */}
        {/*  SECTION 1: HERO                                              */}
        {/* ============================================================ */}
        <div className="flex flex-col items-center" style={{ paddingTop: 'clamp(8px, 1vw, 16px)', paddingBottom: 'clamp(24px, 2.5vw, 40px)' }}>

          {/* Badge pill */}
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
            <img src="/cap.png" alt="cap" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            India&apos;s Most Comprehensive UPSC Platform
          </div>

          {/* Main heading */}
          <h1
            className="font-arimo font-bold text-center"
            style={{
              fontSize: 'clamp(32px, 3.59vw, 48px)',
              lineHeight: 'clamp(38px, 4.2vw, 56px)',
              color: '#17223E',
              marginBottom: 'clamp(10px, 1vw, 16px)',
            }}
          >
            Master Your{' '}
            <span className="font-arimo font-bold italic" style={{ color: '#C68A0B' }}>UPSC Journey</span>
            <br />
            with Expert Video Lectures
          </h1>

          {/* Description */}
          <p
            className="font-arimo text-center"
            style={{
              fontSize: 'clamp(14px, 1.35vw, 18px)',
              lineHeight: 'clamp(22px, 2.1vw, 28px)',
              color: '#4A5565',
              maxWidth: '524px',
              marginBottom: 'clamp(20px, 2vw, 28px)',
            }}
          >
            Every editorial, every perspective &mdash; mapped to what UPSC asks.
          </p>

          {/* Start Learning button */}
          <button
            className="flex items-center gap-2 font-arimo font-bold"
            style={{
              background: '#FFD170',
              color: '#17223E',
              borderRadius: '30px',
              padding: 'clamp(12px, 1.2vw, 16px) clamp(28px, 2.5vw, 36px)',
              fontSize: 'clamp(14px, 1.2vw, 16px)',
              cursor: 'pointer',
              border: 'none',
              marginBottom: 'clamp(28px, 3vw, 40px)',
            }}
          >
            {/* Play icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 3L19 12L5 21V3Z" fill="#17223E"/>
            </svg>
            Start Learning
          </button>

          {/* Stats card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: 'clamp(20px, 2vw, 28px) clamp(28px, 3vw, 44px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
              width: '100%',
              maxWidth: '720px',
            }}
          >
            <div className="flex items-center justify-between">
              {[
                { number: apiStats?.totalLectures ?? '500', suffix: '+', label: 'Video Lectures' },
                { number: apiStats?.totalSubjects ?? '12', suffix: null, label: 'Subjects Covered' },
                { number: apiStats?.totalHours ?? '375', suffix: '+', label: 'Hours of Content' },
              ].map((stat, idx, arr) => (
                <React.Fragment key={stat.label}>
                  <div className="flex flex-col items-center" style={{ flex: 1 }}>
                    <div className="font-arimo font-bold flex items-center gap-1" style={{ fontSize: 'clamp(24px, 2.5vw, 34px)', color: '#162456', lineHeight: 1.2 }}>
                      {stat.number}
                      {stat.suffix && <span style={{ color: '#DBAC49' }}>{stat.suffix}</span>}
                    </div>
                    <div className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#6A7282', marginTop: '4px' }}>
                      {stat.label}
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: '1px', height: 'clamp(32px, 3vw, 44px)', background: '#E5E7EB' }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/*  SECTION 3: BROWSE BY SUBJECT                                  */}
      {/* ============================================================ */}

      {/* Centered content wrapper — Sections 3–6 */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: 'clamp(960px, 75vw, 1200px)',
          padding: '0 clamp(16px, 2vw, 30px)',
          paddingBottom: 'clamp(60px, 6vw, 100px)',
        }}
      >
        {/* SECTION 3: BROWSE BY SUBJECT */}
        <div style={{ marginBottom: 'clamp(40px, 4vw, 60px)' }}>
          {/* Super heading */}
          <div
            className="font-arimo font-bold"
            style={{
              color: '#FDC700',
              fontSize: 'clamp(12px, 1.05vw, 14px)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 'clamp(6px, 0.6vw, 8px)',
              textAlign: 'center',
            }}
          >
            BROWSE BY SUBJECT
          </div>

          {/* Heading */}
          <h2
            className="font-arimo font-bold"
            style={{
              fontSize: 'clamp(24px, 2.5vw, 34px)',
              color: '#17223E',
              marginBottom: 'clamp(24px, 2.5vw, 36px)',
              lineHeight: 1.3,
              textAlign: 'center',
            }}
          >
            Pick Your Subject,<br />
            <span className="font-arimo font-bold italic" style={{ color: '#FDC700' }}>Start Learning.</span>
          </h2>

          {/* Category filter pills */}
          <div className="flex flex-wrap justify-center" style={{ gap: '10px', marginBottom: 'clamp(24px, 2.5vw, 36px)' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="font-arimo font-medium"
                style={{
                  borderRadius: '26843500px',
                  padding: '8px 20px',
                  fontSize: '14px',
                  border: selectedCategory === cat ? 'none' : '1px solid #E5E7EB',
                  background: selectedCategory === cat ? '#17223E' : '#FFFFFF',
                  color: selectedCategory === cat ? '#FFFFFF' : '#374151',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Subject grid */}
          {filteredSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ padding: 'clamp(32px, 4vw, 56px) 0', color: '#9CA3AF' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <p className="font-arimo font-medium" style={{ fontSize: 'clamp(14px, 1.2vw, 16px)' }}>
                No subjects found for this category
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'clamp(14px, 1.5vw, 20px)',
              }}
            >
              {filteredSubjects.map((subject) => (
                <div
                  key={subject.name}
                  onClick={() => handleSubjectClick(subject.name)}
                  style={{
                    background: selectedSubject === subject.name ? '#F0F4FF' : '#FFFFFF',
                    borderRadius: '14px',
                    padding: 'clamp(18px, 2vw, 24px)',
                    boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedSubject === subject.name ? '2px solid #17223E' : '2px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 'clamp(28px, 3vw, 38px)', marginBottom: 'clamp(10px, 1vw, 14px)' }}>
                    {subjectEmoji(subject.name)}
                  </div>
                  <div
                    className="font-arimo font-bold"
                    style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#17223E', marginBottom: 'clamp(4px, 0.4vw, 6px)' }}
                  >
                    {subject.name}
                  </div>
                  <div className="font-arimo" style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#364153' }}>
                    {subject.videoCount ?? 0} videos{subject.viewCount ? ` • ${subject.viewCount >= 1000 ? `${(subject.viewCount / 1000).toFixed(0)}K` : subject.viewCount} Views` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline videos for selected subject */}
          {selectedSubject && (
            <div style={{ marginTop: 'clamp(24px, 2.5vw, 36px)' }}>
              {/* Subject header */}
              <div style={{ marginBottom: 'clamp(16px, 1.5vw, 24px)' }}>
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
                    <span style={{ fontSize: 'clamp(22px, 2vw, 26px)' }}>{subjectEmoji(selectedSubject)}</span>
                  </div>
                  <div>
                    <h2
                      className="font-arimo font-bold"
                      style={{ fontSize: 'clamp(20px, 1.88vw, 26px)', color: '#101828', lineHeight: 1.2 }}
                    >
                      {selectedSubject}
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'clamp(14px, 1.5vw, 20px)',
                  }}
                >
                  {subjectVideos.map((video) => (
                    <div
                      key={video.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '14px',
                        boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        className="flex items-center justify-center"
                        style={{ background: '#EFF6FF', height: 'clamp(140px, 13vw, 180px)', position: 'relative' }}
                      >
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 'clamp(40px, 4vw, 56px)' }}>{subjectEmoji(selectedSubject)}</span>
                        )}
                        <div
                          className="font-arimo font-bold"
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '11px',
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
                          {selectedSubject.toUpperCase()}
                        </p>
                        <h3
                          className="font-arimo font-bold"
                          style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)', lineHeight: 1.3 }}
                        >
                          {video.title}
                        </h3>
                        <p className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#4A5565', marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
                          👀 {video.viewCount ? formatViews(video.viewCount) : '—'}
                          {video.createdAt ? ` · 📅 ${timeAgo(video.createdAt)}` : video.publishedAt ? ` · 📅 ${timeAgo(video.publishedAt)}` : ''}
                        </p>

                        <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
                          <button
                            onClick={() => setShowLoginModal(true)}
                            className="flex items-center gap-1 font-arimo font-medium"
                            style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #101828', color: '#101828', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                          >
                            <img src="/pdf.png" alt="pdf" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                            PDF
                          </button>
                          <button
                            onClick={() => setShowMentorModal(true)}
                            className="flex items-center gap-1 font-arimo font-medium"
                            style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #101828', color: '#101828', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                          >
                            <img src="/think.png" alt="ask mentor" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                            Ask Mentor
                          </button>
                          {video.videoUrl ? (
                            <a
                              href={video.videoUrl}
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
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  SECTION 4: YOUTUBE CTA BANNER                                */}
        {/* ============================================================ */}
        <div style={{ marginBottom: 'clamp(40px, 4vw, 60px)' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0E182D, #172240)',
              borderRadius: '24px',
              padding: 'clamp(32px, 3.5vw, 48px) clamp(32px, 3.5vw, 48px)',
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
                  color: '#BEDBFF',
                  marginBottom: 'clamp(20px, 2vw, 28px)',
                  maxWidth: '480px',
                }}
              >
                Subscribe to our YouTube channel for daily UPSC video lectures, current affairs analysis, and exam strategy sessions &mdash; completely free, forever.
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

              <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#8EC5FF' }}>
                Join 140,000+ UPSC Aspirants Here
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
                flexShrink: 0,                opacity: 0.4,              }}
            >
              <span style={{ fontSize: 'clamp(48px, 5vw, 68px)' }}>{'\uD83D\uDD14'}</span>
            </div>
          </div>

          {/* @RiseWithJeet button below banner */}
          <div className="flex justify-end" style={{ marginTop: 'clamp(12px, 1.2vw, 16px)' }}>
            <a
              href="https://www.youtube.com/@RiseWithJeet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-arimo font-semibold text-white"
              style={{
                background: '#17223E',
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
        </div>

        {/* ============================================================ */}
        {/*  SECTION 5: FEATURED VIDEOS                                  */}
        {/* ============================================================ */}
        {apiVideos.length > 0 && (
          <div style={{ marginBottom: 'clamp(40px, 4vw, 60px)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'clamp(16px, 1.5vw, 24px)' }}>
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
              {(() => {
                const matched = apiSubjects.find(s => s.name === featuredSubjectName);
                return matched?.description ? (
                  <p className="font-arimo" style={{ fontSize: 'clamp(13px, 1.12vw, 15px)', color: '#4A5565', marginTop: 'clamp(8px, 0.8vw, 12px)', lineHeight: 1.5 }}>
                    {matched.description}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Video cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'clamp(14px, 1.5vw, 20px)',
              }}
            >
              {apiVideos.map((video) => (
                <div
                  key={video.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Thumbnail or placeholder */}
                  <div
                    className="flex items-center justify-center"
                    style={{ background: '#EFF6FF', height: 'clamp(140px, 13vw, 180px)', position: 'relative' }}
                  >
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 'clamp(40px, 4vw, 56px)' }}>{subjectEmoji(featuredSubjectName)}</span>
                    )}
                    {/* HOT badge */}
                    <div
                      className="font-arimo font-bold"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '11px',
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
                    {/* Category label */}
                    <p
                      className="font-arimo font-bold"
                      style={{ fontSize: 'clamp(10px, 0.85vw, 12px)', color: '#C68A0B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'clamp(4px, 0.4vw, 6px)' }}
                    >
                      {featuredSubjectName.toUpperCase()}
                    </p>
                    <h3
                      className="font-arimo font-bold"
                      style={{ fontSize: 'clamp(14px, 1.2vw, 16px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)', lineHeight: 1.3 }}
                    >
                      {video.title}
                    </h3>

                    {/* Views & time ago */}
                    <p className="font-arimo" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#4A5565', marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
                      👀 {video.viewCount ? formatViews(video.viewCount) : '—'}
                      {video.createdAt ? ` · 📅 ${timeAgo(video.createdAt)}` : video.publishedAt ? ` · 📅 ${timeAgo(video.publishedAt)}` : ''}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center" style={{ gap: 'clamp(6px, 0.6vw, 8px)' }}>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="flex items-center gap-1 font-arimo font-medium"
                        style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #101828', color: '#101828', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                      >
                        <img src="/pdf.png" alt="pdf" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        PDF
                      </button>
                      <button
                        onClick={() => setShowMentorModal(true)}
                        className="flex items-center gap-1 font-arimo font-medium"
                        style={{ padding: 'clamp(6px, 0.6vw, 8px) clamp(10px, 1vw, 14px)', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #101828', color: '#101828', fontSize: 'clamp(11px, 0.9vw, 13px)', cursor: 'pointer' }}
                      >
                        <img src="/think.png" alt="ask mentor" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        Ask Mentor
                      </button>
                      {video.videoUrl ? (
                        <a
                          href={video.videoUrl}
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

        {/* ============================================================ */}
        {/*  SECTION 6: ASK MENTOR CARD ONLY                             */}
        {/* Section 6 removed — cards are now modals */}
      </div>

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
            {/* Top row */}
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mentor-icon.png" alt="Ask Mentor" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <button onClick={() => setShowMentorModal(false)}
                className="flex items-center justify-center"
                style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#4A5565" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <h3 className="font-arimo font-bold" style={{ fontSize: '24px', color: '#101828', lineHeight: 1.2, marginBottom: '8px' }}>
              Ask the Mentor
            </h3>
            <p className="font-arimo" style={{ fontSize: '14px', color: '#4A5565', marginBottom: '20px', lineHeight: 1.5 }}>
              Have any doubt about <strong>Introduction to Indian Constitution I Historical Background</strong>...Jeet Sir responds within 24 hours.
            </p>

            <p className="font-arimo font-bold" style={{ fontSize: '13px', color: '#101828', marginBottom: '6px' }}>Your doubt or question</p>
            <textarea
              placeholder="e.g. At 18:32, I didn't understand why Article 370 had was mentioned u..."
              className="w-full font-arimo outline-none resize-none"
              style={{ height: '100px', borderRadius: '14px', border: '1.6px solid #D1D5DC', padding: '12px 16px', fontSize: '14px', color: '#0A0A0A', background: '#FFFFFF', marginBottom: '14px' }}
            />

            <p className="font-arimo font-bold" style={{ fontSize: '13px', color: '#101828', marginBottom: '6px' }}>Your name (optional)</p>
            <input type="text" placeholder="e.g. Rahul from Delhi" className="w-full font-arimo outline-none"
              style={{ height: '50px', borderRadius: '14px', border: '1.6px solid #D1D5DC', padding: '0 16px', fontSize: '14px', color: '#0A0A0A', background: '#FFFFFF', marginBottom: '16px' }}
            />

            <button className="w-full flex items-center justify-center font-arimo font-bold text-white"
              style={{ height: '52px', borderRadius: '14px', background: '#101828', fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '12px' }}
            >
              Submit Doubt &rarr;
            </button>

            <p className="font-arimo text-center" style={{ fontSize: '12px', color: '#6A7282' }}>
              Answers posted on{' '}
              <span style={{ color: '#E7000B', fontWeight: 600, cursor: 'pointer' }}>YouTube Community</span>
              {' '}&amp;{' '}
              <span style={{ color: '#1E40AF', fontWeight: 600, cursor: 'pointer' }}>Telegram</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Login to Download Modal ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.6px solid #6A7282',
              padding: 'clamp(20px, 2.51vw, 33px)',
              width: '100%',
              maxWidth: '480px',
              margin: '0 16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top row: emoji + close */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
              <span style={{ fontSize: '32px' }}>📥</span>
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex items-center justify-center"
                style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#4A5565" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <h3 className="font-arimo font-bold" style={{ fontSize: '24px', color: '#101828', lineHeight: 1.2, marginBottom: '8px' }}>
              Login to Download
            </h3>
            <p className="font-arimo" style={{ fontSize: '14px', color: '#4A5565', marginBottom: '20px' }}>
              Please Sign-in to download <strong>Telegram Accts</strong>
            </p>

            <div style={{ marginBottom: '12px' }}>
              <input type="email" placeholder="Email address" className="w-full font-arimo outline-none"
                style={{ height: '50px', borderRadius: '14px', border: '1.6px solid #D1D5DC', padding: '0 16px', fontSize: '14px', color: '#0A0A0A', background: '#FFFFFF' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <input type="password" placeholder="Password" className="w-full font-arimo outline-none"
                style={{ height: '50px', borderRadius: '14px', border: '1.6px solid #D1D5DC', padding: '0 16px', fontSize: '14px', color: '#0A0A0A', background: '#FFFFFF' }}
              />
            </div>

            <button className="w-full flex items-center justify-center font-arimo font-bold text-white"
              style={{ height: '52px', borderRadius: '14px', background: '#162456', fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '16px' }}
            >
              Sign In &amp; Download &rarr;
            </button>

            <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
              <span className="font-arimo" style={{ fontSize: '13px', color: '#6A7282' }}>— or —</span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
            </div>

            <button className="w-full flex items-center justify-center gap-2 font-arimo font-semibold"
              style={{ height: '52px', borderRadius: '14px', border: '1.6px solid #D1D5DC', background: '#FFFFFF', color: '#101828', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center justify-between">
              <span className="font-arimo" style={{ fontSize: '13px', color: '#1E40AF', cursor: 'pointer' }}>New? Create free account &rarr;</span>
              <span className="font-arimo" style={{ fontSize: '13px', color: '#6A7282', cursor: 'pointer' }}>🌐 Forgot?</span>
            </div>
          </div>

          {/* ── Ask the Mentor Card (offset down) ── */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.6px solid #6A7282',
              padding: 'clamp(20px, 2.51vw, 33px)',
              marginTop: 'clamp(100px, 12.33vw, 165px)',
            }}
          >
            {/* Top row: emoji + close */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(12px, 1.2vw, 16px)' }}>
              <span style={{ fontSize: 'clamp(28px, 2.8vw, 38px)' }}>{'\uD83E\uDD14'}</span>
              <button
                className="flex items-center justify-center"
                style={{
                  width: 'clamp(26px, 2.2vw, 30px)',
                  height: 'clamp(26px, 2.2vw, 30px)',
                  borderRadius: '50%',
                  background: '#F3F4F6',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#4A5565" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Heading */}
            <h3
              className="font-arimo font-bold"
              style={{ fontSize: 'clamp(20px, 2.09vw, 28px)', color: '#101828', lineHeight: 1.2, marginBottom: 'clamp(6px, 0.6vw, 8px)' }}
            >
              Ask the Mentor
            </h3>

            <p className="font-arimo" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#4A5565', marginBottom: 'clamp(18px, 1.8vw, 24px)', lineHeight: 1.5 }}>
              Have any doubt about <strong>Introduction to Indian Constitution I Historical Background</strong>...Jeet Sir responds within 24 hours.
            </p>

            {/* Your doubt or question */}
            <p className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)' }}>
              Your doubt or question
            </p>
            <textarea
              placeholder="e.g. At 18:32, I didn't understand why Article 370 had was mentioned u..."
              className="w-full font-arimo outline-none resize-none"
              value={mentorQuestion}
              onChange={(e) => setMentorQuestion(e.target.value)}
              style={{
                height: 'clamp(90px, 8.61vw, 115px)',
                borderRadius: '14px',
                border: '1.6px solid #D1D5DC',
                padding: '16px',
                fontSize: 'clamp(13px, 1.12vw, 15px)',
                color: '#0A0A0A',
                background: '#FFFFFF',
                marginBottom: 'clamp(12px, 1.2vw, 16px)',
              }}
            />

            {/* Your name (optional) */}
            <p className="font-arimo font-bold" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#101828', marginBottom: 'clamp(6px, 0.6vw, 8px)' }}>
              Your name (optional)
            </p>
            <input
              type="text"
              placeholder="e.g. Rahul from Delhi"
              className="w-full font-arimo outline-none"
              style={{
                height: 'clamp(44px, 4.12vw, 55px)',
                borderRadius: '14px',
                border: '1.6px solid #D1D5DC',
                padding: '0 16px',
                fontSize: 'clamp(13px, 1.12vw, 15px)',
                color: '#0A0A0A',
                background: '#FFFFFF',
                marginBottom: 'clamp(14px, 1.5vw, 20px)',
              }}
            />

            {/* Submit Doubt button */}
            <button
              onClick={handleAskMentor}
              disabled={mentorSubmitting || !mentorQuestion.trim()}
              className="w-full flex items-center justify-center gap-2 font-arimo font-bold text-white"
              style={{
                height: 'clamp(48px, 4.48vw, 60px)',
                borderRadius: '14px',
                background: mentorSubmitting ? '#6A7282' : '#101828',
                fontSize: 'clamp(13px, 1.12vw, 15px)',
                border: 'none',
                cursor: mentorSubmitting ? 'not-allowed' : 'pointer',
                marginBottom: 'clamp(12px, 1.2vw, 16px)',
                opacity: !mentorQuestion.trim() ? 0.5 : 1,
              }}
            >
              {mentorSubmitting ? 'Submitting...' : 'Submit Doubt →'}
            </button>

            {mentorSuccess && (
              <p className="font-arimo text-center" style={{ fontSize: 'clamp(12px, 1.05vw, 14px)', color: '#16A34A', marginBottom: 'clamp(8px, 0.8vw, 10px)' }}>
                Your doubt has been submitted! Jeet Sir will respond within 24 hours.
              </p>
            )}

            <p className="font-arimo text-center" style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: '#6A7282' }}>
              Answers posted on{' '}
              <span style={{ color: '#E7000B', fontWeight: 600, cursor: 'pointer' }}>YouTube Community</span>
              {' '}&amp;{' '}
              <span style={{ color: '#1E40AF', fontWeight: 600, cursor: 'pointer' }}>Telegram</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
