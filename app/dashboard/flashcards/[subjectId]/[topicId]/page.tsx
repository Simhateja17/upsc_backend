'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { flashcardService } from '@/lib/services';

type Card = {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  mastered: boolean;
};

export default function FlashcardReviewPage({ params }: { params: { subjectId: string; topicId: string } }) {
  const subjectId = typeof params?.subjectId === 'string' ? params.subjectId : '';
  const topicId = typeof params?.topicId === 'string' ? params.topicId : '';

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [arrowImgFailed, setArrowImgFailed] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    if (!subjectId || !topicId) return;
    flashcardService.getCards(subjectId, topicId)
      .then((res) => {
        if (res.status === 'success') {
          setCards(res.data);
          setMasteredCount(res.data.filter((c: Card) => c.mastered).length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId, topicId]);

  const totalCards = cards.length;
  const card = cards[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalCards - 1;

  const goPrev = () => {
    if (!isFirst) { setCurrentIndex((i) => i - 1); setRevealed(false); }
  };

  const goNext = () => {
    if (isLast) setShowSessionComplete(true);
    else { setCurrentIndex((i) => i + 1); setRevealed(false); }
  };

  const handleReveal = () => {
    setRevealed(true);
    if (card && !card.mastered) {
      // Mark as seen (not mastered yet, user must explicitly mark)
      flashcardService.updateProgress(card.id, false).catch(() => {});
    }
  };

  const handleMastered = () => {
    if (!card) return;
    flashcardService.updateProgress(card.id, true)
      .then(() => {
        setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, mastered: true } : c));
        setMasteredCount((n) => n + 1);
        goNext();
      })
      .catch(() => goNext());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
        <div className="animate-pulse text-gray-400">Loading cards...</div>
      </div>
    );
  }

  if (!loading && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
        <p className="text-gray-500">No cards found for this topic.</p>
        <Link href={`/dashboard/flashcards/${subjectId}`} className="text-blue-600 underline text-sm">
          ← Back to Topics
        </Link>
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Back to Topics */}
          <Link
            href={`/dashboard/flashcards/${subjectId}`}
            className="inline-flex items-center gap-2 mb-4"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#4A5565' }}
          >
            {!arrowImgFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/ArrowLeft.png" alt="" className="w-5 h-5 object-contain flex-shrink-0 mr-1" onError={() => setArrowImgFailed(true)} />
            )}
            {arrowImgFailed && <span aria-hidden className="mr-1">←</span>}
            Back to Topics
          </Link>

          {/* Breadcrumb bar */}
          <div
            className="w-full rounded-[10px] px-4 py-4 flex flex-wrap items-center justify-between gap-3 mb-6"
            style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', minHeight: 71.2 }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>
                {subjectId}
              </span>
              <span style={{ width: 1, height: 16, background: '#E5E7EB' }} aria-hidden />
              <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#101828' }}>
                {topicId.replace(/-/g, ' ')}
              </span>
              <span style={{ width: 1, height: 16, background: '#E5E7EB' }} aria-hidden />
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                Card {currentIndex + 1} of {totalCards}
              </span>
            </div>
          </div>

          {/* Step row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00C950', color: '#FFFFFF', fontSize: 16 }}>✓</div>
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>Subject</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00C950', color: '#FFFFFF', fontSize: 16 }}>✓</div>
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>Topic</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#101828', fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}
              >
                {totalCards}
              </div>
              <div>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, lineHeight: '28px', color: '#101828' }}>Flashcards</p>
                <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#6A7282' }}>Click card to reveal answer</p>
              </div>
            </div>
          </div>

          {/* Main flashcard */}
          {card && (
            <div
              className="w-full rounded-[24px] border p-8 mb-8 min-h-[388px] flex flex-col"
              style={
                revealed
                  ? { background: '#FFFFFF', border: '0.8px solid #E5E7EB', boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08)' }
                  : { background: 'linear-gradient(180deg, #0F1419 0%, #1A2332 50%, #0D1218 100%)', border: '0.8px solid rgba(30,41,59,0.5)' }
              }
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="uppercase tracking-[2px]" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: revealed ? '#101828' : '#6A7282' }}>
                  {revealed ? 'Answer' : 'Question'}
                </span>
                <span className="uppercase tracking-[1.5px]" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '15px', color: revealed ? '#6A7282' : '#F0B100' }}>
                  {card.difficulty}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                {!revealed ? (
                  <>
                    <p className="mb-6" style={{ fontFamily: 'Georgia', fontWeight: 400, fontSize: 30, lineHeight: '48.75px', color: '#FFFFFF' }}>
                      {card.question}
                    </p>
                    <div className="h-px w-full mb-6" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    <button type="button" onClick={handleReveal} className="inline-flex items-center gap-2 self-center" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                      <span aria-hidden>👆</span> Tap to reveal answer
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 16, lineHeight: '24px', color: '#101828' }}>
                      {card.answer}
                    </p>
                    <div className="h-px w-full mb-4" style={{ background: '#E5E7EB' }} />
                    <button type="button" onClick={() => setRevealed(false)} className="inline-flex items-center gap-2 self-center" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                      <span aria-hidden>👆</span> Tap to hide answer
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mb-6">
            {cards.map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: i === currentIndex ? '#F1AB01' : '#E5E7EB' }} aria-hidden />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className="rounded-[10px] px-5 py-2.5 border min-w-[120px] disabled:opacity-50"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#364153', background: '#FFFFFF', border: '0.8px solid #D1D5DC' }}
            >
              ← Previous
            </button>
            {revealed && !card?.mastered && (
              <button
                type="button"
                onClick={handleMastered}
                className="rounded-[10px] px-5 py-2.5 min-w-[156px]"
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', background: '#00C950' }}
              >
                ✓ Got it!
              </button>
            )}
            {!revealed ? (
              <button
                type="button"
                onClick={handleReveal}
                className="rounded-[10px] px-5 py-2.5 min-w-[156px]"
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)' }}
              >
                Reveal Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="rounded-[10px] px-5 py-2.5 min-w-[156px]"
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)' }}
              >
                Hide Answer
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="rounded-[10px] px-5 py-2.5 border min-w-[130px]"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', background: '#101828', border: '0.8px solid #D1D5DC' }}
            >
              Next Card →
            </button>
          </div>
        </div>
      </div>

      {/* Session Complete modal */}
      {showSessionComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSessionComplete(false)}>
          <div className="rounded-[24px] bg-white w-full max-w-md overflow-hidden shadow-xl text-center" style={{ padding: '40px 32px' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-4" aria-hidden>🎉</div>
            <h2 className="mb-2" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}>
              Session Complete!
            </h2>
            <p className="mb-8 mx-auto max-w-[320px]" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
              Great work! Your cards have been updated in the spaced repetition schedule.
            </p>
            <div className="flex justify-center gap-6 mb-8">
              <div>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 28, lineHeight: '36px', color: '#7C3AED' }}>{totalCards}</p>
                <p className="uppercase tracking-wide" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '14px', color: '#6A7282' }}>Reviewed</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 28, lineHeight: '36px', color: '#00C950' }}>100%</p>
                <p className="uppercase tracking-wide" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '14px', color: '#6A7282' }}>Completed</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 28, lineHeight: '36px', color: '#F59E0B' }}>
                  {totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0}%
                </p>
                <p className="uppercase tracking-wide" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '14px', color: '#6A7282' }}>Mastery</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => { setShowSessionComplete(false); setCurrentIndex(0); setRevealed(false); }}
                className="rounded-[10px] px-5 py-2.5 border"
                style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#364153', background: '#FFFFFF', border: '0.8px solid #D1D5DC' }}
              >
                Review Again
              </button>
              <Link
                href="/dashboard/flashcards"
                className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5"
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)' }}
              >
                <span aria-hidden>🏠</span> Back to Decks
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
