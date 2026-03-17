'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateFlashcardModal from '@/components/CreateFlashcardModal';
import { flashcardService } from '@/lib/services';

type Topic = {
  id: string;
  name: string;
  cards: number;
  mastery: number;
};

type DeckMeta = {
  subject: string;
  icon: string;
};

function getMasteryColor(mastery: number): { barColor: string; textColor: string } {
  if (mastery >= 80) return { barColor: '#00C950', textColor: '#00A63E' };
  if (mastery >= 50) return { barColor: '#F0AE00', textColor: '#D08700' };
  return { barColor: '#E7000B', textColor: '#B91C1C' };
}

export default function FlashcardsSubjectPage({ params }: { params: { subjectId: string } }) {
  const subjectId = typeof params?.subjectId === 'string' ? params.subjectId : '';
  const [meta, setMeta] = useState<DeckMeta | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [arrowImgFailed, setArrowImgFailed] = useState(false);

  useEffect(() => {
    if (!subjectId) return;
    flashcardService.getTopics(subjectId)
      .then((res) => {
        if (res.status === 'success') {
          setMeta(res.data.deck);
          setTopics(res.data.topics);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Back to Subjects */}
          <Link
            href="/dashboard/flashcards"
            className="inline-flex items-center gap-2 mb-4"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}
          >
            {!arrowImgFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/ArrowLeft.png" alt="" className="w-5 h-5 object-contain flex-shrink-0 mr-1" onError={() => setArrowImgFailed(true)} />
            )}
            {arrowImgFailed && <span aria-hidden className="mr-1">←</span>}
            Back to Subjects
          </Link>

          {/* Subject summary card */}
          {loading ? (
            <div className="w-full rounded-[10px] h-[101px] animate-pulse mb-6" style={{ background: '#F9FAFB', border: '0.8px solid #E5E7EB' }} />
          ) : meta && (
            <div
              className="w-full rounded-[10px] px-6 py-5 flex items-center gap-4 mb-6"
              style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 101.58 }}
            >
              <span className="text-4xl flex-shrink-0" aria-hidden>{meta.icon}</span>
              <div>
                <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>
                  {meta.subject}
                </h1>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                  {topics.reduce((s, t) => s + t.cards, 0)} cards · {topics.length} topics
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
          <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
            Pick a topic to start reviewing flashcards
          </p>

          {/* Topic cards */}
          {loading ? (
            <div className="space-y-3 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-[10px] h-[91px] animate-pulse" style={{ background: '#F9FAFB', border: '0.8px solid #E5E7EB' }} />
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12 text-gray-400 mb-6">
              <p>No topics found for this subject yet.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {topics.map((topic) => {
                const { barColor, textColor } = getMasteryColor(topic.mastery);
                return (
                  <Link
                    key={topic.id}
                    href={`/dashboard/flashcards/${subjectId}/${topic.id}`}
                    className="flex items-center rounded-[10px] px-6 py-5 border transition-shadow hover:shadow-md"
                    style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 91.59 }}
                  >
                    <span className="text-3xl flex-shrink-0 mr-4" aria-hidden>{meta?.icon ?? '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                        {topic.name}
                      </h3>
                      <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>
                        {topic.cards} cards
                      </p>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full overflow-hidden" style={{ width: 128, height: 8, background: '#F3F4F6' }}>
                          <div className="h-full rounded-full" style={{ width: `${topic.mastery}%`, background: barColor, maxWidth: '100%' }} />
                        </div>
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', color: textColor, minWidth: 40 }}>
                          {topic.mastery}%
                        </span>
                      </div>
                      <span className="text-[#6A7282]" aria-hidden>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

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
                <p className="font-bold mb-1" style={{ fontFamily: 'Inter', fontSize: 18, lineHeight: '28px', color: '#101828' }}>
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
        initialSubject={meta?.subject}
      />
    </div>
  );
}
