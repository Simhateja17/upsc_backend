'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService, dashboardService } from '@/lib/services';

/* ─── Static Config (UI structure only, not data) ─── */

const prelimsPaperTypes = [
  { id: 'gs1', icon: '/2k.png', label: 'GS Paper I', description: 'General Studies — History, Geography, Polity, Economy, Science', isDefault: true },
  { id: 'csat', icon: '/3k.png', label: 'CSAT', description: 'Aptitude · Comprehension · Logical Reasoning' },
];

const fallbackQuestionSources = [
  { id: 'daily-mcq', icon: '/sun.png', label: 'Daily MCQ', description: 'Fresh from 10 curated daily picks' },
  { id: 'practice-pyq', icon: '/script.png', label: 'Practice PYQ', description: 'UPSC papers 2010 – 2024' },
  { id: 'subject-wise', icon: '/booksss.png', label: 'Subject-wise', description: 'Deep-dive any one subject' },
  { id: 'mixed-bag', icon: '/shinee.png', label: 'Mixed Bag', description: 'Random cross-subject mix' },
  { id: 'full-length', icon: '/cuppp.png', label: 'Full Length Test', description: 'Complete 100-Q simulation', pro: true },
];

const subjectEmojiMap: Record<string, string> = {
  'All Subjects': '🌐',
  'All Topics': '🌐',
  'History': '📚',
  'Geography': '🗺️',
  'Polity': '⚖️',
  'Economy': '📊',
  'Science & Tech': '🔬',
  'Environment': '🌿',
  'Current Affairs': '📰',
  'Art & Culture': '🎨',
  'International Relations': '🌍',
  'Security & Defence': '🛡️',
  'Art': '🎨',
  'Ancient History': '🏛️',
};

const fallbackExamModes = [
  { id: 'prelims', label: 'Prelims', description: 'Objective MCQs · 2 hour format' },
  { id: 'mains', label: 'Mains', description: 'Analytical & descriptive questions' },
];

const fallbackMainsPaperTypes = [
  { id: 'gs1', emoji: '🌍', label: 'GS I', description: 'Heritage, Culture, History & Geography' },
  { id: 'gs2', emoji: '⚖️', label: 'GS II', description: 'Governance, Polity, Social Justice & IR' },
  { id: 'gs3', emoji: '🚀', label: 'GS III', description: 'Technology, Economy, Environment & Security' },
  { id: 'gs4', emoji: '🧠', label: 'GS IV', description: 'Ethics, Integrity & Aptitude' },
];

const fallbackOptionalSubjects = [
  { name: 'Public Administration', icon: '🏛️' },
  { name: 'Geography', icon: '🗺️' },
  { name: 'History', icon: '📚' },
  { name: 'Sociology', icon: '👥' },
  { name: 'Political Science', icon: '⚖️' },
  { name: 'Philosophy', icon: '' },
  { name: 'Economics', icon: '📊' },
  { name: 'Anthropology', icon: '🦴' },
  { name: 'Psychology', icon: '🧩' },
  { name: 'Law', icon: '📜' },
];

const fallbackDifficulties = [
  { id: 'easy', emoji: '🌱', label: 'Easy', description: 'Foundation level', icon: '/diff-foundation.png' },
  { id: 'medium', emoji: '⚡', label: 'Medium', description: 'Exam standard', icon: '/diff-exam.png' },
  { id: 'hard', emoji: '🔥', label: 'Hard', description: 'Advanced', icon: '/diff-advanced.png' },
  { id: 'mixed', emoji: '🎯', label: 'Mixed', description: 'All levels', icon: '/diff-all.png' },
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

function MockTestsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSource, setSelectedSource] = useState('daily-mcq');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedExamMode, setSelectedExamMode] = useState('prelims');
  const [selectedPaperType, setSelectedPaperType] = useState('gs1');
  const [selectedOptional, setSelectedOptional] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(2);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showProModal, setShowProModal] = useState(false);
  const [proModalFeature, setProModalFeature] = useState<string>('Full-Length Tests');

  /* ─── API State ─── */
  const [subjects, setSubjects] = useState<{ name: string; count: number }[]>([]);
  const [questionSources, setQuestionSources] = useState(fallbackQuestionSources);
  const [examModes, setExamModes] = useState(fallbackExamModes);
  const [mainsPaperTypes, setMainsPaperTypes] = useState(fallbackMainsPaperTypes);
  const [optionalSubjects, setOptionalSubjects] = useState(fallbackOptionalSubjects);
  const [difficulties, setDifficulties] = useState(fallbackDifficulties);
  const [practiceStats, setPracticeStats] = useState<{ todayCount: number; streak: number } | null>(null);
  const [platformStats, setPlatformStats] = useState<{ questionsCount: number; testsCount: number; usersCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Load all data from API ─── */
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [subjectsRes, configRes, statsRes, platformRes] = await Promise.all([
          mockTestService.getSubjects(),
          mockTestService.getConfig(),
          dashboardService.getPracticeStats(),
          mockTestService.getPlatformStats(),
        ]);

        if (cancelled) return;

        if (subjectsRes.data) setSubjects(subjectsRes.data);
        if (configRes.data) {
          const cfg = configRes.data;
          if (cfg.questionSources) setQuestionSources(cfg.questionSources);
          if (cfg.examModes) setExamModes(cfg.examModes);
          if (cfg.mainsPaperTypes) setMainsPaperTypes(cfg.mainsPaperTypes);
          if (cfg.optionalSubjects) setOptionalSubjects(cfg.optionalSubjects);
          if (cfg.difficulties) setDifficulties(cfg.difficulties);
        }
        if (statsRes.data) setPracticeStats(statsRes.data);
        if (platformRes.data) setPlatformStats(platformRes.data);
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

  /* ─── Pre-fill from series query params ─── */
  useEffect(() => {
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    if (subject) setSelectedSubject(subject);
    if (difficulty) setSelectedDifficulty(difficulty);
  }, [searchParams]);

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
      router.push(`/dashboard/mock-tests/attempt?testId=${testId}&examMode=${selectedExamMode}`);
    } catch (err: any) {
      console.error('Failed to generate test:', err);
      setError(err.message || 'Failed to generate test. Please try again.');
      setGenerating(false);
    }
  };

  const estimatedMinutes = selectedExamMode === 'mains'
    ? Math.ceil(questionCount * 9)
    : Math.ceil(questionCount * 1.6);

  /* Derive display labels for summary */
  const sourceLabel = questionSources.find(s => s.id === selectedSource)?.label ?? 'Daily MCQ';
  const paperLabel = selectedExamMode === 'mains'
    ? (mainsPaperTypes.find(p => p.id === selectedPaperType)?.label ?? 'GS I')
    : (prelimsPaperTypes.find(p => p.id === selectedPaperType)?.label ?? 'GS Paper I');
  const subjectLabel = subjects.find(s => s.name === selectedSubject)?.name ?? selectedSubject ?? 'All Topics';
  const difficultyLabel = difficulties.find(d => d.id === selectedDifficulty)?.label ?? 'Medium';

  /* ─── Card style helper ─── */
  const cardStyle: React.CSSProperties = {
    background: '#FFF',
    border: '0.8px solid #E5E7EB',
    borderRadius: '16px',
    padding: 'clamp(20px, 1.7vw, 28px)',
    marginBottom: 'clamp(14px, 1.2vw, 20px)',
  };

  return (
    <div className="flex overflow-hidden" style={{ background: '#D8DEE6', height: '100%' }}>

      {/* ── Pro Upgrade Modal ── */}
      {showProModal && (
        <div
          onClick={() => setShowProModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '24px',
              padding: '28px 24px 24px',
              width: '100%', maxWidth: '360px',
              position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setShowProModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280', lineHeight: 1 }}
            >×</button>

            {/* Icon */}
            <div style={{ textAlign: 'center', fontSize: '40px', marginBottom: '12px' }}>📋</div>

            {/* Title */}
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '20px', color: '#101828', textAlign: 'center', marginBottom: '8px' }}>
              {proModalFeature} Await
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6B7280', textAlign: 'center', lineHeight: 1.5, marginBottom: '18px' }}>
              Complete 100-question papers replicating real UPSC patterns.{' '}
              <strong style={{ color: '#101828' }}>Top rankers</strong> swear by this format.
            </p>

            {/* Usage bar */}
            <div style={{ background: '#F3F4F6', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B7280' }}>Free today: <strong style={{ color: '#101828' }}>3 / 10</strong> questions used</span>
              </div>
              <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '30%', background: 'linear-gradient(90deg, #FF6900, #FDC700)', borderRadius: '999px' }} />
              </div>
            </div>

            {/* Plans */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {/* Monthly Pro */}
              <div style={{ border: '1.5px solid #E5E7EB', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#101828' }}>Monthly Pro</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B7280' }}>Unlimited tests, all subjects, PYQ, analytics</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#101828' }}>₹299</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6B7280' }}>/month</div>
                </div>
              </div>

              {/* 6-Month Pro + Mentorship (Most Popular) */}
              <div style={{ border: '2px solid #101828', borderRadius: '14px', padding: '14px 16px', background: '#0F172B', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: '#FDC700', color: '#101828', fontFamily: 'Inter, sans-serif',
                  fontWeight: 700, fontSize: '10px', padding: '3px 10px', borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}>⭐ MOST POPULAR</span>
                <span style={{ fontSize: '20px' }}>🎓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>6-Month Pro + Mentorship</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8' }}>Pro + personal mentorship with Jeet Sir</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#FDC700' }}>₹1299</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#94A3B8' }}>/6 months</div>
                </div>
              </div>

              {/* Annual Elite */}
              <div style={{ border: '1.5px solid #E5E7EB', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#101828' }}>Annual Elite</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B7280' }}>Full year + live classes + Interview prep</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#101828' }}>₹1999</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6B7280' }}>/year</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <a href="/dashboard/free-trial" style={{ display: 'block', textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: '#101828', color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer', marginBottom: '10px',
              }}>
                View All Plans &amp; Start Free Trial →
              </button>
            </a>
            <div style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}
              onClick={() => setShowProModal(false)}>
              Continue with free tier
            </div>
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#F9FAFB' }}>

        {/* ── Hero Area (Full Width) ── */}
        <div style={{
          textAlign: 'center',
          padding: 'clamp(28px, 2.5vw, 40px) clamp(16px, 1.5vw, 24px) clamp(14px, 1.2vw, 20px)',
          maxWidth: '1320px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #0F172B 0%, #162456 50%, #1E3A5F 100%)',
          borderRadius: '0 0 24px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Grid pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }} />
          {/* Glow effects */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-20%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(253,199,0,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

            {/* Badge pill */}
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.1)',
              color: '#FDC700',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              padding: '4px 14px',
              borderRadius: '999px',
              marginBottom: '14px',
              border: '1px solid rgba(253,199,0,0.3)',
              position: 'relative',
              zIndex: 1,
            }}>
              📊 MOCK TEST PLATFORM
            </div>

            {/* Heading */}
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '42px',
              lineHeight: '50px',
              color: '#FFFFFF',
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1,
            }}>
              Build Your{' '}
              <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', fontSize: '42px', lineHeight: '50px', color: '#FDC700' }}>Perfect</span>{' '}
              Mock Test
            </h1>

            {/* Subtitle */}
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '22px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1,
            }}>
              Adaptive questions · Real exam environment · Detailed analytics. Add as much as it.
            </p>

            {/* Stats Container */}
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '600px',
              margin: '0 auto',
              position: 'relative',
              zIndex: 1,
            }}>
              {[
                { value: platformStats ? `${platformStats.questionsCount.toLocaleString('en-IN')}+` : '50K+', label: 'Questions', color: '#FDC700' },
                { value: platformStats ? `${platformStats.testsCount.toLocaleString('en-IN')}+` : '15K+', label: 'Community', color: '#FB2C36' },
                { value: platformStats ? `${platformStats.usersCount.toLocaleString('en-IN')}+` : '10K+', label: 'Tests Taken', color: '#3B82F6' },
                { value: '86%', label: 'Success Rate', color: '#16A34A' },
              ].map((stat, idx, arr) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'Arimo, sans-serif',
                      fontWeight: 700,
                      fontSize: '32px',
                      lineHeight: '40px',
                      color: stat.color,
                      fontVariantEmoji: 'text' as React.CSSProperties['fontVariantEmoji'],
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontFamily: 'Arimo, sans-serif',
                      fontWeight: 400,
                      fontSize: '11px',
                      lineHeight: '16px',
                      color: 'rgba(255,255,255,0.5)',
                      textAlign: 'center',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', margin: '0 24px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Prelims / Mains Toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '999px',
              padding: '5px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              marginTop: '22px',
              position: 'relative',
              zIndex: 1,
            }}>
              <button
                onClick={() => setSelectedExamMode('prelims')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingLeft: '30px',
                  paddingRight: '30px',
                  height: '58px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedExamMode === 'prelims' ? '#0F172B' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/9k.png" alt="Prelims" style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '17px', color: selectedExamMode === 'prelims' ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}>Prelims</span>
              </button>
              <button
                onClick={() => setSelectedExamMode('mains')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingLeft: '30px',
                  paddingRight: '30px',
                  height: '58px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedExamMode === 'mains' ? '#0F172B' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src="/8k.png" alt="Mains" style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '17px', color: selectedExamMode === 'mains' ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}>Mains</span>
              </button>
            </div>

              <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(13px, 0.85vw, 15px)', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
                {practiceStats ? (
                  <>
                    You&apos;ve taken <span style={{ color: '#16A34A', fontWeight: 700 }}>{practiceStats.todayCount} test{practiceStats.todayCount !== 1 ? 's' : ''}</span> today
                    {practiceStats.streak > 0 && <> · <span style={{ color: '#F97316', fontWeight: 700 }}>{practiceStats.streak} day streak</span></>}
                  </>
                ) : (
                  <>Start practicing to track your daily progress.</>
                )}
              </p>
          </div>

        {/* ── Two Column Layout: Steps + Test Summary ── */}
        <div style={{ display: 'flex', gap: 'clamp(10px, 1vw, 16px)', padding: '0 clamp(12px, 1.2vw, 20px) clamp(12px, 1.2vw, 20px)', maxWidth: '1320px', margin: '0 auto' }}>

        {/* ── Left Column: Steps ── */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

          {/* ── Step 1: Exam Mode ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '18px',
            padding: '24px 28px',
            marginBottom: 'clamp(14px, 1.2vw, 20px)',
            boxShadow: '0 4px 24px 0 rgba(16,24,40,0.07), 0 1.5px 6px 0 rgba(16,24,40,0.04)',
          }}>
            {/* Step Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#0F172B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>1</span>
              </div>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.35px',
                textTransform: 'uppercase' as const,
                color: '#101828',
              }}>
                Exam Mode
              </span>
            </div>

            {/* Select paper type label */}
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: '#17223E',
              marginBottom: '12px',
            }}>
              Select paper type
            </div>

            {/* Paper Type Cards */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const }}>
              {(selectedExamMode === 'mains' ? mainsPaperTypes : prelimsPaperTypes).map(paper => {
                const isSelected = selectedPaperType === paper.id;
                return (
                  <button
                    key={paper.id}
                    onClick={() => setSelectedPaperType(paper.id)}
                    style={{
                      flex: '1 1 0',
                      minWidth: selectedExamMode === 'mains' ? '110px' : '190px',
                      background: isSelected ? '#EFF6FF' : '#F9FAFB',
                      border: isSelected ? '1.6px solid #BEDBFF' : '1.6px solid #E5E7EB',
                      borderRadius: '14px',
                      padding: '16px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column' as const,
                    }}
                  >
                    {(paper as { emoji?: string }).emoji && (
                      <div style={{ fontSize: '26px', marginBottom: '6px', lineHeight: 1 }}>
                        {(paper as { emoji?: string }).emoji}
                      </div>
                    )}
                    {(paper as { icon?: string }).icon && (
                      <div style={{ marginBottom: '5px' }}>
                        <img src={(paper as { icon?: string }).icon} alt={paper.label} style={{ width: '24px', height: '28px', objectFit: 'contain' }} />
                      </div>
                    )}
                    {(paper as { isDefault?: boolean }).isDefault && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#FDC700',
                        color: '#101828',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700,
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '999px',
                      }}>
                        DEFAULT
                      </span>
                    )}
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#101828', marginBottom: '3px' }}>
                      {paper.label}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '13px', color: '#4A5565', lineHeight: 1.4 }}>
                      {paper.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Focus on a Specific Subject */}
            <div style={{
              background: '#F0F4FF',
              borderRadius: '14px',
              padding: '16px 20px',
            }}>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.5px',
                color: '#17223E',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                🎯 FOCUS ON A SPECIFIC SUBJECT
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subjects.map(subj => {
                  const isSelected = selectedSubject === subj.name;
                  return (
                    <button
                      key={subj.name}
                      onClick={() => setSelectedSubject(subj.name)}
                      style={{
                        background: isSelected ? '#17223E' : '#FFF',
                        color: isSelected ? '#FFF' : '#374151',
                        border: isSelected ? '1.5px solid #17223E' : '1.5px solid #E5E7EB',
                        borderRadius: '999px',
                        padding: '6px 16px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {subjectEmojiMap[subj.name] && (
                        <span style={{ fontSize: '14px', lineHeight: 1 }}>{subjectEmojiMap[subj.name]}</span>
                      )}
                      {subj.name}
                      {subj.count > 0 && (
                        <span style={{ opacity: 0.7, fontWeight: 500, fontSize: 'clamp(11px, 0.7vw, 13px)' }}>{subj.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Subject (Mains only) */}
            {selectedExamMode === 'mains' && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#17223E',
                  marginBottom: '12px',
                }}>
                  Optional Subject
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(6px, 0.45vw, 10px)' }}>
                  {optionalSubjects.map(opt => {
                    const optName = typeof opt === 'string' ? opt : opt.name;
                    const optIcon = typeof opt === 'object' ? opt.icon : '';
                    const isSelected = selectedOptional === optName;
                    return (
                      <button
                        key={optName}
                        onClick={() => setSelectedOptional(isSelected ? null : optName)}
                        style={{
                          background: isSelected ? '#17223E' : '#FFF',
                          color: isSelected ? '#FFF' : '#374151',
                          border: isSelected ? '1.5px solid #17223E' : '1.5px solid #E5E7EB',
                          borderRadius: '999px',
                          padding: 'clamp(5px, 0.4vw, 7px) clamp(12px, 0.9vw, 18px)',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 600,
                          fontSize: 'clamp(12px, 0.78vw, 13px)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {optIcon && <span style={{ fontSize: '14px', lineHeight: 1 }}>{optIcon}</span>}
                        {optName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto' }}>
              {questionSources.map(src => {
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      if ((src as any).pro) {
                        setProModalFeature(src.label);
                        setShowProModal(true);
                      } else {
                        setSelectedSource(src.id);
                      }
                    }}
                    style={{
                      flex: '1 1 0',
                      minWidth: '110px',
                      background: isSelected ? '#EFF6FF' : '#FFF',
                      border: isSelected ? '2px solid #155DFC' : '1.5px solid #E5E7EB',
                      borderRadius: '14px',
                      padding: '16px 16px',
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
                    <div style={{ marginBottom: '8px' }}>
                      <img src={(src as { icon?: string }).icon} alt={src.label} style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#101828', marginBottom: '4px' }}>
                      {src.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                      {src.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          )}


          {/* ── Step 3: Number of Questions ── */}
          {!loading && (
          <div style={cardStyle}>
            <StepHeader step={3} label="Number of Questions" />
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
                  onClick={() => setQuestionCount(c => Math.min(20, c + 1))}
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
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '26843500px',
                    background: `linear-gradient(90deg, #0F172A 0%, #0F172A ${((questionCount - 1) / 19) * 100}%, #E5E7EB ${((questionCount - 1) / 19) * 100}%, #E5E7EB 100%)`,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[1, 5, 10, 20].map(val => (
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
                { value: 1, label: '1 Q', icon: '/90.png', active: true },
                { value: 2, label: '2 Q', icon: '/text7.png', active: false },
                { value: 5, label: '5 Q', icon: '/text8.png', active: false },
                { value: 10, label: '10 Q', icon: '/text8.png', active: false },
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
                onClick={() => {
                  if (questionCount === 20) return;
                  setQuestionCount(20);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '40px',
                  borderRadius: '26843500px',
                  border: questionCount === 20 ? 'none' : '1px solid #E5E7EB',
                  background: questionCount === 20 ? '#0F172B' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative' as const,
                }}
              >
                <img src="/text8.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: questionCount === 20 ? '#FFFFFF' : '#364153',
                }}>
                  20 Q
                </span>
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-4px',
                  background: '#FDC700',
                  color: '#101828',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: '9px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                }}>
                  PRO
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
                  <strong>Guideline:</strong> You&apos;re setting <strong>{questionCount} question{questionCount !== 1 ? 's' : ''}</strong>. Free users have <strong>{selectedExamMode === 'mains' ? '2' : '10'} questions daily</strong>. This is generated from <strong>PYQ, questions bank</strong>.
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

          {/* ── Step 4: Difficulty ── */}
          {!loading && (
          <div style={cardStyle}>
            <StepHeader step={4} label="Difficulty" />
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
        <div className="hidden lg:block" style={{ width: 'clamp(280px, 20vw, 340px)', flexShrink: 0 }}>
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
                  Test Summary - Ready to Begin?
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
                  Your Activity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 0.8vw, 14px)' }}>
                  {[
                    {
                      emoji: '🔥',
                      label: practiceStats ? `${practiceStats.streak} day streak` : 'No streak yet',
                      color: '#F97316',
                      width: practiceStats ? `${Math.min(practiceStats.streak * 10, 100)}%` : '0%',
                    },
                    {
                      emoji: '📝',
                      label: practiceStats ? `${practiceStats.todayCount} test${practiceStats.todayCount !== 1 ? 's' : ''} today` : 'No tests today',
                      color: '#3B82F6',
                      width: practiceStats ? `${Math.min(practiceStats.todayCount * 20, 100)}%` : '0%',
                    },
                    {
                      emoji: '📚',
                      label: platformStats ? `${platformStats.questionsCount.toLocaleString('en-IN')} questions available` : 'Loading...',
                      color: '#16A34A',
                      width: '100%',
                    },
                  ].map((b, i) => (
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

export default function MockTestsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB' }} />}>
      <MockTestsPageInner />
    </Suspense>
  );
}
