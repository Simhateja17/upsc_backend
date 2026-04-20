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
  marks?: number;
  wordLimit?: number;
  timeLimit?: number;
}

type QuestionStatus = 'unattempted' | 'answered' | 'marked' | 'current';

function normalizeDurationToSeconds(rawDuration: unknown, questionCount: number): number {
  const fallbackMinutes = Math.max(1, Math.ceil(questionCount * 1.6));
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

  if (parsed <= 240) {
    return Math.round(parsed * 60);
  }

  return Math.round(parsed);
}

function assignMainsMarks(totalQuestions: number): { marks: number; wordLimit: number; timeLimit: number }[] {
  const assignment: { marks: number; wordLimit: number; timeLimit: number }[] = [];
  
  if (totalQuestions === 1) {
    assignment.push({ marks: 15, wordLimit: 250, timeLimit: 11 });
  } else if (totalQuestions === 2) {
    assignment.push({ marks: 10, wordLimit: 150, timeLimit: 7 });
    assignment.push({ marks: 15, wordLimit: 250, timeLimit: 11 });
  } else {
    const num15 = Math.floor(totalQuestions / 3);
    const num10 = totalQuestions - num15;
    for (let i = 0; i < totalQuestions; i++) {
      if (i < num10) {
        assignment.push({ marks: 10, wordLimit: 150, timeLimit: 7 });
      } else {
        assignment.push({ marks: 15, wordLimit: 250, timeLimit: 11 });
      }
    }
  }
  
  return assignment;
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    subject: 'Polity',
    difficulty: 'Medium',
    text: 'Discuss the role of the Supreme Court in protecting the fundamental rights of citizens in India. How has judicial activism shaped the interpretation of fundamental rights?',
    options: [],
    correct: '',
    explanation: '',
  },
  {
    id: 2,
    subject: 'History',
    difficulty: 'Easy',
    text: 'Examine the significance of the Non-Cooperation Movement in the Indian freedom struggle. What were its achievements and limitations?',
    options: [],
    correct: '',
    explanation: '',
  },
  {
    id: 3,
    subject: 'Geography',
    difficulty: 'Medium',
    text: 'Discuss the factors responsible for the uneven distribution of population in India. How does this impact regional development?',
    options: [],
    correct: '',
    explanation: '',
  },
  {
    id: 4,
    subject: 'Economy',
    difficulty: 'Hard',
    text: 'Analyze the impact of GST on the Indian economy. Has it achieved its objectives of creating a unified national market?',
    options: [],
    correct: '',
    explanation: '',
  },
  {
    id: 5,
    subject: 'Environment',
    difficulty: 'Medium',
    text: 'What are the major challenges in implementing India\'s climate change commitments? Suggest measures to overcome these challenges.',
    options: [],
    correct: '',
    explanation: '',
  },
];

function MockTestAttemptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const examMode = searchParams.get('examMode') || 'prelims';
  const isMains = examMode === 'mains';
  const title = searchParams.get('title') || (isMains ? 'Mains Practice' : 'Prelims Practice');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalMarks, setTotalMarks] = useState(0);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());

  const [mainsPhase, setMainsPhase] = useState<'questions' | 'upload' | 'evaluating'>('questions');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [questionTimerLeft, setQuestionTimerLeft] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mainsMarksAssignment, setMainsMarksAssignment] = useState<{ marks: number; wordLimit: number; timeLimit: number }[]>([]);

  useEffect(() => {
    if (!testId) {
      setQuestions(SAMPLE_QUESTIONS);
      const statuses: Record<number, QuestionStatus> = {};
      SAMPLE_QUESTIONS.forEach((_, i) => {
        statuses[i] = i === 0 ? 'current' : 'unattempted';
      });
      setQuestionStatuses(statuses);
      setTimeLeft(15 * 60);
      setLoading(false);
      setError(null);
      if (isMains) {
        setMainsMarksAssignment(assignMainsMarks(SAMPLE_QUESTIONS.length));
      }
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
        const statuses: Record<number, QuestionStatus> = {};
        qs.forEach((_, i) => {
          statuses[i] = i === 0 ? 'current' : 'unattempted';
        });
        setQuestionStatuses(statuses);
        const durationSeconds = normalizeDurationToSeconds(res.data?.duration, qs.length);
        setTimeLeft(durationSeconds);

        if (isMains) {
          setMainsMarksAssignment(assignMainsMarks(qs.length));
        }
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
  }, [testId, isMains]);

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && questionTimerLeft > 0) {
      interval = setInterval(() => {
        setQuestionTimerLeft(t => {
          if (t <= 1) {
            if (interval) clearInterval(interval);
            setTimerRunning(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerRunning, questionTimerLeft]);

  const totalQuestions = questions.length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const goToQuestion = useCallback((idx: number) => {
    setQuestionStatuses(prev => {
      const updated = { ...prev };
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

  const handleMainsNext = () => {
    if (answers[currentIdx]) {
      setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'answered' }));
    }
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(i => i + 1);
      setTimerRunning(false);
      setTimerStarted(false);
    } else {
      setMainsPhase('upload');
    }
  };

  const handleMainsPrev = () => {
    if (answers[currentIdx]) {
      setQuestionStatuses(prev => ({ ...prev, [currentIdx]: 'answered' }));
    }
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      setTimerRunning(false);
      setTimerStarted(false);
    }
  };

  const handleStartQuestionTimer = () => {
    if (!timerStarted) {
      const currentAssignment = mainsMarksAssignment[currentIdx];
      setQuestionTimerLeft(currentAssignment.timeLimit * 60);
      setTimerStarted(true);
    }
    setTimerRunning(!timerRunning);
  };

  const handleResetQuestionTimer = () => {
    setTimerRunning(false);
    setTimerStarted(false);
    const currentAssignment = mainsMarksAssignment[currentIdx];
    setQuestionTimerLeft(currentAssignment.timeLimit * 60);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMainsSubmit = async () => {
    if (uploadedFiles.length === 0 && !answerText.trim()) return;
    setMainsPhase('evaluating');
    setTimeout(() => {
      if (testId) {
        router.push(`/dashboard/mock-tests/attempt/results?testId=${testId}&examMode=mains`);
      } else {
        router.push(`/dashboard/mock-tests/attempt/results?mode=sample&title=${encodeURIComponent(title)}&examMode=mains`);
      }
    }, 3000);
  };

  const handleSubmit = async () => {
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

  if (isMains) {
    const currentAssignment = mainsMarksAssignment[currentIdx] || { marks: 15, wordLimit: 250, timeLimit: 11 };

    if (mainsPhase === 'evaluating') {
      return (
        <div style={{ minHeight: '100vh', background: '#0F172B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 24 }}>
          <div style={{ fontSize: 56 }}>🧠</div>
          <h2 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 700, margin: 0 }}>AI is evaluating your answers...</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>This usually takes about 30 seconds</p>
          <div style={{ width: 320, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: '40%', background: '#F59E0B', borderRadius: 999, animation: 'progress 3s linear forwards' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>● Reading your handwritten answers</p>
          <style>{`@keyframes progress { from { width: 10% } to { width: 90% } }`}</style>
        </div>
      );
    }

    if (mainsPhase === 'upload') {
      return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)', padding: '10px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✍️</span>
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>{title}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>Upload your answers</span>
            <span style={{ color: '#00C950', fontSize: 13, fontWeight: 700, background: 'rgba(0,201,80,0.12)', padding: '4px 12px', borderRadius: 8 }}>✓ Done</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 24 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: 480, width: '100%' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172B', margin: '0 0 10px' }}>All {totalQuestions} questions read!</h2>
              <p style={{ color: '#6B7280', fontSize: 14, lineHeight: '22px', margin: 0 }}>
                Now write your answers on paper. Take your time — there&apos;s no rush.<br />
                Once done, photograph your answer sheets and upload below for AI evaluation.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: 480, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>📎</div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload your handwritten answers</span>
              </div>
              <p style={{ color: '#6B7280', fontSize: 13, lineHeight: '20px', marginBottom: 20 }}>
                You&apos;ve read all the questions. Now write your answers on paper, photograph/scan the sheets and upload below. AI will evaluate each answer with detailed markup.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #D1D5DB', borderRadius: 14, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA', marginBottom: 16 }}
              >
                <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <p style={{ color: '#374151', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>Click to upload answer sheet(s)</p>
                <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>JPG, PNG or PDF · Multiple pages supported</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F3F4F6', borderRadius: 10, padding: '8px 12px' }}>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{f.name}</span>
                      <button onClick={() => handleRemoveFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleMainsSubmit}
                disabled={uploadedFiles.length === 0 && !answerText.trim()}
                style={{ width: '100%', padding: '14px', background: (uploadedFiles.length === 0 && !answerText.trim()) ? '#94A3B8' : '#0F172B', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: (uploadedFiles.length === 0 && !answerText.trim()) ? 'not-allowed' : 'pointer' }}
              >
                🧠 Submit for AI Evaluation
              </button>
              <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 10 }}>AI will analyze your answers in ~90 seconds. Evaluation tips provided.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'linear-gradient(90.38deg, #10182D 0.28%, #17223E 99.72%)', padding: '10px 24px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✍️</span>
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>{title}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14 }}>Q {currentIdx + 1} of {totalQuestions}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 18 }}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', maxWidth: 680, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ background: '#0F172B', color: '#FFFFFF', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', padding: '6px 14px', borderRadius: 8, textTransform: 'uppercase' }}>
                Question {currentIdx + 1} of {totalQuestions}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                  {currentAssignment.marks} marks
                </span>
                <span style={{ color: '#6B7280', fontSize: 13 }}>
                  {currentAssignment.wordLimit} words
                </span>
              </div>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '20px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#17223E', lineHeight: '28px', margin: 0 }}>
                {currentQ.text}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⏱️</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Time: {currentAssignment.timeLimit} minutes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>📝</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Word limit: {currentAssignment.wordLimit} words</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '3px solid #101828',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: timerRunning ? '#FEF3C7' : '#F9FAFB',
              }}>
                <span style={{ fontFamily: 'Arimo', fontWeight: 700, fontSize: 18, color: '#101828' }}>
                  {timerStarted ? formatTime(questionTimerLeft) : `${currentAssignment.timeLimit}:00`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleStartQuestionTimer}
                  style={{
                    background: timerRunning ? '#DC2626' : '#00BC7D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {timerRunning ? '⏸ Pause' : '▶ Start Timer'}
                </button>
                <button
                  onClick={handleResetQuestionTimer}
                  style={{
                    background: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={handleMainsPrev}
                disabled={currentIdx === 0}
                style={{
                  background: 'none',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '10px 24px',
                  color: currentIdx === 0 ? '#CBD5E1' : '#334155',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ← Prev
              </button>
              <button
                onClick={handleMainsNext}
                style={{
                  background: '#0F172B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 28px',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {currentIdx < totalQuestions - 1 ? 'Next Question →' : 'Done Reading →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>

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
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map(opt => {
                const hasAnswered = !!selectedOptions[currentIdx];
                const isSelected = selectedOptions[currentIdx] === opt.label;
                const isCorrectOpt = opt.label === currentQ.correct;
                const isWrongSelected = isSelected && !isCorrectOpt;

                let bg = '#FFFFFF';
                let border = '2px solid #E2E8F0';
                let circleColor = '#CBD5E1';
                let circleBg = 'transparent';
                let circleText = '#64748B';
                let circleIcon: string = opt.label;
                let textColor = '#1E293B';
                let fontWeight = 400;

                if (hasAnswered) {
                  if (isCorrectOpt) {
                    bg = '#F0FDF4';
                    border = '2px solid #00C950';
                    circleColor = '#00C950';
                    circleBg = '#DCFCE7';
                    circleText = '#00C950';
                    circleIcon = '✓';
                    textColor = '#14532D';
                    fontWeight = 600;
                  } else if (isWrongSelected) {
                    bg = '#FEF2F2';
                    border = '2px solid #FB2C36';
                    circleColor = '#FB2C36';
                    circleBg = '#FEE2E2';
                    circleText = '#FB2C36';
                    circleIcon = '✕';
                    textColor = '#7F1D1D';
                    fontWeight = 600;
                  }
                } else if (isSelected) {
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
                    onClick={() => !hasAnswered && handleSelectOption(opt.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border,
                      background: bg,
                      cursor: hasAnswered ? 'default' : 'pointer',
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

            {selectedOptions[currentIdx] && currentQ.explanation && (
              <div style={{
                marginTop: '20px',
                background: '#EFF6FF',
                borderLeft: '4px solid #2B7FFF',
                borderRadius: '10px',
                padding: '16px 16px 16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#155DFC', lineHeight: '20px' }}>
                  💡 EXPLANATION
                </span>
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#1C398E', lineHeight: '20px' }}>
                  {currentQ.explanation}
                </span>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '14px 18px',
            border: '1px solid #E5E7EB',
          }}>
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
