'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import '../../../../../styles/test-series-v2.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

// Mock questions data
const MOCK_QUESTIONS = [
  {
    id: 1,
    text: 'Which of the following statements about the Indus Valley Civilization is/are correct?\n\n1. The Great Bath was found at Mohenjo-daro\n2. Bronze was not known to the Harappans\n3. The script has been fully deciphered\n\nSelect the correct answer using the code given below:',
    opts: ['1 only', '1 and 2 only', '2 and 3 only', '1, 2 and 3'],
    correct: 0,
    subject: 'History',
    topic: 'Ancient India',
    explanation:
      'Statement 1 is correct: The Great Bath is one of the most famous structures at Mohenjo-daro. Statement 2 is incorrect: Bronze was well known to Harappans; the civilization is part of the Bronze Age. Statement 3 is incorrect: The Indus script remains undeciphered to this day.',
    tags: ['NCERT Class 11', 'PYQ 2019', 'Must Know'],
    time: 45,
  },
  {
    id: 2,
    text: 'Consider the following statements regarding the Mauryan Empire:\n\n1. Ashoka renounced violence after the Kalinga war\n2. The Arthashastra was written during Chandragupta Maurya\'s reign\n3. Rock Edicts were issued in Prakrit language\n\nWhich of the statements given above is/are correct?',
    opts: ['1 and 2 only', '2 and 3 only', '1 and 3 only', 'All of the above'],
    correct: 3,
    subject: 'History',
    topic: 'Ancient India',
    explanation: 'All three statements are correct. Ashoka embraced Buddhism after the Kalinga war, the Arthashastra was authored by Chanakya (Kautilya) during Chandragupta\'s time, and Ashoka\'s Rock Edicts were indeed written in Prakrit.',
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
    explanation: 'Lord Dalhousie introduced the Doctrine of Lapse, which stated that if a ruler of a princely state died without a natural heir, the state would "lapse" to the British.',
    tags: ['PYQ 2018', 'Must Know'],
    time: 38,
  },
  {
    id: 4,
    text: 'Which of the following are correctly matched?\n\n1. Quit India Movement - 1942\n2. Jallianwala Bagh Massacre - 1919\n3. Partition of Bengal - 1911\n\nSelect the correct answer:',
    opts: ['1 and 2 only', '2 and 3 only', '1 and 3 only', 'All of the above'],
    correct: 0,
    subject: 'History',
    topic: 'Modern India',
    explanation: 'Statements 1 and 2 are correct. However, the Partition of Bengal took place in 1905, not 1911. In 1911, the partition was annulled.',
    tags: ['NCERT Class 12', 'Chronology'],
    time: 48,
  },
  {
    id: 5,
    text: 'The Tropic of Cancer passes through which of the following Indian states?\n\n1. Gujarat\n2. Rajasthan\n3. West Bengal\n4. Tripura\n\nSelect the correct answer:',
    opts: ['1, 2 and 3 only', '2, 3 and 4 only', '1, 2, 3 and 4', '1, 3 and 4 only'],
    correct: 2,
    subject: 'Geography',
    topic: 'Indian Geography',
    explanation: 'The Tropic of Cancer (23.5°N) passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.',
    tags: ['NCERT Class 11', 'Must Know', 'Basics'],
    time: 40,
  },
];

const fmtTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function TestAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params?.id as string;
  const testNum = searchParams?.get('test') || '1';

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState(7200); // 2 hours = 7200 seconds
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const handleSelectOption = (optionIndex: number) => {
    setAnswers({ ...answers, [currentQ]: optionIndex });
  };

  const handleNext = () => {
    if (currentQ < MOCK_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQ(index);
  };

  const handleBookmark = () => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(currentQ)) {
      newBookmarks.delete(currentQ);
    } else {
      newBookmarks.add(currentQ);
    }
    setBookmarks(newBookmarks);
  };

  const handleSubmit = useCallback(() => {
    if (confirm('Are you sure you want to submit the test? You cannot change answers after submission.')) {
      // Save answers to localStorage or state management
      localStorage.setItem(`test-${seriesId}-${testNum}-answers`, JSON.stringify(answers));
      router.push(`/dashboard/test-series/${seriesId}/results/${testNum}`);
    }
  }, [answers, router, seriesId, testNum]);

  const currentQuestion = MOCK_QUESTIONS[currentQ];
  const totalQuestions = MOCK_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = ((currentQ + 1) / totalQuestions) * 100;

  const seriesName = 'जड़ें मज़बूत Series';
  const seriesIcon = '📖';

  return (
    <div className={plusJakarta.variable} style={{ fontFamily: 'var(--font-plus-jakarta), sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Top Bar */}
      <div
        className="test-topbar"
        style={{
          background: 'var(--navy)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <div className="ttb-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            {seriesIcon} {seriesName}
          </div>
          <div className="ttb-sub" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
            Mock Test #{testNum} · {totalQuestions} Questions · –0.67 per wrong
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="timer" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <div id="timer-val" className="timer-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: timer < 300 ? 'var(--rose)' : '#fff', fontFamily: 'monospace' }}>
                {fmtTime(timer)}
              </div>
              <div className="timer-lbl" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                Time Left
              </div>
            </div>
          </div>
          <button
            className="btn-outline"
            onClick={() => {
              if (confirm('Quit test? Progress will be saved.')) {
                router.push(`/dashboard/test-series/${seriesId}`);
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕ Quit
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.68rem', color: 'var(--ink4)', marginBottom: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="bc-link" onClick={() => router.push('/dashboard/test-series')} style={{ cursor: 'pointer', color: 'var(--ink3)' }}>
            Test Series
          </span>
          <span>›</span>
          <span className="bc-link" onClick={() => router.push(`/dashboard/test-series/${seriesId}`)} style={{ cursor: 'pointer', color: 'var(--ink3)' }}>
            {seriesName}
          </span>
          <span>›</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Mock Test #{testNum}</span>
        </div>

        {/* Progress Bar */}
        <div className="q-progress" style={{ marginBottom: '20px' }}>
          <div
            className="q-ptrack"
            style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}
          >
            <div
              className="q-pfill"
              style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--sky) 0%, var(--jade) 100%)', transition: 'width 0.3s' }}
            ></div>
          </div>
          <span className="q-ptext" style={{ fontSize: '0.7rem', color: 'var(--ink4)', fontWeight: 600 }}>
            Q {currentQ + 1} / {totalQuestions} · {answeredCount} Answered
          </span>
        </div>

        {/* Main Layout */}
        <div className="q-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          {/* Question Card */}
          <div>
            <div className="q-card fu" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '28px 32px', border: '1px solid var(--border)', marginBottom: '12px' }}>
              <div className="q-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className="q-num-tag"
                    style={{
                      background: 'var(--navy)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    Question {currentQ + 1}
                  </span>
                  <span className="q-marks" style={{ fontSize: '0.68rem', color: 'var(--ink4)' }}>+2 marks · –0.67 if wrong</span>
                </div>
                <div className="q-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`q-act-btn ${bookmarks.has(currentQ) ? 'bm' : ''}`}
                    onClick={handleBookmark}
                    title="Bookmark"
                    style={{
                      background: bookmarks.has(currentQ) ? 'var(--goldbg)' : 'var(--bg)',
                      color: bookmarks.has(currentQ) ? 'var(--gold2)' : 'var(--ink4)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    🔖
                  </button>
                  <button
                    className="q-act-btn"
                    onClick={() => alert('📹 Video solution available after submission')}
                    title="Video"
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--ink4)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="q-body">
                <div className="q-text" style={{ fontSize: '0.95rem', color: 'var(--ink)', lineHeight: 1.8, marginBottom: '24px', whiteSpace: 'pre-line' }}>
                  {currentQuestion.text}
                </div>
                <div className="q-opts" style={{ display: 'grid', gap: '12px' }}>
                  {currentQuestion.opts.map((opt, i) => (
                    <div
                      key={i}
                      className={`q-opt ${answers[currentQ] === i ? 'sel' : ''}`}
                      onClick={() => handleSelectOption(i)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--r)',
                        border: answers[currentQ] === i ? '2px solid var(--navy)' : '1px solid var(--border)',
                        background: answers[currentQ] === i ? 'var(--skybg)' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '0.85rem',
                        color: 'var(--ink)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        className="q-key"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: answers[currentQ] === i ? 'var(--navy)' : 'var(--bg)',
                          color: answers[currentQ] === i ? '#fff' : 'var(--ink3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {['A', 'B', 'C', 'D'][i]}
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>

              <div className="q-card-foot" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn-outline"
                  onClick={handleSkip}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg)',
                    color: 'var(--ink3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Skip →
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {currentQ > 0 && (
                    <button
                      className="btn-outline"
                      onClick={handlePrev}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Prev
                    </button>
                  )}
                  <button
                    className="btn-primary"
                    onClick={currentQ === totalQuestions - 1 ? handleSubmit : handleNext}
                    style={{
                      padding: '10px 20px',
                      background: currentQ === totalQuestions - 1 ? 'var(--jade)' : 'var(--navy)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--r)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {currentQ === totalQuestions - 1 ? 'Submit Test' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 14px', background: 'var(--skybg)', borderRadius: '9px', border: '1px solid var(--skym)', fontSize: '0.7rem', color: 'var(--sky)' }}>
              💡 Subject: <strong>{currentQuestion.subject}</strong> · Topic: <strong>{currentQuestion.topic}</strong>
            </div>
          </div>

          {/* Navigator Sidebar */}
          <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
            <div className="q-nav-card" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '20px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div className="q-nav-title" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px' }}>
                Question Navigator
              </div>
              <div className="q-nav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {MOCK_QUESTIONS.map((_, i) => {
                  const isAnswered = answers[i] !== undefined;
                  const isBookmarked = bookmarks.has(i);
                  const isCurrent = i === currentQ;

                  return (
                    <button
                      key={i}
                      className={`q-nav-btn ${isCurrent ? 'cur' : ''} ${isAnswered ? 'ans' : ''} ${isBookmarked ? 'bmk' : ''}`}
                      onClick={() => handleGoToQuestion(i)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        background: isCurrent ? 'var(--navy)' : isAnswered ? 'var(--jadebg)' : isBookmarked ? 'var(--goldbg)' : 'var(--bg)',
                        color: isCurrent ? '#fff' : isAnswered ? 'var(--jade)' : isBookmarked ? 'var(--gold2)' : 'var(--ink3)',
                        border: isCurrent ? '2px solid var(--navy)' : isAnswered ? '1px solid var(--jadem)' : '1px solid var(--border)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="q-legend" style={{ display: 'grid', gap: '6px', fontSize: '0.68rem' }}>
                <div className="q-leg" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="q-leg-dot" style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--navy)' }}></div>
                  Current
                </div>
                <div className="q-leg" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="q-leg-dot" style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--jadem)' }}></div>
                  Answered
                </div>
                <div className="q-leg" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="q-leg-dot" style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--gold2)' }}></div>
                  Bookmarked
                </div>
                <div className="q-leg" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="q-leg-dot" style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--border)' }}></div>
                  Not visited
                </div>
              </div>
            </div>

            <div className="live-sum" style={{ background: '#fff', borderRadius: 'var(--r2)', padding: '18px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div className="ls-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="ls-l" style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>Answered</span>
                <span className="ls-v text-jade" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--jade)' }}>
                  {answeredCount}
                </span>
              </div>
              <div className="ls-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="ls-l" style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>Unanswered</span>
                <span className="ls-v text-rose" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--rose)' }}>
                  {totalQuestions - answeredCount}
                </span>
              </div>
              <div className="ls-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="ls-l" style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>Bookmarked</span>
                <span className="ls-v text-gold" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold2)' }}>
                  {bookmarks.size}
                </span>
              </div>
              <div className="ls-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span className="ls-l" style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>Est. Score</span>
                <span className="ls-v fw8" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ink)' }}>
                  {(answeredCount * 2).toFixed(1)}
                </span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--jade)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✓ Submit Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
