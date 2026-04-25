'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService } from '@/lib/services';

interface Question {
  id: number;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  text: string;
  options: { label: string; text: string }[];
  correct: string;
  explanation: string;
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    subject: 'Polity',
    difficulty: 'Medium',
    text: 'Which of the following statements about the Preamble to the Indian Constitution is/are correct?\n\n1. The Preamble is a part of the Constitution\n2. It can be amended under Article 368\n3. It has been amended only once',
    options: [
      { label: 'A', text: '1 only' },
      { label: 'B', text: '1 and 2 only' },
      { label: 'C', text: '1, 2 and 3' },
      { label: 'D', text: '2 and 3 only' },
    ],
    correct: 'B',
    explanation: 'The Preamble is part of the Constitution (Kesavananda Bharati) and can be amended under Article 368 (subject to basic structure). It has been amended once (42nd Amendment).',
  },
  {
    id: 2,
    subject: 'History',
    difficulty: 'Easy',
    text: 'The term “Swaraj” was first used prominently by:',
    options: [
      { label: 'A', text: 'Bal Gangadhar Tilak' },
      { label: 'B', text: 'Mahatma Gandhi' },
      { label: 'C', text: 'Dadabhai Naoroji' },
      { label: 'D', text: 'Subhas Chandra Bose' },
    ],
    correct: 'C',
    explanation: 'Dadabhai Naoroji used “Swaraj” prominently; later Tilak popularized it widely.',
  },
  {
    id: 3,
    subject: 'Geography',
    difficulty: 'Medium',
    text: 'Which one of the following factors most directly influences the formation of monsoon winds over the Indian subcontinent?',
    options: [
      { label: 'A', text: 'Earth’s rotation alone' },
      { label: 'B', text: 'Seasonal differential heating of land and sea' },
      { label: 'C', text: 'Ocean currents only' },
      { label: 'D', text: 'Mountain building processes' },
    ],
    correct: 'B',
    explanation: 'Monsoon is driven by seasonal differential heating between land and sea creating pressure gradients.',
  },
  {
    id: 4,
    subject: 'Economy',
    difficulty: 'Hard',
    text: 'In the context of inflation targeting, which institution sets the policy repo rate in India?',
    options: [
      { label: 'A', text: 'Ministry of Finance' },
      { label: 'B', text: 'NITI Aayog' },
      { label: 'C', text: 'Monetary Policy Committee (RBI)' },
      { label: 'D', text: 'SEBI' },
    ],
    correct: 'C',
    explanation: 'The RBI’s Monetary Policy Committee sets the policy repo rate under the inflation targeting framework.',
  },
  {
    id: 5,
    subject: 'Environment',
    difficulty: 'Medium',
    text: '“Biodiversity hotspot” refers to a region that:',
    options: [
      { label: 'A', text: 'Has only high species richness' },
      { label: 'B', text: 'Has high endemism and is under significant threat' },
      { label: 'C', text: 'Has low endemism but high productivity' },
      { label: 'D', text: 'Is protected as a national park' },
    ],
    correct: 'B',
    explanation: 'Hotspots have high endemism and have lost a large portion of their original habitat (high threat).',
  },
];

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
      <text x="80" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="36" fontWeight="700" fontFamily="Inter">{pct}%</text>
      <text x="80" y="90" textAnchor="middle" fill="#99A1AF" fontSize="11" fontFamily="Inter" letterSpacing="2">SCORE</text>
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

interface MainsPerQuestion {
  idx: number;
  questionText: string;
  subject: string;
  score: number;
  maxScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailedFeedback?: string;
  answerText?: string | null;
  wordCount?: number;
}

function MockTestResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const mode = searchParams.get('mode');
  const examMode = searchParams.get('examMode') || 'prelims';
  const isMains = examMode === 'mains';
  const title = searchParams.get('title') || 'Test Series';

  const [results, setResults] = useState<ResultsData | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(1);
  const [mainsData, setMainsData] = useState<MainsPerQuestion[] | null>(null);

  /* ─── Mains results loader ─── */
  useEffect(() => {
    if (!isMains || !testId) return;
    let cancelled = false;

    async function loadMains() {
      setLoading(true);
      setError(null);
      try {
        const raw = typeof window !== 'undefined'
          ? sessionStorage.getItem(`mockTestMainsAttempts:${testId}`)
          : null;
        if (!raw) throw new Error('No mains evaluation session found. Please re-attempt the test.');
        const { attemptIds } = JSON.parse(raw) as { attemptIds: string[] };
        if (!attemptIds?.length) throw new Error('No mains attempts recorded.');

        const out: MainsPerQuestion[] = [];
        for (let i = 0; i < attemptIds.length; i++) {
          const id = attemptIds[i];
          const res = await mockTestService.getMainsResults(testId!, id);
          if (cancelled) return;
          const d = res.data || {};
          out.push({
            idx: i + 1,
            questionText: d.question?.questionText || '',
            subject: d.question?.subject || '',
            score: Number(d.score ?? 0),
            maxScore: Number(d.maxScore ?? 15),
            strengths: Array.isArray(d.strengths) ? d.strengths : [],
            improvements: Array.isArray(d.improvements) ? d.improvements : [],
            suggestions: Array.isArray(d.suggestions) ? d.suggestions : [],
            detailedFeedback: d.detailedFeedback,
            answerText: d.answerText,
            wordCount: d.wordCount,
          });
        }
        if (!cancelled) {
          setMainsData(out);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load mains results.');
          setLoading(false);
        }
      }
    }

    loadMains();
    return () => { cancelled = true; };
  }, [isMains, testId]);

  useEffect(() => {
    if (isMains) return; // handled by mains loader above
    if (mode === 'sample') {
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('mockTestSampleResults') : null;
        if (!raw) throw new Error('No local results found.');
        const data = JSON.parse(raw) as any;
        setResults({
          total: data.total ?? 5,
          correct: data.correct ?? 0,
          wrong: data.wrong ?? 0,
          skipped: data.skipped ?? 0,
          netScore: (Number(data.correct ?? 0) * 2 - Number(data.wrong ?? 0) * 0.67).toFixed(2),
          scorePct: data.accuracyPct ?? 0,
          perfLabel: 'Keep Going — Every Attempt Makes You Better!',
          subjectStats: [],
          analysis: [],
          testLabel: title,
          // stash for render
          _sample: data,
        } as any);
        setLoading(false);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'No local results.');
        setLoading(false);
      }
      return;
    }

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
        const correct = data.correct ?? data.correctCount ?? data.correct_count ?? 0;
        const wrong = data.wrong ?? data.wrongCount ?? data.wrong_count ?? 0;
        const skipped = data.skipped ?? data.skippedCount ?? data.skipped_count ?? 0;
        const total = data.total ?? data.totalQuestions ?? data.question_count
          ?? (correct + wrong + skipped > 0 ? correct + wrong + skipped : (data.questions?.length ?? 0));
        const netScore = data.netScore ?? data.score ?? (correct * 2 - wrong * 0.67).toFixed(2);
        const scorePct = data.scorePct ?? data.scorePercentage ?? data.accuracy ?? (total > 0 ? Math.round((correct / total) * 100) : 0);

        const perfLabel = data.perfLabel ?? data.performanceLabel ?? (
          scorePct >= 80 ? 'Excellent Work!' :
          scorePct >= 60 ? 'Good Job!' :
          scorePct >= 40 ? 'Keep Practising' :
          'Don\'t Give Up!'
        );

        // Subject stats - use API data or build from available info
        const subjectStats: SubjectStat[] = data.subjectStats ?? data.subjectWise ?? data.subject_wise
          ? Object.entries(data.subject_wise || {}).map(([subject, v]: [string, any]) => ({
              subject,
              correct: v.correct ?? 0,
              total: v.total ?? 0,
            }))
          : [];

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

        // Store question review data from API
        if (data.questions && Array.isArray(data.questions)) {
          setReviewQuestions(data.questions.map((q: any, i: number) => ({
            idx: i + 1,
            text: q.questionText || q.text || '',
            subject: q.subject || '',
            options: (q.options || []).map((o: any) => ({ label: o.id || o.label, text: o.text })),
            correct: q.correctOption || q.correct || '',
            selected: q.selectedOption || q.selected || null,
            isCorrect: q.isCorrect ?? false,
            explanation: q.explanation || '',
            status: !q.selectedOption && !q.selected ? 'skipped' : (q.isCorrect ? 'correct' : 'wrong'),
            delta: !q.selectedOption && !q.selected ? 0 : (q.isCorrect ? 2 : -0.67),
            timeSec: '-',
          })));
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
  if (error || (!isMains && !results) || (isMains && !mainsData)) {
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

  /* ─── Mains Results View (PYQ-style) ─── */
  if (isMains && mainsData) {
    const totalScore = mainsData.reduce((a, b) => a + (b.score || 0), 0);
    const totalMax = mainsData.reduce((a, b) => a + (b.maxScore || 0), 0) || 1;
    const pct = Math.round((totalScore / totalMax) * 100);
    const headline =
      pct >= 70 ? 'Strong attempt across all questions'
      : pct >= 50 ? 'Good attempt — solid foundation'
      : 'Keep practising — real progress ahead';

    const gradeFor = (s: number, m: number): string => {
      const p = m > 0 ? (s / m) * 100 : 0;
      if (p >= 85) return 'A';
      if (p >= 75) return 'A-';
      if (p >= 65) return 'B+';
      if (p >= 55) return 'B';
      if (p >= 45) return 'C+';
      if (p >= 35) return 'C';
      return 'D';
    };

    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard/mock-tests')}
            style={{ background: 'transparent', border: 'none', color: '#374151', fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
          >
            ← Back to Mock Tests
          </button>

          {/* Header card */}
          <div style={{ borderRadius: 24, background: '#0F172B', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '28px 32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: '#1E3A5F', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#FBBF24', textTransform: 'uppercase', marginBottom: 8 }}>
                  🖥 AI EVALUATION COMPLETE
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>{headline}</h2>
                <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
                  {title} · Mains · {mainsData.length} Questions evaluated
                </p>
              </div>
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#64748B" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="42" fill="none" stroke="#FBBF24" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(1, Math.max(0, pct / 100)))}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{pct}%</span>
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.1em', marginTop: 4 }}>MARKS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-question cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mainsData.map((q) => {
              const grade = gradeFor(q.score, q.maxScore);
              return (
                <div key={q.idx} style={{ background: '#F1F5F9', borderRadius: 16, padding: '22px 24px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#64748B', marginBottom: 10 }}>
                    QUESTION {q.idx}{q.subject ? ` · ${q.subject.toUpperCase()}` : ''}
                  </div>
                  <p style={{ fontSize: 15, lineHeight: '24px', color: '#334155', margin: '0 0 14px', whiteSpace: 'pre-line' }}>
                    {q.questionText}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>{grade}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>
                      {q.score}/{q.maxScore} marks
                    </span>
                    {typeof q.wordCount === 'number' && q.wordCount > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', background: '#E2E8F0', borderRadius: 8, padding: '4px 10px' }}>
                        {q.wordCount} words
                      </span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.strengths.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 14, color: '#334155', lineHeight: '22px' }}>
                        <span style={{ color: '#15803D', fontWeight: 700, flexShrink: 0 }}>✓ Strengths:</span>
                        <span>{q.strengths.join(' ')}</span>
                      </div>
                    )}
                    {q.improvements.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 14, color: '#334155', lineHeight: '22px' }}>
                        <span style={{ color: '#EA580C', fontWeight: 700, flexShrink: 0 }}>↑ Improve:</span>
                        <span>{q.improvements.join(' ')}</span>
                      </div>
                    )}
                    {q.suggestions.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 14, color: '#334155', lineHeight: '22px' }}>
                        <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0 }}>✕ Key misses:</span>
                        <span>{q.suggestions.join(' ')}</span>
                      </div>
                    )}
                    {q.detailedFeedback && (
                      <div style={{ marginTop: 6, fontSize: 13, color: '#475569', lineHeight: '20px', background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0' }}>
                        {q.detailedFeedback}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall feedback */}
          <div style={{ marginTop: 24, background: '#1E293B', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 12 }}>
              📊 JEET SIR&apos;S OVERALL FEEDBACK
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', gap: 10, color: '#E2E8F0', fontSize: 14, lineHeight: '22px' }}>
                <span>💡</span>
                <span>Overall you scored <strong>{totalScore}/{totalMax}</strong> ({pct}%). Focus next on the questions below 50% to lift your average quickly.</span>
              </li>
              <li style={{ display: 'flex', gap: 10, color: '#E2E8F0', fontSize: 14, lineHeight: '22px' }}>
                <span>📖</span>
                <span>Layer in recent policy / current-affairs examples — examiners consistently reward contemporary linkage on mains.</span>
              </li>
              <li style={{ display: 'flex', gap: 10, color: '#E2E8F0', fontSize: 14, lineHeight: '22px' }}>
                <span>🎯</span>
                <span>Push for multi-dimensional analysis: social, economic, political, and environmental angles strengthen answers significantly.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const { total, correct, wrong, skipped, scorePct } = results!;
  const sample = (results as any)._sample as any | undefined;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <div
        style={{
          width: 1024,
          minHeight: 955.9750366210938,
          marginTop: 52,
          marginLeft: 46,
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/dashboard/test-series')}
          style={{ background: 'transparent', border: 'none', color: '#374151', fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}
        >
          ← Back to Series
        </button>

        <div
          style={{
            borderRadius: 16,
            background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)',
            padding: '28px 32px',
            textAlign: 'center',
            color: '#FFFFFF',
            marginBottom: 18,
          }}
        >
          <div style={{ width: 96, height: 96, borderRadius: 999, background: '#FFFFFF', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#0F172B', fontWeight: 800, fontSize: 26, lineHeight: '28px' }}>
              {correct}/{total}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Score</div>
            </div>
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Keep Going — Every Attempt Makes You Better!</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
            {title} · Mock Test · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 18 }}>
            <StatMini label="CORRECT" value={correct} color="#00C950" />
            <StatMini label="WRONG" value={wrong} color="#FB2C36" />
            <StatMini label="SKIPPED" value={skipped} color="#60A5FA" />
            <StatMini label="ACCURACY" value={`${scorePct}%`} color="#FFFFFF" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/mock-tests/attempt?mode=sample&title=${encodeURIComponent(title)}`)}
              style={{ height: 36, borderRadius: 10, padding: '0 16px', border: 'none', background: 'linear-gradient(89.92deg, #F1A901 0.07%, #FD7302 99.93%)', color: '#0B1120', fontWeight: 800, cursor: 'pointer' }}
            >
              ↻ Reattempt
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('mt-full-analysis');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else router.push('/dashboard/test-analytics');
              }}
              style={{ height: 36, borderRadius: 10, padding: '0 16px', border: 'none', background: '#314158', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
            >
              📊 Full Analysis
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
              style={{ height: 36, borderRadius: 10, padding: '0 16px', border: 'none', background: '#314158', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
            >
              📄 PDF Report
            </button>
          </div>
        </div>

        <div id="mt-full-analysis" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: '#101828', marginBottom: 12 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid #00C950', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#00C950' }}>✓</span>
            Answer Review
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(sample?.review ?? reviewQuestions).map((row: any) => {
              const questions: Question[] = (sample?.questions as Question[] | undefined) ?? SAMPLE_QUESTIONS;
              const selectedOptions: Record<number, string> = (sample?.selectedOptions as Record<number, string> | undefined) ?? {};
              // For real tests, row itself contains full question data
              const isSample = !!sample;
              const q = isSample ? questions[(row.idx ?? 1) - 1] : {
                text: row.text,
                subject: row.subject,
                options: row.options || [],
                correct: row.correct,
                explanation: row.explanation,
                difficulty: 'Medium' as const,
                id: row.idx,
              };
              const selected = isSample ? selectedOptions[(row.idx ?? 1) - 1] : row.selected;
              const isExpanded = expandedIdx === row.idx;
              const borderColor = row.status === 'wrong' ? '#FB2C36' : row.status === 'correct' ? '#00C950' : '#E5E7EB';
              const bg = row.status === 'wrong' ? '#FEF2F24D' : row.status === 'correct' ? '#F0FDF44D' : '#FFFFFF';
              const height = row.status === 'wrong' ? 73.5999984741211 : 65.5999984741211;
              const rightText = row.status === 'skipped' ? 'Skipped' : (row.delta < 0 ? row.delta.toFixed(2) : `+${row.delta}`);
              const rightColor = row.status === 'wrong' ? '#FB2C36' : row.status === 'correct' ? '#00C950' : '#6B7280';
              return (
                <div key={row.idx} style={{ width: 904.4000244140625 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(prev => (prev === row.idx ? null : row.idx))}
                    style={{
                      width: 904.4000244140625,
                      height,
                      borderRadius: 10,
                      background: bg,
                      borderStyle: 'solid',
                      borderTopWidth: 0.8,
                      borderRightWidth: 0.8,
                      borderBottomWidth: 0.8,
                      borderLeftWidth: 4,
                      borderColor,
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 999, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6B7280', flexShrink: 0 }}>
                        {row.idx}
                      </div>
                      <div style={{ fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 720 }}>
                        {row.text}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>🕒 {row.timeSec}s</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: rightColor, minWidth: 52, textAlign: 'right' }}>{rightText}</div>
                      <div style={{ color: '#6B7280', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>⌄</div>
                    </div>
                  </button>

                  {isExpanded && q ? (
                    <div
                      style={{
                        width: 904.4000244140625,
                        marginTop: 10,
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        background: '#FFFFFF',
                        padding: 18,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 999, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6B7280', flexShrink: 0 }}>
                            {row.idx}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: '20px', minWidth: 0 }}>
                            {q.text.split('\n').slice(0, 1).join(' ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>🕒 {row.timeSec}s</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: rightColor, minWidth: 52, textAlign: 'right' }}>{rightText}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 8, padding: '4px 8px' }}>
                          {q.subject}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#854D0E', background: '#FEF08A', borderRadius: 8, padding: '4px 8px' }}>
                          PYQ 2019
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {q.options.map((opt: any) => {
                          const isCorrect = opt.label === q.correct;
                          const isSelected = selected === opt.label;
                          const isWrongSelected = isSelected && !isCorrect;
                          const rowBg = isCorrect ? '#F0FDF4' : isWrongSelected ? '#FEF2F2' : '#FFFFFF';
                          const rowBorder = isCorrect ? '1px solid #86EFAC' : isWrongSelected ? '1px solid #FCA5A5' : '1px solid #E5E7EB';
                          const right = isCorrect ? '✓ Correct' : isWrongSelected ? '✕ Your Answer' : '';
                          const rightCol = isCorrect ? '#16A34A' : isWrongSelected ? '#DC2626' : '#6B7280';
                          return (
                            <div
                              key={opt.label}
                              style={{
                                borderRadius: 10,
                                border: rowBorder,
                                background: rowBg,
                                padding: '12px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #E5E7EB', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#111827', flexShrink: 0 }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 13, color: '#111827', minWidth: 0 }}>
                                  {opt.text}
                                </div>
                              </div>
                              {right ? <div style={{ fontSize: 12, fontWeight: 700, color: rightCol, flexShrink: 0 }}>{right}</div> : <div />}
                            </div>
                          );
                        })}
                      </div>

                      {selected ? (
                        <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>
                          You picked:{' '}
                          <span style={{ fontWeight: 800, color: row.status === 'wrong' ? '#DC2626' : '#16A34A' }}>
                            {selected} — {(q.options.find((o: any) => o.label === selected)?.text ?? '')}
                          </span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>You picked: <span style={{ fontWeight: 800, color: '#6B7280' }}>Skipped</span></div>
                      )}

                      <div
                        style={{
                          marginTop: 12,
                          background: '#EFF6FF',
                          borderRadius: 10,
                          padding: '14px 14px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#155DFC', marginBottom: 6 }}>
                          Explanation:
                        </div>
                        <div style={{ fontSize: 13, color: '#1D4ED8', lineHeight: '18px' }}>
                          {q.explanation}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, fontSize: 12 }}>
                        <button type="button" style={{ background: 'transparent', border: 'none', color: '#DC2626', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                          Add to Flashcards
                        </button>
                        <button type="button" style={{ background: 'transparent', border: 'none', color: '#D97706', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                          Mark Weak
                        </button>
                        <button type="button" style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                          Study Notes
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em' }}>{label}</div>
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
