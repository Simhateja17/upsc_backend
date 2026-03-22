'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { TestSeries } from '@/types/test-series';
import { TEST_SERIES_DATA } from '@/data/test-series-data';
import '../../../../styles/test-series.css';

export default function TestSeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;
  
  const series = TEST_SERIES_DATA.find(s => s.id === seriesId);
  
  if (!series) {
    return (
      <div className="wrap page">
        <h1>Test Series Not Found</h1>
        <Link href="/dashboard/test-series-new">← Back to Test Series</Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="wrap page">
        <BackNav series={series} />
        <DetailHero series={series} />
        
        <div className="detail-layout">
          {/* MAIN CONTENT */}
          <MainContent series={series} />
          
          {/* STICKY SIDEBAR */}
          <SidebarEnrollCard 
            series={series}
            onEnroll={() => router.push(`/dashboard/test-series-new/${series.id}/payment`)}
            onStartTest={() => router.push(`/dashboard/test-series-new/${series.id}/attempt`)}
          />
        </div>
      </div>
    </div>
  );
}

function BackNav({ series }: { series: TestSeries }) {
  return (
    <div className="back-nav fade">
      <Link href="/dashboard/test-series-new" className="back-btn">
        ← Back
      </Link>
      <div className="bcrumb">
        <Link href="/dashboard/test-series-new" className="bc-item">
          Test Series
        </Link>
        <span className="bc-sep"> › </span>
        <span className="bc-cur">{series.nameEn}</span>
      </div>
    </div>
  );
}

function DetailHero({ series }: { series: TestSeries }) {
  return (
    <div 
      className="dh fade" 
      style={{ 
        background: `linear-gradient(140deg,${series.gradFrom} 0%,${series.gradTo} 100%)`,
        marginBottom: '28px'
      }}
    >
      <div className="dh-noise"></div>
      <div className="dh-glow"></div>
      <div className="dh-inner">
        <div className="dh-eyebrow">
          {series.icon} {series.nameEn}
        </div>
        <h1 className="dh-h1">
          <span className="it">{series.name.split(' ')[0]}</span> {series.name.split(' ').slice(1).join(' ')}
        </h1>
        <p className="dh-tagline">"{series.tagline}"</p>
        <div className="dh-meta-row">
          <span className="dh-meta-item">📝 {series.tests} Tests</span>
          <span className="dh-meta-item">⏱ {series.dur}</span>
          <span className="dh-meta-item">👥 {series.enrolled.toLocaleString()} enrolled</span>
          <span className="dh-meta-item">★ {series.rating} ({series.reviewCount} reviews)</span>
          <span className="dh-meta-item">📊 {series.diff}</span>
        </div>
        <div className="dh-tags">
          {series.tags.map((t, i) => (
            <span key={i} className="dh-tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MainContent({ series }: { series: TestSeries }) {
  const [openAccordion, setOpenAccordion] = useState(0);

  return (
    <div>
      {/* Quick stats */}
      <div className="stats-row fade d1">
        <div className="stat-box">
          <div className="stat-v" style={{ color: series.color }}>{series.tests}</div>
          <div className="stat-l">Total Tests</div>
        </div>
        <div className="stat-box">
          <div className="stat-v">{series.dur}</div>
          <div className="stat-l">Duration</div>
        </div>
        <div className="stat-box">
          <div className="stat-v" style={{ color: '#059669' }}>{series.enrolled.toLocaleString()}</div>
          <div className="stat-l">Students</div>
        </div>
        <div className="stat-box">
          <div className="stat-v" style={{ color: '#D97706' }}>{series.rating} ★</div>
          <div className="stat-l">{series.reviewCount} Reviews</div>
        </div>
      </div>

      {/* WHY ENROLL */}
      <div className="card fade d1">
        <div className="sec-title">
          <div className="sec-ico" style={{ background: series.colorBg }}>💡</div>
          Why enroll in {series.name}?
        </div>
        <div className="why-grid">
          {series.features.map((f, i) => (
            <div key={i} className="why-item">
              <div className="why-num">{i + 1}</div>
              <div>
                <div className="why-title">
                  {['Purpose-built tests', 'Deep analytics', 'Rank & benchmarking', 'Expert insights', 'Language support'][i] || 'Smart Feature'}
                </div>
                <div className="why-desc">{f}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SCHEDULE */}
      <div className="card fade d2">
        <div className="sec-title">
          <div className="sec-ico" style={{ background: '#EEF2FF' }}>📅</div>
          Test Schedule
        </div>
        <table className="sch-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Test Name</th>
              <th>Date</th>
              <th>Qs</th>
              <th>Time</th>
              <th>Status</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {series.schedule.map((t) => (
              <tr key={t.no}>
                <td style={{ color: 'var(--text4)', fontWeight: 700 }}>{t.no}</td>
                <td className="tname">{t.name}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{t.date}</td>
                <td style={{ fontWeight: 700 }}>{t.qs}</td>
                <td>{t.dur}</td>
                <td>
                  <span className={`sch-badge sb-${t.status}`}>
                    {t.status === 'done' && '✓ Completed'}
                    {t.status === 'live' && '● Live Now'}
                    {t.status === 'open' && 'Attempt'}
                    {t.status === 'upcoming' && 'Upcoming'}
                    {t.status === 'locked' && 'Locked'}
                  </span>
                </td>
                <td style={{ fontWeight: 800, color: t.score ? series.color : 'var(--text4)' }}>
                  {t.score || '—'}
                </td>
                <td>
                  {(t.status === 'open' || t.status === 'live') && (
                    <Link href={`/dashboard/test-series-new/${series.id}/attempt`}>
                      <button className="tbl-btn tb-attempt">▶ Attempt</button>
                    </Link>
                  )}
                  {t.status === 'done' && (
                    <button className="tbl-btn tb-view">Analysis</button>
                  )}
                  {t.status === 'upcoming' && (
                    <span style={{ fontSize: '.67rem', color: 'var(--text4)' }}>Remind me</span>
                  )}
                  {t.status === 'locked' && (
                    <button className="tbl-btn tb-locked">🔒 Locked</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          marginTop: 12,
          padding: '10px 13px',
          background: 'var(--indigop)',
          borderRadius: 8,
          border: '1px solid var(--indigom)',
          fontSize: '.71rem',
          color: 'var(--indigo)'
        }}>
          ℹ️ Showing {series.schedule.length} of {series.tests} total tests. Full schedule unlocks after enrollment.
        </div>
      </div>

      {/* SYLLABUS */}
      <div className="card fade d3">
        <div className="sec-title">
          <div className="sec-ico" style={{ background: '#FFFBEB' }}>📚</div>
          Detailed Syllabus
        </div>
        {series.syllabus.map((u, i) => (
          <div key={i} className="acc">
            <div className="acc-h" onClick={() => setOpenAccordion(openAccordion === i ? -1 : i)}>
              <div className="acc-hl">
                <div className="acc-num">{i + 1}</div>
                <div>
                  <div className="acc-ttl">{u.u}</div>
                  <div className="acc-sub">{u.sub}</div>
                </div>
              </div>
              <div className={`acc-arr ${openAccordion === i ? 'open' : ''}`}>▼</div>
            </div>
            <div className={`acc-body ${openAccordion === i ? 'open' : ''}`}>
              {u.topics.map((t, ti) => (
                <div key={ti} className="acc-topic">{t}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* REVIEWS */}
      <ReviewsSection series={series} />

      {/* LEADERBOARD */}
      <LeaderboardSection series={series} />
    </div>
  );
}

function ReviewsSection({ series }: { series: TestSeries }) {
  return (
    <div className="card fade d3">
      <div className="sec-title">
        <div className="sec-ico" style={{ background: '#FFFBEB' }}>⭐</div>
        Student Reviews
      </div>
      <div className="rev-summary">
        <div className="rev-score">
          <div className="rev-big">{series.rating}</div>
          <div className="rev-stars-big">
            {'★'.repeat(Math.floor(series.rating))}
            {'☆'.repeat(5 - Math.floor(series.rating))}
          </div>
          <div className="rev-count">{series.reviewCount.toLocaleString()} ratings</div>
        </div>
        <div>
          <div className="rev-cards">
            {series.reviews.map((r, i) => (
              <div key={i} className="rev-card">
                <div className="rev-top">
                  <div>
                    <div className="rev-name">{r.name}</div>
                    <div className="rev-rank">🎯 {r.rank}</div>
                  </div>
                  <div style={{ color: 'var(--amber2)', fontSize: '.78rem' }}>
                    {'★'.repeat(r.stars)}
                  </div>
                </div>
                <div className="rev-text">"{r.text}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSection({ series }: { series: TestSeries }) {
  const rankColors = ['#D97706', '#9CA3AF', '#CD7F32'];
  const rankIco = ['🥇', '🥈', '🥉'];

  return (
    <div className="card fade d4">
      <div className="sec-title">
        <div className="sec-ico" style={{ background: '#FFFBEB' }}>🏆</div>
        Leaderboard — Top Scorers
      </div>
      {series.leaderboard[0].score === null ? (
        <div style={{ textAlign: 'center', padding: 28, color: 'var(--text3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚀</div>
          <div style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--text)' }}>
            {series.leaderboard[0].name}
          </div>
          <div style={{ fontSize: '.74rem', marginTop: 5, color: 'var(--text3)' }}>
            Enroll now to secure your spot in the leaderboard
          </div>
        </div>
      ) : (
        <>
          {series.leaderboard.map((e, i) => (
            <div key={i} className={`lb-row ${e.me ? 'lb-me-row' : ''}`}>
              <div
                className="lb-pos"
                style={{
                  background: i < 3 ? rankColors[i] : e.me ? 'var(--indigop)' : 'var(--bg2)',
                  color: i < 3 ? '#fff' : e.me ? 'var(--indigo)' : 'var(--text3)'
                }}
              >
                {i < 3 ? rankIco[i] : e.rank}
              </div>
              <div 
                className="lb-avt" 
                style={{ background: e.me ? 'var(--navy)' : 'var(--bg2)' }}
              >
                {e.me ? '👤' : '🎓'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="lb-name">
                  {e.name}
                  {e.me && (
                    <span style={{ fontSize: '.61rem', color: 'var(--indigo)', fontWeight: 800 }}>
                      {' '}(You)
                    </span>
                  )}
                </div>
                <div className="lb-city">{e.city}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lb-score" style={{ color: series.color }}>{e.score}</div>
                <div className="lb-acc">{e.acc}% acc</div>
              </div>
            </div>
          ))}
        </>
      )}
      <div style={{
        marginTop: 12,
        padding: '11px 14px',
        background: 'var(--amberp)',
        border: '1px solid var(--amberb)',
        borderRadius: 9,
        fontSize: '.72rem',
        color: 'var(--sand)',
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }}>
        <span>🏅</span> Top 100 rankers receive official rank certificates from RiseWithJeet
      </div>
    </div>
  );
}

interface SidebarEnrollCardProps {
  series: TestSeries;
  onEnroll: () => void;
  onStartTest: () => void;
}

function SidebarEnrollCard({ series, onEnroll, onStartTest }: SidebarEnrollCardProps) {
  const isFree = series.price === 0;

  return (
    <div className="sidebar">
      <div className="enroll-card fade d2">
        <div className="ec-thumb" style={{ background: series.color }}></div>
        <div className="ec-body">
          {isFree ? (
            <>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--jade)', marginBottom: 4 }}>
                FREE
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--text4)', marginBottom: 18 }}>
                No credit card · No signup fee · Lifetime access
              </div>
              <button className="ec-btn-free" onClick={onStartTest}>
                ▶ Start Now — It's Free
              </button>
              <button className="ec-btn-demo" onClick={() => console.log('Preview')}>
                Preview a Sample Test
              </button>
            </>
          ) : (
            <>
              <div className="ec-price-row">
                <div className="ec-price">₹{series.price}</div>
                {series.oldPrice && (
                  <>
                    <div className="ec-old">₹{series.oldPrice}</div>
                    <div className="ec-save">Save ₹{series.oldPrice - series.price}</div>
                  </>
                )}
              </div>
              <div className="ec-tax">Inclusive of all taxes (GST 18%)</div>
              {series.status === 'open' || series.status === 'live' || series.progress !== null ? (
                <>
                  <button className="ec-btn-enroll" onClick={onEnroll}>
                    {series.progress !== null ? 'Continue Series →' : '🚀 Enroll Now'}
                  </button>
                  <button className="ec-btn-demo" onClick={onStartTest}>
                    ▶ Try Free Demo Test
                  </button>
                </>
              ) : (
                <>
                  <button className="ec-btn-enroll" onClick={onEnroll}>
                    📝 Register Interest
                  </button>
                  <button className="ec-btn-demo" onClick={() => console.log('Notify')}>
                    🔔 Notify Me on Launch
                  </button>
                </>
              )}
              <div className="terms-notice">
                By enrolling you agree to our <span className="terms-link">Terms & Conditions</span> and{' '}
                <span className="terms-link">Refund Policy</span>. Digital product — access granted instantly after payment.
              </div>
            </>
          )}

          <div className="ec-includes">
            <div className="ec-inc-title">This enrollment includes</div>
            <div className="ec-inc-item">
              <span className="ec-inc-ico">📝</span>
              {series.tests} {series.price === 0 ? 'free' : 'full-access'} tests
            </div>
            <div className="ec-inc-item">
              <span className="ec-inc-ico">📊</span>
              Detailed analytics after each test
            </div>
            <div className="ec-inc-item">
              <span className="ec-inc-ico">🏆</span>
              National leaderboard & rank certificate
            </div>
            <div className="ec-inc-item">
              <span className="ec-inc-ico">📱</span>
              Web + mobile access
            </div>
            <div className="ec-inc-item">
              <span className="ec-inc-ico">♾️</span>
              Lifetime reattempt access
            </div>
            {!isFree && (
              <div className="ec-inc-item">
                <span className="ec-inc-ico">💬</span>
                WhatsApp support from mentors
              </div>
            )}
          </div>
          <div className="ec-trust">
            <span className="ec-trust-ico">🔒</span>
            Secure payment · 7-day refund policy
          </div>
        </div>
      </div>
    </div>
  );
}
