'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { testSeriesService } from '@/lib/services';
import '../../../../styles/test-series-v2.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', style: ['normal', 'italic'] });

// Extended series data with detail page fields
const getSeriesData = (id: string) => {
  const seriesMap: { [key: string]: any } = {
    ncert: {
      id: 'ncert',
      name: 'जड़ें मज़बूत Series',
      tagline: 'Build roots so strong, no examiner can shake you.',
      cat: 'foundation',
      icon: '📖',
      tests: 60,
      dur: '3 Months',
      enrolled: 4820,
      rating: 4.8,
      difficulty: 'Beginner',
      price: 799,
      oldPrice: 1499,
      tags: ['NCERT Cl.6–12', 'All Subjects', 'Chapter-wise', 'Concept Deep-dive', 'Explanation-Rich'],
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
      whyEnroll: [
        { t: 'Foundation First', d: 'UPSC Prelims requires 70% NCERT clarity. We test every line, every table.' },
        { t: 'Chapter-wise Design', d: '60 tests — 1 test per chapter. Finish NCERT with confidence.' },
        { t: 'Video Explanations', d: 'Every question explained by UPSC CSE rankers. No confusion.' },
        { t: 'Adaptive Learning', d: 'Weak topics auto-marked. Custom revision tests generated.' },
      ],
      achieve: [
        'Complete NCERT 6–12 coverage (Polity, History, Geography, Economy, Science)',
        'Detailed explanations with source book/page references',
        'Chapter-wise performance reports to track mastery',
        'Unlock Prelims-level PYQ integration',
      ],
      schedule: [
        { num: 1, name: 'NCERT Class 6 History — Ancient Civilizations', date: '1 Mar', qs: 20, time: '30 min', status: 'done', score: 18 },
        { num: 2, name: 'NCERT Class 6 Geography — Globe & Maps', date: '3 Mar', qs: 20, time: '30 min', status: 'done', score: 17 },
        { num: 3, name: 'NCERT Class 7 History — Medieval India', date: '5 Mar', qs: 20, time: '30 min', status: 'open', score: null },
        { num: 4, name: 'NCERT Class 7 Geography — Environment', date: '7 Mar', qs: 20, time: '30 min', status: 'open', score: null },
        { num: 5, name: 'NCERT Class 8 History — Modern India Begins', date: '9 Mar', qs: 20, time: '30 min', status: 'upcoming', score: null },
      ],
      syllabus: [
        { t: 'Ancient India — NCERT Class 6 & 11', n: '12 tests', topics: ['Indus Valley Civilization', 'Vedic Age & Literature', 'Mahajanapadas & Rise of Magadha', 'Mauryan Empire', 'Gupta Age & Art', 'Sangam Period & South India'] },
        { t: 'Medieval India — NCERT Class 7 & 11', n: '10 tests', topics: ['Delhi Sultanate — All Dynasties', 'Mughal Empire — Akbar to Aurangzeb', 'Bhakti & Sufi Movements', 'Architecture & Art', 'Regional Kingdoms'] },
        { t: 'Modern India — NCERT Class 8, 12', n: '18 tests', topics: ['British Rule — Company to Crown', '1857 Revolt', 'Freedom Movement 1885–1947', 'Social Reform Movements', 'Partition & Independence'] },
      ],
      faqs: [
        { q: 'Is this enough for Prelims History?', a: 'NCERT alone = 50% of History. Combine with our PYQ series for 100% coverage.' },
        { q: 'Do I get explanations?', a: 'Every question has a detailed text explanation + 2-min video solution.' },
        { q: 'Can I access on mobile?', a: 'Yes — Android, iOS & Web. Syncs across all devices.' },
      ],
      reviews: [
        { name: 'Ananya Sharma', rank: 'AIR 142, CSE 2023', stars: 5, text: 'NCERT was my weakness. This series changed everything. Cleared Prelims with 122/200 — NCERT alone gave me 60.' },
        { name: 'Rajesh Kumar', rank: 'AIR 324, CSE 2023', stars: 5, text: 'Chapter-wise tests are gold. I used to skip NCERT. This forced me to read every line.' },
      ],
      leaderboard: [
        { rank: 1, name: 'Priya Verma', city: 'Delhi', score: 1180, acc: '98.3%', medal: '🥇', isMe: false },
        { rank: 2, name: 'Arjun Mehta', city: 'Mumbai', score: 1165, acc: '97.1%', medal: '🥈', isMe: false },
        { rank: 3, name: 'Sneha Reddy', city: 'Hyderabad', score: 1142, acc: '95.2%', medal: '🥉', isMe: false },
        { rank: 12, name: 'You', city: 'Bangalore', score: 1080, acc: '90.0%', medal: '', isMe: true },
      ],
      includes: [
        '60 Chapter-wise Tests (20 Qs each)',
        'Video Solutions by UPSC Rankers',
        'All-India Rank after every test',
        'Weak Topic Tracker & Revision Tests',
        'Mobile App + Web Access',
        'Lifetime Validity — No Expiry',
      ],
    },
    current: {
      id: 'current',
      name: 'Rozana Ladon Series',
      tagline: 'Every day is a new battle — fight it with knowledge.',
      cat: 'current-affairs',
      icon: '📰',
      tests: 365,
      dur: '1 Year',
      enrolled: 11240,
      rating: 4.9,
      difficulty: 'Intermediate',
      price: 1199,
      oldPrice: 2499,
      tags: ['Daily 10 Qs', 'The Hindu', 'PIB', 'Yojana', 'Monthly Mega Tests'],
      gradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
      whyEnroll: [
        { t: 'Daily Discipline', d: '10 MCQs every morning. Just 10 minutes. No excuses.' },
        { t: 'The Hindu + PIB', d: 'Questions directly from The Hindu editorial, PIB releases, Yojana.' },
        { t: 'Weekly Recaps', d: 'Every Sunday — 40 Q weekly recap test to consolidate.' },
        { t: 'Monthly Mega Test', d: '100 Q full test at month-end. Track All-India Rank monthly.' },
      ],
      achieve: [
        '365 daily tests — 3,650+ MCQs across the year',
        'The Hindu, PIB, Yojana coverage with source links',
        '52 weekly recap tests (40 Qs each)',
        '12 monthly mega tests (100 Qs each) with All-India Rank',
      ],
      schedule: [
        { num: 1, name: 'Daily CA — 1 March 2026', date: '1 Mar', qs: 10, time: '15 min', status: 'done', score: 9 },
        { num: 2, name: 'Daily CA — 2 March 2026', date: '2 Mar', qs: 10, time: '15 min', status: 'done', score: 8 },
        { num: 3, name: 'Daily CA — 3 March 2026', date: '3 Mar', qs: 10, time: '15 min', status: 'live', score: null },
        { num: 4, name: 'Daily CA — 4 March 2026', date: '4 Mar', qs: 10, time: '15 min', status: 'upcoming', score: null },
      ],
      syllabus: [
        { t: 'Economy & Business', n: '80 days', topics: ['Budget Analysis', 'RBI Policy', 'Banking & Finance', 'Stock Market & IPOs', 'Trade & Commerce'] },
        { t: 'Polity & Governance', n: '60 days', topics: ['Parliament Sessions', 'Supreme Court Judgements', 'New Bills & Amendments', 'Government Schemes'] },
        { t: 'International Relations', n: '50 days', topics: ['India-Bilateral', 'UN & Multilateral', 'Geopolitics', 'Conflicts & Treaties'] },
      ],
      faqs: [
        { q: 'Do I get daily tests automatically?', a: 'Yes — every morning at 6 AM IST, new test unlocks. Email & app notification sent.' },
        { q: 'What if I miss a day?', a: 'No worries. All tests remain accessible. Attempt anytime within the year.' },
      ],
      reviews: [
        { name: 'Kavya Iyer', rank: 'AIR 89, CSE 2024', stars: 5, text: 'I scored 94/100 in CA section. Daily discipline is key. This series forced me to read The Hindu daily.' },
      ],
      leaderboard: [
        { rank: 1, name: 'Amit Singh', city: 'Delhi', score: 3420, acc: '94.0%', medal: '🥇', isMe: false },
        { rank: 2, name: 'Neha Gupta', city: 'Pune', score: 3380, acc: '92.9%', medal: '🥈', isMe: false },
        { rank: 8, name: 'You', city: 'Delhi', score: 3200, acc: '87.7%', medal: '', isMe: true },
      ],
      includes: [
        '365 Daily Tests (10 Qs each)',
        '52 Weekly Recaps (40 Qs each)',
        '12 Monthly Mega Tests (100 Qs)',
        'The Hindu + PIB source links',
        'All-India Rank tracking',
        '1-Year Validity',
      ],
    },
    // Add minimal data for other series
    pyq: {
      id: 'pyq',
      name: 'Topper Ki Pathshala',
      tagline: "The examiner's mind is hidden in old questions.",
      cat: 'pyq',
      icon: '🏛️',
      tests: 45,
      dur: '2 Months',
      enrolled: 7634,
      rating: 4.9,
      difficulty: 'Advanced',
      price: 999,
      oldPrice: 1999,
      tags: ['PYQ 1979–2025', 'Trend Analysis', 'All Subjects'],
      gradient: 'linear-gradient(135deg, #713f12 0%, #92400e 100%)',
      whyEnroll: [
        { t: 'Complete Bank', d: '47 years of UPSC questions — every single one.' },
        { t: 'Trend Mapping', d: 'See what UPSC loves to repeat. Pattern revealed.' },
        { t: 'Topic-wise', d: 'Test by topic (Polity — Fundamental Rights) or by year.' },
        { t: 'Must-Do PYQs', d: 'AI flags 400 "must-do" questions for shortcut prep.' },
      ],
      achieve: [
        'Complete PYQ bank 1979–2025',
        'Topic-wise & year-wise tests',
        'Trend analysis & frequency mapping',
        'Must-do question bank (AI-curated)',
      ],
      schedule: [
        { num: 1, name: 'Polity PYQs — Fundamental Rights', date: '1 Mar', qs: 25, time: '30 min', status: 'open', score: null },
        { num: 2, name: 'History PYQs — Ancient India', date: '3 Mar', qs: 30, time: '40 min', status: 'upcoming', score: null },
      ],
      syllabus: [
        { t: 'Polity PYQs', n: '8 tests', topics: ['Fundamental Rights', 'DPSP', 'Parliament', 'Judiciary', 'Centre-State Relations'] },
        { t: 'History PYQs', n: '10 tests', topics: ['Ancient', 'Medieval', 'Modern', 'Art & Culture'] },
      ],
      faqs: [
        { q: 'Are answers UPSC official?', a: 'Yes — all answer keys verified from UPSC official answer sheets.' },
      ],
      reviews: [
        { name: 'Rohit Sharma', rank: 'AIR 67, CSE 2024', stars: 5, text: 'PYQs = blueprint. I solved 2000+ PYQs from this series. Cleared Prelims with ease.' },
      ],
      leaderboard: [
        { rank: 1, name: 'Sanya Malhotra', city: 'Delhi', score: 880, acc: '97.8%', medal: '🥇', isMe: false },
        { rank: 5, name: 'You', city: 'Bangalore', score: 820, acc: '91.1%', medal: '', isMe: true },
      ],
      includes: [
        '45 PYQ Tests (topic + year-wise)',
        'Trend Analysis Dashboard',
        'Must-Do PYQ Bank (AI-curated)',
        'All-India Rank',
        'Lifetime Validity',
      ],
    },
  };

  return seriesMap[id] || null;
};

function isCmsUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export default function TestSeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params?.id as string;
  const cms = isCmsUuid(seriesId);
  const [apiData, setApiData] = useState<{
    series: Record<string, unknown>;
    schedule: { id: string; num: number; name: string; qs: number; status: string; score: number | null }[];
  } | null>(null);
  const [apiLoading, setApiLoading] = useState(cms);
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [startLoading, setStartLoading] = useState<string | null>(null);

  const series = getSeriesData(seriesId);

  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!cms) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await testSeriesService.getSeriesDetail(seriesId);
        if (!cancelled) setApiData(res.data as typeof apiData);
      } catch (e) {
        if (!cancelled) setApiErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cms, seriesId]);

  if (cms) {
    if (apiLoading) {
      return (
        <div style={{ padding: 48, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ color: '#6B7280' }}>Loading series…</p>
        </div>
      );
    }
    if (apiErr || !apiData) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Series not found</h2>
          <p style={{ color: '#6B7280' }}>{apiErr}</p>
          <Link href="/dashboard/test-series">← Back to Test Series</Link>
        </div>
      );
    }
    const s = apiData.series as Record<string, any>;
    const cmsGradient = s.gradient || 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)';
    const cmsTags: string[] = s.tags || [];
    const cmsWhyEnroll: Array<{ t: string; d: string }> = s.whyEnroll || [];
    const cmsAchievements: string[] = s.achievements || [];
    const cmsSyllabus: Array<{ t: string; n: string; topics: string[] }> = s.syllabus || [];
    const cmsFaqs: Array<{ q: string; a: string }> = s.faqs || [];
    const cmsIncludes: string[] = s.includes || [];

    return (
      <div
        className={`${plusJakarta.variable} ${playfair.variable}`}
        style={{ fontFamily: 'var(--font-plus-jakarta), sans-serif', background: 'var(--bg)', minHeight: 'calc(100vh - 111px)', padding: '28px 20px 80px' }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 8 }}>
            <button onClick={() => router.push('/dashboard/test-series')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink3)', cursor: 'pointer' }}>← Back</button>
          </div>

          {/* Hero */}
          <div className="detail-hero fu" style={{ background: cmsGradient, borderRadius: 'var(--r2)', padding: '40px 48px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div className="dh-noise"></div>
            <div className="dh-glow"></div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>
                ⚡ {(s.categoryLabel || 'SERIES').toUpperCase()}
              </div>
              <h1 className="serif" style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginBottom: 12, fontStyle: 'italic' }}>
                <em>{s.title}</em>
              </h1>
              {s.tagline && <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 20, maxWidth: 700 }}>{s.tagline}</div>}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: '0.73rem', color: 'rgba(255,255,255,0.7)' }}>
                <span>📝 {s.totalTests ?? apiData.schedule.length} Tests</span>
                <span>⏱ {s.durationLabel || 'Ongoing'}</span>
                <span>👥 {(s.enrollmentCount ?? 0).toLocaleString('en-IN')} enrolled</span>
                <span>★ {s.rating ?? '—'}</span>
                <span>📊 {s.difficulty}</span>
              </div>
              {cmsTags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cmsTags.map((tag: string, i: number) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
            {/* Left column */}
            <div>
              {/* Description */}
              <p style={{ color: '#4B5563', lineHeight: 1.7, marginBottom: 28 }}>{s.description}</p>

              {/* Why Enroll */}
              {cmsWhyEnroll.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--ink)' }}>Why Enroll?</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {cmsWhyEnroll.map((item, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{item.t}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink3)', lineHeight: 1.5 }}>{item.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {cmsAchievements.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>What You&apos;ll Achieve</h2>
                  <ul style={{ paddingLeft: 20, color: 'var(--ink2)', lineHeight: 1.8 }}>
                    {cmsAchievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {/* Test Schedule */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>Tests ({apiData.schedule.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {apiData.schedule.map((row) => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>#{row.num} · {row.name}</div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>
                          {row.qs} questions · {row.status}{row.score != null ? ` · Score ${row.score}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={startLoading === row.id}
                        onClick={async () => {
                          setStartLoading(row.id);
                          try { await testSeriesService.enroll(seriesId); } catch { /* ok */ }
                          router.push(`/dashboard/test-series/${seriesId}/attempt?test=${row.num}`);
                          setStartLoading(null);
                        }}
                        style={{ background: row.status === 'done' ? '#059669' : '#101828', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', opacity: startLoading === row.id ? 0.7 : 1 }}
                      >
                        {startLoading === row.id ? '…' : row.status === 'done' ? 'Review' : 'Start'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Syllabus */}
              {cmsSyllabus.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>Syllabus</h2>
                  {cmsSyllabus.map((mod, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{mod.t}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--ink4)' }}>{mod.n}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {mod.topics.map((topic, j) => (
                          <span key={j} style={{ background: '#F3F4F6', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', color: 'var(--ink3)' }}>{topic}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQs */}
              {cmsFaqs.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>FAQs</h2>
                  {cmsFaqs.map((faq, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between' }}>
                        {faq.q} <span>{activeFaq === i ? '−' : '+'}</span>
                      </div>
                      {activeFaq === i && <div style={{ marginTop: 8, color: 'var(--ink3)', fontSize: '0.88rem', lineHeight: 1.6 }}>{faq.a}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar — Pricing card */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  {s.price === 0 ? 'Free' : `₹${s.price?.toLocaleString('en-IN')}`}
                </div>
                {s.compareAtPrice > 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink4)', marginBottom: 12 }}>
                    <span style={{ textDecoration: 'line-through' }}>₹{s.compareAtPrice?.toLocaleString('en-IN')}</span>
                    {s.discountPercent > 0 && <span style={{ color: '#059669', fontWeight: 700, marginLeft: 8 }}>-{s.discountPercent}%</span>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try { await testSeriesService.enroll(seriesId); } catch { /* ok */ }
                    if (apiData.schedule.length > 0) {
                      router.push(`/dashboard/test-series/${seriesId}/attempt?test=1`);
                    }
                  }}
                  style={{ width: '100%', background: '#101828', color: '#fff', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', marginBottom: 16 }}
                >
                  Enroll & Start
                </button>
                {cmsIncludes.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)', marginBottom: 8 }}>This series includes:</div>
                    <ul style={{ paddingLeft: 18, fontSize: '0.8rem', color: 'var(--ink3)', lineHeight: 1.8 }}>
                      {cmsIncludes.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Series not found</h2>
        <Link href="/dashboard/test-series">← Back to Test Series</Link>
      </div>
    );
  }

  const isEnrolled = false; // TODO: Check from auth context
  const isFree = series.price === 0;
  const savePercent = series.oldPrice ? Math.round(((series.oldPrice - series.price) / series.oldPrice) * 100) : 0;

  return (
    <div
      className={`${plusJakarta.variable} ${playfair.variable}`}
      style={{ fontFamily: 'var(--font-plus-jakarta), sans-serif', background: 'var(--bg)', minHeight: 'calc(100vh - 111px)', padding: '28px 20px 100px' }}
    >
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className="back-btn"
            onClick={() => router.push('/dashboard/test-series')}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--ink3)',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div className="breadcrumb" style={{ fontSize: '0.68rem', color: 'var(--ink4)', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className="bc-link" onClick={() => router.push('/dashboard/test-series')} style={{ cursor: 'pointer', color: 'var(--ink3)' }}>
              Test Series
            </span>
            <span className="bc-sep">/</span>
            <span className="bc-cur" style={{ fontWeight: 700, color: 'var(--ink)' }}>
              {series.name}
            </span>
          </div>
        </div>

        {/* Detail Hero */}
        <div
          className="detail-hero fu"
          style={{
            background: series.gradient,
            borderRadius: 'var(--r2)',
            padding: '40px 48px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="dh-noise"></div>
          <div className="dh-glow"></div>
          <div className="dh-inner" style={{ position: 'relative', zIndex: 2 }}>
            <div
              className="dh-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '12px',
              }}
            >
              ⚡ {series.cat.toUpperCase()} SERIES
            </div>
            <h1 className="dh-h1 serif" style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginBottom: '12px', fontStyle: 'italic' }}>
              <em>{series.name}</em>
            </h1>
            <div className="dh-tagline" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '20px', maxWidth: '700px' }}>
              {series.tagline}
            </div>
            <div className="dh-meta-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '0.73rem', color: 'rgba(255,255,255,0.7)' }}>
              <span>📝 {series.tests} Tests</span>
              <span>⏱ {series.dur}</span>
              <span>👥 {series.enrolled.toLocaleString('en-IN')} enrolled</span>
              <span>★ {series.rating} ({Math.floor(series.enrolled * 0.08)} reviews)</span>
              <span>📊 {series.difficulty}</span>
            </div>
            <div className="dh-tags" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {series.tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="dh-chip"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="detail-stats fu d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="dstat" style={{ background: '#fff', borderRadius: 'var(--r)', padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div className="dstat-v" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>
              {series.tests}
            </div>
            <div className="dstat-l" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)' }}>
              Total Tests
            </div>
          </div>
          <div className="dstat" style={{ background: '#fff', borderRadius: 'var(--r)', padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div className="dstat-v" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--sky)', marginBottom: '4px' }}>
              {series.dur}
            </div>
            <div className="dstat-l" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)' }}>
              Duration
            </div>
          </div>
          <div className="dstat" style={{ background: '#fff', borderRadius: 'var(--r)', padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div className="dstat-v" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--jade)', marginBottom: '4px' }}>
              {series.enrolled.toLocaleString('en-IN')}
            </div>
            <div className="dstat-l" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)' }}>
              Students
            </div>
          </div>
          <div className="dstat" style={{ background: '#fff', borderRadius: 'var(--r)', padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div className="dstat-v" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold2)', marginBottom: '4px' }}>
              {series.rating} ★
            </div>
            <div className="dstat-l" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)' }}>
              Rating
            </div>
          </div>
        </div>

        {/* Main Layout with Sidebar */}
        <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          {/* Main Content */}
          <div>
            {/* Why Enroll */}
            <div className="dcard fu d2" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--goldbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  💡
                </div>
                Why enroll in {series.name}?
              </div>
              <div className="why-grid" style={{ display: 'grid', gap: '16px' }}>
                {series.whyEnroll.map((item: any, i: number) => (
                  <div key={i} className="why-item" style={{ display: 'flex', gap: '14px' }}>
                    <div
                      className="why-num"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--navy)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="why-t" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                        {item.t}
                      </div>
                      <div className="why-d" style={{ fontSize: '0.75rem', color: 'var(--ink3)', lineHeight: 1.5 }}>
                        {item.d}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What You Achieve */}
            <div className="dcard fu d3" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--jadebg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  🎯
                </div>
                What you will achieve
              </div>
              <div className="achieve-grid" style={{ display: 'grid', gap: '12px' }}>
                {series.achieve.map((item: string, i: number) => (
                  <div key={i} className="achieve-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span className="achieve-ico" style={{ color: 'var(--jade)', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}>
                      ✓
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink3)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Schedule */}
            <div className="dcard fu d3" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--skybg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  📅
                </div>
                Test Schedule
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sch-tbl" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Name</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qs</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.schedule.map((test: any, i: number) => {
                      const statusMap: any = { live: '● Live Now', done: '✓ Completed', open: 'Open', upcoming: 'Upcoming' };
                      const statusCls: any = { live: 'sp-live', done: 'sp-done', open: 'sp-open', upcoming: 'sp-upcoming' };
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 10px', color: 'var(--ink4)', fontSize: '0.68rem' }}>{test.num}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span className="sch-name" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)' }}>
                              {test.name}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--ink3)' }}>{test.date}</td>
                          <td style={{ padding: '12px 10px', color: 'var(--ink3)' }}>{test.qs}</td>
                          <td style={{ padding: '12px 10px', color: 'var(--ink3)' }}>{test.time}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span
                              className={`status-pill ${statusCls[test.status]}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: test.status === 'done' ? 'var(--jadebg)' : test.status === 'live' ? 'var(--rosebg)' : test.status === 'open' ? 'var(--skybg)' : 'var(--bg)',
                                color: test.status === 'done' ? 'var(--jade)' : test.status === 'live' ? 'var(--rose)' : test.status === 'open' ? 'var(--sky)' : 'var(--ink4)',
                              }}
                            >
                              {statusMap[test.status]}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--gold2)', fontWeight: 700 }}>{test.score !== null ? test.score : '—'}</td>
                          <td style={{ padding: '12px 10px' }}>
                            {test.status === 'open' || test.status === 'live' ? (
                              <button
                                className="sch-act-btn"
                                onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=${test.num}`)}
                                style={{
                                  background: 'var(--sky)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ▶ Attempt
                              </button>
                            ) : test.status === 'done' ? (
                              <button
                                className="sch-act-btn"
                                onClick={() => router.push(`/dashboard/test-series/${seriesId}/results/${test.num}`)}
                                style={{
                                  background: 'var(--goldbg)',
                                  color: 'var(--gold2)',
                                  border: '1px solid rgba(201,146,42,0.3)',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                📊 Analysis
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: 'var(--ink4)' }}>Upcoming</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', padding: '9px 12px', background: 'var(--skybg)', borderRadius: '8px', fontSize: '0.68rem', color: 'var(--sky)', border: '1px solid var(--skym)' }}>
                📋 Showing {series.schedule.length} of {series.tests} total tests. Full schedule unlocks after enrollment.
              </div>
            </div>

            {/* Detailed Syllabus */}
            <div className="dcard fu d4" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--violetbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  📖
                </div>
                Detailed Syllabus
              </div>
              <div className="acc-list">
                {series.syllabus.map((module: any, i: number) => (
                  <div key={i} className="acc" style={{ marginBottom: '10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <div
                      className="acc-hd"
                      onClick={() => setActiveAccordion(activeAccordion === i ? null : i)}
                      style={{
                        padding: '14px 18px',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div className="acc-hl" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className="acc-num"
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--navy)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div className="acc-t" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '2px' }}>
                            {module.t}
                          </div>
                          <div className="acc-s" style={{ fontSize: '0.68rem', color: 'var(--ink4)' }}>
                            {module.n}
                          </div>
                        </div>
                      </div>
                      <span className="acc-arr" style={{ fontSize: '1rem', color: 'var(--ink3)', transform: activeAccordion === i ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                        ▾
                      </span>
                    </div>
                    {activeAccordion === i && (
                      <div className="acc-body" style={{ padding: '16px 18px', background: '#fff' }}>
                        {module.topics.map((topic: string, j: number) => (
                          <div key={j} className="acc-topic" style={{ padding: '8px 12px', marginBottom: '6px', background: 'var(--bg)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--ink3)' }}>
                            • {topic}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="dcard fu d4" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--goldbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  ⭐
                </div>
                Student Reviews
              </div>
              <div className="rev-row" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px' }}>
                <div>
                  <div className="rev-big" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
                    {series.rating}
                  </div>
                  <div className="rev-stars" style={{ fontSize: '1.2rem', color: 'var(--gold2)', marginBottom: '6px' }}>
                    {'★'.repeat(Math.floor(series.rating))}
                    {'☆'.repeat(5 - Math.floor(series.rating))}
                  </div>
                  <div className="rev-cnt" style={{ fontSize: '0.7rem', color: 'var(--ink4)' }}>
                    {Math.floor(series.enrolled * 0.08).toLocaleString('en-IN')} reviews
                  </div>
                </div>
                <div className="rev-cards" style={{ display: 'grid', gap: '12px' }}>
                  {series.reviews.map((review: any, i: number) => (
                    <div key={i} className="rev-card" style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                      <div className="rev-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div className="rev-card-name" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '2px' }}>
                            {review.name}
                          </div>
                          <div className="rev-card-rank" style={{ fontSize: '0.65rem', color: 'var(--jade)', fontWeight: 600 }}>
                            {review.rank}
                          </div>
                        </div>
                        <div style={{ color: 'var(--gold2)', fontSize: '0.8rem' }}>{'★'.repeat(review.stars)}</div>
                      </div>
                      <div className="rev-card-text" style={{ fontSize: '0.75rem', color: 'var(--ink3)', lineHeight: 1.5 }}>
                        {review.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="dcard fu d5" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>
                <div className="dcard-title-ico" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--goldbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  🏆
                </div>
                Leaderboard — Mock #{series.schedule[0]?.num || 1}
              </div>
              {series.leaderboard.map((entry: any, i: number) => (
                <div
                  key={i}
                  className={`lb-row ${entry.isMe ? 'me' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    marginBottom: '8px',
                    background: entry.isMe ? 'var(--skybg)' : 'var(--bg)',
                    borderRadius: 'var(--r)',
                    border: entry.isMe ? '2px solid var(--sky)' : '1px solid var(--border)',
                  }}
                >
                  <div
                    className="lb-pos"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'var(--bg)',
                      color: entry.rank <= 3 ? '#fff' : 'var(--ink3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                    }}
                  >
                    {entry.rank <= 3 ? entry.medal : entry.rank}
                  </div>
                  <div className="lb-avt" style={{ fontSize: '1.5rem' }}>
                    {entry.medal || '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lb-name" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '2px' }}>
                      {entry.name}
                      {entry.isMe && (
                        <span style={{ fontSize: '0.6rem', background: 'var(--skybg)', color: 'var(--sky)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '6px' }}>YOU</span>
                      )}
                    </div>
                    <div className="lb-city" style={{ fontSize: '0.68rem', color: 'var(--ink4)' }}>
                      {entry.city}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lb-score" style={{ fontSize: '1rem', fontWeight: 800, color: entry.isMe ? 'var(--sky)' : 'var(--ink)', marginBottom: '2px' }}>
                      {entry.score}
                    </div>
                    <div className="lb-acc" style={{ fontSize: '0.65rem', color: 'var(--ink4)' }}>
                      {entry.acc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQs */}
            <div className="fu d5" style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>❓ Frequently Asked Questions</div>
              <div className="faq-list">
                {series.faqs.map((faq: any, i: number) => (
                  <div key={i} className="faq" style={{ marginBottom: '10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', background: '#fff' }}>
                    <div
                      className="faq-hd"
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      style={{
                        padding: '14px 18px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg)',
                      }}
                    >
                      {faq.q}
                      <span style={{ color: 'var(--ink4)', fontSize: '0.9rem' }}>{activeFaq === i ? '−' : '+'}</span>
                    </div>
                    {activeFaq === i && (
                      <div className="faq-body" style={{ padding: '14px 18px', fontSize: '0.75rem', color: 'var(--ink3)', lineHeight: 1.6 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="sidebar" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
            <div className="enroll-card" style={{ background: '#fff', borderRadius: 'var(--r2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div className="ec-top-bar" style={{ height: '8px', background: series.gradient }}></div>
              <div className="ec-body" style={{ padding: '24px' }}>
                {/* Price Block */}
                {isFree ? (
                  <>
                    <div className="ec-price-row" style={{ marginBottom: '6px' }}>
                      <div className="ec-price" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--jade)' }}>
                        FREE
                      </div>
                    </div>
                    <div className="ec-tax" style={{ fontSize: '0.68rem', color: 'var(--ink4)', marginBottom: '20px' }}>
                      No signup needed
                    </div>
                  </>
                ) : isEnrolled ? (
                  <>
                    <div className="ec-price-row" style={{ marginBottom: '6px' }}>
                      <div className="ec-price" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--jade)' }}>
                        Enrolled ✓
                      </div>
                    </div>
                    <div className="ec-tax" style={{ fontSize: '0.68rem', color: 'var(--ink4)', marginBottom: '20px' }}>
                      Full access active
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ec-price-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <div className="ec-price" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink)' }}>
                        ₹{series.price.toLocaleString('en-IN')}
                      </div>
                      {series.oldPrice && (
                        <>
                          <div className="ec-old" style={{ fontSize: '1rem', color: 'var(--ink4)', textDecoration: 'line-through' }}>
                            ₹{series.oldPrice.toLocaleString('en-IN')}
                          </div>
                          {savePercent > 0 && (
                            <div className="ec-save" style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--jadebg)', color: 'var(--jade)', padding: '3px 8px', borderRadius: '5px' }}>
                              Save ₹{(series.oldPrice - series.price).toLocaleString('en-IN')}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="ec-tax" style={{ fontSize: '0.68rem', color: 'var(--ink4)', marginBottom: '20px' }}>
                      Inclusive of all taxes (GST 18%)
                    </div>
                  </>
                )}

                {/* CTA Buttons */}
                {isFree ? (
                  <button
                    className="ec-btn-free"
                    onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=1`)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'var(--jade)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--r)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: '12px',
                    }}
                  >
                    ▶ Start Free — No Signup
                  </button>
                ) : isEnrolled ? (
                  <>
                    <button
                      className="ec-btn-enroll"
                      onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=1`)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'var(--navy)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--r)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      ▶ Continue Test Series
                    </button>
                    <button
                      className="ec-btn-demo"
                      onClick={() => router.push(`/dashboard/test-series/${seriesId}/results/1`)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      📊 View My Analytics
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="ec-btn-enroll"
                      onClick={() => alert('Payment modal will open here')}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'var(--navy)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--r)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      🚀 Enroll Now
                    </button>
                    <button
                      className="ec-btn-demo"
                      onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=1`)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      ▶ Try Free Demo Test
                    </button>
                  </>
                )}

                <div className="ec-terms" style={{ fontSize: '0.65rem', color: 'var(--ink4)', lineHeight: 1.5, marginBottom: '16px' }}>
                  By enrolling you agree to our <a style={{ color: 'var(--sky)', cursor: 'pointer' }}>Terms & Conditions</a> and <a style={{ color: 'var(--sky)', cursor: 'pointer' }}>Refund Policy</a>. Digital product — access granted instantly after payment.
                </div>

                <hr className="ec-divider" style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

                <div className="ec-inc-title" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)', marginBottom: '12px' }}>
                  This Enrollment Includes
                </div>
                {series.includes.map((item: string, i: number) => (
                  <div key={i} className="ec-inc-item" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px', fontSize: '0.72rem', color: 'var(--ink3)' }}>
                    <span className="ec-inc-ico" style={{ color: 'var(--jade)', fontWeight: 800, flexShrink: 0 }}>
                      ✓
                    </span>
                    {item}
                  </div>
                ))}

                <div className="ec-trust" style={{ marginTop: '16px', padding: '10px', background: 'var(--bg)', borderRadius: 'var(--r)', fontSize: '0.68rem', color: 'var(--ink3)', textAlign: 'center' }}>
                  🔒 Secure payment · 7-day refund policy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
