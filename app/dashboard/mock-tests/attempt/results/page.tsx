'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService } from '@/lib/services';
import ConfettiBurst from '@/components/ConfettiBurst';

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

function MockTestResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const mode = searchParams.get('mode');
  const title = searchParams.get('title') || 'Test Series';

  const [results, setResults] = useState<ResultsData | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(1);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
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
          perfLabel: 'Keep Going - Every Attempt Makes You Better!',
          subjectStats: [],
          analysis: [],
          testLabel: title,
          // stash for render
          _sample: data,
        } as any);
        setLoading(false);
        setError(null);

        const accuracyPct = data.accuracyPct ?? 0;
        if (accuracyPct > 50) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
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

        if (scorePct > 50) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
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

  const { total, correct, wrong, skipped, scorePct } = results;
  const sample = (results as any)._sample as any | undefined;

  const handleFullAnalysis = () => {
    if (testId) {
      router.push(`/dashboard/test-analytics?testId=${testId}`);
    } else {
      router.push('/dashboard/test-analytics');
    }
  };

  const handlePDFReport = async () => {
    try {
      if (testId) {
        const res = await mockTestService.getResults(testId);
        const data = res.data;
        if (data) {
          const reportContent = generatePDFReport(data);
          const blob = new Blob([reportContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mock-test-report-${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        const reportContent = generatePDFReport({
          total,
          correct,
          wrong,
          skipped,
          scorePct,
          netScore: results.netScore,
          testLabel: title,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        });
        const blob = new Blob([reportContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mock-test-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    }
  };

  const generatePDFReport = (data: any) => {
    const correct = data.correct ?? 0;
    const wrong = data.wrong ?? 0;
    const skipped = data.skipped ?? 0;
    const total = data.total ?? 0;
    const scorePct = data.scorePct ?? 0;
    const netScore = data.netScore ?? 0;
    const testLabel = data.testLabel ?? title;
    const date = data.date ?? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mock Test Report - RiseWithJeet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background: #F9FAFB; color: #101828; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 800; color: #10182D; margin-bottom: 8px; }
    .header p { color: #6B7280; font-size: 14px; }
    .score-card { background: linear-gradient(135deg, #10182D, #17223E); border-radius: 16px; padding: 32px; text-align: center; color: white; margin-bottom: 24px; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; background: white; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .score-circle span { font-size: 32px; font-weight: 800; color: #0F172B; }
    .stats { display: flex; justify-content: center; gap: 32px; margin-top: 20px; }
    .stat { text-align: center; }
    .stat .value { font-size: 24px; font-weight: 800; }
    .stat .label { font-size: 11px; color: rgba(255,255,255,0.6); letter-spacing: 0.1em; text-transform: uppercase; }
    .correct-color { color: #00C950; }
    .wrong-color { color: #FB2C36; }
    .skipped-color { color: #60A5FA; }
    .section { background: white; border-radius: 14px; border: 1px solid #E5E7EB; padding: 24px; margin-bottom: 16px; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #101828; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .summary-item { background: #F9FAFB; border-radius: 10px; padding: 16px; }
    .summary-item .label { font-size: 12px; color: #6B7280; margin-bottom: 4px; }
    .summary-item .value { font-size: 16px; font-weight: 700; color: #101828; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Mock Test Report</h1>
      <p>${testLabel} · ${date}</p>
    </div>
    <div class="score-card">
      <div class="score-circle"><span>${correct}/${total}</span></div>
      <div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">Score: ${scorePct}%</div>
      <div style="font-size: 14px; color: rgba(255,255,255,0.7);">Net Score: ${netScore}</div>
      <div class="stats">
        <div class="stat"><div class="value correct-color">${correct}</div><div class="label">Correct</div></div>
        <div class="stat"><div class="value wrong-color">${wrong}</div><div class="label">Wrong</div></div>
        <div class="stat"><div class="value skipped-color">${skipped}</div><div class="label">Skipped</div></div>
        <div class="stat"><div class="value" style="color: white;">${scorePct}%</div><div class="label">Accuracy</div></div>
      </div>
    </div>
    <div class="section">
      <h2>Performance Summary</h2>
      <div class="summary-grid">
        <div class="summary-item"><div class="label">Total Questions</div><div class="value">${total}</div></div>
        <div class="summary-item"><div class="label">Attempted</div><div class="value">${correct + wrong}</div></div>
        <div class="summary-item"><div class="label">Correct Answers</div><div class="value" style="color: #00C950;">${correct}</div></div>
        <div class="summary-item"><div class="label">Wrong Answers</div><div class="value" style="color: #FB2C36;">${wrong}</div></div>
        <div class="summary-item"><div class="label">Skipped</div><div class="value" style="color: #60A5FA;">${skipped}</div></div>
        <div class="summary-item"><div class="label">Accuracy Rate</div><div class="value">${scorePct}%</div></div>
      </div>
    </div>
    <div class="section">
      <h2>Recommendations</h2>
      <ul style="padding-left: 20px; line-height: 2; color: #4A5565;">
        ${scorePct >= 80 ? '<li>Excellent performance! Focus on maintaining consistency.</li>' : ''}
        ${scorePct >= 60 && scorePct < 80 ? '<li>Good progress! Work on weak areas to improve further.</li>' : ''}
        ${scorePct < 60 ? '<li>Keep practicing! Focus on understanding concepts rather than memorization.</li>' : ''}
        <li>Review all incorrect answers and understand the explanations.</li>
        <li>Practice similar difficulty tests to consolidate learning.</li>
        <li>Track your progress over time to identify improvement patterns.</li>
      </ul>
    </div>
    <div class="footer">
      <p>Generated by RiseWithJeet · ${new Date().toLocaleString()}</p>
      <p style="margin-top: 4px;">Keep Going - Every Attempt Makes You Better!</p>
    </div>
  </div>
</body>
</html>`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <ConfettiBurst active={showConfetti} />
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
          onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', border: 'none', color: '#374151', fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            borderRadius: 16,
            background: '#10182D',
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

          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Keep Going - Every Attempt Makes You Better!</div>
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
              onClick={handleFullAnalysis}
              style={{ height: 36, borderRadius: 10, padding: '0 16px', border: 'none', background: '#314158', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
            >
              📊 Full Analysis
            </button>
            <button
              type="button"
              onClick={handlePDFReport}
              style={{ height: 36, borderRadius: 10, padding: '0 16px', border: 'none', background: '#314158', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
            >
              📄 PDF Report
            </button>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: 16 }}>
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
