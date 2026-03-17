'use client';

import React from 'react';
import Link from 'next/link';

const heroStats = [
  { value: '847', label: 'Active', valueColor: '#D4AF37' },
  { value: '1.2L+', label: 'Students', valueColor: '#00D492' },
  { value: '42,980+', label: 'Tests Taken', valueColor: '#FFFFFF' },
  { value: '68%', label: 'Success Rate', valueColor: '#FF8904' },
  { value: '10', label: 'TESTS', valueColor: '#FFFFFF', labelWeight: 600 },
];

const activeSeries = [
  { icon: '🏛️', title: 'Prelims Assault 2026', progress: '8/20 tests done', bg: '#E9D4FF' },
  { icon: '📡', title: 'Current Affairs Radar', progress: '4/16 tests done', bg: '#D1FAE5' },
  { icon: '✍️', title: 'Ink & Insight Series', progress: 'Q/FI started', bg: '#FBCFE8' },
];

const filters = [
  { key: 'all', label: '📚 All Series' },
  { key: 'prelims', label: '🏛️ Prelims' },
  { key: 'mains', label: '✍️ Mains' },
  { key: 'current-affairs', label: '📰 Current Affairs' },
  { key: 'pyq', label: '📋 PYQ' },
  { key: 'csat', label: '📊 CSAT' },
  { key: 'foundation', label: '🏁 Foundation' },
  { key: 'gs-papers', label: '📑 GS Papers' },
  { key: 'optional', label: '🎓 Optional' },
  { key: 'free', label: '🎁 Free' },
];

const enrolledPrograms = [
  {
    icon: '📄',
    iconBg: '#E9D4FF',
    tags: ['FULL MOCK', 'OPEN'],
    statusTag: 'OPEN' as const,
    title: 'Prelims(llr)z 2026',
    stats: { count: '16.3K', tests: '20 Tests', duration: '2 Months', rating: '4.9' },
    description: '200-question Full Prelims mocks with All-India rank, negative marking simulation, video solutions and AI analysis.',
    price: '₹1,299',
    originalPrice: null,
    discount: null,
    enrolled: true,
  },
  {
    icon: '📡',
    iconBg: '#DBEAFE',
    tags: ['CURRENT AFFAIRS', 'LIVE'],
    statusTag: 'LIVE' as const,
    title: 'Current Affairs Radar',
    stats: { count: '2.1K', tests: '16 Tests', duration: 'Ongoing', rating: '4.8' },
    description: 'Weekly current affairs MCQs from The Hindu, PIB & Yojana. 30 questions per test covering editorial analysis and news events.',
    price: '₹1,199',
    originalPrice: '₹1,999',
    discount: '-40%',
    enrolled: true,
  },
  {
    icon: '✍️',
    iconBg: '#FEF3C7',
    tags: ['MAINS', 'DAILY LIVE', 'OPEN'],
    statusTag: 'DAILY LIVE' as const,
    title: 'Ink & Insight Series',
    stats: { count: '3.8K', tests: '180 Tests', duration: '6 Months', rating: '4.8' },
    description: '2 answer-writing questions daily, evaluated by experts within 24 hrs. Keywords, model answers & personalized feedback.',
    price: '₹1,799',
    originalPrice: '₹3,499',
    discount: '-49%',
    enrolled: true,
  },
];

const explorePrograms = [
  { icon: '📜', iconBg: '#E9D4FF', tags: ['PYQ', 'OPEN'], statusTag: 'OPEN' as const, title: 'PYQ Decoder Pro', stats: { count: '8.2K', tests: '12 Tests', duration: '1 Month', rating: '4.9' }, description: 'Topic-wise PYQ mocks with detailed solutions.', price: '₹999', originalPrice: '₹1,299', discount: '-23%', free: false },
  { icon: '🎯', iconBg: '#D1FAE5', tags: ['CONCEPT', 'FREE'], statusTag: 'Free' as const, title: 'Zero Se Hero Series', stats: { count: '5.1K', tests: '30 Tests', duration: 'Ongoing', rating: '4.7' }, description: 'Foundation building with NCERT-aligned tests.', price: 'Free - No Fees', originalPrice: null, discount: null, free: true },
  { icon: '📐', iconBg: '#DBEAFE', tags: ['CSAT', 'OPEN'], statusTag: 'OPEN' as const, title: 'CSAT Crack Code', stats: { count: '4.3K', tests: '15 Tests', duration: '2 Months', rating: '4.8' }, description: 'Dedicated CSAT paper practice and strategy.', price: '₹799', originalPrice: '₹1,299', discount: '-38%', free: false },
  { icon: '📋', iconBg: '#FEF3C7', tags: ['MAINS', 'OPENS FEB 2026', 'ENROLLING'], statusTag: 'ENROLLING' as const, title: 'Mains Manifest Series', stats: { count: '1.2K', tests: '90 Tests', duration: '4 Months', rating: '4.9' }, description: 'GS I–IV + Essay mocks with evaluation.', price: '₹2,999', originalPrice: '₹4,999', discount: '-40%', free: false },
  { icon: '📚', iconBg: '#E9D4FF', tags: ['GS PAPER', 'OPEN'], statusTag: 'OPEN' as const, title: 'GS Masterstroke Series', stats: { count: '6.4K', tests: '48 Tests', duration: '3 Months', rating: '4.8' }, description: 'Subject-wise GS papers with rank and analysis.', price: '₹1,499', originalPrice: '₹2,999', discount: '-50%', free: false },
  { icon: '✍️', iconBg: '#FEF3C7', tags: ['MAINS', 'OPEN'], statusTag: 'OPEN' as const, title: 'Ink & Insight Series', stats: { count: '3.8K', tests: '180 Tests', duration: '6 Months', rating: '4.8' }, description: 'Daily answer writing with expert evaluation.', price: '₹1,799', originalPrice: '₹3,499', discount: '-49%', free: false },
];

export default function TestSeriesPage() {
  return (
    <div
      style={{
        background: '#F9FAFB',
        minHeight: 'calc(100vh - 111px)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              width: 1687,
              margin: '0 auto',
              padding: '35px 24px 48px',
              boxSizing: 'border-box',
            }}
          >
            {/* Hero */}
            <div
              style={{
                width: 1623,
                height: 297,
                marginBottom: 32,
                borderRadius: 16,
                background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)',
                display: 'flex',
                gap: 24,
                padding: 24,
                boxSizing: 'border-box',
              }}
            >
              {/* Left */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      fontSize: 14,
                      lineHeight: '20px',
                      color: '#0B1120',
                      background: '#FDC700',
                      padding: '4px 12px',
                      borderRadius: 6,
                      marginBottom: 16,
                    }}
                  >
                    ⚡ TEST SERIES · ALL PROGRAMS
                  </span>
                  <h1
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 700,
                      fontSize: 48,
                      lineHeight: '48px',
                      color: '#FFFFFF',
                      marginBottom: 8,
                    }}
                  >
                    Choose Your <span style={{ color: '#FDC700', fontStyle: 'italic' }}>Battle Plan.</span>
                  </h1>
                  <p
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: '20px',
                      color: '#D1D5DC',
                      maxWidth: 655,
                      marginBottom: 16,
                    }}
                  >
                    From NCERT foundations to full Prelims war-room simulations — each series is crafted to mirror real UPSC patterns. Rise every day. Rise with Jeet.
                  </p>
                </div>
                {/* Stats strip */}
                <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: '0.8px solid #364153' }}>
                  {heroStats.map((card, index) => (
                    <div
                      key={card.label}
                      style={{
                        width: index === 0 ? 117.375 : index === 1 ? 144.8 : index === 2 ? 181.225 : index === 3 ? 160 : 107,
                        height: 101.5875,
                        background: '#1C273B',
                        borderTop: '0.8px solid #364153',
                        padding: '24.8px 32.8px 0.8px',
                        borderLeft: index === 0 ? undefined : '0.8px solid #364153',
                        borderTopLeftRadius: index === 0 ? 14 : 0,
                        borderBottomLeftRadius: index === 0 ? 14 : 0,
                        borderTopRightRadius: index === heroStats.length - 1 ? 14 : 0,
                        borderBottomRightRadius: index === heroStats.length - 1 ? 14 : 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Inter',
                          fontWeight: 700,
                          fontSize: index === heroStats.length - 1 ? 36 : 30,
                          lineHeight: index === heroStats.length - 1 ? '40px' : '36px',
                          color: card.valueColor,
                        }}
                      >
                        {card.value}
                      </span>
                      <span
                        style={{
                          fontFamily: 'Inter',
                          fontWeight: (card as { labelWeight?: number }).labelWeight ?? 400,
                          fontSize: 12,
                          lineHeight: '16px',
                          color: index === heroStats.length - 1 ? '#99A1AF' : '#6A7282',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          marginTop: 4,
                        }}
                      >
                        {card.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Your Active Series */}
              <div
                style={{
                  width: 256,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 800,
                    fontSize: 28,
                    lineHeight: '32px',
                    letterSpacing: '0px',
                    color: '#FF8904',
                    textTransform: 'uppercase',
                  }}
                >
                  ⚡&nbsp; YOUR ACTIVE SERIES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeSeries.map((s) => (
                    <Link
                      key={s.title}
                      href="/dashboard/test-series"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '22px 22px',
                        borderRadius: 24,
                        border: '2px solid rgba(255,255,255,0.16)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                        textDecoration: 'none',
                        color: 'inherit',
                        height: 140,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: 14,
                          background: s.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 34,
                          flexShrink: 0,
                        }}
                      >
                        {s.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 38, lineHeight: '44px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.title}
                        </div>
                        <div style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 34, lineHeight: '40px', color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
                          {s.progress}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'Inter', fontSize: 44, lineHeight: '44px', color: 'rgba(255,255,255,0.55)', marginLeft: 12 }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                padding: '12px 0',
                width: 1639,
              }}
            >
              {filters.map((f, i) => (
                <button
                  key={f.key}
                  type="button"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: '20px',
                    height: 37.6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 26843500,
                    padding: '8px 16px',
                    boxSizing: 'border-box',
                    color: i === 0 ? '#FFFFFF' : '#364153',
                    background: i === 0 ? '#101828' : '#FFFFFF',
                    border: i === 0 ? '0.8px solid #101828' : '0.8px solid #E5E7EB',
                    borderTop: i === 0 ? '0.8px solid #101828' : '0.8px solid #E5E7EB',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href="/dashboard/test-analytics"
                  style={{
                    height: 38,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 10,
                    padding: '8px 16px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: '#364153',
                    background: 'linear-gradient(89.92deg, #F1A901 0.07%, #FD7302 99.93%)',
                    border: '0.8px solid #E5E7EB',
                    borderTop: '0.8px solid #E5E7EB',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📊&nbsp; Analytics
                </Link>
              </div>
            </div>

            {/* Content block (matches #F9FAFB 1639×2214) */}
            <div
              style={{
                width: 1639,
                minHeight: 2214,
                background: '#F9FAFB',
                boxSizing: 'border-box',
              }}
            >
              {/* Your Enrolled Series */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8, width: 1639 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 18,
                        height: 18,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F97316',
                        fontSize: 18,
                        lineHeight: '18px',
                        flexShrink: 0,
                      }}
                    >
                      🧡
                    </span>
                    <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828', margin: 0, whiteSpace: 'nowrap' }}>
                      Your Enrolled Series
                    </h2>
                  </div>
                  <Link href="/dashboard/test-series" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#155DFC', textDecoration: 'none' }}>View all →</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 524px)', gap: 24, width: 1639 }}>
                  {enrolledPrograms.map((p) => (
                    <ProgramCard key={p.title} program={p} enrolled />
                  ))}
                </div>
              </div>

              {/* Explore All Programs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span aria-hidden="true" style={{ fontSize: 18, lineHeight: '18px' }}>🧭</span>
                  <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, lineHeight: '28px', color: '#101828', margin: 0 }}>Explore All Programs</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 524px)', gap: 24, width: 1639 }}>
                  {explorePrograms.map((p, idx) => (
                    <ProgramCard key={'explore-' + idx} program={p} enrolled={false} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const statusTagStyles: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: '#D1FAE5', color: '#065F46' },
  LIVE: { bg: '#FEE2E2', color: '#991B1B' },
  'DAILY LIVE': { bg: '#FEE2E2', color: '#991B1B' },
  ENROLLING: { bg: '#FFEDD5', color: '#9A3412' },
  Free: { bg: '#D1FAE5', color: '#065F46' },
};

function ProgramCard({
  program,
  enrolled,
}: {
  program: {
    icon: string;
    iconBg?: string;
    tags: string[];
    statusTag?: string;
    title: string;
    stats: { count: string; tests: string; duration: string; rating: string };
    description: string;
    price: string;
    originalPrice: string | null;
    discount: string | null;
    enrolled?: boolean;
    free?: boolean;
  };
  enrolled: boolean;
}) {
  const statusStyle = program.statusTag ? statusTagStyles[program.statusTag] ?? { bg: '#F3F4F6', color: '#374151' } : { bg: '#F3F4F6', color: '#374151' };
  const categoryLine = program.tags.join(' · ');
  const descriptionWidth = program.title === 'Ink & Insight Series' ? 473 : 484;
  return (
    <div
      style={{
        width: 524,
        minHeight: 303,
        borderRadius: 24,
        border: '0.8px solid #E5E7EB',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0px 2px 4px -2px rgba(0,0,0,0.10), 0px 4px 6px -1px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 84.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.8px 24px 0px',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FAF5FF 100%)',
          borderBottom: '0.8px solid #E5E7EB',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
              boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px rgba(0,0,0,0.10)',
            }}
          >
            {program.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                color: '#101828',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {program.title}
            </h3>
            <div style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#99A1AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {categoryLine}
            </div>
          </div>
        </div>
        {program.statusTag && (
          <span
            style={{
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 12,
              lineHeight: '16px',
              color: statusStyle.color,
              background: statusStyle.bg,
              padding: '6px 12px',
              borderRadius: 10,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {program.statusTag}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '24px 24px 0px', boxSizing: 'border-box', flex: 1 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#364153', marginBottom: 12 }}>
          <span>👥 {program.stats.count}</span>
          <span>📄 {program.stats.tests}</span>
          <span>🕐 {program.stats.duration}</span>
          <span>★ {program.stats.rating}</span>
        </div>
        <p
          style={{
            width: descriptionWidth,
            height: 46,
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '22.75px',
            color: '#6A7282',
            margin: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {program.description}
        </p>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-playfair), "Playfair Display", serif', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>{program.price}</span>
          {program.originalPrice && (
            <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 13, color: '#9CA3AF', textDecoration: 'line-through' }}>{program.originalPrice}</span>
          )}
          {program.discount && (
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: 4 }}>{program.discount}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {enrolled ? (
            <>
              <button type="button" style={{ width: 101, height: 40, fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: '#4A5565', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>📊 Analytics</button>
              <button type="button" style={{ width: 113.4, height: 40, fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: '#FFFFFF', background: '#1E2939', border: 'none', borderRadius: 10, cursor: 'pointer' }}>▶ Resume</button>
            </>
          ) : (
            <>
              <button type="button" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Details</button>
              <button type="button" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: program.free ? '#065F46' : '#FFFFFF', background: program.free ? '#D1FAE5' : '#101828', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>{program.free ? '► Start Free' : '► Enroll Now'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
