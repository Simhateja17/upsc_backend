'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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

interface MainsAnswer {
  text: string;
  file: File | null;
}

type QuestionStatus = 'unattempted' | 'answered' | 'marked' | 'current';

function normalizeDurationToSeconds(rawDuration: unknown, questionCount: number, isMains: boolean): number {
  const fallbackMinutes = isMains
    ? Math.max(8, questionCount * 8)
    : Math.max(1, questionCount);
  const fallbackSeconds = fallbackMinutes * 60;

  const parsed =
    typeof rawDuration === 'number'
      ? rawDuration
      : typeof rawDuration === 'string'
        ? Number(rawDuration)
        : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackSeconds;
  }

  // DB records may store duration in minutes; normalize to seconds for countdown.
  if (parsed <= 240) {
    return Math.round(parsed * 60);
  }

  return Math.round(parsed);
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

function MockTestAttemptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const examMode = searchParams.get('examMode') || 'prelims';
  const isMains = examMode === 'mains';
  const title = searchParams.get('title') || (isMains ? 'Mains Practice' : 'Prelims Practice');

  /* ─── API / Loading State ─── */
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalMarks, setTotalMarks] = useState(0);

  /* ─── Quiz State ─── */
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());

  /* ─── Mains State ─── */
  const [mainsPhase, setMainsPhase] = useState<'questions' | 'evaluating'>('questions');
  const [mainsAnswers, setMainsAnswers] = useState<Record<number, MainsAnswer>>({});
  const [evaluationProgress, setEvaluationProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Load questions from API ─── */
  useEffect(() => {
    if (!testId) {
      // No testId: fall back to a built-in 5-question set so the UI always opens from "Resume".
      setQuestions(SAMPLE_QUESTIONS);
      const statuses: Record<number, QuestionStatus> = {};
      SAMPLE_QUESTIONS.forEach((_, i) => {
        statuses[i] = i === 0 ? 'current' : 'unattempted';
      });
      setQuestionStatuses(statuses);
      setTimeLeft(15 * 60);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    async function loadQuestions() {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getQuestions(testId!);
        if (cancelled) return;

        const rawQs = res.data?.questions || res.data || [];
        const qs: Question[] = rawQs.map((q: any) => ({
          ...q,
          text: q.text || q.questionText || '',
          options: q.options || [],
        }));
        if (!qs.length) {
          throw new Error('No questions returned for this test.');
        }
        setTotalMarks(res.data?.totalMarks || 0);
        setQuestions(qs);
        // Initialize statuses
        const statuses: Record<number, QuestionStatus> = {};
        qs.forEach((_, i) => {
          statuses[i] = i === 0 ? 'current' : 'unattempted';
        });
        setQuestionStatuses(statuses);
        // Set timer based on API duration (minutes or seconds) with a safe fallback.
        const durationSeconds = normalizeDurationToSeconds(res.data?.duration, qs.length, isMains);
        setTimeLeft(durationSeconds);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load questions:', err);
          setError(err.message || 'Failed to load test questions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, questions.length]);

  const totalQuestions = questions.length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const goToQuestion = useCallback((idx: number) => {
    setQuestionStatuses(prev => {
      const updated = { ...prev };
      // Only change current question status if it's still 'current' (not answered/marked)
      if (updated[currentIdx] === 'current') updated[currentIdx] = 'unattempted';
      if (updated[idx] !== 'answered' && updated[idx] !== 'marked') updated[idx] = 'current';
      return updated;
    });
    setCurrentIdx(idx);
  }, [currentIdx]);

  const handleSelectOption = (label: string) => {
    setSelectedOptions(prev => ({ ...prev, [currentIdx]: label }));
    setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'answered' }));
  };

  const handleMark = () => {
    setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'marked' }));
    handleNext();
  };

  const handleClear = () => {
    setSelectedOptions(prev => { const n = { ...prev }; delete n[currentIdx]; return n; });
    setQuestionStatuses(prev => ({
      ...prev,
      [currentIdx]: prev[currentIdx] === 'marked' ? 'unattempted' : prev[currentIdx] === 'answered' ? 'unattempted' : prev[currentIdx],
    }));
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) goToQuestion(currentIdx + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  };

  /* ─── Mains handlers ─── */
  const currentAnswer: MainsAnswer = mainsAnswers[currentIdx] || { text: '', file: null };

  const handleMainsTextChange = (value: string) => {
    setMainsAnswers(prev => ({
      ...prev,
      [currentIdx]: { ...(prev[currentIdx] || { text: '', file: null }), text: value },
    }));
  };

  const handleMainsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMainsAnswers(prev => ({
      ...prev,
      [currentIdx]: { ...(prev[currentIdx] || { text: '', file: null }), file },
    }));
    // Reset input so re-selecting the same file still fires change
    e.target.value = '';
  };

  const handleMainsRemoveFile = () => {
    setMainsAnswers(prev => ({
      ...prev,
      [currentIdx]: { ...(prev[currentIdx] || { text: '', file: null }), file: null },
    }));
  };

  const handleMainsNext = () => {
    if (currentIdx < totalQuestions - 1) setCurrentIdx(i => i + 1);
  };

  const handleMainsPrev = () => {
    if (currentIdx > 0) setCurrentIdx(i => i - 1);
  };

  const waitForEvaluation = async (attemptId: string, maxMs = 120_000) => {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
      try {
        const res = await mockTestService.getMainsEvaluationStatus(testId!, attemptId);
        if (res.data?.isComplete) return true;
      } catch {
        /* transient — keep polling */
      }
      await new Promise(r => setTimeout(r, 2500));
    }
    return false;
  };

  const handleMainsSubmitAll = async () => {
    if (!testId) {
      setError('Cannot submit without a test session. Please regenerate the test.');
      return;
    }

    // Require at least one form of answer per question
    const missing = questions.findIndex((_, i) => {
      const a = mainsAnswers[i];
      return !a || (!a.text.trim() && !a.file);
    });
    if (missing !== -1) {
      setCurrentIdx(missing);
      setError(`Please provide an answer for Question ${missing + 1} (text or file).`);
      return;
    }

    setError(null);
    setMainsPhase('evaluating');
    setEvaluationProgress({ done: 0, total: totalQuestions });

    const attemptIds: string[] = [];
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const a = mainsAnswers[i];
        const resp = await mockTestService.submitMainsAnswer(testId, String(q.id), {
          answerText: a?.text?.trim() || undefined,
          file: a?.file || undefined,
        });
        const attemptId = resp.data?.attemptId;
        if (attemptId) attemptIds.push(attemptId);
        setEvaluationProgress(p => ({ ...p, done: Math.min(p.total, i + 1) }));
      }

      // Poll for each attempt to complete evaluation
      for (const id of attemptIds) {
        await waitForEvaluation(id);
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `mockTestMainsAttempts:${testId}`,
          JSON.stringify({ attemptIds, title })
        );
      }
      router.push(
        `/dashboard/mock-tests/attempt/results?testId=${testId}&examMode=mains&title=${encodeURIComponent(title)}`
      );
    } catch (err: any) {
      console.error('Mains submit failed:', err);
      setError(err.message || 'Failed to submit answers. Please try again.');
      setMainsPhase('questions');
    }
  };

  const handleSubmit = async () => {
    // Sample mode (no testId): store local results and open results screen
    if (!testId) {
      const total = questions.length;
      const correctCount = correct;
      const wrongCount = wrong;
      const skippedCount = Math.max(0, total - Object.keys(selectedOptions).length);
      const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const review = questions.map((q, idx) => {
        const selected = selectedOptions[idx];
        const status: 'correct' | 'wrong' | 'skipped' =
          selected ? (selected === q.correct ? 'correct' : 'wrong') : 'skipped';
        const delta = status === 'correct' ? 2 : status === 'wrong' ? -0.67 : 0;
        // simple, deterministic per-question time estimate for UI
        const timeSec = 60 + (idx % 4) * 15;
        return {
          idx: idx + 1,
          text: q.text.split('\n').slice(0, 2).join(' ').trim(),
          timeSec,
          status,
          delta,
        };
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'mockTestSampleResults',
          JSON.stringify({
            title,
            total,
            correct: correctCount,
            wrong: wrongCount,
            skipped: skippedCount,
            accuracyPct,
            scoreText: `${correctCount}/${total}`,
            review,
            selectedOptions,
            questions,
          })
        );
      }

      router.push(`/dashboard/mock-tests/attempt/results?mode=sample&title=${encodeURIComponent(title)}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      // Build answers map: questionId -> selected option label
      const answersMap: Record<string, string> = {};
      Object.entries(selectedOptions).forEach(([idx, opt]) => {
        const q = questions[Number(idx)];
        if (q) {
          answersMap[String(q.id)] = opt;
        }
      });
      await mockTestService.submit(testId, answersMap, timeTaken);
      router.push(`/dashboard/mock-tests/attempt/results?testId=${testId}`);
    } catch (err: any) {
      console.error('Failed to submit test:', err);
      setError(err.message || 'Failed to submit test. Please try again.');
      setSubmitting(false);
    }
  };

  // Stats
  const answered = Object.values(questionStatuses).filter(s => s === 'answered').length;
  const marked = Object.values(questionStatuses).filter(s => s === 'marked').length;
  const correct = Object.entries(selectedOptions).filter(([idx, opt]) => questions[Number(idx)]?.correct === opt).length;
  const wrong = Object.keys(selectedOptions).length - correct;
  const netScore = correct * 2 - wrong * 0.67;

  const currentQ = questions[currentIdx];
  const [questionTitle, questionBodyRaw] = (currentQ?.text ?? '').split('\n\n', 2);
  const questionBody = questionBodyRaw ?? '';

  const statusColor: Record<QuestionStatus, string> = {
    answered: '#00C950',
    current: '#2B7FFF',
    marked: '#FDC700',
    unattempted: '#314158',
  };

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
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
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading test questions...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error && questions.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#101828', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '400px', textAlign: 'center' }}>{error}</p>
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

  if (!currentQ) return null;

  /* ──────────────────────────── MAINS UI ──────────────────────────── */
  if (isMains) {
    const marksPerQ = totalMarks && totalQuestions ? Math.round(totalMarks / totalQuestions) : 15;
    const minPerQ = Math.max(1, Math.round(marksPerQ * 0.5));
    const isLast = currentIdx === totalQuestions - 1;
    const answeredCount = questions.reduce((acc, _, i) => {
      const a = mainsAnswers[i];
      return acc + (a && (a.text.trim() || a.file) ? 1 : 0);
    }, 0);

    /* ── Evaluating screen ── */
    if (mainsPhase === 'evaluating') {
      const { done, total } = evaluationProgress;
      const pct = total > 0 ? Math.max(8, Math.round((done / total) * 100)) : 8;
      return (
        <div style={{ minHeight: '100vh', background: '#0F172B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 20, padding: 24 }}>
          <div style={{ fontSize: 56 }}>🧠</div>
          <h2 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 700, margin: 0, textAlign: 'center' }}>AI is evaluating your answers...</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>
            Submitting {done} of {total} · this usually takes about 30–60 seconds
          </p>
          <div style={{ width: 360, maxWidth: '90%', height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FBBF24,#F59E0B)', borderRadius: 999, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>● Reading answers &nbsp;●&nbsp; Scoring against rubric &nbsp;●&nbsp; Preparing feedback</p>
        </div>
      );
    }

    /* ── Questions screen (mains) ── */
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)', padding: '10px 24px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✍️</span>
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>{title}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 14 }}>
              Question {currentIdx + 1} of {totalQuestions}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 18 }}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 720, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, height: 4, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(((currentIdx + 1) / Math.max(1, totalQuestions)) * 100)}%`, background: '#F59E0B', transition: 'width 0.25s ease' }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#364153', whiteSpace: 'nowrap' }}>
              {answeredCount} / {totalQuestions} answered
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: 14, color: '#991B1B' }}>{error}</span>
          </div>
        )}

        {/* Question card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', maxWidth: 720, width: '100%' }}>
            {/* Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ background: '#0F172B', color: '#FFFFFF', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', padding: '6px 14px', borderRadius: 8, textTransform: 'uppercase' }}>
                Question {currentIdx + 1} of {totalQuestions}
              </div>
              <div style={{ color: '#6B7280', fontSize: 13, fontWeight: 500 }}>
                <span style={{ color: '#0F172B', fontWeight: 700 }}>{marksPerQ} marks</span> · {minPerQ} min
              </div>
            </div>

            {/* Question text */}
            <p style={{ fontSize: 17, fontWeight: 500, color: '#17223E', lineHeight: '28px', marginBottom: 24, whiteSpace: 'pre-line' }}>
              {currentQ.text}
            </p>

            {/* Text answer */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172B', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Your Answer
            </label>
            <textarea
              value={currentAnswer.text}
              onChange={(e) => handleMainsTextChange(e.target.value)}
              placeholder="Type your answer here… or upload a PDF/image below."
              rows={8}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: 12,
                fontSize: 15,
                lineHeight: '24px',
                color: '#0F172B',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                background: '#FAFAFA',
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
              {currentAnswer.text.trim() ? `${currentAnswer.text.trim().split(/\s+/).filter(Boolean).length} words` : 'No text yet'}
            </div>

            {/* File upload */}
            <div style={{ marginTop: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172B', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Or upload handwritten answer (PDF / Image)
              </label>
              {!currentAnswer.file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleMainsFileSelect}
                  />
                  <div style={{ fontSize: 28, marginBottom: 4 }}>📄</div>
                  <p style={{ color: '#374151', fontWeight: 600, fontSize: 13, margin: '0 0 2px' }}>Click to upload your answer sheet</p>
                  <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>JPG, PNG or PDF · one file per question</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '10px 14px' }}>
                  <span style={{ fontSize: 13, color: '#15803D', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📎 {currentAnswer.file.name}
                  </span>
                  <button onClick={handleMainsRemoveFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', fontSize: 16, padding: 0, fontWeight: 700 }}>✕</button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
              <button
                onClick={handleMainsPrev}
                disabled={currentIdx === 0}
                style={{
                  background: 'none',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '10px 18px',
                  color: currentIdx === 0 ? '#CBD5E1' : '#334155',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ← Prev
              </button>

              {isLast ? (
                <button
                  onClick={handleMainsSubmitAll}
                  style={{
                    background: 'linear-gradient(90deg,#F1A901,#FD7302)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 28px',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(253,115,2,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  🧠 Submit &amp; Evaluate
                </button>
              ) : (
                <button
                  onClick={handleMainsNext}
                  style={{
                    background: '#0F172B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 28px',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Next Question →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  /* ─────────────────────────── END MAINS UI ─────────────────────────── */

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sub-header (matches screenshot strip) ── */}
      <div
        style={{
          background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)',
          padding: '10px 24px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: 14, lineHeight: '16px' }}>🏛️</span>
              <span style={{ fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </span>
            </div>
            <div style={{ fontWeight: 500, fontSize: 11, lineHeight: '16px', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              Today Prelims Mock Test · {totalQuestions} Questions · +0.67 per wrong
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: '16px' }}>⏳</span>
                <span style={{ fontWeight: 800, fontSize: 18, lineHeight: '22px', color: '#FFFFFF' }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 10, lineHeight: '12px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
                TIME LEFT
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress row (1116×44) ── */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '0.8px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 1116,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 32,
            paddingRight: 32,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ flex: 1, marginRight: 16, height: 4, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round(((currentIdx + 1) / Math.max(1, totalQuestions)) * 100)}%`,
                height: '100%',
                background: '#00C950',
              }}
            />
          </div>
          <div style={{ fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#364153', whiteSpace: 'nowrap' }}>
            Q {currentIdx + 1} / {totalQuestions} - {answered} Answered
          </div>
        </div>
      </div>

      {/* ── Submit Error Banner ── */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ fontSize: '14px', color: '#991B1B' }}>{error}</span>
        </div>
      )}

      {/* ── Body (centered fixed frame) ── */}
      <div
        style={{
          flex: 1,
          background: '#F9FAFB',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1116,
            display: 'flex',
            gap: 24,
            boxSizing: 'border-box',
            alignItems: 'flex-start',
          }}
        >
        {/* ── Question Panel ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Question Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E5E7EB',
              padding: 24,
              boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px rgba(0,0,0,0.10)',
              overflow: 'visible',
            }}
          >
            {/* Question header row (pill + bookmark) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 103.20000457763672,
                  height: 32,
                  borderRadius: 10,
                  background: '#101828',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: 73,
                    height: 20,
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: '#FFFFFF',
                  }}
                >
                  Question {currentIdx + 1}
                </span>
              </div>

              <div
                aria-label="Bookmark"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Inline icon so no asset needed */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16l-6.5-3-6.5 3V5A1.5 1.5 0 0 1 7 3.5Z"
                    stroke="#111827"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Question Text (fixed frame per layout) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxSizing: 'border-box',
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#17223E',
                  lineHeight: '28px',
                  letterSpacing: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {questionTitle || currentQ.text}
              </div>
              {questionBody ? (
                <div style={{ fontSize: 15, fontWeight: 400, color: '#0F172A', lineHeight: '24px', whiteSpace: 'pre-line' }}>
                  {questionBody}
                </div>
              ) : null}
            </div>

            {/* Options — this is a quiz: we show selection only, and reveal
                correctness + explanation only on the results screen. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map(opt => {
                const isSelected = selectedOptions[currentIdx] === opt.label;

                let bg = '#FFFFFF';
                let border = '2px solid #E2E8F0';
                let circleColor = '#CBD5E1';
                let circleBg = 'transparent';
                let circleText = '#64748B';
                let circleIcon: string = opt.label;
                let textColor = '#1E293B';
                let fontWeight = 400;

                if (isSelected) {
                  bg = '#EFF6FF';
                  border = '2px solid #2B7FFF';
                  circleColor = '#2B7FFF';
                  circleBg = '#DBEAFE';
                  circleText = '#2B7FFF';
                  fontWeight = 600;
                }

                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectOption(opt.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border,
                      background: bg,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${circleColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: circleText,
                      flexShrink: 0,
                      background: circleBg,
                    }}>
                      {circleIcon}
                    </span>
                    <span style={{ fontSize: '15px', color: textColor, fontWeight }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanations are hidden during the quiz and revealed only on the
                results screen, so students focus on finishing first. */}
          </div>

          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '14px 18px',
            border: '1px solid #E5E7EB',
          }}>
            {/* Left actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleMark}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#FB2C36',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                🚩 Mark
              </button>
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '52px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6A7282',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '0px',
                  padding: 0,
                }}
              >
                ✕ Clear
              </button>
              <button
                onClick={handleNext}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#155DFC',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                Skip
              </button>
            </div>

            {/* Right nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                style={{
                  background: 'none',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  color: currentIdx === 0 ? '#CBD5E1' : '#334155',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={currentIdx === totalQuestions - 1}
                style={{
                  background: currentIdx === totalQuestions - 1 ? '#1E293B' : '#2B7FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 22px',
                  color: '#FFFFFF',
                  cursor: currentIdx === totalQuestions - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </main>

        {/* ── Right panel (Navigator card) ── */}
        <aside style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px rgba(0,0,0,0.10)' }}>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.6px', color: '#6B7280', textTransform: 'uppercase', marginBottom: 12 }}>
              Question Navigator
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid #E5E7EB',
                      background: isCurrent ? '#0F172B' : '#F3F4F6',
                      color: isCurrent ? '#FFFFFF' : '#111827',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Answered', color: '#00C950', value: answered },
                { label: 'Unanswered', color: '#94A3B8', value: Math.max(0, totalQuestions - answered) },
                { label: 'Bookmarked', color: '#F59E0B', value: marked },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color }} />
                    <span style={{ fontSize: 12, color: '#374151' }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12, marginTop: 6 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Est. Score</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172B', marginBottom: 14 }}>{netScore.toFixed(1)}</div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  height: 44,
                  background: '#0F172B',
                  border: 'none',
                  borderRadius: 12,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                ✓ Submit Test
              </button>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}

export default function MockTestAttemptPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
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
      <MockTestAttemptInner />
    </Suspense>
  );
}
