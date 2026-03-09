'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';

const subjectPills = [
  { label: 'Critical:', count: '2 subjects', icon: '🔴' },
  { label: 'Weak:', count: '1 subjects', icon: '🟠' },
  { label: 'Improving:', count: '6 subjects', icon: '🟡' },
  { label: 'Strong:', count: '3 subjects', icon: '🟢' },
];

const filterOptions = ['All', 'MCQ', 'Mains', 'PYQ'];

const scheduleOptions = ['3d', '7d', '15d', '30d'];

const deckOptions = [
  { id: 'geography', label: 'Geography', icon: '🌍' },
  { id: 'polity', label: 'Polity', icon: '🏛️' },
  { id: 'economy', label: 'Economy', icon: '💰' },
  { id: 'environment', label: 'Environment', icon: '🌿' },
  { id: 'history', label: 'History', icon: '📚' },
  { id: 'current-affairs', label: 'Current Affairs', icon: '📰' },
];

const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Tricky'];

const questionsData = [
  { id: 1, text: 'The Fiscal Responsibility and Budget Management (FRBM) Act primarily aims at achieving which of the following?', source: 'Daily MCQ', sourceColor: '#F54900', ago: '3d ago', added: true, subject: 'Economy', subjectBg: '#ECFDF5', scheduleActive: [true, false, false, false], remind: false },
  { id: 2, text: 'Consider the Sarkaria Commission — what were its recommendations on Centre-State financial relations?', source: 'Mains Test 8', sourceColor: '#155DFC', ago: '5d ago', added: true, subject: 'Polity', subjectBg: '#BEDBFF', scheduleActive: [true, true, false, false], remind: true },
  { id: 3, text: 'Explain the significance of the Kunming-Montreal Global Biodiversity Framework adopted in 2022.', source: 'PYQ 2023', sourceColor: '#9810FA', ago: '5d ago', added: false, subject: 'Environment', subjectBg: '#84FAB0', scheduleActive: [true, true, false, false], remind: false },
  { id: 4, text: 'Which of the following is NOT correctly matched: International agreement — Area covered', source: 'Daily MCQ', sourceColor: '#F54900', ago: '6d ago', added: true, subject: 'Environment', subjectBg: '#84FAB0', scheduleActive: [true, true, false, false], remind: true },
  { id: 5, text: 'Discuss the impact of Non-Performing Assets (NPAs) on credit flow in the Indian economy.', source: 'Daily Mains', sourceColor: '#155DFC', ago: '6d ago', added: false, subject: 'Economy', subjectBg: '#ECFDF5', scheduleActive: [true, false, false, false], remind: false },
  { id: 6, text: 'The doctrine of "pleasure of the President" under Article 310 — can it override Article 311 protections?', source: 'PYQ 2022', sourceColor: '#9810FA', ago: '7d ago', added: true, subject: 'Polity', subjectBg: '#BEDBFF', scheduleActive: [true, true, false, false], remind: true },
];

export default function SpacedRepetitionPage() {
  const [filter, setFilter] = useState('All');
  const [remind, setRemind] = useState<Record<number, boolean>>(
    questionsData.reduce((acc, q) => ({ ...acc, [q.id]: q.remind }), {})
  );
  const [schedule, setSchedule] = useState<Record<number, boolean[]>>(
    questionsData.reduce((acc, q) => ({ ...acc, [q.id]: q.scheduleActive }), {})
  );
  const [page, setPage] = useState(1);
  const [showAddFlashcardModal, setShowAddFlashcardModal] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState('geography');
  const [flashcardDifficulty, setFlashcardDifficulty] = useState('Hard');
  const [flashcardQuestion, setFlashcardQuestion] = useState('');
  const [flashcardAnswer, setFlashcardAnswer] = useState('');

  const toggleRemind = (id: number) => setRemind((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSchedule = (qId: number, idx: number) =>
    setSchedule((prev) => ({
      ...prev,
      [qId]: (prev[qId] || []).map((v, i) => (i === idx ? !v : v)),
    }));

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1168px] mx-auto px-6 py-6">
          {/* Weak Subject Tracker - AI-Powered Gap Analysis */}
          <div
            className="w-full rounded-[16px] px-8 pt-8 pb-8 mb-6"
            style={{
              background: 'linear-gradient(180deg, #121B2E 0%, #172032 100%)',
              minHeight: 256.6,
            }}
          >
            <div
              className="uppercase tracking-[0.5px] mb-2"
              style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#FDC700' }}
            >
              WEAK SUBJECT TRACKER - AI-POWERED GAP ANALYSIS
            </div>
            <h1
              className="font-bold mb-4"
              style={{ fontFamily: 'Inter', fontSize: 36, lineHeight: '40px', color: '#FFFFFF' }}
            >
              Close every <span className="italic">gap</span> before exam day.
            </h1>
            <p
              className="mb-6 max-w-[768px]"
              style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 16, lineHeight: '24px', color: '#D1D5DC' }}
            >
              Real-time subject health monitoring — pinpoints exactly which topics need your attention and builds a smart revision plan by ranking gaps through:
            </p>
            <div className="flex flex-wrap gap-4">
              {subjectPills.map((pill) => (
                <div
                  key={pill.label}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5"
                  style={{
                    border: '0.8px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <span aria-hidden>{pill.icon}</span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}>{pill.label}</span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}>{pill.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions to Revisit - header */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 rounded-t-[10px]"
            style={{ borderBottom: '0.8px solid #F3F4F6', background: '#FFFFFF' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span aria-hidden>⚠️</span>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>Questions to Revisit</span>
              <span
                className="rounded px-2.5 py-1"
                style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, lineHeight: '16px', background: '#FEF2F2', color: '#E7000B' }}
              >
                47 questions
              </span>
              <div className="flex items-center gap-2">
                {filterOptions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className="rounded-[10px] px-3 py-2"
                    style={{
                      fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                      background: filter === f ? '#101828' : '#F3F4F6',
                      color: filter === f ? '#FFFFFF' : '#4A5565',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddFlashcardModal(true)}
              className="flex items-center gap-2 rounded-[10px] px-4 py-2"
              style={{
                background: 'linear-gradient(90deg, #F0AE00 0%, #FE6D00 100%)',
                boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF',
              }}
            >
              <span>+</span> Add Question
            </button>
          </div>

          {/* Table header */}
          <div
            className="grid gap-4 px-6 py-3"
            style={{ background: '#F9FAFB', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.6px', color: '#6A7282', textTransform: 'uppercase' }}
          >
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center" style={{ maxWidth: 1130 }}>
              <span>Question</span>
              <span>Subject</span>
              <span>Spaced Rep. Schedule</span>
              <span>Remind</span>
            </div>
          </div>

          {/* Question rows */}
          <div style={{ background: '#FFFFFF', borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6' }}>
            {questionsData.map((q) => (
              <div
                key={q.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-start px-6 py-4 border-b border-[#F3F4F6]"
                style={{ minHeight: 83 }}
              >
                <div>
                  <p style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '22.75px', color: '#101828', marginBottom: 4 }}>{q.text}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, color: q.sourceColor }}>{q.source}</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 400, color: '#6A7282' }}>{q.ago}</span>
                    {q.added ? (
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, color: '#009966' }}>✓ Added to Flashcards</span>
                    ) : (
                      <button type="button" className="font-semibold" style={{ fontFamily: 'Inter', color: '#155DFC' }}>+ Add to Flashcards</button>
                    )}
                  </div>
                </div>
                <div>
                  <span
                    className="inline-block rounded-full px-3 py-1"
                    style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', background: q.subjectBg, color: '#0A0A0A' }}
                  >
                    {q.subject}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="uppercase text-[12px] font-semibold" style={{ fontFamily: 'Inter', color: '#6A7282' }}>Schedule</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {scheduleOptions.map((opt, idx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleSchedule(q.id, idx)}
                        className="rounded px-2 py-1 text-[12px] font-bold"
                        style={{
                          fontFamily: 'Inter', lineHeight: '16px',
                          background: (schedule[q.id] || q.scheduleActive)[idx] ? '#101828' : '#E5E7EB',
                          color: (schedule[q.id] || q.scheduleActive)[idx] ? '#FFFFFF' : '#4A5565',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={remind[q.id]}
                    onClick={() => toggleRemind(q.id)}
                    className="relative w-11 h-6 rounded-full transition-colors flex items-center"
                    style={{
                      background: remind[q.id] ? '#00BC7D' : '#D1D5DC',
                      paddingLeft: 4,
                      paddingRight: 4,
                    }}
                  >
                    <span
                      className="block w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ transform: remind[q.id] ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Question/Topic */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[14px] my-6 border-2 border-dashed border-[#D1D5DC]"
            style={{ background: '#FFFFFF', minHeight: 107 }}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[16px] flex items-center justify-center text-2xl" style={{ background: '#F3F4F6' }}>+</div>
              <div>
                <p className="font-bold mb-1" style={{ fontFamily: 'Inter', fontSize: 18, lineHeight: '28px', color: '#101828' }}>Add Custom Question/Topic</p>
                <p style={{ fontFamily: 'Arimo, sans-serif', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}>Create your own question for today</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddFlashcardModal(true)}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5"
              style={{
                background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F00 100%)',
                fontFamily: 'Arimo, sans-serif', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#FFFFFF',
              }}
            >
              Add Question
            </button>
          </div>

          {/* Pagination */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 rounded-b-[10px]"
            style={{ borderTop: '0.8px solid #F3F4F6', background: '#FFFFFF' }}
          >
            <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
              Showing 6 of 47 weak-area questions
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center font-semibold text-[14px]"
                  style={{
                    fontFamily: 'Inter', lineHeight: '20px',
                    background: page === n ? '#101828' : '#F3F4F6',
                    color: page === n ? '#FFFFFF' : '#4A5565',
                  }}
                >
                  {n}
                </button>
              ))}
              <span className="w-8 h-8 rounded-[10px] flex items-center justify-center font-semibold text-[14px]" style={{ background: '#F3F4F6', color: '#4A5565' }}>...</span>
              <button
                type="button"
                onClick={() => setPage(8)}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center font-semibold text-[14px]"
                style={{ fontFamily: 'Inter', lineHeight: '20px', background: '#F3F4F6', color: '#4A5565' }}
              >
                8
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Flashcard Deck modal */}
      {showAddFlashcardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddFlashcardModal(false)}
        >
          <div
            className="rounded-[16px] bg-white flex flex-col w-full max-w-[512px] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '0.8px solid #E5E7EB', minHeight: 60.8 }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden style={{ fontSize: 22 }}>📇</span>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>Add to Flashcard Deck</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFlashcardModal(false)}
                className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[18px] font-bold"
                style={{ background: '#F3F4F6', color: '#364153' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* QUESTION / FRONT SIDE */}
              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  QUESTION / FRONT SIDE
                </label>
                <input
                  type="text"
                  placeholder="e.g. What is the Coriolis Effect?"
                  value={flashcardQuestion}
                  onChange={(e) => setFlashcardQuestion(e.target.value)}
                  className="w-full rounded-[10px] px-4 py-2.5 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1, background: '#F9FAFB', border: '0.8px solid #E5E7EB', color: '#101828' }}
                />
              </div>

              {/* ANSWER / BACK SIDE */}
              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  ANSWER / BACK SIDE
                </label>
                <textarea
                  placeholder="e.g. The deflection of moving objects caused by Earth's rotation..."
                  value={flashcardAnswer}
                  onChange={(e) => setFlashcardAnswer(e.target.value)}
                  rows={4}
                  className="w-full rounded-[10px] px-4 py-2.5 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent resize-y"
                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', background: '#F9FAFB', border: '0.8px solid #E5E7EB', color: '#101828' }}
                />
              </div>

              {/* SELECT DECK */}
              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  SELECT DECK
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {deckOptions.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => setFlashcardDeck(deck.id)}
                      className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left border transition-colors"
                      style={{
                        border: '0.8px solid ' + (flashcardDeck === deck.id ? '#FDC700' : '#E5E7EB'),
                        background: flashcardDeck === deck.id ? '#FEFCE8' : '#FFFFFF',
                        fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                        color: flashcardDeck === deck.id ? '#101828' : '#364153',
                      }}
                    >
                      <span aria-hidden>{deck.icon}</span>
                      <span className="flex-1">{deck.label}</span>
                      {flashcardDeck === deck.id && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIFFICULTY */}
              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  DIFFICULTY
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFlashcardDifficulty(d)}
                      className="rounded-[10px] px-4 py-2 border"
                      style={{
                        fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                        border: '0.8px solid ' + (flashcardDifficulty === d ? '#101828' : '#E5E7EB'),
                        background: flashcardDifficulty === d ? '#101828' : '#FFFFFF',
                        color: flashcardDifficulty === d ? '#FFFFFF' : '#364153',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setShowAddFlashcardModal(false)}
                style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, color: '#6A7282' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowAddFlashcardModal(false)}
                className="flex items-center gap-2 rounded-[10px] px-5 py-2.5"
                style={{
                  background: 'linear-gradient(90deg, #F0AE00 0%, #FE6D00 100%)',
                  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF',
                }}
              >
                <span aria-hidden>✓</span> Add to Flashcards
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
