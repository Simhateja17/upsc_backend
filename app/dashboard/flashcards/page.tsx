'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateFlashcardModal from '@/components/CreateFlashcardModal';
import { flashcardService } from '@/lib/services';

const DECK_COLORS: Record<string, string> = {
  polity: '#155DFC',
  history: '#D08700',
  geography: '#F6339A',
  economy: '#F0AE00',
  science: '#AD46FF',
  environment: '#14B8A6',
  ethics: '#A78BFA',
  'current-affairs': '#00C950',
  weak: '#E7000B',
};

const DECK_ICONS: Record<string, string> = {
  polity: '🏛️',
  history: '📜',
  geography: '🌍',
  economy: '💰',
  science: '🔬',
  environment: '🌿',
  ethics: '⚖️',
  'current-affairs': '📰',
  weak: '⚠️',
};

type Deck = {
  id: string;
  subject: string;
  icon: string;
  totalCards: number;
  topics: number;
  mastery: number;
  masteredCards: number;
};

export default function FlashcardsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flashcardService.getSubjects()
      .then((res) => {
        if (res.status === 'success') setDecks(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCards = decks.reduce((s, d) => s + d.totalCards, 0);
  const totalMastered = decks.reduce((s, d) => s + d.masteredCards, 0);
  const coverage = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;
  const needReview = decks.reduce((s, d) => s + (d.totalCards - d.masteredCards), 0);

  const bannerMetrics = [
    { label: 'TOTAL CARDS', value: String(totalCards), valueColor: '#7D96B3' },
    { label: 'MASTERED', value: String(totalMastered), valueColor: '#4ADE80' },
    { label: 'COVERAGE', value: `${coverage}%`, valueColor: '#FBBF24' },
    { label: 'NEED REVIEW', value: String(needReview), valueColor: '#FB7185' },
  ];

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: '100%' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Flashcard Vault banner */}
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
            <div className="flex flex-wrap gap-6">
              {bannerMetrics.map((m) => (
                <div key={m.label} className="flex flex-col items-center">
                  <span
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 700,
                      fontSize: 36,
                      lineHeight: '40px',
                      color: m.valueColor,
                    }}
                  >
                    {m.value}
                  </span>
                  <span
                    className="uppercase tracking-[1px] mt-1"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      fontSize: 10,
                      lineHeight: '15px',
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
              <h2 style={{ fontFamily: 'Georgia', fontWeight: 700, fontSize: 36, lineHeight: '40px', color: '#101828' }}>
                Choose a <span style={{ fontStyle: 'italic', color: '#F0B100' }}>Subject</span>
              </h2>
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
              <span>+</span> New Flashcard
            </button>
          </div>
          <p
            className="mb-6"
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}
          >
            Pick the subject you want to revise today
          </p>

          {/* Subject cards grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-[10px] border animate-pulse" style={{ border: '0.8px solid #E5E7EB', background: '#F9FAFB', minHeight: 201 }} />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-semibold mb-2">No flashcard decks yet</p>
              <p className="text-sm">Create your first flashcard to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => {
                const progressColor = DECK_COLORS[deck.id] ?? '#155DFC';
                const icon = DECK_ICONS[deck.id] ?? deck.icon;
                const due = deck.totalCards - deck.masteredCards;
                return (
                  <Link
                    key={deck.id}
                    href={`/dashboard/flashcards/${deck.id}`}
                    className="block rounded-[10px] p-6 border transition-shadow hover:shadow-md"
                    style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 201.57 }}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-3xl" aria-hidden>{icon}</span>
                    </div>
                    <h3
                      className="mt-4 mb-1"
                      style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', color: '#101828' }}
                    >
                      {deck.subject}
                    </h3>
                    <p
                      className="mb-3"
                      style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}
                    >
                      {deck.totalCards} cards · {deck.topics} topics
                    </p>
                    <div className="w-full h-1 rounded-full mb-3" style={{ background: '#F3F4F6' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${deck.mastery}%`, background: progressColor, maxWidth: '100%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: progressColor }}>
                        {deck.mastery}% mastered
                      </span>
                      {due === 0 ? (
                        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#00C950' }}>
                          ✓ All done
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: '#F54900' }}>
                          {due} due
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateFlashcardModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
