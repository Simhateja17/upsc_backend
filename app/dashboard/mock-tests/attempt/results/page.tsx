'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService } from '@/lib/services';

function CircleScore({ pct }: { pct: number }) {
  const r = 68;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: 'block' }}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx="80" cy="80" r={r} fill="none"
        stroke="#FDC700" strokeWidth="8"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text x="80" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="36" fontWeight="700" fontFamily="Inter">{pct}%</text>
      <text x="80" y="96" textAnchor="middle" fill="#99A1AF" fontSize="11" fontFamily="Inter" letterSpacing="1">SCORE</text>
    </svg>
  );
}

interface SubjectStat {
  subject: string;
  correct: number;
  total: number;
}

interface AnalysisItem {
  emoji: string;
  text: string;
}

interface ResultsData {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  netScore: string | number;
  scorePct: number;
  perfLabel: string;
  subjectStats: SubjectStat[];
  analysis: AnalysisItem[];
  testLabel?: string;
}

function MockTestResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');

  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) {
      setError('No test ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getResults(testId!);
        if (cancelled) return;

        const data = res.data;
        if (!data) {
          throw new Error('No results data returned.');
        }

        // Normalize the API response into our ResultsData shape
        const total = data.total ?? data.totalQuestions ?? 0;
        const correct = data.correct ?? data.correctCount ?? 0;
        const wrong = data.wrong ?? data.wrongCount ?? 0;
        const skipped = data.skipped ?? data.skippedCount ?? (total - correct - wrong);
        const netScore = data.netScore ?? (correct * 2 - wrong * 0.67).toFixed(2);
        const scorePct = data.scorePct ?? data.scorePercentage ?? (total > 0 ? Math.round((correct / total) * 100) : 0);

        const perfLabel = data.perfLabel ?? data.performanceLabel ?? (
          scorePct >= 80 ? 'Excellent Work!' :
          scorePct >= 60 ? 'Good Job!' :
          scorePct >= 40 ? 'Keep Practising' :
          'Don\'t Give Up!'
        );

        // Subject stats - use API data or build from available info
        const subjectStats: SubjectStat[] = data.subjectStats ?? data.subjectWise ?? [];

        // Analysis - use API data or build fallbacks based on subject stats
        let analysis: AnalysisItem[] = data.analysis ?? data.insights ?? [];
        if (analysis.length === 0 && subjectStats.length > 0) {
          const strongest = subjectStats.reduce((a: SubjectStat, b: SubjectStat) => (a.correct / (a.total || 1)) >= (b.correct / (b.total || 1)) ? a : b);
          const weakest = subjectStats.reduce((a: SubjectStat, b: SubjectStat) => (a.correct / (a.total || 1)) <= (b.correct / (b.total || 1)) ? a : b);
          analysis = [
            { emoji: '💪', text: `Your strongest area is ${strongest.subject} — maintain momentum here.` },
            { emoji: '🔥', text: `Focus on ${weakest.subject} — 20 min daily for two weeks will show major gains.` },
            { emoji: '🎯', text: 'Accuracy is improving. Attempt similar difficulty tests to consolidate.' },
            { emoji: '🏆', text: 'Top rankers average 82%+. You\'re building momentum!' },
          ];
        }

        setResults({
          total,
          correct,
          wrong,
          skipped,
          netScore: typeof netScore === 'number' ? netScore.toFixed(2) : netScore,
          scorePct,
          perfLabel,
          subjectStats,
          analysis,
          testLabel: data.testLabel ?? 'Prelims · Daily MCQ',
        });
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load results:', err);
          setError(err.message || 'Failed to load test results.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadResults();
    return () => { cancelled = true; };
  }, [testId]);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading results...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error || !results) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#101828', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '400px', textAlign: 'center' }}>{error || 'Could not load results.'}</p>
        <button
          onClick={() => router.push('/dashboard/mock-tests')}
          style={{
            background: '#0F172B',
            color: '#FFF',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Back to Mock Tests
        </button>
      </div>
    );
  }

  const { total, correct, wrong, skipped, netScore, scorePct, perfLabel, subjectStats, analysis, testLabel } = results;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        width: '100%', height: '56px', background: '#0F172B',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#FDC700' }}>Prelims Practice</span>
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: '#fff' }}>P</div>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#FDC700' }}>Results</span>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Hero Card ── */}
        <div style={{
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1D293D 0%, #0F172B 50%, #162456 100%)',
          padding: '40px 48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            background: 'rgba(253,199,0,0.15)', border: '1px solid rgba(253,199,0,0.4)',
            borderRadius: '20px', padding: '4px 14px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '12px' }}>⭐</span>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#FDC700', letterSpacing: '0.5px' }}>TEST COMPLETE</span>
          </div>

          {/* Score Circle */}
          <CircleScore pct={scorePct} />

          {/* Title */}
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF', margin: '24px 0 8px', textAlign: 'center', lineHeight: '40px' }}>
            {perfLabel}
          </h1>
          <p style={{ fontSize: '16px', color: '#99A1AF', margin: 0, textAlign: 'center' }}>
            {testLabel} · {total} Questions
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
          {[
            { img: '/stat-icon-9.png',  value: correct,  label: 'Correct' },
            { img: '/stat-icon-11.png', value: wrong,    label: 'Wrong' },
            { img: '/stat-icon-2.png',  value: skipped,  label: 'Skipped' },
            { img: '/stat-icon-14.png', value: netScore, label: 'Net (-¼)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#FFFFFF', borderRadius: '16px', padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stat.img} alt={stat.label} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#101828', lineHeight: '40px' }}>{stat.value}</span>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#6A7282', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Subject-wise Breakdown ── */}
        {subjectStats.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#101828', letterSpacing: '0.35px', textTransform: 'uppercase' }}>Subject-wise Breakdown</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subjectStats.map(({ subject, correct: sc, total: st }) => {
              const pct = st > 0 ? (sc / st) * 100 : 0;
              const barColor = pct === 100 ? '#00C950' : pct > 0 ? '#FDC700' : '#FB2C36';
              const scoreColor = pct === 100 ? '#00A63E' : pct > 0 ? '#CA8A04' : '#E7000B';
              return (
                <div key={subject} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', color: '#364153', width: '110px', flexShrink: 0 }}>{subject}</span>
                  <div style={{ flex: 1, position: 'relative', height: '8px', background: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: barColor, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: scoreColor, width: '32px', textAlign: 'right', flexShrink: 0 }}>{sc}/{st}</span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Jeet Sir's Analysis ── */}
        {analysis.length > 0 && (
        <div style={{
          background: '#FFFFFF', borderRadius: '16px',
          borderLeft: '4px solid #AD46FF',
          padding: '24px 24px 24px 28px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#101828', letterSpacing: '0.35px', textTransform: 'uppercase' }}>Jeet Sir&apos;s Analysis</span>
          </div>
          {analysis.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.emoji}</span>
              <span style={{ fontSize: '14px', color: '#364153', lineHeight: '20px' }} dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          ))}
        </div>
        )}

        {/* ── Bottom Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => router.push(`/dashboard/mock-tests/next-steps?testId=${testId}`)}
            style={{
              height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #1D293D 0%, #0F172B 50%, #162456 100%)',
              border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            💭 What would you like to do next?
          </button>
          <button
            onClick={() => router.push(`/dashboard/mock-tests/attempt?testId=${testId}`)}
            style={{
              height: '56px', borderRadius: '16px',
              background: '#FFFFFF',
              border: '1.6px solid #E5E7EB', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px', color: '#364153',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📄 Review Answers
          </button>
        </div>

      </div>
    </div>
  );
}

export default function MockTestResultsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <MockTestResultsInner />
    </Suspense>
  );
}
