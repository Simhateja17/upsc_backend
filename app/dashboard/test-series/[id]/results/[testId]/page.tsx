'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import '../../../../../../styles/test-series-v2.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

// Mock questions (same as in attempt page)
const MOCK_QUESTIONS = [
  {
    id: 1,
    text: 'Which of the following statements about the Indus Valley Civilization is/are correct?',
    opts: ['1 only', '1 and 2 only', '2 and 3 only', '1, 2 and 3'],
    correct: 0,
    subject: 'History',
    topic: 'Ancient India',
    explanation:
      'Statement 1 is correct: The Great Bath is one of the most famous structures at Mohenjo-daro. Statement 2 is incorrect: Bronze was well known to Harappans. Statement 3 is incorrect: The Indus script remains undeciphered.',
    tags: ['NCERT Class 11', 'PYQ 2019', 'Must Know'],
    time: 45,
  },
  {
    id: 2,
    text: 'Consider the following statements regarding the Mauryan Empire:',
    opts: ['1 and 2 only', '2 and 3 only', '1 and 3 only', 'All of the above'],
    correct: 3,
    subject: 'History',
    topic: 'Ancient India',
    explanation: 'All three statements are correct. Ashoka embraced Buddhism after the Kalinga war, Arthashastra was written during Chandragupta\'s time, and Rock Edicts were in Prakrit.',
    tags: ['NCERT Class 11', 'Important'],
    time: 52,
  },
  {
    id: 3,
    text: 'The term "Doctrine of Lapse" is associated with which British Governor-General?',
    opts: ['Lord Dalhousie', 'Lord Wellesley', 'Lord Cornwallis', 'Warren Hastings'],
    correct: 0,
    subject: 'History',
    topic: 'Modern India',
    explanation: 'Lord Dalhousie introduced the Doctrine of Lapse.',
    tags: ['PYQ 2018', 'Must Know'],
    time: 38,
  },
  {
    id: 4,
    text: 'Which of the following are correctly matched?',
    opts: ['1 and 2 only', '2 and 3 only', '1 and 3 only', 'All of the above'],
    correct: 0,
    subject: 'History',
    topic: 'Modern India',
    explanation: 'Statements 1 and 2 are correct. The Partition of Bengal took place in 1905, not 1911.',
    tags: ['NCERT Class 12', 'Chronology'],
    time: 48,
  },
  {
    id: 5,
    text: 'The Tropic of Cancer passes through which Indian states?',
    opts: ['1, 2 and 3 only', '2, 3 and 4 only', '1, 2, 3 and 4', '1, 3 and 4 only'],
    correct: 2,
    subject: 'Geography',
    topic: 'Indian Geography',
    explanation: 'The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, WB, Tripura, and Mizoram.',
    tags: ['NCERT Class 11', 'Must Know', 'Basics'],
    time: 40,
  },
];

export default function TestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params?.id as string;
  const testId = params?.testId as string;

  const [qByQFilter, setQByQFilter] = useState('all');
  const [expandedQbq, setExpandedQbq] = useState<Set<number>>(new Set());

  // Load answers from localStorage
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    const savedAnswers = localStorage.getItem(`test-${seriesId}-${testId}-answers`);
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    } else {
      // Mock data for demo
      setAnswers({ 0: 0, 1: 3, 2: 1, 3: 0 }); // Some correct, some wrong, Q5 skipped
    }
  }, [seriesId, testId]);

  // Calculate results
  const totalQuestions = MOCK_QUESTIONS.length;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  MOCK_QUESTIONS.forEach((q, i) => {
    if (answers[i] === undefined) {
      skipped++;
    } else if (answers[i] === q.correct) {
      correct++;
    } else {
      wrong++;
    }
  });

  const score = correct * 2 - wrong * 0.67;
  const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const attempted = correct + wrong;

  // Grade calculation
  const getGrade = (score: number) => {
    if (score >= 8) return { g: 'A+', c: '#22C55E', lbl: 'Outstanding Performance!' };
    if (score >= 6) return { g: 'A', c: '#3B82F6', lbl: 'Excellent Work!' };
    if (score >= 4) return { g: 'B+', c: '#F59E0B', lbl: 'Good Effort — Keep Improving!' };
    if (score >= 2) return { g: 'B', c: '#F97316', lbl: 'Room to Improve!' };
    return { g: 'C', c: '#EF4444', lbl: 'Keep Going — Every Attempt Makes You Better!' };
  };

  const grade = getGrade(score);

  const toggleQbq = (index: number) => {
    const newSet = new Set(expandedQbq);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedQbq(newSet);
  };

  // Filter Q-by-Q
  const filteredQuestions = MOCK_QUESTIONS.filter((q, i) => {
    if (qByQFilter === 'all') return true;
    const userAns = answers[i];
    const isCorrect = userAns === q.correct;
    const isSkipped = userAns === undefined;
    if (qByQFilter === 'correct') return isCorrect;
    if (qByQFilter === 'wrong') return !isCorrect && !isSkipped;
    if (qByQFilter === 'skipped') return isSkipped;
    return true;
  });

  const seriesName = 'जड़ें मज़बूत Series';

  return (
    <div className={plusJakarta.variable} style={{ fontFamily: 'var(--font-plus-jakarta), sans-serif', background: 'var(--bg)', minHeight: 'calc(100vh - 111px)', padding: '28px 20px 100px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <button
          className="back-btn"
          onClick={() => router.push(`/dashboard/test-series/${seriesId}`)}
          style={{
            marginBottom: '14px',
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
          ← Back to Series
        </button>

        {/* Result Hero */}
        <div
          className="result-hero fu"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
            borderRadius: 'var(--r2)',
            padding: '40px 48px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div className="rh-noise" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }}></div>
          <div className="rh-inner" style={{ position: 'relative', zIndex: 2 }}>
            <div className="rh-grade" style={{ fontSize: '4rem', fontWeight: 800, color: grade.c, marginBottom: '12px' }}>
              {grade.g}
            </div>
            <div className="rh-label" style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              {grade.lbl}
            </div>
            <div className="rh-sub" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
              {seriesName} · Mock Test #{testId} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="rh-kpis" style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div className="rk">
                <span className="rkv" style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {score.toFixed(1)}
                </span>
                <span className="rkl" style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Score
                </span>
              </div>
              <div className="rk">
                <span className="rkv" style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: 'var(--jade)' }}>
                  {correct}
                </span>
                <span className="rkl" style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Correct
                </span>
              </div>
              <div className="rk">
                <span className="rkv" style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: 'var(--rose)' }}>
                  {wrong}
                </span>
                <span className="rkl" style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Wrong
                </span>
              </div>
              <div className="rk">
                <span className="rkv" style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>
                  {skipped}
                </span>
                <span className="rkl" style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Skipped
                </span>
              </div>
              <div className="rk">
                <span className="rkv" style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {accuracy}%
                </span>
                <span className="rkl" style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Accuracy
                </span>
              </div>
            </div>
            <div className="rh-btns" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="rh-btn"
                onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=${testId}`)}
                style={{
                  padding: '12px 24px',
                  background: 'var(--gold2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ↺ Reattempt
              </button>
              <button
                className="rh-btn"
                onClick={() => alert('📄 PDF Report downloading...')}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--r)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📄 PDF Report
              </button>
            </div>
          </div>
        </div>

        {/* Score Breakdown Cards */}
        <div className="score-breakdown fu d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {[
            { ico: '🎯', v: score.toFixed(1), l: 'Raw Score', change: '↑ Best this month', up: true },
            { ico: '📊', v: accuracy + '%', l: 'Accuracy', change: '↑ +5.1% vs avg', up: true },
            { ico: '🏆', v: '#1,274', l: 'All India Rank', change: '↑ +86 improved', up: true },
            { ico: '⏱', v: '1m 29s', l: 'Avg per Question', change: '▲ 29s over ideal', up: false },
          ].map((stat, i) => (
            <div key={i} className="sb-card" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div className="sb-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>
                {stat.ico}
              </div>
              <div className="sb-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '4px' }}>
                {stat.v}
              </div>
              <div className="sb-lbl" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink4)', marginBottom: '8px' }}>
                {stat.l}
              </div>
              <div className={`sb-change ${stat.up ? 'sb-up' : 'sb-dn'}`} style={{ fontSize: '0.7rem', color: stat.up ? 'var(--jade)' : 'var(--rose)' }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Score Breakdown Detail */}
        <div className="report-grid fu d3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="dcard" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', border: '1px solid var(--border)' }}>
            <div className="dcard-title" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--skybg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📈</div>
              Score Breakdown
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--ink4)', marginBottom: '12px' }}>How your marks were distributed</div>

            {[
              { lbl: 'Correct (+2)', count: correct, mult: '×2', pts: `+${correct * 2}`, pct: (correct / totalQuestions) * 100, color: 'var(--jade)' },
              { lbl: 'Wrong (–0.67)', count: wrong, mult: '×0.67', pts: `–${(wrong * 0.67).toFixed(1)}`, pct: (wrong / totalQuestions) * 100, color: 'var(--rose)' },
              { lbl: 'Skipped (0)', count: skipped, mult: '×0', pts: '=0', pct: (skipped / totalQuestions) * 100, color: 'var(--border2)' },
            ].map((b, i) => (
              <div key={i} className="score-bar-row" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--ink3)' }}>{b.lbl}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink4)' }}>
                      {b.count} {b.mult}
                    </span>
                    <span style={{ fontWeight: 700, color: b.color }}>{b.pts}</span>
                  </div>
                </div>
                <div className="sbr-bar" style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="sbr-fill" style={{ width: `${b.pct}%`, height: '100%', background: b.color }}></div>
                </div>
              </div>
            ))}

            <div style={{ background: 'var(--navy)', borderRadius: '9px', padding: '11px 16px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Final Score ({correct * 2} – {(wrong * 0.67).toFixed(1)})</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold2)' }}>{score.toFixed(1)} / {totalQuestions * 2}</span>
            </div>
          </div>

          {/* Subject Accuracy */}
          <div className="dcard" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', border: '1px solid var(--border)' }}>
            <div className="dcard-title" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--goldbg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📚</div>
              Accuracy by Subject
            </div>

            {[
              { s: 'History', pct: 75, cor: 3, wrg: 1, color: '#C9922A' },
              { s: 'Geography', pct: 100, cor: 1, wrg: 0, color: '#1A7A52' },
            ].map((subj, i) => (
              <div key={i} className="subj-acc-row" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)' }}>{subj.s}</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: subj.color }}>{subj.pct}%</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--ink4)' }}>
                      ✓{subj.cor} ✗{subj.wrg}
                    </span>
                  </div>
                </div>
                <div className="sar-bar" style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${subj.pct}%`, height: '100%', background: subj.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q-by-Q Review */}
        <div className="dcard fu d5" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <div className="dcard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--jadebg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✅</div>
            Question-by-Question Review
          </div>

          <div className="qbq-filters" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', l: `All (${totalQuestions})` },
              { id: 'correct', l: `✓ Correct (${correct})` },
              { id: 'wrong', l: `✗ Wrong (${wrong})` },
              { id: 'skipped', l: `⬜ Skipped (${skipped})` },
            ].map((f) => (
              <button
                key={f.id}
                className={`qbq-filter ${qByQFilter === f.id ? 'on' : ''}`}
                onClick={() => setQByQFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  background: qByQFilter === f.id ? 'var(--navy)' : 'var(--bg)',
                  color: qByQFilter === f.id ? '#fff' : 'var(--ink3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {f.l}
              </button>
            ))}
          </div>

          {filteredQuestions.map((q, idx) => {
            const i = MOCK_QUESTIONS.indexOf(q);
            const userAns = answers[i];
            const isCorrect = userAns === q.correct;
            const isSkipped = userAns === undefined;
            const borderCol = isSkipped ? 'var(--border)' : isCorrect ? 'var(--jade)' : 'var(--rose)';
            const numBg = isSkipped ? 'var(--bg)' : isCorrect ? 'var(--jadebg)' : 'var(--rosebg)';
            const numColor = isSkipped ? 'var(--ink4)' : isCorrect ? 'var(--jade)' : 'var(--rose)';
            const scoreChip = isSkipped ? (
              <span style={{ background: 'var(--bg)', color: 'var(--ink4)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>
                Skipped
              </span>
            ) : isCorrect ? (
              <span style={{ background: 'var(--jadebg)', color: 'var(--jade)', padding: '3px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>+2</span>
            ) : (
              <span style={{ background: 'var(--rosebg)', color: 'var(--rose)', padding: '3px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>–0.67</span>
            );

            return (
              <div key={i} className="qbq-item" style={{ marginBottom: '12px', border: `1px solid ${borderCol}`, borderLeft: `3px solid ${borderCol}`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
                <div
                  className="qbq-head"
                  onClick={() => toggleQbq(i)}
                  style={{
                    padding: '14px 18px',
                    background: 'var(--bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      className="qbq-num"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: numBg,
                        color: numColor,
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
                    <div className="qbq-q" style={{ fontSize: '0.8rem', color: 'var(--ink)', fontWeight: 600, flex: 1 }}>
                      {q.text.substring(0, 90)}...
                    </div>
                  </div>
                  <div className="qbq-right" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                    <span className="qbq-time" style={{ fontSize: '0.68rem', color: 'var(--ink4)' }}>
                      ⏱ {q.time}s
                    </span>
                    {scoreChip}
                    <span style={{ fontSize: '1rem', color: 'var(--ink3)' }}>{expandedQbq.has(i) ? '▴' : '▾'}</span>
                  </div>
                </div>

                {expandedQbq.has(i) && (
                  <div className="qbq-detail" style={{ padding: '18px', background: '#fff' }}>
                    <div className="qbq-tags" style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {q.tags.map((tag, j) => (
                        <span
                          key={j}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background: tag.includes('PYQ') ? 'var(--goldbg)' : tag === 'Must Know' ? 'var(--rosebg)' : 'var(--skybg)',
                            color: tag.includes('PYQ') ? 'var(--gold2)' : tag === 'Must Know' ? 'var(--rose)' : 'var(--sky)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="qbq-opts" style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                      {q.opts.map((opt, oi) => {
                        const isUserAns = oi === userAns;
                        const isCorrectOpt = oi === q.correct;
                        return (
                          <div
                            key={oi}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 'var(--r)',
                              border: isCorrectOpt ? '2px solid var(--jade)' : isUserAns ? '2px solid var(--rose)' : '1px solid var(--border)',
                              background: isCorrectOpt ? 'var(--jadebg)' : isUserAns ? 'var(--rosebg)' : 'var(--bg)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '0.78rem',
                            }}
                          >
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: isCorrectOpt ? 'var(--jade)' : isUserAns ? 'var(--rose)' : 'var(--border)',
                                color: isCorrectOpt || isUserAns ? '#fff' : 'var(--ink3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {['A', 'B', 'C', 'D'][oi]}
                            </span>
                            {opt}
                            {isCorrectOpt && <span style={{ marginLeft: 'auto', color: 'var(--jade)', fontSize: '0.7rem', fontWeight: 700 }}>✓ Correct</span>}
                            {isUserAns && !isCorrect && <span style={{ marginLeft: 'auto', color: 'var(--rose)', fontSize: '0.7rem', fontWeight: 700 }}>✗ Your Answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {!isSkipped && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink3)', marginBottom: '8px' }}>
                        You picked: <strong style={{ color: isCorrect ? 'var(--jade)' : 'var(--rose)' }}>{['A', 'B', 'C', 'D'][userAns]} — {q.opts[userAns]}</strong>
                      </div>
                    )}

                    <div className="qbq-exp" style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--r)', fontSize: '0.78rem', color: 'var(--ink3)', lineHeight: 1.6, marginBottom: '12px' }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </div>

                    <div className="qbq-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => alert('📌 Added to Flashcards!')}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--bg)',
                          color: 'var(--ink3)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📌 Add to Flashcards
                      </button>
                      <button
                        onClick={() => alert('⚠️ Marked as Weak Topic!')}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--bg)',
                          color: 'var(--ink3)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚠️ Mark Weak
                      </button>
                      <button
                        onClick={() => alert('📝 Opening Study Notes...')}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--bg)',
                          color: 'var(--ink3)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📝 Study Notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Insights Panel */}
        <div className="ai-panel fu d5" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid #d8b4fe' }}>
          <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="ai-brand" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="ai-logo" style={{ fontSize: '2rem' }}>🤖</div>
              <div>
                <div className="ai-name" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)' }}>
                  Jeet AI — Post-Test Intelligence Report
                </div>
                <div className="ai-sub" style={{ fontSize: '0.7rem', color: 'var(--ink4)' }}>
                  Analysed {totalQuestions} answers · time patterns · compared against your last 6 tests
                </div>
              </div>
            </div>
            <div className="ai-badge" style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.15)', color: '#7c3aed', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · Auto-generated
            </div>
          </div>

          <div className="ai-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Fix These First */}
            <div className="ai-section">
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--rose)', marginBottom: '14px' }}>
                🔴 Fix These First{' '}
                <span style={{ fontSize: '0.58rem', background: 'rgba(192,57,43,0.2)', color: 'var(--rose)', padding: '1px 7px', borderRadius: '4px', marginLeft: '6px' }}>
                  Highest Impact
                </span>
              </div>

              <div className="ai-item" style={{ marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: 'var(--r)', display: 'flex', gap: '10px' }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>📉</div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>Modern India needs focused revision</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink3)', lineHeight: 1.5, marginBottom: '6px' }}>
                    60% accuracy on 4 questions. Doctrine of Lapse, chronology errors — these need dedicated work.
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--rosebg)', color: 'var(--rose)', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                    HIGH IMPACT
                  </span>
                </div>
              </div>
            </div>

            {/* What Went Well */}
            <div className="ai-section">
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--jade)', marginBottom: '14px' }}>
                ✅ What Went Well{' '}
                <span style={{ fontSize: '0.58rem', background: 'rgba(26,122,82,0.2)', color: 'var(--jade)', padding: '1px 7px', borderRadius: '4px', marginLeft: '6px' }}>
                  Keep doing
                </span>
              </div>

              <div className="ai-item" style={{ marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: 'var(--r)', display: 'flex', gap: '10px' }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>🎯</div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>Geography — Perfect score!</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink3)', lineHeight: 1.5, marginBottom: '6px' }}>
                    100% on Indian Geography. Tropic of Cancer, states — absolutely solid. This is your strength.
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--jadebg)', color: 'var(--jade)', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                    STRENGTH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What Next */}
        <div className="dcard fu d5" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink4)', marginBottom: '14px' }}>⭕ WHAT NEXT?</div>
          <div className="what-next" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--navy)', borderRadius: 'var(--r2)', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📚</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Study Weak Topics</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>Modern India · Doctrine of Lapse · Chronology</div>
              <button
                onClick={() => alert('📝 Opening Study Notes...')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'var(--gold2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Open Notes →
              </button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 'var(--r2)', padding: '24px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>Next Test</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ink4)', marginBottom: '14px' }}>NCERT Class 7 Geography — Due 7 Mar</div>
              <button
                onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=${parseInt(testId) + 1}`)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'var(--navy)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Start Test →
              </button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 'var(--r2)', padding: '24px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>↺</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>Retake This Test</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ink4)', marginBottom: '14px' }}>Re-attempt with same questions in random order</div>
              <button
                onClick={() => router.push(`/dashboard/test-series/${seriesId}/attempt?test=${testId}`)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'var(--jade)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retake →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
