'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import CreateFlashcardModal from '@/components/CreateFlashcardModal';

const subjectMeta: Record<string, { title: string; icon: string; cards: number; topics: number }> = {
  polity: { title: 'Indian Polity', icon: '🏛️', cards: 42, topics: 5 },
  history: { title: 'Modern History', icon: '📜', cards: 38, topics: 5 },
  geography: { title: 'Geography', icon: '🌍', cards: 45, topics: 6 },
  economy: { title: 'Indian Economy', icon: '💰', cards: 36, topics: 5 },
  science: { title: 'Science & Tech', icon: '🔬', cards: 28, topics: 4 },
  environment: { title: 'Environment', icon: '🌿', cards: 22, topics: 3 },
  ethics: { title: 'GS IV — Ethics', icon: '⚖️', cards: 18, topics: 3 },
  'current-affairs': { title: 'Current Affairs', icon: '📰', cards: 14, topics: 3 },
  weak: { title: 'Weak Topics', icon: '⚠️', cards: 24, topics: 4 },
};

const polityTopics = [
  { id: 'amendments', name: 'Constitutional Amendments', cards: 8, mastered: 98, barColor: '#00C950', textColor: '#00A63E' },
  { id: 'fr-dpsp', name: 'Fundamental Rights & DPSPs', cards: 12, mastered: 85, barColor: '#00C950', textColor: '#00A63E' },
  { id: 'parliament', name: 'Parliament & State Legislature', cards: 10, mastered: 78, barColor: '#00C950', textColor: '#00A63E' },
  { id: 'panchayati', name: 'Panchayati Raj & Local Bodies', cards: 7, mastered: 72, barColor: '#F0AE00', textColor: '#D08700' },
  { id: 'judiciary', name: 'Judiciary & Supreme Court', cards: 5, mastered: 88, barColor: '#00C950', textColor: '#00A63E' },
];

export default function FlashcardsSubjectPage({ params }: { params: { subjectId: string } }) {
  const subjectId = typeof params?.subjectId === 'string' ? params.subjectId : '';
  const meta = subjectMeta[subjectId];
  const topics = subjectId === 'polity' ? polityTopics : [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [arrowImgFailed, setArrowImgFailed] = useState(false);

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Back to Subjects */}
          <Link
            href="/dashboard/flashcards"
            className="inline-flex items-center gap-2 mb-4"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: '#4A5565' }}
          >
            {!arrowImgFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/ArrowLeft.png" alt="" className="w-5 h-5 object-contain flex-shrink-0 mr-1" onError={() => setArrowImgFailed(true)} />
            )}
            {arrowImgFailed && <span aria-hidden className="mr-1">←</span>}
            Back to Subjects
          </Link>

          {/* Subject summary card - 1116 x 101.58 */}
          {meta && (
            <div
              className="w-full rounded-[10px] px-6 py-5 flex items-center gap-4 mb-6"
              style={{
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
                minHeight: 101.58,
              }}
            >
              <span className="text-4xl flex-shrink-0" aria-hidden>{meta.icon}</span>
              <div>
                <h1
                  style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', letterSpacing: 0, color: '#101828' }}
                >
                  {meta.title}
                </h1>
                <p
                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: '#6A7282' }}
                >
                  {meta.cards} cards · {meta.topics} topics
                </p>
              </div>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#00C950', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: '28px', color: '#FFFFFF' }}
              >
                ✓
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                Subject selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#101828', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}
              >
                2
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, lineHeight: '28px', color: '#101828' }}>
                Choose a Topic
              </span>
            </div>
          </div>
          <p
            className="mb-6"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}
          >
            Pick a topic to start reviewing flashcards
          </p>

          {/* Topic cards */}
          <div className="space-y-3 mb-6">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/dashboard/flashcards/${subjectId}/${topic.id}`}
                className="flex items-center rounded-[10px] px-6 py-5 border transition-shadow hover:shadow-md"
                style={{
                  border: '0.8px solid #E5E7EB',
                  background: '#FFFFFF',
                  minHeight: 91.59,
                }}
              >
                <span className="text-3xl flex-shrink-0 mr-4" aria-hidden>{meta?.icon ?? '📄'}</span>
                <div className="flex-1 min-w-0">
                  <h3
                    style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', letterSpacing: 0, color: '#101828' }}
                  >
                    {topic.name}
                  </h3>
                  <p
                    style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', letterSpacing: 0, color: '#6A7282' }}
                  >
                    {topic.cards} cards
                  </p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ width: 128, height: 8, background: '#F3F4F6' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${topic.mastered}%`, background: topic.barColor, maxWidth: '100%' }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontSize: 18,
                        lineHeight: '28px',
                        textAlign: 'right',
                        color: topic.textColor,
                        minWidth: 40,
                      }}
                    >
                      {topic.mastered}%
                    </span>
                  </div>
                  <span className="text-[#6A7282]" aria-hidden>→</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Add Custom Flashcard */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[14px] border-2 border-dashed"
            style={{ borderColor: '#D1D5DC', background: '#FFFFFF', minHeight: 107 }}
          >
            <div className="flex items-center gap-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: '#101828', color: '#FFFFFF', fontFamily: 'Inter', fontWeight: 700 }}
              >
                +
              </div>
              <div>
                <p
                  className="font-bold mb-1"
                  style={{ fontFamily: 'Inter', fontSize: 18, lineHeight: '28px', color: '#101828' }}
                >
                  Add Custom Flashcard
                </p>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                  Create your own flashcard for today
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-[10px] px-5 py-2.5"
              style={{
                background: 'linear-gradient(90deg, #F0AE00 0%, #FE6D00 100%)',
                boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF',
              }}
            >
              <span>+</span> Add Flashcard
            </button>
          </div>
        </div>
      </div>

      <CreateFlashcardModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialSubject={meta?.title}
      />
    </div>
  );
}
