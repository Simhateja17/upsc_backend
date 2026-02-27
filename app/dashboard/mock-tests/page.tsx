'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

/* ─── Data Arrays ─── */

const questionSources = [
  { id: 'daily-mcq', emoji: '📝', label: 'Daily MCQ', description: 'Fresh questions every day based on current affairs' },
  { id: 'practice-pyq', emoji: '📚', label: 'Practice PYQ', description: 'Previous year questions sorted by topic & year' },
  { id: 'subject-wise', emoji: '🎯', label: 'Subject-wise', description: 'Deep dive into specific UPSC subjects' },
  { id: 'mixed-bag', emoji: '🎲', label: 'Mixed Bag', description: 'Random questions across all subjects' },
  { id: 'full-length', emoji: '🏅', label: 'Full Length Test', description: 'Complete exam simulation experience', pro: true },
];

const subjects = [
  { id: 'all', label: 'All Subjects', count: null },
  { id: 'history', label: 'History', count: 348 },
  { id: 'geography', label: 'Geography', count: 398 },
  { id: 'polity', label: 'Polity', count: 348 },
  { id: 'economy', label: 'Economy', count: 368 },
];

const examModes = [
  { id: 'prelims', label: 'Prelims', description: 'Objective MCQs · 2 hour format' },
  { id: 'mains', label: 'Mains', description: 'Analytical & descriptive questions' },
];

const mainsPaperTypes = [
  { id: 'gs1', label: 'GS Paper I', description: 'Indian Heritage, History, Geography & Society' },
  { id: 'gs2', label: 'GS Paper II', description: 'Governance, Constitution, Polity & IR' },
  { id: 'gs3', label: 'GS Paper III', description: 'Technology, Economic Dev, Biodiversity & Security' },
  { id: 'gs4', label: 'GS Paper IV', description: 'Ethics, Integrity & Aptitude' },
];

const optionalSubjects = [
  'Public Administration', 'Geography', 'History', 'Sociology',
  'Political Science', 'Philosophy', 'Economics', 'Anthropology',
  'Psychology', 'Law',
];

const difficulties = [
  { id: 'easy', emoji: '🌱', label: 'Easy', description: 'Foundation level' },
  { id: 'medium', emoji: '⚡', label: 'Medium', description: 'Exam standard' },
  { id: 'hard', emoji: '🔥', label: 'Hard', description: 'Advanced level' },
  { id: 'mixed', emoji: '🎯', label: 'Mixed', description: 'All difficulty levels' },
];

const benchmarks = [
  { emoji: '🏆', label: 'Rank 1-100 avg 82%+', color: '#3B82F6', width: '82%' },
  { emoji: '✅', label: 'Cutoff clearers 60+ daily', color: '#16A34A', width: '60%' },
  { emoji: '📊', label: 'Your streak top 18%', color: '#F97316', width: '45%' },
];

/* ─── StepHeader Helper ─── */

function StepHeader({ step, label }: { step: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 0.6vw, 12px)', marginBottom: 'clamp(12px, 1vw, 18px)' }}>
      <div style={{
        width: 'clamp(28px, 2vw, 34px)',
        height: 'clamp(28px, 2vw, 34px)',
        borderRadius: '50%',
        background: '#17223E',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(12px, 0.85vw, 15px)',
        flexShrink: 0,
      }}>
        {step}
      </div>
      <span style={{
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(12px, 0.85vw, 15px)',
        letterSpacing: '0.06em',
        color: '#17223E',
        textTransform: 'uppercase' as const,
      }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Page Component ─── */

export default function MockTestsPage() {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState('daily-mcq');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedExamMode, setSelectedExamMode] = useState('mains');
  const [selectedPaperType, setSelectedPaperType] = useState('gs1');
  const [selectedOptional, setSelectedOptional] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  const estimatedMinutes = Math.ceil(questionCount * 1.6);

  /* Derive display labels for summary */
  const sourceLabel = questionSources.find(s => s.id === selectedSource)?.label ?? 'Daily MCQ';
  const paperLabel = selectedExamMode === 'mains'
    ? (mainsPaperTypes.find(p => p.id === selectedPaperType)?.label ?? 'GS I')
    : 'Prelims';
  const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label ?? 'All Subjects';
  const difficultyLabel = difficulties.find(d => d.id === selectedDifficulty)?.label ?? 'Medium';

  /* ─── Card style helper ─── */
  const cardStyle: React.CSSProperties = {
    background: '#FFF',
    border: '0.8px solid #E5E7EB',
    borderRadius: '16px',
    padding: 'clamp(20px, 1.8vw, 32px)',
    marginBottom: 'clamp(16px, 1.4vw, 24px)',
  };

  return (
    <div className="flex overflow-hidden" style={{ background: '#D8DEE6', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#F9FAFB' }}>
        <div style={{ display: 'flex', gap: 'clamp(16px, 1.4vw, 24px)', padding: 'clamp(20px, 2vw, 36px) clamp(16px, 1.5vw, 24px)', maxWidth: '1320px', margin: '0 auto' }}>

        {/* ── Left Column: Steps ── */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

          {/* ── Hero Area ── */}
          <div style={cardStyle}>
            {/* Badge pill */}
            <div style={{
              display: 'inline-block',
              background: '#17223E',
              color: '#fff',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(11px, 0.75vw, 13px)',
              padding: 'clamp(4px, 0.35vw, 6px) clamp(12px, 1vw, 16px)',
              borderRadius: '999px',
              marginBottom: 'clamp(14px, 1.2vw, 20px)',
            }}>
              🏆 India&apos;s #1 UPSC Mock Test Platform
            </div>

            {/* Heading */}
            <h1 style={{
              fontFamily: 'var(--font-arimo), Arimo, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(26px, 2.2vw, 38px)',
              lineHeight: 1.15,
              color: '#101828',
              marginBottom: 'clamp(6px, 0.5vw, 10px)',
            }}>
              Build Your{' '}
              <span style={{ fontFamily: "'Tinos', serif", fontStyle: 'italic', color: '#C68A0B' }}>Perfect</span>{' '}
              Mock Test
            </h1>

            {/* Subtitle */}
            <p style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              color: '#4A5565',
              fontSize: 'clamp(13px, 0.9vw, 16px)',
              lineHeight: 1.6,
              marginBottom: 'clamp(18px, 1.5vw, 28px)',
              maxWidth: '540px',
            }}>
              Adaptive questions · Real exam environment · Detailed analytics.<br />
              Everything free. Add as much it.
            </p>

            {/* Today's Practice Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0E182D, #172240)',
              borderRadius: '20px',
              padding: 'clamp(18px, 1.5vw, 28px)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 0.6vw, 12px)', marginBottom: 'clamp(8px, 0.6vw, 12px)' }}>
                <div style={{
                  width: 'clamp(32px, 2.2vw, 40px)',
                  height: 'clamp(32px, 2.2vw, 40px)',
                  borderRadius: '50%',
                  background: '#3D5A3D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(14px, 1vw, 18px)',
                }}>
                  🎯
                </div>
                <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 1vw, 17px)' }}>
                  Today&apos;s Practice
                </span>
              </div>

              <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(13px, 0.85vw, 15px)', lineHeight: 1.6, color: '#CBD5E1' }}>
                You&apos;ve completed <span style={{ color: '#16A34A', fontWeight: 700 }}>2 questions</span> today — <span style={{ color: '#16A34A', fontWeight: 700 }}>7 remaining</span> on free tier
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: 'clamp(10px, 0.8vw, 14px)',
                border: '1px solid #C68A0B',
                borderRadius: '999px',
                padding: 'clamp(4px, 0.3vw, 6px) clamp(12px, 0.8vw, 16px)',
                fontSize: 'clamp(12px, 0.78vw, 14px)',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontWeight: 600,
                color: '#FDC700',
              }}>
                🔥 8-day streak — keep the momentum!
              </div>
            </div>
          </div>

          {/* ── Step 1: Question Source ── */}
          <div style={cardStyle}>
            <StepHeader step={1} label="Question Source" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 0.8vw, 14px)' }}>
              {questionSources.map(src => {
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setSelectedSource(src.id)}
                    style={{
                      flex: '1 1 clamp(140px, 14vw, 170px)',
                      background: isSelected ? '#EFF6FF' : '#FFF',
                      border: isSelected ? '2px solid #155DFC' : '1.5px solid #E5E7EB',
                      borderRadius: '14px',
                      padding: 'clamp(14px, 1.1vw, 20px)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {src.pro && (
                      <span style={{
                        position: 'absolute',
                        top: 'clamp(8px, 0.6vw, 12px)',
                        right: 'clamp(8px, 0.6vw, 12px)',
                        background: '#FDC700',
                        color: '#17223E',
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        fontWeight: 800,
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}>
                        PRO
                      </span>
                    )}
                    <div style={{ fontSize: 'clamp(20px, 1.5vw, 26px)', marginBottom: '6px' }}>{src.emoji}</div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: 'clamp(13px, 0.85vw, 15px)', color: '#101828', marginBottom: '4px' }}>
                      {src.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(11px, 0.72vw, 13px)', color: '#6B7280', lineHeight: 1.4 }}>
                      {src.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Step 2: Subject Filter ── */}
          <div style={cardStyle}>
            <StepHeader step={2} label="Subject Filter" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(8px, 0.55vw, 10px)', marginBottom: 'clamp(12px, 1vw, 16px)' }}>
              {subjects.map(subj => {
                const isSelected = selectedSubject === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => setSelectedSubject(subj.id)}
                    style={{
                      background: isSelected ? '#17223E' : '#FFF',
                      color: isSelected ? '#FFF' : '#374151',
                      border: isSelected ? '1.5px solid #17223E' : '1.5px solid #E5E7EB',
                      borderRadius: '999px',
                      padding: 'clamp(6px, 0.45vw, 8px) clamp(14px, 1vw, 20px)',
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(12px, 0.8vw, 14px)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {subj.label}
                    {subj.count !== null && (
                      <span style={{ opacity: 0.7, fontWeight: 500, fontSize: 'clamp(11px, 0.7vw, 13px)' }}>{subj.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{
              background: '#17223E',
              color: '#FFF',
              borderRadius: '12px',
              padding: 'clamp(10px, 0.75vw, 14px) clamp(16px, 1.2vw, 22px)',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: 'clamp(12px, 0.78vw, 14px)',
              fontWeight: 500,
            }}>
              Scroll to explore all subjects →
            </div>
          </div>

          {/* ── Step 3: Exam Mode ── */}
          <div style={cardStyle}>
            <StepHeader step={3} label="Exam Mode" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 0.8vw, 14px)', marginBottom: 'clamp(14px, 1.1vw, 20px)' }}>
              {examModes.map(mode => {
                const isSelected = selectedExamMode === mode.id;
                const isMains = mode.id === 'mains';
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedExamMode(mode.id)}
                    style={{
                      flex: '1 1 clamp(200px, 20vw, 280px)',
                      background: isMains && isSelected ? '#17223E' : isSelected ? '#EFF6FF' : '#FFF',
                      border: isMains && isSelected ? '2px solid #FDC700' : isSelected ? '2px solid #155DFC' : '1.5px solid #E5E7EB',
                      borderRadius: '14px',
                      padding: 'clamp(16px, 1.3vw, 24px)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isMains && isSelected ? '#FFF' : '#101828',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: 'clamp(15px, 1vw, 18px)', marginBottom: '4px' }}>
                      {mode.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                      fontSize: 'clamp(12px, 0.78vw, 14px)',
                      color: isMains && isSelected ? '#CBD5E1' : '#6B7280',
                    }}>
                      {mode.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conditional: Mains selected */}
            {selectedExamMode === 'mains' && (
              <>
                {/* Paper Type */}
                <div style={{ marginBottom: 'clamp(14px, 1.1vw, 20px)' }}>
                  <div style={{
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 'clamp(13px, 0.85vw, 15px)',
                    color: '#17223E',
                    marginBottom: 'clamp(10px, 0.8vw, 14px)',
                  }}>
                    Select paper type
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 0.8vw, 14px)' }}>
                    {mainsPaperTypes.map(paper => {
                      const isSelected = selectedPaperType === paper.id;
                      return (
                        <button
                          key={paper.id}
                          onClick={() => setSelectedPaperType(paper.id)}
                          style={{
                            flex: '1 1 clamp(180px, 18vw, 220px)',
                            background: isSelected ? '#EFF6FF' : '#FFF',
                            border: isSelected ? '2px solid #155DFC' : '1.5px solid #E5E7EB',
                            borderRadius: '12px',
                            padding: 'clamp(12px, 1vw, 18px)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: 'clamp(13px, 0.85vw, 15px)', color: '#101828', marginBottom: '3px' }}>
                            {paper.label}
                          </div>
                          <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(11px, 0.7vw, 12px)', color: '#6B7280', lineHeight: 1.4 }}>
                            {paper.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Subject */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 'clamp(13px, 0.85vw, 15px)',
                    color: '#17223E',
                    marginBottom: 'clamp(10px, 0.8vw, 14px)',
                  }}>
                    Optional Subject
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(6px, 0.45vw, 10px)' }}>
                    {optionalSubjects.map(opt => {
                      const isSelected = selectedOptional === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setSelectedOptional(isSelected ? null : opt)}
                          style={{
                            background: isSelected ? '#17223E' : '#FFF',
                            color: isSelected ? '#FFF' : '#374151',
                            border: isSelected ? '1.5px solid #17223E' : '1.5px solid #E5E7EB',
                            borderRadius: '999px',
                            padding: 'clamp(5px, 0.4vw, 7px) clamp(12px, 0.9vw, 18px)',
                            fontFamily: 'var(--font-inter), Inter, sans-serif',
                            fontWeight: 600,
                            fontSize: 'clamp(12px, 0.78vw, 13px)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Step 4: Number of Questions ── */}
          <div style={cardStyle}>
            <StepHeader step={4} label="Number of Questions" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.4vw, 8px)', marginBottom: 'clamp(16px, 1.2vw, 22px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(18px, 1.5vw, 28px)' }}>
                <button
                  onClick={() => setQuestionCount(c => Math.max(1, c - 1))}
                  style={{
                    width: 'clamp(38px, 2.8vw, 48px)',
                    height: 'clamp(38px, 2.8vw, 48px)',
                    borderRadius: '50%',
                    border: '1.5px solid #D1D5DB',
                    background: '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 'clamp(18px, 1.3vw, 24px)',
                    color: '#374151',
                    transition: 'all 0.15s ease',
                  }}
                >
                  −
                </button>
                <span style={{
                  fontFamily: 'var(--font-arimo), Arimo, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(36px, 3vw, 52px)',
                  color: '#101828',
                  minWidth: '60px',
                  textAlign: 'center',
                }}>
                  {questionCount}
                </span>
                <button
                  onClick={() => setQuestionCount(c => c + 1)}
                  style={{
                    width: 'clamp(38px, 2.8vw, 48px)',
                    height: 'clamp(38px, 2.8vw, 48px)',
                    borderRadius: '50%',
                    border: '1.5px solid #D1D5DB',
                    background: '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 'clamp(18px, 1.3vw, 24px)',
                    color: '#374151',
                    transition: 'all 0.15s ease',
                  }}
                >
                  +
                </button>
              </div>
              <span style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(11px, 0.72vw, 13px)',
                letterSpacing: '0.08em',
                color: '#6B7280',
                textTransform: 'uppercase' as const,
              }}>
                Questions
              </span>
            </div>

            {/* Guideline box */}
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #C68A0B',
              borderRadius: '12px',
              padding: 'clamp(12px, 1vw, 18px)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <p style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: 'clamp(12px, 0.78vw, 14px)',
                color: '#92400E',
                lineHeight: 1.5,
                flex: '1 1 auto',
              }}>
                Free tier allows up to <strong>9 questions</strong> per test. Upgrade to PRO for unlimited questions and full-length tests.
              </p>
              <button style={{
                background: '#C68A0B',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                padding: 'clamp(6px, 0.45vw, 8px) clamp(16px, 1.2vw, 22px)',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(12px, 0.78vw, 14px)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                Unlock
              </button>
            </div>
          </div>

          {/* ── Step 5: Difficulty ── */}
          <div style={cardStyle}>
            <StepHeader step={5} label="Difficulty" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 0.8vw, 14px)' }}>
              {difficulties.map(diff => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    onClick={() => setSelectedDifficulty(diff.id)}
                    style={{
                      flex: '1 1 clamp(120px, 12vw, 160px)',
                      background: isSelected ? '#FEF3C7' : '#FFF',
                      border: isSelected ? '2px solid #FDC700' : '1.5px solid #E5E7EB',
                      borderRadius: '14px',
                      padding: 'clamp(14px, 1.1vw, 20px)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 'clamp(22px, 1.6vw, 30px)', marginBottom: '6px' }}>{diff.emoji}</div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: 'clamp(13px, 0.85vw, 15px)', color: '#101828', marginBottom: '2px' }}>
                      {diff.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(11px, 0.7vw, 12px)', color: '#6B7280' }}>
                      {diff.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Right Column: Sticky Test Summary ── */}
        <div className="hidden xl:block" style={{ width: 'clamp(280px, 20vw, 340px)', flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 'clamp(16px, 1.4vw, 24px)' }}>
            <div style={{
              background: 'linear-gradient(135deg, #162456 0%, #0F172B 50%, #030712 100%)',
              borderRadius: '20px',
              padding: 'clamp(20px, 1.6vw, 28px)',
              color: '#FFF',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'clamp(16px, 1.3vw, 24px)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FDC700' }} />
                <span style={{
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(11px, 0.75vw, 13px)',
                  letterSpacing: '0.08em',
                  color: '#FDC700',
                  textTransform: 'uppercase' as const,
                }}>
                  Test Summary — Ready to Begin?
                </span>
              </div>

              {/* 2×3 Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(10px, 0.8vw, 14px)',
                marginBottom: 'clamp(18px, 1.4vw, 26px)',
              }}>
                {[
                  { emoji: '📋', value: `${questionCount}`, label: 'Questions' },
                  { emoji: '⏱', value: `${estimatedMinutes} min`, label: 'Duration' },
                  { emoji: '📚', value: sourceLabel, label: 'Source' },
                  { emoji: '🌍', value: paperLabel, label: 'Paper' },
                  { emoji: '⚡', value: difficultyLabel, label: 'Difficulty' },
                  { emoji: '🌐', value: subjectLabel, label: 'Subjects' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: 'clamp(10px, 0.8vw, 14px)',
                  }}>
                    <div style={{ fontSize: 'clamp(14px, 1vw, 18px)', marginBottom: '4px' }}>{item.emoji}</div>
                    <div style={{
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: 'clamp(13px, 0.85vw, 15px)',
                      color: '#FFF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.value}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(10px, 0.65vw, 11px)',
                      letterSpacing: '0.06em',
                      color: '#94A3B8',
                      textTransform: 'uppercase' as const,
                    }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Benchmark */}
              <div style={{ marginBottom: 'clamp(18px, 1.4vw, 26px)' }}>
                <div style={{
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(11px, 0.72vw, 13px)',
                  letterSpacing: '0.06em',
                  color: '#94A3B8',
                  textTransform: 'uppercase' as const,
                  marginBottom: 'clamp(10px, 0.8vw, 14px)',
                }}>
                  Performance Benchmark
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 0.8vw, 14px)' }}>
                  {benchmarks.map((b, i) => (
                    <div key={i}>
                      <div style={{
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        fontSize: 'clamp(11px, 0.72vw, 13px)',
                        color: '#CBD5E1',
                        marginBottom: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span>{b.emoji}</span> {b.label}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ background: b.color, width: b.width, height: '100%', borderRadius: '6px', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Test Button */}
              <button
                onClick={() => router.push('/dashboard/mock-tests/attempt')}
                style={{
                width: '100%',
                background: 'linear-gradient(90deg, #FDC700, #FF8904, #FF6900)',
                border: 'none',
                borderRadius: '14px',
                padding: 'clamp(12px, 1vw, 16px)',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(14px, 0.95vw, 17px)',
                color: '#FFF',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                marginBottom: 'clamp(14px, 1.1vw, 20px)',
              }}>
                🚀 Generate Test
              </button>

              {/* Bottom info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: 'clamp(10px, 0.68vw, 12px)',
                color: '#64748B',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FDC700' }} />
                <span style={{ marginLeft: '4px' }}>247 students are taking tests right now</span>
              </div>
            </div>
          </div>
        </div>

        </div>
      </main>
    </div>
  );
}
