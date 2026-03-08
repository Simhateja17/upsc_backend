'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { mockTestService, dashboardService } from '@/lib/services';

/* ─── Fallback Data Arrays (used while API loads or on error) ─── */

const prelimsPaperTypes = [
  { id: 'gs1', icon: '/2k.png', label: 'GS Paper I', description: 'General Studies — History, Geography, Polity, Economy, Science', isDefault: true },
  { id: 'csat', icon: '/3k.png', label: 'CSAT', description: 'Aptitude · Comprehension · Logical Reasoning' },
];

const fallbackQuestionSources = [
  { id: 'daily-mcq', emoji: '📝', label: 'Daily MCQ', description: 'Fresh questions every day based on current affairs' },
  { id: 'practice-pyq', emoji: '📚', label: 'Practice PYQ', description: 'Previous year questions sorted by topic & year' },
  { id: 'subject-wise', emoji: '🎯', label: 'Subject-wise', description: 'Deep dive into specific UPSC subjects' },
  { id: 'mixed-bag', emoji: '🎲', label: 'Mixed Bag', description: 'Random questions across all subjects' },
  { id: 'full-length', emoji: '🏅', label: 'Full Length Test', description: 'Complete exam simulation experience', pro: true },
];

const fallbackSubjects = [
  { id: 'all', label: 'All Subjects', count: null },
  { id: 'history', label: 'History', count: 348 },
  { id: 'geography', label: 'Geography', count: 398 },
  { id: 'polity', label: 'Polity', count: 348 },
  { id: 'economy', label: 'Economy', count: 368 },
];

const fallbackExamModes = [
  { id: 'prelims', label: 'Prelims', description: 'Objective MCQs · 2 hour format' },
  { id: 'mains', label: 'Mains', description: 'Analytical & descriptive questions' },
];

const fallbackMainsPaperTypes = [
  { id: 'gs1', label: 'GS Paper I', description: 'Indian Heritage, History, Geography & Society' },
  { id: 'gs2', label: 'GS Paper II', description: 'Governance, Constitution, Polity & IR' },
  { id: 'gs3', label: 'GS Paper III', description: 'Technology, Economic Dev, Biodiversity & Security' },
  { id: 'gs4', label: 'GS Paper IV', description: 'Ethics, Integrity & Aptitude' },
];

const fallbackOptionalSubjects = [
  'Public Administration', 'Geography', 'History', 'Sociology',
  'Political Science', 'Philosophy', 'Economics', 'Anthropology',
  'Psychology', 'Law',
];

const fallbackDifficulties = [
  { id: 'easy', emoji: '🌱', label: 'Easy', description: 'Foundation level' },
  { id: 'medium', emoji: '⚡', label: 'Medium', description: 'Exam standard' },
  { id: 'hard', emoji: '🔥', label: 'Hard', description: 'Advanced level' },
  { id: 'mixed', emoji: '🎯', label: 'Mixed', description: 'All difficulty levels' },
];

const fallbackBenchmarks = [
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
  const [selectedExamMode, setSelectedExamMode] = useState('prelims');
  const [selectedPaperType, setSelectedPaperType] = useState('gs1');
  const [selectedOptional, setSelectedOptional] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  /* ─── API State ─── */
  const [subjects, setSubjects] = useState(fallbackSubjects);
  const [questionSources, setQuestionSources] = useState(fallbackQuestionSources);
  const [examModes, setExamModes] = useState(fallbackExamModes);
  const [mainsPaperTypes, setMainsPaperTypes] = useState(fallbackMainsPaperTypes);
  const [optionalSubjects, setOptionalSubjects] = useState(fallbackOptionalSubjects);
  const [difficulties, setDifficulties] = useState(fallbackDifficulties);
  const [benchmarks, setBenchmarks] = useState(fallbackBenchmarks);
  const [practiceStats, setPracticeStats] = useState<{ completed: number; remaining: number; streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Load subjects, config, and practice stats from API ─── */
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [subjectsRes, configRes, statsRes] = await Promise.all([
          mockTestService.getSubjects(),
          mockTestService.getConfig(),
          dashboardService.getPracticeStats(),
        ]);

        if (cancelled) return;

        if (subjectsRes.data) {
          setSubjects(subjectsRes.data);
        }
        if (configRes.data) {
          const cfg = configRes.data;
          if (cfg.questionSources) setQuestionSources(cfg.questionSources);
          if (cfg.examModes) setExamModes(cfg.examModes);
          if (cfg.mainsPaperTypes) setMainsPaperTypes(cfg.mainsPaperTypes);
          if (cfg.optionalSubjects) setOptionalSubjects(cfg.optionalSubjects);
          if (cfg.difficulties) setDifficulties(cfg.difficulties);
          if (cfg.benchmarks) setBenchmarks(cfg.benchmarks);
        }
        if (statsRes.data) {
          setPracticeStats(statsRes.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load mock test config:', err);
          setError(err.message || 'Failed to load configuration');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  /* ─── Generate Test Handler ─── */
  const handleGenerateTest = async () => {
    setGenerating(true);
    setError(null);
    try {
      const config = {
        source: selectedSource,
        subject: selectedSubject,
        examMode: selectedExamMode,
        paperType: selectedExamMode === 'mains' ? selectedPaperType : undefined,
        questionCount,
        difficulty: selectedDifficulty,
      };
      const res = await mockTestService.generate(config);
      const testId = res.data?.testId || res.data?.id;
      if (!testId) {
        throw new Error('No test ID returned from server');
      }
      router.push(`/dashboard/mock-tests/attempt?testId=${testId}`);
    } catch (err: any) {
      console.error('Failed to generate test:', err);
      setError(err.message || 'Failed to generate test. Please try again.');
      setGenerating(false);
    }
  };

  const estimatedMinutes = Math.ceil(questionCount * 1.6);

  /* Derive display labels for summary */
  const sourceLabel = questionSources.find(s => s.id === selectedSource)?.label ?? 'Daily MCQ';
  const paperLabel = selectedExamMode === 'mains'
    ? (mainsPaperTypes.find(p => p.id === selectedPaperType)?.label ?? 'GS I')
    : (prelimsPaperTypes.find(p => p.id === selectedPaperType)?.label ?? 'GS Paper I');
  const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label ?? 'All Topics';
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
      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#F9FAFB' }}>

        {/* ── Hero Area (Full Width) ── */}
        <div style={{ textAlign: 'center', padding: 'clamp(28px, 3vw, 48px) clamp(16px, 1.5vw, 24px) clamp(16px, 1.4vw, 24px)', maxWidth: '1320px', margin: '0 auto' }}>

            {/* Badge pill */}
            <div style={{
              display: 'inline-block',
              background: '#0F172B',
              color: '#FFFFFF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              lineHeight: '16px',
              letterSpacing: '0px',
              padding: '4px 14px',
              borderRadius: '999px',
              marginBottom: '20px',
              border: '1px solid #0F172B',
              boxShadow: '0px 1px 3px 0px #0000001A',
            }}>
              📊 India&apos;s #1 UPSC Mock Test Platform
            </div>

            {/* Heading */}
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '48px',
              lineHeight: '48px',
              letterSpacing: '0px',
              color: '#101828',
              marginBottom: '16px',
            }}>
              Build Your{' '}
              <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', fontSize: '48px', lineHeight: '48px', color: '#C68A0B' }}>Perfect</span>{' '}
              Mock Test
            </h1>

            {/* Subtitle */}
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0px',
              color: '#4A5565',
              marginBottom: '0px',
            }}>
              Adaptive questions · Real exam environment · Detailed analytics.
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0px',
              color: '#4A5565',
              marginBottom: '28px',
            }}>
              Everything free. Add as much it.
            </p>

            {/* Stats Container */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '0.8px solid #E5E7EB',
              boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '614px',
              margin: '0 auto',
            }}>
              {[
                { value: '4800+', label: 'Questions', color: '#101828' },
                { value: '2.1L+', label: 'Tests Taken', color: '#101828' },
                { value: '94K+', label: 'Community', color: '#101828' },
                { value: '\u221E', label: 'Always Growing', color: '#DBAC49' },
              ].map((stat, idx, arr) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'Arimo, sans-serif',
                      fontWeight: 700,
                      fontSize: '36px',
                      lineHeight: '40px',
                      letterSpacing: '0px',
                      color: stat.color,
                      fontVariantEmoji: 'text' as React.CSSProperties['fontVariantEmoji'],
                    }}>
                      {stat.value.includes('+')
                        ? <>{stat.value.replace('+', '')}<span style={{ color: '#DBAC49' }}>+</span></>
                        : stat.value}
                    </div>
                    <div style={{
                      fontFamily: 'Arimo, sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0px',
                      color: '#6A7282',
                      textAlign: 'center',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: '1px', height: '40px', background: '#E5E7EB', margin: '0 24px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Prelims / Mains Toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '26843500px',
              padding: '8px',
              gap: '0px',
              background: '#FFFFFF',
              border: '0.8px solid #E5E7EB',
              boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A',
              marginTop: '28px',
            }}>
              <button
                onClick={() => setSelectedExamMode('prelims')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  height: '64px',
                  borderRadius: '26843500px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedExamMode === 'prelims' ? '#0F172B' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/9k.png" alt="Prelims" style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '28px',
                  color: selectedExamMode === 'prelims' ? '#FFFFFF' : '#4A5565',
                }}>Prelims</span>
              </button>
              <button
                onClick={() => setSelectedExamMode('mains')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  height: '64px',
                  borderRadius: '26843500px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedExamMode === 'mains' ? '#0F172B' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/8k.png" alt="Mains" style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '28px',
                  color: selectedExamMode === 'mains' ? '#FFFFFF' : '#4A5565',
                }}>Mains</span>
              </button>
            </div>

              <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(13px, 0.85vw, 15px)', lineHeight: 1.6, color: '#CBD5E1' }}>
                {practiceStats ? (
                  <>
                    You&apos;ve completed <span style={{ color: '#16A34A', fontWeight: 700 }}>{practiceStats.completed} questions</span> today — <span style={{ color: '#16A34A', fontWeight: 700 }}>{practiceStats.remaining} remaining</span> on free tier
                  </>
                ) : (
                  <>Start practicing to track your daily progress.</>
                )}
              </p>
          </div>

        {/* ── Two Column Layout: Steps + Test Summary ── */}
        <div style={{ display: 'flex', gap: 'clamp(16px, 1.4vw, 24px)', padding: '0 clamp(16px, 1.5vw, 24px) clamp(20px, 2vw, 36px)', maxWidth: '1320px', margin: '0 auto' }}>

        {/* ── Left Column: Steps ── */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

          {/* ── Step 1: Exam Mode ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: 'clamp(16px, 1.4vw, 24px)',
          }}>
            {/* Step Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '26843500px',
                background: '#0F172B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#FFFFFF',
                }}>1</span>
              </div>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '0.35px',
                textTransform: 'uppercase' as const,
                color: '#101828',
              }}>
                Exam Mode
              </span>
            </div>

            {/* Subtitle */}
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '20px',
              color: '#4A5565',
              marginBottom: '20px',
            }}>
              Select paper type
            </div>

            {/* Paper Type Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {(selectedExamMode === 'mains' ? mainsPaperTypes : prelimsPaperTypes).map(paper => {
                const isSelected = selectedPaperType === paper.id;
                return (
                  <button
                    key={paper.id}
                    onClick={() => setSelectedPaperType(paper.id)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '280px',
                      height: '179px',
                      background: isSelected ? '#EFF6FF' : '#F9FAFB',
                      border: isSelected ? '1.6px solid #BEDBFF' : '1.6px solid #E5E7EB',
                      borderRadius: '16px',
                      padding: '20px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column' as const,
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <img src={paper.icon} alt={paper.label} style={{ width: '36px', height: '40px', objectFit: 'contain' }} />
                    </div>
                    {'isDefault' in paper && paper.isDefault && (
                      <span style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: '#FDC700',
                        color: '#101828',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700,
                        fontSize: '12px',
                        lineHeight: '16px',
                        padding: '4px 12px',
                        borderRadius: '26843500px',
                      }}>
                        DEFAULT
                      </span>
                    )}
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: '18px',
                      lineHeight: '28px',
                      color: '#101828',
                      marginBottom: '4px',
                    }}>
                      {paper.label}
                    </div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#4A5565',
                    }}>
                      {paper.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Loading Spinner ── */}
          {loading && (
            <div style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(40px, 3vw, 60px)',
              gap: '12px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #E5E7EB',
                borderTopColor: '#17223E',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: 'clamp(13px, 0.85vw, 15px)',
                color: '#6B7280',
              }}>
                Loading configuration...
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Error Banner ─── */}
          {error && (
            <div style={{
              ...cardStyle,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: 'clamp(14px, 1vw, 20px)',
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: 'clamp(13px, 0.85vw, 15px)',
                color: '#991B1B',
              }}>
                {error}
              </span>
            </div>
          )}

          {/* ── Step 1: Question Source ── */}
          {!loading && (
          <div style={cardStyle}>
                <StepHeader step={2} label="Question Source" />
                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 'clamp(8px, 0.6vw, 12px)', overflowX: 'auto' }}>
              {questionSources.map(src => {
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setSelectedSource(src.id)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '120px',
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
                    {(src as any).pro && (
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
                    <div style={{ marginBottom: '6px' }}>
                      <img src={src.icon} alt={src.label} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    </div>
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
          )}

          {/* ── Step 2: Subject Filter ── */}
          {!loading && (
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
          )}

          {/* ── Step 3: Exam Mode ── */}
          {!loading && (
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
          )}

          {/* ── Step 4: Number of Questions ── */}
          {!loading && (
          <div style={cardStyle}>
            <StepHeader step={4} label="Number of Questions" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.4vw, 8px)', marginBottom: 'clamp(16px, 1.2vw, 22px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(18px, 1.5vw, 28px)' }}>
                <button
                  onClick={() => setQuestionCount(c => Math.max(1, c - 1))}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '26843500px',
                    border: 'none',
                    background: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#364153',
                    transition: 'all 0.15s ease',
                  }}
                >
                  −
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '48px',
                    lineHeight: '48px',
                    color: '#101828',
                  }}>
                    {questionCount}
                  </div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#6A7282',
                    marginTop: '4px',
                  }}>
                    questions
                  </div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#99A1AF',
                  }}>
                    ~{Math.ceil(questionCount * 2)} min · Free tier
                  </div>
                </div>
                <button
                  onClick={() => setQuestionCount(c => Math.min(100, c + 1))}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '26843500px',
                    border: 'none',
                    background: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#364153',
                    transition: 'all 0.15s ease',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Range Slider */}
            <div style={{ padding: '10px 32px', marginBottom: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '26843500px',
                    background: `linear-gradient(90deg, #0F172A 0%, #0F172A ${questionCount}%, #E5E7EB ${questionCount}%, #E5E7EB 100%)`,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[1, 25, 50, 75, 100].map(val => (
                  <span
                    key={val}
                    onClick={() => setQuestionCount(val)}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#99A1AF',
                      cursor: 'pointer',
                    }}
                  >
                    {val}
                  </span>
                ))}
              </div>
            </div>

            {/* Preset Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              {[
                { value: 5, label: 'Quick 5', icon: '/90.png', active: true },
                { value: 10, label: 'Standard 10', icon: '/text7.png', active: false },
                { value: 25, label: '25 Q', icon: '/text8.png', active: false },
                { value: 50, label: '50 Q', icon: '/text8.png', active: false },
                { value: 75, label: '75 Q', icon: '/text8.png', active: false },
              ].map(preset => {
                const isActive = questionCount === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setQuestionCount(preset.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '20px',
                      paddingRight: '20px',
                      height: '40px',
                      borderRadius: '26843500px',
                      border: isActive ? 'none' : '1px solid #E5E7EB',
                      background: isActive ? '#0F172B' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <img src={preset.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: isActive ? '#FFFFFF' : '#364153',
                    }}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setQuestionCount(100)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '40px',
                  borderRadius: '26843500px',
                  border: questionCount === 100 ? 'none' : '1px solid #E5E7EB',
                  background: questionCount === 100 ? '#0F172B' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <img src="/text8.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: questionCount === 100 ? '#FFFFFF' : '#364153',
                }}>
                  Full 100
                </span>
              </button>
            </div>

            {/* Guideline Banner */}
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M9 1.5L1.5 15H16.5L9 1.5Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M9 7V10" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="9" cy="12.5" r="0.75" fill="#D97706"/>
                </svg>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#92400E',
                  lineHeight: '20px',
                  margin: 0,
                }}>
                  <strong>Guideline:</strong> You&apos;re setting <strong>{questionCount} questions</strong>. Free users have <strong>10 questions daily</strong>. This generates from <strong>PYQ, questions bank</strong>.
                </p>
              </div>
              <button style={{
                background: '#FDC700',
                color: '#101828',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 20px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Unlock
              </button>
            </div>
          </div>
          )}

          {/* ── Step 5: Difficulty ── */}
          {!loading && (
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
          )}

        </div>

        {/* ── Right Column: Sticky Test Summary ── */}
        <div className="hidden xl:block" style={{ width: 'clamp(280px, 20vw, 340px)', flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: '80px' }}>
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

              {/* 2x3 Info Grid */}
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
                onClick={handleGenerateTest}
                disabled={generating || loading}
                style={{
                width: '100%',
                background: generating ? '#9CA3AF' : 'linear-gradient(90deg, #FDC700, #FF8904, #FF6900)',
                border: 'none',
                borderRadius: '14px',
                padding: 'clamp(12px, 1vw, 16px)',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(14px, 0.95vw, 17px)',
                color: '#FFF',
                cursor: generating || loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                marginBottom: 'clamp(14px, 1.1vw, 20px)',
                opacity: generating || loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                {generating ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFF',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Generating...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  '🚀 Generate Test'
                )}
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
