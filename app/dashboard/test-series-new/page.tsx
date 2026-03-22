'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TestSeries, FILTER_OPTIONS } from '@/types/test-series';
import { TEST_SERIES_DATA } from '@/data/test-series-data';
import '../../../styles/test-series.css';

export default function TestSeriesNew() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filteredSeries = filter === 'all' 
    ? TEST_SERIES_DATA 
    : TEST_SERIES_DATA.filter(s => s.cat === filter);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="wrap page">
        {/* Hero Section */}
        <HeroSection />

        {/* Filter Bar */}
        <div className="fbar fade d1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              className={`fb ${filter === f.id ? 'on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Series Grid */}
        <div className="sgrid">
          {filteredSeries.map((series, i) => (
            <SeriesCard 
              key={series.id} 
              series={series} 
              index={i}
              onOpenDetail={() => router.push(`/dashboard/test-series/${series.id}`)}
              onStartTest={() => router.push(`/dashboard/test-series/${series.id}/attempt`)}
              onOpenPayment={() => console.log('Open payment for', series.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="cat-hero fade">
      <div className="ch-noise"></div>
      <div className="ch-line"></div>
      <div className="ch-inner">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="ch-eyebrow">
            <span className="ch-dot"></span>
            India's Smartest UPSC Test Platform · 2026
          </div>
          <h1 className="ch-h1">
            Rise with <span className="it">Jeet</span> —<br />
            Test Series That <span className="it">Transforms</span>
          </h1>
          <p className="ch-sub">
            10 battle-tested series. 600+ tests. From NCERT basics to Mains writing — every step of your UPSC journey covered with intelligence, analytics & mentorship.
          </p>
          <div className="ch-pills">
            <div className="chp">
              <span className="chpv">10</span>
              <span className="chpl">Series</span>
            </div>
            <div className="chp">
              <span className="chpv">600+</span>
              <span className="chpl">Tests</span>
            </div>
            <div className="chp">
              <span className="chpv" style={{ color: '#86EFAC' }}>80K+</span>
              <span className="chpl">Students</span>
            </div>
            <div className="chp">
              <span className="chpv" style={{ color: '#FCD34D' }}>340+</span>
              <span className="chpl">Selections</span>
            </div>
            <div className="chp">
              <span className="chpv" style={{ color: '#FCD34D' }}>4.9 ★</span>
              <span className="chpl">Rating</span>
            </div>
          </div>
        </div>
        <div className="ch-ring" style={{ position: 'relative', zIndex: 2 }}>
          <svg viewBox="0 0 108 108">
            <defs>
              <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <circle cx="54" cy="54" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <circle 
              cx="54" 
              cy="54" 
              r="42" 
              fill="none" 
              stroke="url(#rg)" 
              strokeWidth="7" 
              strokeDasharray="263.9" 
              strokeDashoffset="47.5" 
              strokeLinecap="round" 
            />
          </svg>
          <div className="ch-ring-lbl">
            <span className="ch-ring-v">340+</span>
            <span className="ch-ring-s">Selections</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SeriesCardProps {
  series: TestSeries;
  index: number;
  onOpenDetail: () => void;
  onStartTest: () => void;
  onOpenPayment: () => void;
}

function SeriesCard({ series, index, onOpenDetail, onStartTest, onOpenPayment }: SeriesCardProps) {
  const delay = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'][index % 6];

  // Header gradient per series
  const gradMap: Record<string, string> = {
    ncert: 'linear-gradient(135deg,#d4e9df 0%,#b8d9c8 100%)',
    current: 'linear-gradient(135deg,#ddd6f3 0%,#c9bfee 100%)',
    pyq: 'linear-gradient(135deg,#fde8c8 0%,#f5d5a0 100%)',
    prelims: 'linear-gradient(135deg,#fad5d5 0%,#f5bbbb 100%)',
    basics: 'linear-gradient(135deg,#c8eedd 0%,#a8e0c8 100%)',
    csat: 'linear-gradient(135deg,#ccdff7 0%,#b0ceef 100%)',
    daw: 'linear-gradient(135deg,#d0dcf8 0%,#b8c8f4 100%)',
    mains: 'linear-gradient(135deg,#e2d4f5 0%,#d0bef0 100%)',
    gsfoundation: 'linear-gradient(135deg,#ccdaf5 0%,#b4c8f0 100%)',
    optional: 'linear-gradient(135deg,#c8e8e6 0%,#a8d8d5 100%)',
  };
  const grad = gradMap[series.id] || 'linear-gradient(135deg,#1B2340 0%,#2E3B68 100%)';

  // Category label
  const catMap: Record<string, string> = {
    foundation: 'Foundation',
    'current-affairs': 'Current Affairs',
    pyq: 'PYQ Series',
    mock: 'Full Mock',
    mains: 'Mains Writing',
    csat: 'CSAT Prep',
    gs: 'GS Papers',
    optional: 'Optional Subject',
  };
  const catLabel = catMap[series.cat] || series.cat;

  // Status label
  const statusMap: Record<string, string> = {
    open: 'Open',
    live: 'Live',
    free: 'Free',
    enrolling: 'Enrolling',
    upcoming: 'Upcoming',
  };
  const statusLabel = statusMap[series.status] || 'Open';
  const dotCls = series.status === 'live' ? 'live' : series.status === 'free' ? 'free' : '';

  // Progress figures
  const done = series.progress !== null ? Math.round((series.tests * series.progress) / 100) : 0;
  const left = series.progress !== null ? series.tests - done : series.tests;
  const progPct = series.progress || 0;
  const hasProgress = series.progress !== null;

  // Description per series
  const descMap: Record<string, string> = {
    ncert: 'Chapter-wise NCERT tests covering Polity, History, Geography, Economy & Science. Concept explanations with every question.',
    current: 'Daily 10 MCQs from The Hindu, PIB & Yojana. Weekly 40-Q recaps and monthly 100-Q mega test.',
    pyq: 'Complete UPSC PYQ bank 1979–2025. Topic-wise & year-wise tests with trend analysis and frequency mapping.',
    prelims: '200-question full Prelims mocks with All-India Rank, negative marking simulation and video solutions.',
    basics: '20-question concept tests, no negative marking. Perfect Day 1 start for fresh aspirants. Fully free.',
    csat: 'Comprehension, Maths, Reasoning & Data Interpretation. CSAT full mocks with speed-building drills.',
  };
  const desc = descMap[series.id] || series.tagline;

  // Price HTML
  const isFree = series.price === 0;
  const primaryLabel = isFree ? '▶ Start Free' : hasProgress ? '▶ Resume' : 'Enroll Now';
  const primaryCls = isFree ? 'free' : hasProgress ? 'resume' : '';
  const primaryClick = isFree ? onStartTest : onOpenPayment;

  return (
    <div className={`sc fade ${delay}`} onClick={onOpenDetail} style={{ cursor: 'pointer' }}>
      {/* DARK HEADER BAND */}
      <div className="sc-header" style={{ background: grad }}>
        <div className="sc-header-icon">{series.icon}</div>
        <div className="sc-header-text">
          <div className="sc-header-title">{series.name}</div>
          <div className="sc-header-tags">
            <span className="sc-htag">{catLabel}</span>
            <span className="sc-htag-sep">·</span>
            <span className="sc-htag">{statusLabel}</span>
          </div>
        </div>
        <div className={`sc-status-dot ${dotCls}`}></div>
      </div>

      {/* META PILLS */}
      <div className="sc-meta-strip">
        <div className="sc-meta-pill">
          <span className="mp-ico">👥</span>
          {series.enrolled >= 1000 ? (series.enrolled / 1000).toFixed(1) + 'K' : series.enrolled}
        </div>
        <div className="sc-meta-pill">
          <span className="mp-ico">📝</span>
          {series.tests} tests
        </div>
        <div className="sc-meta-pill">
          <span className="mp-ico">⏱</span>
          {series.dur}
        </div>
        <div className="sc-meta-pill">
          <span className="mp-ico">★</span>
          {series.rating}
        </div>
      </div>

      {/* WHITE BODY */}
      <div className="sc-body">
        <div className="sc-desc">{desc}</div>

        {/* TESTS / DONE / LEFT stats */}
        <div className="sc-stats">
          <div className="sc-stat">
            <div className="sc-stat-v">{series.tests}</div>
            <div className="sc-stat-l">Tests</div>
          </div>
          <div className="sc-stat">
            <div className="sc-stat-v done">{done}</div>
            <div className="sc-stat-l">Done</div>
          </div>
          <div className="sc-stat">
            <div className="sc-stat-v left">{left}</div>
            <div className="sc-stat-l">Left</div>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="sc-prog-row">
          <span className="sc-prog-lbl">Progress</span>
          <span className="sc-prog-val">{hasProgress ? `${done} / ${series.tests}` : 'Not started'}</span>
        </div>
        <div className="sc-prog">
          <div 
            className="sc-prog-fill" 
            style={{ 
              width: `${progPct}%`, 
              background: hasProgress ? '#4F46E5' : '#E4E4E7' 
            }}
          ></div>
        </div>

        {/* FOOTER: price + buttons */}
        <div className="sc-foot">
          {!isFree && (
            <div className="sc-price-block">
              {series.oldPrice && <div className="sc-price-old">₹{series.oldPrice}</div>}
              <div className="sc-price-new">₹{series.price.toLocaleString('en-IN')}</div>
              {series.oldPrice && (
                <div className="sc-price-tag">
                  -{Math.round(((series.oldPrice - series.price) / series.oldPrice) * 100)}%
                </div>
              )}
            </div>
          )}
          <button
            className="sc-btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
          >
            Details
          </button>
          {hasProgress ? (
            <>
              <button
                className={`sc-btn-primary ${primaryCls}`}
                onClick={(e) => {
                  e.stopPropagation();
                  primaryClick();
                }}
              >
                {primaryLabel}
              </button>
              <button
                className="sc-analytics-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Analytics');
                }}
              >
                📊 Analytics
              </button>
            </>
          ) : (
            <button
              className={`sc-btn-primary ${primaryCls}`}
              onClick={(e) => {
                e.stopPropagation();
                primaryClick();
              }}
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
