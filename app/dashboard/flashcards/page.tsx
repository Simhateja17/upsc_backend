'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import CreateFlashcardModal from '@/components/CreateFlashcardModal';

const bannerMetrics = [
  { label: 'TOTAL MAPS', value: '28', valueColor: '#7D96B3' },
  { label: 'MASTERED', value: '19', valueColor: '#4ADE80' },
  { label: 'COVERAGE', value: '76%', valueColor: '#FBBF24' },
  { label: 'NEED REVIEW', value: '9', valueColor: '#FB7185' },
  { label: 'DAY STREAK', value: '42', valueColor: '#C4B5FD', icon: '🔥' },
];

const subjectDecks = [
  { id: 'polity', title: 'Indian Polity', icon: '🏛️', cards: 42, topics: 5, mastered: 83, progressColor: '#155DFC', due: 3, allDone: false },
  { id: 'history', title: 'Modern History', icon: '📜', cards: 38, topics: 5, mastered: 79, progressColor: '#D08700', due: 2, allDone: false },
  { id: 'geography', title: 'Geography', icon: '🌍', cards: 45, topics: 6, mastered: 69, progressColor: '#F6339A', due: 12, allDone: false },
  { id: 'economy', title: 'Indian Economy', icon: '💰', cards: 36, topics: 5, mastered: 58, progressColor: '#F0AE00', due: 8, allDone: false },
  { id: 'science', title: 'Science & Tech', icon: '🔬', cards: 28, topics: 4, mastered: 71, progressColor: '#AD46FF', due: 4, allDone: false },
  { id: 'environment', title: 'Environment', icon: '🌿', cards: 22, topics: 3, mastered: 82, progressColor: '#14B8A6', due: 1, allDone: false },
  { id: 'ethics', title: 'GS IV — Ethics', icon: '⚖️', cards: 18, topics: 3, mastered: 89, progressColor: '#A78BFA', due: 0, allDone: true },
  { id: 'current-affairs', title: 'Current Affairs', icon: '📰', cards: 14, topics: 3, mastered: 71, progressColor: '#00C950', due: 2, allDone: false },
  { id: 'weak', title: 'Weak Topics', icon: '⚠️', cards: 24, topics: 4, mastered: 33, progressColor: '#E7000B', due: 14, allDone: false },
];

export default function FlashcardsPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Flashcard Vault banner - 1116 x 301 */}
          <div
            className="w-full rounded-[16px] px-8 pt-10 pb-8 mb-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0F172B 0%, #17223E 100%)',
              minHeight: 301,
            }}
          >
            <div
              className="uppercase tracking-[0.55px] mb-2"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 11, lineHeight: '16.5px', color: '#FFCB47' }}
            >
              Revision — Smart Learning System
            </div>
            <h1 className="mb-3" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 48, lineHeight: '48px', letterSpacing: 0, color: '#FFFFFF' }}>
              Your <span style={{ color: '#FFCB47', fontStyle: 'italic' }}>Flashcard</span> <span style={{ fontStyle: 'italic', color: '#FFFFFF' }}>Vault.</span>
            </h1>
            <p
              className="mb-8 max-w-[574px]"
              style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: 'rgba(255,255,255,0.95)' }}
            >
              Powered by spaced repetition science. Study smarter — each card surfaces exactly when your brain is about to forget it.
            </p>
            {/* Metrics row */}
            <div className="flex flex-wrap gap-6">
              {bannerMetrics.map((m) => (
                <div key={m.label} className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1" style={{ minHeight: 40 }}>
                    {m.icon && <span className="text-lg" aria-hidden>{m.icon}</span>}
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontSize: 36,
                        lineHeight: '40px',
                        letterSpacing: 0,
                        textAlign: 'center',
                        color: m.valueColor,
                      }}
                    >
                      {m.value}
                    </span>
                  </div>
                  <span
                    className="uppercase tracking-[1px] mt-1"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      fontSize: 10,
                      lineHeight: '15px',
                      textAlign: 'center',
                      color: '#536480',
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1 Choose a Subject */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#101828', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}
              >
                1
              </div>
              <div>
                <h2 style={{ fontFamily: 'Georgia', fontWeight: 700, fontSize: 36, lineHeight: '40px', letterSpacing: 0, color: '#101828' }}>
                  Choose a <span style={{ fontStyle: 'italic', color: '#F0B100' }}>Subject</span>
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-[10px] px-5 py-2.5"
              style={{
                background: 'linear-gradient(90deg, #F0AE00 0%, #FE6D00 100%)',
                boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: '#FFFFFF',
              }}
            >
              <span>+</span> New Flashcard
            </button>
          </div>
          <p
            className="mb-6"
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: '#6A7282' }}
          >
            Pick the subject you want to revise today
          </p>

          {/* Subject cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectDecks.map((deck) => (
              <Link
                key={deck.id}
                href={`/dashboard/flashcards/${deck.id}`}
                className="block rounded-[10px] p-6 border transition-shadow hover:shadow-md"
                style={{
                  border: '0.8px solid #E5E7EB',
                  background: '#FFFFFF',
                  minHeight: 201.57,
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl" aria-hidden>{deck.icon}</span>
                </div>
                <h3
                  className="mt-4 mb-1"
                  style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: 0, color: '#101828' }}
                >
                  {deck.title}
                </h3>
                <p
                  className="mb-3"
                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', letterSpacing: 0, color: '#6A7282' }}
                >
                  {deck.cards} cards · {deck.topics} topics
                </p>
                <div
                  className="w-full h-1 rounded-full mb-3"
                  style={{ background: '#F3F4F6' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${deck.mastered}%`, background: deck.progressColor, maxWidth: '100%' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      fontSize: 12,
                      lineHeight: '16px',
                      color: deck.progressColor,
                    }}
                  >
                    {deck.mastered}% mastered
                  </span>
                  {deck.allDone ? (
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#00C950' }}>
                      ✓ All done
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#F54900' }}>
                      {deck.due} due
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <CreateFlashcardModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
