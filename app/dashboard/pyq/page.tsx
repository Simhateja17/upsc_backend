'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { pyqService } from '@/lib/services';

const AI_EVAL_DURATION_MS = 30 * 1000; // 30 seconds
const AI_EVAL_STEPS = [
  'Reading your handwritten answers',
  'Identifying key points & arguments',
  'Comparing with model answers',
  'Preparing detailed markup & feedback',
  "Generating Jeet Sir's analysis",
];

export default function PyqPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAttemptModal, setShowAttemptModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showMainsWriteModal, setShowMainsWriteModal] = useState(false);
  const [showAiEvalModal, setShowAiEvalModal] = useState(false);
  const [showAiEvalCompleteModal, setShowAiEvalCompleteModal] = useState(false);
  const [aiEvalProgress, setAiEvalProgress] = useState(0);
  const [aiEvalStepIndex, setAiEvalStepIndex] = useState(0);
  const [mode, setMode] = useState<'prelims' | 'mains'>('prelims');

  // Data state
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('All Papers');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pyqService.getQuestions({
        mode,
        year: selectedYear || undefined,
        subject: selectedSubject !== 'All Papers' ? selectedSubject : undefined,
        page,
        limit: 20,
      });
      if (res.status === 'success') {
        setQuestions(res.data.questions);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      } else {
        setError(res.message || 'Failed to load questions');
        setQuestions([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch PYQ questions:', e);
      setError('Unable to load questions. Please check your connection and try again.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedYear, selectedSubject, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [mode, selectedYear, selectedSubject]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // When AI eval modal opens: run 30s timer, animate progress and steps, then open results
  useEffect(() => {
    if (!showAiEvalModal) {
      setAiEvalProgress(0);
      setAiEvalStepIndex(0);
      return;
    }
    setShowAiEvalCompleteModal(false);
    setAiEvalStepIndex(1); // First step "Reading your handwritten answers" done from start
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AI_EVAL_DURATION_MS) * 100);
      setAiEvalProgress(pct);
      // Steps 2–5 complete at ~6s, 12s, 18s, 24s (step 1 already done)
      const step = 1 + Math.min(AI_EVAL_STEPS.length - 1, Math.floor((elapsed / AI_EVAL_DURATION_MS) * (AI_EVAL_STEPS.length - 1)));
      setAiEvalStepIndex(step);
    }, 200);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setShowAiEvalModal(false);
      setAiEvalProgress(100);
      setAiEvalStepIndex(AI_EVAL_STEPS.length);
      setShowAiEvalCompleteModal(true); // Open AI Evaluation Complete screen
    }, AI_EVAL_DURATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showAiEvalModal]);

  return (
    <div
      className="flex flex-col items-center overflow-y-auto"
      style={{ background: '#F9FAFB', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}
    >
      <div className="w-full max-w-[1080px] px-6 pt-16 pb-16">
        {/* Hero copy */}
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-geist)] font-bold text-[36px] md:text-[48px] leading-[48px] text-[#101828]">
            The Complete{' '}
            <span className="italic font-bold text-[#1452CC]">
              PYQ
            </span>{' '}
            <span className="text-[#D9A84F]">
              Bank
            </span>
          </h1>
          <h2 className="font-[var(--font-geist)] font-bold text-[36px] md:text-[48px] leading-[48px] text-[#101828] mt-2">
            for UPSC Success
          </h2>
          <p className="mt-4 text-[14px] md:text-[18px] leading-[29px] text-[#6A7282] max-w-[768px] mx-auto">
            Every UPSC question ever asked — Prelims &amp; Mains — with smart AI-powered Mains evaluation,
            subject filters, and instant explanations.
          </p>
        </div>

        {/* Stats strip */}
        <div className="w-full max-w-[672px] mx-auto mb-10 rounded-[24px] bg-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Questions */}
            <div className="flex flex-col items-center md:items-start md:pr-8">
              <div className="text-[28px] md:text-[32px] font-bold text-[#101828] leading-[36px]">
                12,400
              </div>
              <div className="mt-1 text-[11px] tracking-[0.07em] uppercase text-[#99A1AF]">
                Questions
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-[#E5E7EB]" />

            {/* Coverage */}
            <div className="flex flex-col items-center md:items-start md:px-8">
              <div className="text-[20px] md:text-[24px] font-semibold leading-[32px] text-[#D9A84F]">
                14yrs
              </div>
              <div className="mt-1 text-[11px] tracking-[0.07em] uppercase text-[#99A1AF]">
                Coverage
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-[#E5E7EB]" />

            {/* Mapped */}
            <div className="flex flex-col items-center md:items-start md:px-8">
              <div className="text-[20px] md:text-[24px] font-semibold leading-[32px] text-[#D9A84F]">
                100%
              </div>
              <div className="mt-1 text-[11px] tracking-[0.07em] uppercase text-[#99A1AF]">
                Mapped
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-[#E5E7EB]" />

            {/* AI Mains Eval */}
            <div className="flex flex-col items-center md:items-start md:pl-8">
              <div className="inline-flex items-center gap-2">
                <img
                  src="/ai-mains-eval.png"
                  alt="AI Mains Eval"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-[14px] font-semibold leading-[20px] tracking-[0.06em] uppercase text-[#364153]">
                  AI MAINS EVAL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="w-full flex justify-center mb-10">
          <div
            className="inline-flex items-center bg-white rounded-full shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]"
            style={{
              width: '347.3px',
              height: '79.9875px',
              paddingTop: '8px',
              paddingBottom: '8px',
              paddingLeft: '8px',
              paddingRight: '8px',
              borderRadius: '26843500px',
              gap: 0,
            }}
          >
            <button
              className="flex items-center"
              style={{
                width: '171.5px',
                height: '63.9875px',
                paddingLeft: '32px',
                paddingRight: '32px',
                borderRadius: '26843500px',
                background: mode === 'prelims' ? '#0F172B' : 'transparent',
                gap: '12px',
              }}
              onClick={() => setMode('prelims')}
            >
              <img
                src="/9k.png"
                alt="Prelims"
                style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '28px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: mode === 'prelims' ? '#FFFFFF' : '#4A5565',
                }}
              >
                Prelims
              </span>
            </button>
            <button
              className="flex items-center"
              style={{
                paddingLeft: '32px',
                paddingRight: '32px',
                height: '63.9875px',
                borderRadius: '26843500px',
                background: mode === 'mains' ? '#0F172B' : 'transparent',
                gap: '12px',
              }}
              onClick={() => setMode('mains')}
            >
              <img
                src="/8k.png"
                alt="Mains"
                style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '28px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: mode === 'mains' ? '#FFFFFF' : '#4A5565',
                }}
              >
                Mains
              </span>
            </button>
          </div>
        </div>

        {/* Content area: filters (left on desktop) + questions */}
        <div className="flex flex-col lg:flex-row-reverse gap-6">
          {/* Questions list */}
          <section className="flex-1 min-w-0">
            {mode === 'prelims' ? (
              <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <h3 className="font-bold text-[20px] md:text-[24px] text-[#101828]">
                  Prelims Questions{selectedYear ? ` · ${selectedYear}` : ''}
                </h3>
                <p className="text-[13px] text-[#6A7282]">
                  {loading ? 'Loading...' : `Showing ${questions.length} of ${total} questions`}
                </p>
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[16px] bg-white p-6 mb-4 animate-pulse">
                      <div className="flex gap-2 mb-4"><div className="h-6 w-20 bg-gray-200 rounded-full"/><div className="h-6 w-16 bg-gray-200 rounded-full"/></div>
                      <div className="h-5 w-3/4 bg-gray-200 rounded mb-3"/>
                      <div className="h-4 w-full bg-gray-200 rounded mb-2"/>
                      <div className="h-4 w-5/6 bg-gray-200 rounded"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Dynamic question cards */}
              {!loading && questions.map((q, idx) => {
                const opts: { label: string; text: string }[] = Array.isArray(q.options) ? q.options : [];
                const diffColor = q.difficulty === 'Hard'
                  ? { bg: '#FFE2E2', color: '#C10007' }
                  : q.difficulty === 'Easy'
                  ? { bg: '#DCFCE7', color: '#008236' }
                  : { bg: '#FFEDD4', color: '#CA3500' };
                return (
                  <div
                    key={q.id}
                    className="rounded-[16px] bg-white shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)] p-6 mb-6"
                  >
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {q.year > 0 && (
                        <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: '#DBEAFE', color: '#1447E6' }}>
                          UPSC {q.year}
                        </span>
                      )}
                      {q.subject && (
                        <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: '#E0E7FF', color: '#432DD7' }}>
                          {q.subject.toUpperCase()}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={diffColor}>
                        {q.difficulty?.toUpperCase()}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="uppercase mb-2 text-[12px] tracking-[0.02em] text-[#9CA3AF]">
                      PRELIMS · QUESTION #{idx + 1}
                    </div>

                    {/* Question text */}
                    <p className="mb-5 text-[18px] font-[500] leading-[1.5] text-[#111827]">
                      {q.questionText}
                    </p>

                    {/* Options */}
                    {opts.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {opts.map((opt) => (
                          <button
                            key={opt.label}
                            className="w-full flex items-center gap-4 rounded-[14px] bg-white px-5 py-3.5 text-left transition-colors hover:bg-[#FAFAFA]"
                            style={{ border: '1.6px solid #E5E7EB' }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold flex-shrink-0"
                              style={{ background: '#EBECEF', color: '#4A5565' }}
                            >
                              {opt.label}
                            </div>
                            <span className="text-[16px]" style={{ color: '#1A202C', fontWeight: 400 }}>
                              {opt.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuestion(q);
                        setSelectedAnswer(null);
                        setHasSubmitted(false);
                        setShowAttemptModal(true);
                      }}
                      className="w-full h-[52px] rounded-[14px] bg-[#0F172B] text-white font-bold text-[18px] leading-[28px] flex items-center justify-center hover:bg-[#111827] transition-colors"
                    >
                      Attempt Question
                    </button>
                  </div>
                );
              })}

              {!loading && error && (
                <div className="rounded-[16px] bg-red-50 border border-red-200 p-10 text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={fetchQuestions}
                    className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && questions.length === 0 && (
                <div className="rounded-[16px] bg-white p-10 text-center text-[#6A7282]">
                  No questions found for the selected filters.
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-5 py-2.5 rounded-[12px] bg-white shadow text-[15px] font-semibold text-[#0F172B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-[15px] text-[#6A7282]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-5 py-2.5 rounded-[12px] bg-white shadow text-[15px] font-semibold text-[#0F172B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* PLACEHOLDER card 3 — kept for UI reference until removed */}
              {false && <div
              className="rounded-[16px] bg-white shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)] p-6 mb-6 w-full max-w-[546px] mx-auto"
              style={{ opacity: 1 }}
            >
              {/* Tag row */}
              <div
                className="flex flex-wrap gap-2 mb-5"
                style={{ width: '482px', maxWidth: '100%' }}
              >
                <span
                  className="px-3 py-1 rounded-full text-[12px] font-bold"
                  style={{ background: '#DCFCE7', color: '#008236' }}
                >
                  UPSC 2022
                </span>
                <span
                  className="px-3 py-1 rounded-full text-[12px] font-bold"
                  style={{ background: '#D0FAE5', color: '#007A55' }}
                >
                  ENVIRONMENT
                </span>
                <span
                  className="px-3 py-1 rounded-full text-[12px] font-bold"
                  style={{ background: '#FFEDD4', color: '#CA3500' }}
                >
                  MODERATE
                </span>
              </div>

              {/* Question meta */}
              <div
                className="uppercase mb-2"
                style={{
                  width: '482px',
                  maxWidth: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  lineHeight: '16px',
                  color: '#6A7282',
                }}
              >
                Prelims · Question #4
              </div>

              {/* Question text */}
              <p
                className="mb-5"
                style={{
                  width: '482px',
                  maxWidth: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '18px',
                  fontWeight: 400,
                  lineHeight: '29.25px',
                  color: '#101828',
                }}
              >
                Which of the following are recognised as biodiversity hotspots that include Indian territory?
              </p>

              {/* Stem */}
              <div
                className="rounded-[14px] px-4 py-4 mb-5 space-y-2 text-[14px]"
                style={{
                  width: '482px',
                  maxWidth: '100%',
                  background: '#F9FAFB',
                  color: '#364153',
                }}
              >
                <p>1. Western Ghats</p>
                <p>2. Eastern Himalayas</p>
                <p>3. Sundaland</p>
              </div>

              {/* Options */}
              <div
                className="space-y-3 mb-6"
                style={{ width: '482px', maxWidth: '100%' }}
              >
                {[
                  '1 only',
                  '1 and 2 only',
                  '1, 2 and 3',
                  '2 and 3 only',
                ].map((text, index) => {
                  const label = String.fromCharCode(65 + index);
                  return (
                    <button
                      key={label}
                      className="w-full flex items-center gap-4 rounded-[14px] bg-white px-6 py-4 text-left"
                      style={{
                        minHeight: '75.2px',
                        borderRadius: '14px',
                        border: '1.6px solid #E5E7EB',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold flex-shrink-0"
                        style={{ background: '#F3F4F6', color: '#364153' }}
                      >
                        {label}
                      </div>
                      <span
                        className="text-[16px]"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 500,
                          lineHeight: '24px',
                          color: '#101828',
                        }}
                      >
                        {text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowAttemptModal(true)}
                  className="w-full h-[52px] rounded-[14px] bg-[#0F172B] text-white font-bold text-[18px] leading-[28px] flex items-center justify-center hover:bg-[#111827] transition-colors"
                >
                  Attempt Question
                </button>
              </div>
            </div>}
              </>
            ) : (
              <>
                {/* Mains header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                  <h3 className="font-bold text-[24px] text-[#101828]">
                    Mains Questions{selectedYear ? ` · ${selectedYear}` : ' - All Papers'}
                  </h3>
                  <p className="text-[14px] text-[#6A7282]">
                    {loading ? 'Loading...' : `Showing ${questions.length} of ${total} questions`}
                  </p>
                </div>

                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-[16px] bg-white p-8 mb-4 animate-pulse" style={{ border: '0.8px solid #E5E7EB' }}>
                        <div className="flex gap-2 mb-4"><div className="h-6 w-32 bg-gray-200 rounded"/><div className="h-6 w-20 bg-gray-200 rounded"/></div>
                        <div className="h-5 w-full bg-gray-200 rounded mb-2"/>
                        <div className="h-5 w-4/5 bg-gray-200 rounded"/>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dynamic mains cards */}
                {!loading && questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="mb-6"
                    style={{
                      width: '540px',
                      maxWidth: '100%',
                      borderRadius: '16px',
                      border: '0.8px solid #E5E7EB',
                      background: '#FFFFFF',
                      boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                      padding: '32px',
                    }}
                  >
                    {/* Tag row */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {q.year > 0 && (
                        <span className="px-3 py-1 rounded-[8px] text-[12px] font-bold" style={{ background: '#1E40AF', color: '#FFFFFF' }}>
                          UPSC MAINS {q.year}
                        </span>
                      )}
                      {q.paper && (
                        <span className="px-3 py-1 rounded-[8px] text-[12px] font-bold" style={{ background: '#DBEAFE', color: '#1447E6' }}>
                          {q.paper.toUpperCase()}
                        </span>
                      )}
                      {q.subject && (
                        <span className="px-3 py-1 rounded-[8px] text-[12px] font-bold" style={{ background: '#FFEDD4', color: '#CA3500' }}>
                          {q.subject.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* AI Evaluation pill */}
                    <div className="inline-flex items-center mb-4" style={{ borderRadius: '8px', background: '#17223E', padding: '4px 16px' }}>
                      <span style={{ fontSize: '14px', marginRight: '8px' }} aria-hidden>✨</span>
                      <span style={{ fontFamily: 'Arimo, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '20px', color: '#FFD272' }}>
                        AI Evaluation
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mb-2 uppercase text-[12px] tracking-[0.3px] text-[#6A7282]">
                      MAINS · {q.paper || 'GS'} · QUESTION #{idx + 1}
                    </div>

                    {/* Question text */}
                    <p className="mb-4 text-[16px] font-[500] leading-[26px] text-[#101828]">
                      {q.questionText}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-6 mb-6">
                      {q.year > 0 && (
                        <div className="flex items-center gap-2">
                          <span aria-hidden>📅</span>
                          <span className="text-[14px] text-[#6A7282]">{q.year}</span>
                        </div>
                      )}
                      {q.topic && (
                        <div className="flex items-center gap-2">
                          <span aria-hidden>📝</span>
                          <span className="text-[14px] text-[#6A7282]">{q.topic}</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons row */}
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => setShowMainsWriteModal(true)}
                        className="flex items-center justify-center"
                        style={{ height: '59px', borderRadius: '14px', background: '#101828', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', padding: '0 20px' }}
                      >
                        <span aria-hidden style={{ marginRight: '8px' }}>🔥</span>
                        <span>Write &amp; AI Evaluate</span>
                      </button>
                      <button
                        className="flex items-center justify-center"
                        style={{ height: '59px', borderRadius: '14px', background: '#0F172A', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', padding: '0 20px' }}
                      >
                        <span>Model Answer</span>
                      </button>
                    </div>

                    {/* Footnote */}
                    <div className="flex items-center gap-2 justify-end text-[14px] text-[#6A7282]">
                      <img src="/icon-21-lock.png" alt="Locked" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                      <span>Full model answer on login</span>
                    </div>
                  </div>
                ))}

                {!loading && questions.length === 0 && (
                  <div className="rounded-[16px] bg-white p-10 text-center text-[#6A7282]" style={{ border: '0.8px solid #E5E7EB' }}>
                    No mains questions found for the selected filters.
                  </div>
                )}
              </>
            )}
          </section>

          {/* Right: filters */}
          <aside className="w-full lg:w-[320px] xl:w-[358px] flex-shrink-0 space-y-4">
            {/* Exam year card - 307×198, exact shadow & year buttons */}
            <div
              className="rounded-[16px] bg-white flex flex-col"
              style={{
                width: '307px',
                height: '198px',
                opacity: 1,
                boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
              }}
            >
              <div className="flex items-center gap-3 pt-5 pl-5 pr-5 pb-3">
                <div className="w-7 h-7 rounded-full bg-[#0F172B] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                  1
                </div>
                <div className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#4A5565]">
                  EXAM YEAR
                </div>
              </div>
              <div
                className="grid grid-cols-4 gap-2 px-5"
                style={{ gap: '8px 8px' }}
              >
                {['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'].map((year) => {
                  const selected = selectedYear === parseInt(year);
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(selected ? null : parseInt(year))}
                      className="rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{
                        width: '49.25px',
                        height: '36px',
                        background: selected ? '#FDBA26' : '#F3F4F6',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: 0,
                        textAlign: 'center',
                        color: selected ? '#FFFFFF' : '#364153',
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setSelectedYear(null)}
                className="flex-1 flex items-end justify-center pb-4"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: selectedYear === null ? 700 : 500,
                  color: selectedYear === null ? '#FDBA26' : '#364153',
                }}
              >
                All Years
              </button>
            </div>

            {/* Subject Filter panel - 310×826 */}
            <div
              className="rounded-[16px] bg-white flex flex-col overflow-hidden"
              style={{
                width: '310px',
                minHeight: '826px',
                opacity: 1,
                borderTop: '0.8px solid #E5E7EB',
                boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
              }}
            >
              <div className="flex items-center gap-3 pt-6 pb-4 px-5">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 24, height: 24, background: '#1E293B', color: '#FFFFFF', fontSize: 12, fontWeight: 700 }}
                >
                  2
                </div>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: '#364153',
                  }}
                >
                  Subject Filter
                </span>
              </div>

              <div className="flex flex-col gap-2 px-5 pb-5">
                {[
                  { label: 'All Papers', icon: '📘' },
                  { label: 'History', icon: '🏛️' },
                  { label: 'Geography', icon: '🌍' },
                  { label: 'Polity', icon: '⚖️' },
                  { label: 'Economy', icon: '📈' },
                  { label: 'Science & Tech', icon: '🔬' },
                  { label: 'Environment', icon: '🌿' },
                  { label: 'International Relations', icon: '🌐' },
                  { label: 'Art & Culture', icon: '🎨' },
                  { label: 'Current Affairs', icon: '📰' },
                ].map(({ label, icon }) => {
                  const selected = selectedSubject === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedSubject(label)}
                      className="w-full flex items-center justify-between rounded-[14px] px-4 py-3 text-left transition-colors"
                      style={{
                        minHeight: '59.99px',
                        background: selected ? '#0F1A30' : '#F9FAFB',
                        paddingLeft: 16,
                        paddingRight: 16,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[18px] leading-none flex-shrink-0" aria-hidden>
                          {icon}
                        </span>
                        <span
                          style={{
                            fontFamily: selected ? 'Arimo, sans-serif' : 'Inter, sans-serif',
                            fontWeight: selected ? 700 : 500,
                            fontSize: '14px',
                            lineHeight: '20px',
                            letterSpacing: 0,
                            color: selected ? '#FFFFFF' : '#101828',
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Login modal - Unlock Full PYQ Access */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
          <div
            className="relative flex flex-col items-center text-center"
            style={{
              width: '448px',
              maxWidth: '100%',
              minHeight: '549.2px',
              borderRadius: '24px',
              background: '#FFFFFF',
              boxShadow: '0px 25px 50px -12px #00000040',
              padding: '40px 32px 32px',
            }}
          >
            {/* Target icon placeholder */}
            <div
              className="mb-6 flex items-center justify-center"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '9999px',
                background: '#0F172B',
              }}
            >
              <span style={{ fontSize: '36px' }} aria-hidden>
                🎯
              </span>
            </div>

            {/* Heading */}
            <h2
              style={{
                width: '347px',
                maxWidth: '100%',
                height: '36px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '30px',
                lineHeight: '36px',
                color: '#101828',
                marginBottom: '16px',
              }}
            >
              Unlock Full PYQ Access
            </h2>

            {/* Description */}
            <p
              style={{
                width: '367px',
                maxWidth: '100%',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '32px',
              }}
            >
              Login or create a free account to attempt questions, save progress, read full explanations, and use
              AI-powered Mains Answer Evaluation.
            </p>

            {/* Create Free Account button */}
            <button
              className="flex items-center justify-center mb-3"
              style={{
                width: '368px',
                maxWidth: '100%',
                height: '60px',
                borderRadius: '16px',
                gap: '8px',
                background: '#0F172B',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '28px',
              }}
            >
              <span aria-hidden>🚀</span>
              <span>Create Free Account</span>
            </button>

            {/* Login with Google button */}
            <button
              className="flex items-center justify-center mb-5"
              style={{
                width: '368px',
                maxWidth: '100%',
                height: '63.2px',
                borderRadius: '16px',
                gap: '8px',
                background: '#FFFBEB',
                border: '1.6px solid #FEE685',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '28px',
                color: '#101828',
              }}
            >
              <span aria-hidden>🔑</span>
              <span>Login with Google</span>
            </button>

            {/* Maybe later */}
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              style={{
                width: '368px',
                maxWidth: '100%',
                height: '48px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '24px',
                color: '#6A7282',
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Mains Write & AI Evaluate modal - opens from Write & AI Evaluate on Mains tab */}
      {showMainsWriteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(15,23,42,0.5)' }}
          onClick={() => setShowMainsWriteModal(false)}
        >
          <div
            className="rounded-[24px] bg-white flex flex-col my-8 overflow-hidden"
            style={{
              width: '896px',
              maxWidth: '100%',
              minHeight: '875px',
              opacity: 1,
              boxShadow: '0px 4px 6px -4px #0000001A, 0px 10px 15px -3px #0000001A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
              {/* Header row: 2024, GS Paper I, Modern India, 15M, bookmark */}
              <div
                className="flex items-center justify-between flex-wrap gap-2"
                style={{ width: 832, maxWidth: '100%', height: 40 }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex items-center justify-center gap-1.5 rounded-[10px] flex-shrink-0"
                    style={{ width: 82.61, height: 32, background: '#1E2939' }}
                  >
                    <span aria-hidden style={{ fontSize: 14 }}>📅</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}>2024</span>
                  </div>
                  <div
                    className="rounded-[10px] flex items-center justify-center flex-shrink-0 px-3"
                    style={{ height: 33.6, border: '0.8px solid #D1D5DC', background: '#FFFFFF' }}
                  >
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#364153' }}>GS Paper I</span>
                  </div>
                  <div
                    className="rounded-[10px] flex items-center justify-center flex-shrink-0 px-3"
                    style={{ height: 33.6, border: '0.8px solid #D1D5DC', background: '#FFFFFF' }}
                  >
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#364153' }}>Modern India</span>
                  </div>
                  <div
                    className="rounded-[10px] flex items-center justify-center flex-shrink-0 px-3"
                    style={{ width: 50.35, height: 32, background: '#FFEDD4' }}
                  >
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#F54900' }}>15M</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }} aria-label="Bookmark">🔖</button>
                  <button type="button" onClick={() => setShowMainsWriteModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[18px] font-bold" style={{ background: '#1E2939', color: '#FFF' }} aria-label="Close">×</button>
                </div>
              </div>

              {/* Question text */}
              <p
                style={{
                  width: 832,
                  maxWidth: '100%',
                  marginTop: 24,
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: '#1E2939',
                }}
              >
                Critically analyse the role of the Constituent Assembly in shaping the foundational philosophy of the Indian Constitution. How did it balance competing ideological strands?
              </p>

              {/* Steps: 1 Write, 2 Upload, 3 AI Eval */}
              <div className="flex items-center gap-3" style={{ width: 832, maxWidth: '100%', marginTop: 24, height: 32 }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#3B52D4' }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}>1</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#3B52D4' }}>Write</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>2</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#99A1AF' }}>Upload</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>3</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#99A1AF' }}>AI Eval</span>
                </div>
              </div>

              {/* Specs bar: 7–9 min, ~100 words, 15 marks | 0:00, Resume */}
              <div
                className="flex items-center justify-between flex-wrap gap-4 rounded-[14px] px-4 py-3"
                style={{ width: 832, maxWidth: '100%', marginTop: 24, minHeight: 69.6, border: '0.8px solid #E5E7EB', background: '#F9FAFB' }}
              >
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}><span aria-hidden>🕐</span>7–9 min</span>
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}><span aria-hidden>✏️</span>~100 words</span>
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}><span aria-hidden>🏆</span>15 marks</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#1E2939' }}>0:00</span>
                  <button type="button" className="flex items-center justify-center gap-2 rounded-[10px] px-4 py-2" style={{ background: '#F3F4F6', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#364153' }}><span aria-hidden>▶</span>Resume</button>
                </div>
              </div>

              {/* Buttons: View Key Points, Ready to Upload */}
              <div className="flex items-center gap-3 flex-wrap" style={{ width: 832, maxWidth: '100%', marginTop: 24, gap: 12 }}>
                <button type="button" className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-3" style={{ border: '1.6px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 600, fontSize: 16, lineHeight: '24px', color: '#364153' }}><span aria-hidden>📄</span>View Key Points</button>
                <button type="button" className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-3" style={{ background: '#101828', fontFamily: 'Inter', fontWeight: 600, fontSize: 16, lineHeight: '24px', color: '#FFFFFF' }}><span aria-hidden>📷</span>Ready to Upload →</button>
              </div>

              {/* Upload area */}
              <div
                className="rounded-[16px] flex flex-col items-center justify-center text-center"
                style={{ width: 832, maxWidth: '100%', marginTop: 24, minHeight: 288.8, padding: '49.6px', border: '1.6px solid #D1D5DC' }}
              >
                <div className="mb-4" style={{ fontSize: 48 }} aria-hidden>📷</div>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', color: '#1E2939', marginBottom: 8 }}>Photograph your handwritten answer & upload</p>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282', marginBottom: 24 }}>Take a clear photo of each page. Good lighting = better AI evaluation.</p>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <span className="rounded-[10px] px-4 py-2" style={{ border: '0.8px solid #BEDBFF', background: '#EFF6FF', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>JPG</span>
                  <span className="rounded-[10px] px-4 py-2" style={{ border: '0.8px solid #BEDBFF', background: '#EFF6FF', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>PNG</span>
                  <span className="rounded-[10px] px-4 py-2" style={{ border: '0.8px solid #BEDBFF', background: '#EFF6FF', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>PDF</span>
                </div>
              </div>

              {/* Submit for AI Evaluation */}
              <button
                type="button"
                onClick={() => { setShowMainsWriteModal(false); setShowAiEvalModal(true); }}
                className="w-full flex items-center justify-center gap-2 rounded-[16px] py-4 mt-4"
                style={{ width: 832, maxWidth: '100%', height: 60, background: '#0F172B', fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', color: '#F9FAFB' }}
              >
                <span aria-hidden>📤</span>Submit for AI Evaluation
              </button>

              {/* Footer: views, evals, avg | Save, Get AI Eval */}
              <div className="flex items-center justify-between flex-wrap gap-4" style={{ width: 832, maxWidth: '100%', marginTop: 24, paddingTop: 16, minHeight: 45.6 }}>
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}><span aria-hidden>👁</span>120 views</span>
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}><span aria-hidden>🎯</span>34 AI evals done</span>
                  <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}><span aria-hidden>⭐</span>3.9/5 avg</span>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-2.5" style={{ border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 600, fontSize: 16, lineHeight: '24px', color: '#364153' }}><span aria-hidden>💾</span>Save</button>
                  <button type="button" className="flex items-center justify-center rounded-[14px] px-5 py-2.5" style={{ background: 'linear-gradient(90deg, #FF8904 0%, #FF6900 100%)', boxShadow: '0px 2px 4px -2px #0000001A, 0px 4px 6px -1px #0000001A', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#FFFFFF' }}>Get AI Eval</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI is evaluating your answers... modal - opens after Submit for AI Evaluation */}
      {showAiEvalModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="rounded-[24px] flex flex-col items-center text-center px-10 py-10 max-w-md w-full"
            style={{
              background: 'linear-gradient(180deg, #1E3A5F 0%, #0F172B 100%)',
              boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <div className="mb-4" style={{ fontSize: 48 }} aria-hidden>🧠</div>
            <h2
              className="font-bold mb-2"
              style={{ fontFamily: 'Inter', fontSize: 22, lineHeight: 1.3, color: '#FFFFFF' }}
            >
              AI is evaluating your answers...
            </h2>
            <p
              className="mb-6"
              style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.4, color: '#94A3B8' }}
            >
              This usually takes about 30 seconds
            </p>
            {/* Progress bar - fills over 30 seconds */}
            <div
              className="w-full h-2 rounded-full mb-8 overflow-hidden"
              style={{ background: '#334155', maxWidth: 320 }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${aiEvalProgress}%`, background: 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)' }}
              />
            </div>
            {/* Evaluation steps - advance over 30 seconds */}
            <div className="flex flex-col gap-3 w-full text-left" style={{ maxWidth: 320 }}>
              {AI_EVAL_STEPS.map((text, i) => {
                const done = i < aiEvalStepIndex;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[12px]"
                      style={{
                        background: done ? '#FBBF24' : '#334155',
                        color: done ? '#0F172B' : '#64748B',
                      }}
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: done ? 600 : 400,
                        fontSize: 14,
                        lineHeight: '20px',
                        color: done ? '#FBBF24' : '#94A3B8',
                      }}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI EVALUATION COMPLETE - opens after 30s loading */}
      {showAiEvalCompleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="rounded-[24px] flex flex-col my-8 overflow-hidden w-full max-w-[720px]"
            style={{
              background: '#0F172B',
              boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.5)',
              minHeight: 560,
            }}
          >
            {/* Header - dark blue-grey banner (matches screenshot) */}
            <div className="px-8 pt-8 pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4 rounded-t-[24px]" style={{ background: '#1E3A5F' }}>
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.05em', color: '#FBBF24', textTransform: 'uppercase' }}>
                  <span aria-hidden>🖥️</span> AI EVALUATION COMPLETE
                </div>
                <h2 className="font-bold mb-1" style={{ fontFamily: 'Inter', fontSize: 24, lineHeight: 1.3, color: '#FFFFFF' }}>
                  Good attempt across 2 questions
                </h2>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.4, color: '#94A3B8' }}>
                  Mains · GS Paper I · 2 Questions evaluated
                </p>
              </div>
              {/* Circular progress ring: 64% arc, light grey outline */}
              <div className="flex-shrink-0 relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#64748B" strokeWidth="4" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#FBBF24" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={2 * Math.PI * 36 * (1 - 64 / 100)} strokeLinecap="round" />
                </svg>
                <div className="relative flex flex-col items-center justify-center">
                  <span className="font-bold block leading-none" style={{ fontFamily: 'Inter', fontSize: 18, color: '#FFFFFF' }}>64%</span>
                  <span className="block mt-0.5" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: 1.2, color: '#94A3B8', letterSpacing: '0.02em' }}>MARKS</span>
                </div>
              </div>
            </div>

            <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
              {/* Question 1 card */}
              <div className="rounded-[16px] p-6 space-y-4" style={{ background: '#F1F5F9' }}>
                <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#64748B', letterSpacing: '0.05em' }}>QUESTION 1</div>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 15, lineHeight: 1.5, color: '#334155' }}>
                  Examine the role of socio-religious reform movements of the 19th century in laying the foundation of Indian nationalism.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold" style={{ fontFamily: 'Inter', fontSize: 28, lineHeight: 1.2, color: '#1E3A5F' }}>B+</span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#64748B' }}>9/15</span>
                </div>
                <div className="flex flex-wrap gap-4 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
                  <span className="flex items-center gap-1.5" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: '#15803D' }}><span aria-hidden>✓</span> What went right</span>
                  <span className="flex items-center gap-1.5" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: '#EA580C' }}><span aria-hidden>↑</span> Needs improvement</span>
                  <span className="flex items-center gap-1.5" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: '#DC2626' }}><span aria-hidden>✕</span> Key misses</span>
                </div>
                <div className="space-y-3 text-[14px]">
                  <p style={{ fontFamily: 'Inter', lineHeight: 1.5, color: '#334155' }}>
                    <span className="text-[#15803D]" aria-hidden>✓</span> <strong>Strengths:</strong> Strong introduction with relevant context. Multidimensional analysis covering social, economic and political angles.
                  </p>
                  <p style={{ fontFamily: 'Inter', lineHeight: 1.5, color: '#334155' }}>
                    <span className="text-[#0EA5E9]" aria-hidden>ℹ</span> <strong>Improve:</strong> Conclusion could be more forward-looking — mention contemporary relevance.
                  </p>
                  <p style={{ fontFamily: 'Inter', lineHeight: 1.5, color: '#334155' }}>
                    <span className="text-[#DC2626]" aria-hidden>✕</span> <strong>Missed:</strong> Did not address the &quot;regional variation&quot; dimension. Could mention Bengal, Maharashtra separately.
                  </p>
                </div>
              </div>

              {/* Jeet Sir's Overall Feedback */}
              <div className="rounded-[16px] p-6 space-y-4" style={{ background: '#1E293B' }}>
                <div className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#94A3B8', letterSpacing: '0.03em' }}>
                  <span aria-hidden>📊</span> JEET SIR&apos;S OVERALL FEEDBACK
                </div>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 mt-0.5" aria-hidden>💡</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.5, color: '#E2E8F0' }}>Your writing shows <strong>conceptual clarity</strong> but needs more <strong>structured formatting</strong> — use subheadings, bullet points where allowed.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 mt-0.5" aria-hidden>📖</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.5, color: '#E2E8F0' }}>Revise <strong>recent government schemes</strong> and link them to answers — examiners reward contemporary examples.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 mt-0.5" aria-hidden>🎯</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.5, color: '#E2E8F0' }}>Word limit discipline is good. Focus on <strong>dimensions analysis</strong> — social, economic, political, environmental angles strengthen answers significantly.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA button */}
            <div className="px-8 pb-8 pt-2">
              <button
                type="button"
                onClick={() => setShowAiEvalCompleteModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-[16px] py-4"
                style={{ background: '#1E3A5F', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#FFFFFF' }}
              >
                <span aria-hidden>💬</span> What would you like to do next? →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attempt / Question review modal - Prelims only; opens from Attempt Question in Prelims tab */}
      {showAttemptModal && mode === 'prelims' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(15,23,42,0.5)' }}
          onClick={() => setShowAttemptModal(false)}
        >
          <div
            className="rounded-[24px] bg-white flex flex-col my-8"
            style={{
              width: '896px',
              maxWidth: '100%',
              minHeight: '882px',
              gap: '24px',
              padding: '32px 32px 32px 40px',
              borderLeft: '8px solid #00A63E',
              boxShadow: '0px 4px 6px -4px #0000001A, 0px 10px 15px -3px #0000001A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: question #, tags, actions */}
            <div
              className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0"
              style={{ width: '824px', maxWidth: '100%', minHeight: '48px' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className="rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: '#1E293B', color: '#FFFFFF', fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '28px' }}
                >
                  {selectedQuestion?.questionNum ?? '?'}
                </div>
                <span className="px-3 py-1.5 rounded-full text-[14px] font-semibold flex-shrink-0" style={{ background: '#1E293B', color: '#FFFFFF' }}>{selectedQuestion?.year}</span>
                <span className="px-3 py-1.5 rounded-full text-[14px] font-semibold flex-shrink-0" style={{ background: '#FEF3C6', color: '#BB4D00' }}>{selectedQuestion?.subject}</span>
                <span className="px-3 py-1.5 rounded-full text-[14px] font-semibold flex items-center gap-1 flex-shrink-0" style={{ background: '#FFEDD4', color: '#F54900' }}>🔥 {selectedQuestion?.difficulty}</span>
                {hasSubmitted
                  ? <span className="px-3 py-1 rounded-full text-[14px] font-semibold flex items-center gap-1 flex-shrink-0" style={{ background: '#DCFCE7', color: '#008236' }}>✅ Attempted</span>
                  : <span className="px-3 py-1 rounded-full text-[14px] font-semibold flex items-center gap-1 flex-shrink-0" style={{ background: '#F3F4F6', color: '#6A7282' }}>📝 Not Attempted</span>
                }
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => setShowAttemptModal(false)} className="w-10 h-10 rounded-[14px] flex items-center justify-center text-[18px] font-bold" style={{ background: '#00A63E', color: '#FFFFFF' }} aria-label="Close">×</button>
                <button type="button" className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: '#F3F4F6', color: '#364153' }} aria-label="Edit">✏️</button>
                <button type="button" className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: '#F3F4F6', color: '#364153' }} aria-label="Full screen">⛶</button>
              </div>
            </div>

            {/* Question text */}
            <p style={{ width: '824px', maxWidth: '100%', fontFamily: 'Inter', fontWeight: 400, fontSize: '18px', lineHeight: '29.25px', color: '#1E2939' }}>
              {selectedQuestion?.questionText}
            </p>

            {/* Options */}
            <div style={{ width: '824px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(selectedQuestion?.options ?? []).map((opt: any) => {
                const isSelected = selectedAnswer === opt.label;
                const isCorrect  = opt.label === selectedQuestion?.correctOption;

                let bg = '#F9FAFB', border = '0.8px solid #E5E7EB', labelBg = '#D1D5DC', labelColor = '#364153';
                if (!hasSubmitted && isSelected) {
                  bg = '#EFF6FF'; border = '1.6px solid #3B82F6'; labelBg = '#3B82F6'; labelColor = '#fff';
                }
                if (hasSubmitted && isCorrect) {
                  bg = '#F0FDF4'; border = '1.6px solid #00C950'; labelBg = '#00A63E'; labelColor = '#fff';
                }
                if (hasSubmitted && isSelected && !isCorrect) {
                  bg = '#FEF2F2'; border = '1.6px solid #FB2C36'; labelBg = '#E7000B'; labelColor = '#fff';
                }

                return (
                  <button
                    key={opt.label}
                    disabled={hasSubmitted}
                    onClick={() => setSelectedAnswer(opt.label)}
                    className="w-full flex items-center gap-3 rounded-[14px] pl-4 py-3 text-left transition-colors"
                    style={{ minHeight: 65, background: bg, border }}
                  >
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[16px] font-bold"
                         style={{ background: labelBg, color: labelColor }}>
                      {opt.label}
                    </div>
                    <span style={{ fontWeight: (hasSubmitted && (isCorrect || isSelected)) ? 500 : 400, fontSize: '16px', color: '#1E2939' }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation — shown only after submit */}
            {hasSubmitted && selectedQuestion?.explanation && (
              <div style={{ width: '774.4px', maxWidth: '100%' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: '#016630', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase' }}>
                  <span>✅</span><span>Explanation</span>
                </div>
                <p style={{ fontSize: '16px', color: '#364153', lineHeight: '26px', marginBottom: 12 }}>
                  {selectedQuestion.explanation}
                </p>
                <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#6A7282' }}>
                  <span>📖</span>
                  <span>UPSC CSE Prelims {selectedQuestion.year}, {selectedQuestion.paper}</span>
                </div>
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex items-center justify-between flex-wrap gap-4" style={{ width: '824px', maxWidth: '100%', marginTop: 'auto', paddingTop: 8 }}>
              {!hasSubmitted ? (
                <button
                  type="button"
                  onClick={() => { if (selectedAnswer) setHasSubmitted(true); }}
                  disabled={!selectedAnswer}
                  className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-2.5"
                  style={{ background: selectedAnswer ? '#0F172B' : '#E5E7EB', color: selectedAnswer ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: '16px', cursor: selectedAnswer ? 'pointer' : 'not-allowed' }}
                >
                  {selectedAnswer ? 'Submit Answer' : 'Select an answer first'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setHasSubmitted(false); setSelectedAnswer(null); }}
                  className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-2.5"
                  style={{ background: '#DCFCE7', color: '#008236', fontWeight: 600, fontSize: '16px' }}
                >
                  <span>✅</span><span>Attempted · Reset</span>
                </button>
              )}
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#6A7282' }}>
                  <span aria-hidden>👁</span>
                  <span>1,240 views</span>
                </span>
                <span className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#6A7282' }}>
                  <span aria-hidden>🎯</span>
                  <span>58% avg accuracy</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

