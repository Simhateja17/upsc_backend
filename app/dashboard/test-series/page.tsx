'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../styles/test-series-v2.css';

// Import font from Google Fonts for Playfair Display
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', style: ['normal', 'italic'] });

// Test Series Data
const SERIES_DATA = [
  {
    id: 'ncert',
    cat: 'foundation',
    name: 'जड़ें मज़बूत Series',
    nameEn: 'NCERT Foundation Blitz',
    tagline: 'Build roots so strong, no examiner can shake you.',
    icon: '📖',
    cardGrad: 'linear-gradient(135deg,#d4e9df 0%,#b8d9c8 100%)',
    color: '#2D6A4F',
    colorBg: '#F0FDF4',
    tags: ['NCERT Cl.6–12', 'All Subjects', 'Chapter-wise'],
    diff: 'Beginner',
    tests: 60,
    dur: '3 Months',
    enrolled: 4820,
    rating: 4.8,
    reviews: 312,
    status: 'open',
    progress: null,
    price: 799,
    oldPrice: 1499,
    desc: 'Chapter-wise NCERT tests covering Polity, History, Geography, Economy & Science. Concept explanations with every question.',
  },
  {
    id: 'current',
    cat: 'current-affairs',
    name: 'Rozana Ladon Series',
    nameEn: 'Daily Current Affairs Challenge',
    tagline: 'Every day is a new battle — fight it with knowledge.',
    icon: '📰',
    cardGrad: 'linear-gradient(135deg,#ddd6f3 0%,#c9bfee 100%)',
    color: '#9A3412',
    colorBg: '#FFF7ED',
    tags: ['Daily 10 Qs', 'The Hindu · PIB', 'Monthly Test'],
    diff: 'Intermediate',
    tests: 365,
    dur: '1 Year',
    enrolled: 11240,
    rating: 4.9,
    reviews: 824,
    status: 'open',
    progress: 34,
    price: 1199,
    oldPrice: 2499,
    desc: 'Daily 10 MCQs from The Hindu, PIB & Yojana. Weekly 40-Q recaps and monthly 100-Q mega test.',
  },
  {
    id: 'pyq',
    cat: 'pyq',
    name: 'Topper Ki Pathshala',
    nameEn: 'PYQ Challenge Series',
    tagline: "The examiner's mind is hidden in old questions.",
    icon: '🏛️',
    cardGrad: 'linear-gradient(135deg,#fde8c8 0%,#f5d5a0 100%)',
    color: '#B45309',
    colorBg: '#FFFBEB',
    tags: ['PYQ 1979–2025', 'Trend Analysis', 'All Subjects'],
    diff: 'Advanced',
    tests: 45,
    dur: '2 Months',
    enrolled: 7634,
    rating: 4.9,
    reviews: 580,
    status: 'open',
    progress: null,
    price: 999,
    oldPrice: 1999,
    desc: 'Complete UPSC PYQ bank 1979–2025. Topic-wise & year-wise tests with trend analysis and frequency mapping.',
  },
  {
    id: 'prelims',
    cat: 'mock',
    name: 'PrelimsBlitz 2026',
    nameEn: 'Full Mock Prelims Series',
    tagline: "Train like it's exam day — every single time.",
    icon: '⚡',
    cardGrad: 'linear-gradient(135deg,#fad5d5 0%,#f5bbbb 100%)',
    color: '#B91C1C',
    colorBg: '#FFF1F2',
    tags: ['200 Questions', 'All-India Rank', 'UPSC Pattern'],
    diff: 'Advanced',
    tests: 20,
    dur: '2 Months',
    enrolled: 14320,
    rating: 4.9,
    reviews: 1124,
    status: 'open',
    progress: 35,
    price: 1299,
    oldPrice: 2499,
    desc: '200-question full Prelims mocks with All-India Rank, negative marking simulation and video solutions.',
  },
  {
    id: 'basics',
    cat: 'foundation',
    name: 'Zero Se Hero Series',
    nameEn: 'Basics & Concepts Booster',
    tagline: 'Every topper started from zero — this is your zero.',
    icon: '🌱',
    cardGrad: 'linear-gradient(135deg,#c8eedd 0%,#a8e0c8 100%)',
    color: '#065F46',
    colorBg: '#ECFDF5',
    tags: ['Beginners', 'Concept Based', 'No Neg. Marking'],
    diff: 'Beginner',
    tests: 30,
    dur: '6 Weeks',
    enrolled: 22400,
    rating: 4.6,
    reviews: 1850,
    status: 'free',
    progress: null,
    price: 0,
    oldPrice: null,
    desc: '20-question concept tests, no negative marking. Perfect Day 1 start for fresh aspirants. Fully free.',
  },
  {
    id: 'csat',
    cat: 'csat',
    name: 'CSAT Crack Code',
    nameEn: 'CSAT Mastery Program',
    tagline: 'Paper 2 fears no more — crack the code, own the exam.',
    icon: '🧮',
    cardGrad: 'linear-gradient(135deg,#ccdff7 0%,#b0ceef 100%)',
    color: '#0F766E',
    colorBg: '#F0FDFA',
    tags: ['CSAT Paper II', 'Aptitude', 'Comprehension'],
    diff: 'Intermediate',
    tests: 25,
    dur: '6 Weeks',
    enrolled: 6240,
    rating: 4.7,
    reviews: 388,
    status: 'open',
    progress: null,
    price: 799,
    oldPrice: 1499,
    desc: 'Comprehension, Maths, Reasoning & Data Interpretation. CSAT full mocks with speed-building drills.',
  },
  {
    id: 'daw',
    cat: 'mains',
    name: 'Ink & Insight Series',
    nameEn: 'Daily Answer Writing Program',
    tagline: 'The pen that writes every day — wins ultimately.',
    icon: '✍️',
    cardGrad: 'linear-gradient(135deg,#d0dcf8 0%,#b8c8f4 100%)',
    color: '#1D4ED8',
    colorBg: '#EEF2FF',
    tags: ['Daily Writing', 'Expert Evaluation', 'GS I–IV'],
    diff: 'Advanced',
    tests: 180,
    dur: '6 Months',
    enrolled: 3840,
    rating: 4.8,
    reviews: 260,
    status: 'open',
    progress: 12,
    price: 1799,
    oldPrice: 3499,
    desc: '2 answer-writing questions daily, evaluated by experts within 24 hrs. Keywords, model answers & feedback.',
  },
  {
    id: 'mains',
    cat: 'mains',
    name: 'Mains Manifest Series',
    nameEn: 'Full Mains Test Series 2026',
    tagline: 'Manifest your IAS selection — write your destiny.',
    icon: '🗺️',
    cardGrad: 'linear-gradient(135deg,#e2d4f5 0%,#d0bef0 100%)',
    color: '#4C1D95',
    colorBg: '#F5F3FF',
    tags: ['Mains 2026', 'GS I–IV', 'Expert Evaluated'],
    diff: 'Expert',
    tests: 12,
    dur: '3 Months',
    enrolled: 2640,
    rating: 4.9,
    reviews: 190,
    status: 'enrolling',
    progress: null,
    price: 2999,
    oldPrice: 5999,
    desc: 'Full-length GS I–IV + Essay mocks evaluated by Ex-IAS officers. All-India Mains Rank after each paper.',
  },
  {
    id: 'gsfoundation',
    cat: 'gs',
    name: 'GS Masterstroke Series',
    nameEn: 'GS Foundation Mastery',
    tagline: 'Four papers, one warrior — dominate every front.',
    icon: '⚔️',
    cardGrad: 'linear-gradient(135deg,#ccdaf5 0%,#b4c8f0 100%)',
    color: '#1E3A5F',
    colorBg: '#EFF6FF',
    tags: ['GS I', 'GS II', 'GS III', 'GS IV'],
    diff: 'Intermediate',
    tests: 80,
    dur: '4 Months',
    enrolled: 5920,
    rating: 4.7,
    reviews: 420,
    status: 'open',
    progress: null,
    price: 1499,
    oldPrice: 2999,
    desc: 'Subject-wise tests across all 4 GS Papers — Prelims MCQs + Mains answer writing in one series.',
  },
];

const FILTERS = [
  { id: 'all', label: 'All Series' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'current-affairs', label: 'Current Affairs' },
  { id: 'pyq', label: 'PYQ' },
  { id: 'mock', label: 'Full Mocks' },
  { id: 'mains', label: 'Mains' },
  { id: 'csat', label: 'CSAT' },
  { id: 'gs', label: 'GS Papers' },
];

export default function TestSeriesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filteredSeries = filter === 'all' ? SERIES_DATA : SERIES_DATA.filter((s) => s.cat === filter);

  const handleStartTest = (seriesId: string) => {
    router.push(`/dashboard/mock-tests/attempt?series=${seriesId}`);
  };

  return (
    <div className={`${plusJakarta.variable} ${playfair.variable}`} style={{ fontFamily: 'var(--font-plus-jakarta), sans-serif', background: 'var(--bg)', minHeight: 'calc(100vh - 111px)', padding: '28px 20px 100px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div className="cat-hero fade">
          <div className="ch-noise"></div>
          <div className="ch-line"></div>
          <div className="ch-inner">
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div className="ch-eyebrow">
                <span className="ch-dot"></span>
                India&apos;s Smartest UPSC Test Platform · 2026
              </div>
              <h1 className="ch-h1">
                Rise with <span className="it">Jeet</span> —<br />
                Test Series That <span className="it">Transforms</span>
              </h1>
              <p className="ch-sub">10 battle-tested series. 600+ tests. From NCERT basics to Mains writing — every step of your UPSC journey covered with intelligence, analytics & mentorship.</p>
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
                  <span className="chpv" style={{ color: '#86EFAC' }}>
                    80K+
                  </span>
                  <span className="chpl">Students</span>
                </div>
                <div className="chp">
                  <span className="chpv" style={{ color: '#FCD34D' }}>
                    340+
                  </span>
                  <span className="chpl">Selections</span>
                </div>
                <div className="chp">
                  <span className="chpv" style={{ color: '#FCD34D' }}>
                    4.9 ★
                  </span>
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
                <circle cx="54" cy="54" r="42" fill="none" stroke="url(#rg)" strokeWidth="7" strokeDasharray="263.9" strokeDashoffset="47.5" strokeLinecap="round" />
              </svg>
              <div className="ch-ring-lbl">
                <span className="ch-ring-v">340+</span>
                <span className="ch-ring-s">Selections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="fbar fade d1">
          {FILTERS.map((f) => (
            <button key={f.id} className={`fb ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Series Grid */}
        <div className="sgrid">
          {filteredSeries.map((series, i) => (
            <SeriesCard key={series.id} series={series} index={i} onStartTest={handleStartTest} />
          ))}
        </div>
      </div>

      {/* Toast (for notifications) */}
      <div className="toast" id="toast"></div>
    </div>
  );
}

// Series Card Component
function SeriesCard({ series, index, onStartTest }: { series: any; index: number; onStartTest: (id: string) => void }) {
  const router = useRouter();
  const delay = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'][index % 6];

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

  const statusMap: Record<string, string> = {
    open: 'Open',
    live: 'Live',
    free: 'Free',
    enrolling: 'Enrolling',
    upcoming: 'Upcoming',
  };
  const statusLabel = statusMap[series.status] || 'Open';
  const dotCls = series.status === 'live' ? 'live' : series.status === 'free' ? 'free' : '';

  const done = series.progress !== null ? Math.round((series.tests * series.progress) / 100) : 0;
  const left = series.progress !== null ? series.tests - done : series.tests;
  const progPct = series.progress || 0;
  const hasProgress = series.progress !== null;

  const isFree = series.price === 0;

  const handleCardClick = () => {
    router.push(`/dashboard/test-series/${series.id}`);
  };

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFree || hasProgress) {
      onStartTest(series.id);
    } else {
      // Open payment modal (implement later)
      alert(`Enroll in ${series.name}`);
    }
  };

  return (
    <div className={`sc fade ${delay}`} onClick={handleCardClick}>
      {/* DARK HEADER BAND */}
      <div className="sc-header" style={{ background: series.cardGrad }}>
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
        <div className="sc-desc">{series.desc}</div>

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
          <div className="sc-prog-fill" style={{ width: `${progPct}%`, background: hasProgress ? '#4F46E5' : '#E4E4E7' }}></div>
        </div>

        {/* FOOTER: price + buttons */}
        <div className="sc-foot">
          {!isFree && (
            <div className="sc-price-block">
              {series.oldPrice && <div className="sc-price-old">₹{series.oldPrice}</div>}
              <div className="sc-price-new">₹{series.price.toLocaleString('en-IN')}</div>
              {series.oldPrice && <div className="sc-price-tag">-{Math.round(((series.oldPrice - series.price) / series.oldPrice) * 100)}%</div>}
            </div>
          )}
          {isFree && <div className="sc-price-free">FREE</div>}
          <button
            className="sc-btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/test-series/${series.id}`);
            }}
          >
            Details
          </button>
          {hasProgress ? (
            <>
              <button className="sc-btn-primary resume" onClick={handlePrimaryAction}>
                ▶ Resume
              </button>
              <button
                className="sc-analytics-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/test-series/${series.id}/results/1`);
                }}
              >
                📊 Analytics
              </button>
            </>
          ) : (
            <button className={`sc-btn-primary ${isFree ? 'free' : ''}`} onClick={handlePrimaryAction}>
              {isFree ? '▶ Start Free' : 'Enroll Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
