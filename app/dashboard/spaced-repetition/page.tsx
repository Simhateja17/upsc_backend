'use client';

import React, { useState, useEffect } from 'react';
import { spacedRepService } from '@/lib/services';

const subjectPills = [
  { label: 'Critical:', count: '2 subjects', icon: '🔴' },
  { label: 'Weak:', count: '1 subjects', icon: '🟠' },
  { label: 'Improving:', count: '6 subjects', icon: '🟡' },
  { label: 'Strong:', count: '3 subjects', icon: '🟢' },
];

const filterOptions = ['All', 'mcq', 'mains', 'pyq', 'custom'];
const scheduleOptions = [3, 7, 15, 30];

const deckOptions = [
  { id: 'geography', label: 'Geography', icon: '🌍' },
  { id: 'polity', label: 'Polity', icon: '🏛️' },
  { id: 'economy', label: 'Economy', icon: '💰' },
  { id: 'environment', label: 'Environment', icon: '🌿' },
  { id: 'history', label: 'History', icon: '📚' },
  { id: 'current-affairs', label: 'Current Affairs', icon: '📰' },
];

const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Tricky'];

type SpacedRepItem = {
  id: string;
  questionText: string;
  source: string;
  sourceType: string;
  subject: string;
  scheduleDay: number;
  remindEnabled: boolean;
  addedToFlashcard: boolean;
  nextReviewAt: string;
};

function sourceColor(sourceType: string): string {
  if (sourceType === 'mcq') return '#F54900';
  if (sourceType === 'pyq') return '#9810FA';
  return '#155DFC';
}

function subjectBg(subject: string): string {
  const map: Record<string, string> = {
    Economy: '#ECFDF5',
    Polity: '#BEDBFF',
    Environment: '#84FAB0',
    Geography: '#FEF9C3',
    History: '#FEF3C7',
  };
  return map[subject] ?? '#F3F4F6';
}

export default function SpacedRepetitionPage() {
  const [filter, setFilter] = useState('All');
  const [items, setItems] = useState<SpacedRepItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal state
  const [modalDeck, setModalDeck] = useState('geography');
  const [modalDifficulty, setModalDifficulty] = useState('Hard');
  const [modalQuestion, setModalQuestion] = useState('');
  const [modalAnswer, setModalAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = (sourceType?: string) => {
    setLoading(true);
    spacedRepService.getItems(sourceType === 'All' ? undefined : sourceType)
      .then((res) => {
        if (res.status === 'success') setItems(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems(filter === 'All' ? undefined : filter);
  }, [filter]);

  const toggleRemind = (id: string, current: boolean) => {
    spacedRepService.updateItem(id, { remindEnabled: !current })
      .then((res) => {
        if (res.status === 'success') {
          setItems((prev) => prev.map((i) => i.id === id ? { ...i, remindEnabled: !current } : i));
        }
      })
      .catch(() => {});
  };

  const toggleSchedule = (id: string, day: number) => {
    spacedRepService.updateItem(id, { scheduleDay: day })
      .then((res) => {
        if (res.status === 'success') {
          setItems((prev) => prev.map((i) => i.id === id ? { ...i, scheduleDay: day } : i));
        }
      })
      .catch(() => {});
  };

  const handleAddItem = () => {
    if (!modalQuestion.trim()) return;
    setSaving(true);
    const subjectLabel = deckOptions.find((d) => d.id === modalDeck)?.label ?? modalDeck;
    spacedRepService.addItem({
      questionText: modalQuestion,
      subject: subjectLabel,
      source: 'Custom',
      sourceType: 'custom',
    })
      .then((res) => {
        if (res.status === 'success') {
          setItems((prev) => [res.data, ...prev]);
          setModalQuestion('');
          setModalAnswer('');
          setShowAddModal(false);
        }
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const visibleItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1168px] mx-auto px-6 py-6">
          {/* Header banner */}
          <div
            className="w-full rounded-[16px] px-8 pt-8 pb-8 mb-6"
            style={{ background: 'linear-gradient(180deg, #121B2E 0%, #172032 100%)', minHeight: 256.6 }}
          >
            <div className="uppercase tracking-[0.5px] mb-2" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#FDC700' }}>
              WEAK SUBJECT TRACKER - AI-POWERED GAP ANALYSIS
            </div>
            <h1 className="font-bold mb-4" style={{ fontFamily: 'Inter', fontSize: 36, lineHeight: '40px', color: '#FFFFFF' }}>
              Close every <span className="italic">gap</span> before exam day.
            </h1>
            <p className="mb-6 max-w-[768px]" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 16, lineHeight: '24px', color: '#D1D5DC' }}>
              Real-time subject health monitoring — pinpoints exactly which topics need your attention and builds a smart revision plan.
            </p>
            <div className="flex flex-wrap gap-4">
              {subjectPills.map((pill) => (
                <div
                  key={pill.label}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5"
                  style={{ border: '0.8px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)' }}
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
              <span className="rounded px-2.5 py-1" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, lineHeight: '16px', background: '#FEF2F2', color: '#E7000B' }}>
                {items.length} questions
              </span>
              <div className="flex items-center gap-2">
                {filterOptions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFilter(f); setPage(1); }}
                    className="rounded-[10px] px-3 py-2"
                    style={{
                      fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                      background: filter === f ? '#101828' : '#F3F4F6',
                      color: filter === f ? '#FFFFFF' : '#4A5565',
                      textTransform: 'capitalize',
                    }}
                  >
                    {f === 'All' ? 'All' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
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
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 border-b border-[#F3F4F6] animate-pulse" style={{ minHeight: 83 }}>
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              ))
            ) : visibleItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No items found. Add your first question above.
              </div>
            ) : (
              visibleItems.map((q) => (
                <div
                  key={q.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-start px-6 py-4 border-b border-[#F3F4F6]"
                  style={{ minHeight: 83 }}
                >
                  <div>
                    <p style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '22.75px', color: '#101828', marginBottom: 4 }}>{q.questionText}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, color: sourceColor(q.sourceType) }}>{q.source}</span>
                      {q.addedToFlashcard ? (
                        <span style={{ fontFamily: 'Inter', fontWeight: 600, color: '#009966' }}>✓ Added to Flashcards</span>
                      ) : (
                        <button
                          type="button"
                          className="font-semibold"
                          style={{ fontFamily: 'Inter', color: '#155DFC' }}
                          onClick={() => spacedRepService.updateItem(q.id, { addedToFlashcard: true }).then(() => {
                            setItems((prev) => prev.map((i) => i.id === q.id ? { ...i, addedToFlashcard: true } : i));
                          })}
                        >
                          + Add to Flashcards
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span
                      className="inline-block rounded-full px-3 py-1"
                      style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', background: subjectBg(q.subject), color: '#0A0A0A' }}
                    >
                      {q.subject}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="uppercase text-[12px] font-semibold" style={{ fontFamily: 'Inter', color: '#6A7282' }}>Schedule</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {scheduleOptions.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleSchedule(q.id, day)}
                          className="rounded px-2 py-1 text-[12px] font-bold"
                          style={{
                            fontFamily: 'Inter', lineHeight: '16px',
                            background: q.scheduleDay === day ? '#101828' : '#E5E7EB',
                            color: q.scheduleDay === day ? '#FFFFFF' : '#4A5565',
                          }}
                        >
                          {day}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={q.remindEnabled}
                      onClick={() => toggleRemind(q.id, q.remindEnabled)}
                      className="relative w-11 h-6 rounded-full transition-colors flex items-center"
                      style={{ background: q.remindEnabled ? '#00BC7D' : '#D1D5DC', paddingLeft: 4, paddingRight: 4 }}
                    >
                      <span
                        className="block w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: q.remindEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
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
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}>Create your own question for today</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5"
              style={{ background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F00 100%)', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}
            >
              Add Question
            </button>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 rounded-b-[10px]"
              style={{ borderTop: '0.8px solid #F3F4F6', background: '#FFFFFF' }}
            >
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                Showing {visibleItems.length} of {items.length} questions
              </span>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center font-semibold text-[14px]"
                    style={{ fontFamily: 'Inter', lineHeight: '20px', background: page === n ? '#101828' : '#F3F4F6', color: page === n ? '#FFFFFF' : '#4A5565' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Flashcard Deck modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="rounded-[16px] bg-white flex flex-col w-full max-w-[512px] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.8px solid #E5E7EB', minHeight: 60.8 }}>
              <div className="flex items-center gap-2">
                <span aria-hidden style={{ fontSize: 22 }}>📇</span>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>Add Question to Review</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[18px] font-bold"
                style={{ background: '#F3F4F6', color: '#364153' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  QUESTION
                </label>
                <textarea
                  placeholder="e.g. What is the Coriolis Effect?"
                  value={modalQuestion}
                  onChange={(e) => setModalQuestion(e.target.value)}
                  rows={3}
                  className="w-full rounded-[10px] px-4 py-2.5 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent resize-y"
                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', background: '#F9FAFB', border: '0.8px solid #E5E7EB', color: '#101828' }}
                />
              </div>

              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  SELECT SUBJECT
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {deckOptions.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => setModalDeck(deck.id)}
                      className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left border transition-colors"
                      style={{
                        border: '0.8px solid ' + (modalDeck === deck.id ? '#FDC700' : '#E5E7EB'),
                        background: modalDeck === deck.id ? '#FEFCE8' : '#FFFFFF',
                        fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                        color: modalDeck === deck.id ? '#101828' : '#364153',
                      }}
                    >
                      <span aria-hidden>{deck.icon}</span>
                      <span className="flex-1">{deck.label}</span>
                      {modalDeck === deck.id && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block uppercase tracking-[0.5px]" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 10, lineHeight: '15px', color: '#99A1AF' }}>
                  DIFFICULTY
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setModalDifficulty(d)}
                      className="rounded-[10px] px-4 py-2 border"
                      style={{
                        fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px',
                        border: '0.8px solid ' + (modalDifficulty === d ? '#101828' : '#E5E7EB'),
                        background: modalDifficulty === d ? '#101828' : '#FFFFFF',
                        color: modalDifficulty === d ? '#FFFFFF' : '#364153',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, color: '#6A7282' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={saving || !modalQuestion.trim()}
                className="flex items-center gap-2 rounded-[10px] px-5 py-2.5 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(90deg, #F0AE00 0%, #FE6D00 100%)',
                  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF',
                }}
              >
                <span aria-hidden>✓</span> {saving ? 'Saving...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
