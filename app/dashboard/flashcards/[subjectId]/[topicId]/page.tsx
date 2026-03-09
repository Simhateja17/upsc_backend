'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

const subjectMeta: Record<string, { title: string; icon: string }> = {
  polity: { title: 'Indian Polity', icon: '🏛️' },
  history: { title: 'Modern History', icon: '📜' },
  geography: { title: 'Geography', icon: '🌍' },
  economy: { title: 'Indian Economy', icon: '💰' },
  science: { title: 'Science & Tech', icon: '🔬' },
  environment: { title: 'Environment', icon: '🌿' },
  ethics: { title: 'GS IV — Ethics', icon: '⚖️' },
  'current-affairs': { title: 'Current Affairs', icon: '📰' },
  weak: { title: 'Weak Topics', icon: '⚠️' },
};

const polityTopicMeta: Record<string, { name: string; cards: number }> = {
  amendments: { name: 'Constitutional Amendments', cards: 8 },
  'fr-dpsp': { name: 'Fundamental Rights & DPSPs', cards: 12 },
  parliament: { name: 'Parliament & State Legislature', cards: 10 },
  panchayati: { name: 'Panchayati Raj & Local Bodies', cards: 7 },
  judiciary: { name: 'Judiciary & Supreme Court', cards: 5 },
};

// Sample cards for Constitutional Amendments (8 cards)
const sampleCards = [
  { question: "What is the significance of the 42nd Amendment Act (1976)?", answer: 'Called "Mini Constitution". Added Fundamental Duties (Part IV-A), added words Secular, Socialist, Integrity to Preamble. Curtailed judicial review, extended emergency provisions. Many provisions later reversed by 44th Amendment.' },
  { question: "What are the key recommendations of the Sarkaria Commission on Centre-State relations?", answer: "Key recommendations include creation of Inter-State Council, more fiscal devolution, and clearer division of responsibilities between Centre and States." },
  { question: "Which article deals with the President's power to grant pardons?", answer: "Article 72 empowers the President to grant pardons, reprieves, respites or remissions of punishment." },
  { question: "What is the difference between a constitutional amendment under Article 368 and a simple majority law?", answer: "Amendments under Article 368 require special majority and sometimes ratification by states; simple laws need only ordinary majority in Parliament." },
  { question: "Define the doctrine of basic structure as evolved by the Supreme Court.", answer: "The basic structure doctrine holds that certain fundamental features of the Constitution cannot be amended by Parliament, as established in Kesavananda Bharati." },
  { question: "What is the significance of the 44th Amendment Act?", answer: "It restored several democratic provisions after the Emergency, including limiting the President's power to declare Emergency and strengthening fundamental rights." },
  { question: "How does the 73rd Amendment relate to Panchayati Raj?", answer: "The 73rd Amendment gave constitutional status to Panchayati Raj institutions and mandated a three-tier structure at village, block and district levels." },
  { question: "What are the three lists in the Seventh Schedule?", answer: "Union List, State List, and Concurrent List—defining the legislative competence of Parliament and State Legislatures." },
];

export default function FlashcardReviewPage({ params }: { params: { subjectId: string; topicId: string } }) {
  const subjectId = typeof params?.subjectId === 'string' ? params.subjectId : '';
  const topicId = typeof params?.topicId === 'string' ? params.topicId : '';
  const subject = subjectMeta[subjectId];
  const topic = subjectId === 'polity' ? polityTopicMeta[topicId] : { name: topicId, cards: 5 };
  const cards = topic?.cards ? sampleCards.slice(0, topic.cards) : sampleCards;
  const totalCards = cards.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [arrowImgFailed, setArrowImgFailed] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);

  const card = cards[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalCards - 1;

  const goPrev = () => { if (!isFirst) { setCurrentIndex((i) => i - 1); setRevealed(false); } };
  const goNext = () => {
    if (isLast) setShowSessionComplete(true);
    else { setCurrentIndex((i) => i + 1); setRevealed(false); }
  };

  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-[1180px] mx-auto px-6 py-6">
          {/* Back to Topics */}
          <Link
            href={`/dashboard/flashcards/${subjectId}`}
            className="inline-flex items-center gap-2 mb-4"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', letterSpacing: 0, color: '#4A5565' }}
          >
            {!arrowImgFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/ArrowLeft.png" alt="" className="w-5 h-5 object-contain flex-shrink-0 mr-1" onError={() => setArrowImgFailed(true)} />
            )}
            {arrowImgFailed && <span aria-hidden className="mr-1">←</span>}
            Back to Topics
          </Link>

          {/* Breadcrumb bar - 936 x 71.2 */}
          <div
            className="w-full rounded-[10px] px-4 py-4 flex flex-wrap items-center justify-between gap-3 mb-6"
            style={{
              border: '0.8px solid #E5E7EB',
              background: '#FFFFFF',
              minHeight: 71.2,
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#155DFC' }}>
                {subject?.icon} {subject?.title ?? subjectId}
              </span>
              <span style={{ width: 1, height: 16, background: '#E5E7EB' }} aria-hidden />
              <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#101828' }}>
                {topic?.name ?? topicId}
              </span>
              <span style={{ width: 1, height: 16, background: '#E5E7EB' }} aria-hidden />
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}>
                Card {currentIndex + 1} of {totalCards}
              </span>
            </div>
          </div>

          {/* Step row: Subject, Topic, 3, Flashcards */}
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

          {/* Main flashcard - dark card for question, white card for answer */}
          <div
            className="w-full rounded-[24px] border p-8 mb-8 min-h-[388px] flex flex-col"
            style={
              revealed
                ? {
                    background: '#FFFFFF',
                    border: '0.8px solid #E5E7EB',
                    boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.06)',
                  }
                : {
                    background: 'linear-gradient(180deg, #0F1419 0%, #1A2332 50%, #0D1218 100%)',
                    border: '0.8px solid rgba(30,41,59,0.5)',
                  }
            }
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <span
                className="uppercase tracking-[2px]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: '15px',
                  color: revealed ? '#101828' : '#6A7282',
                }}
              >
                {revealed ? 'Answer' : 'Question'}
              </span>
              <span
                className="uppercase tracking-[1.5px]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: '15px',
                  color: revealed ? '#6A7282' : '#F0B100',
                }}
              >
                {subject?.title} · {topic?.name}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {!revealed ? (
                <>
                  <p
                    className="mb-6"
                    style={{
                      fontFamily: 'Georgia',
                      fontWeight: 400,
                      fontSize: 30,
                      lineHeight: '48.75px',
                      letterSpacing: 0,
                      color: '#FFFFFF',
                    }}
                  >
                    {card.question}
                  </p>
                  <div className="h-px w-full mb-6" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="inline-flex items-center gap-2 self-center"
                    style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}
                  >
                    <span aria-hidden>👆</span> Tap to reveal answer
                  </button>
                </>
              ) : (
                <>
                  <p
                    className="mb-6"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: 16,
                      lineHeight: '24px',
                      letterSpacing: 0,
                      color: '#101828',
                    }}
                  >
                    {card.answer}
                  </p>
                  <div className="h-px w-full mb-4" style={{ background: '#E5E7EB' }} />
                  <button
                    type="button"
                    onClick={() => setRevealed(false)}
                    className="inline-flex items-center gap-2 self-center"
                    style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}
                  >
                    <span aria-hidden>👆</span> Tap to hide answer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mb-6">
            {cards.map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: i === currentIndex ? '#F1AB01' : '#E5E7EB',
                }}
                aria-hidden
              />
            ))}
          </div>

          {/* Buttons: Previous, Reveal Answer, Next Card */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className="rounded-[10px] px-5 py-2.5 border min-w-[120px] disabled:opacity-50"
              style={{
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                textAlign: 'center',
                color: '#364153',
                background: '#FFFFFF',
                border: '0.8px solid #D1D5DC',
              }}
            >
              ← Previous
            </button>
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="rounded-[10px] px-5 py-2.5 min-w-[156px]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: '20px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: '#FFFFFF',
                  background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)',
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="rounded-[10px] px-5 py-2.5 min-w-[156px]"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: '20px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: '#FFFFFF',
                  background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)',
                }}
              >
                Hide Answer
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="rounded-[10px] px-5 py-2.5 border min-w-[130px]"
              style={{
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                textAlign: 'center',
                color: '#FFFFFF',
                background: '#101828',
                border: '0.8px solid #D1D5DC',
              }}
            >
              Next Card →
            </button>
          </div>
        </div>
      </div>

      {/* Session Complete modal */}
      {showSessionComplete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSessionComplete(false)}
        >
          <div
            className="rounded-[24px] bg-white w-full max-w-md overflow-hidden shadow-xl text-center"
            style={{ padding: '40px 32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-4" aria-hidden>🎉</div>
            <h2
              className="mb-2"
              style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#101828' }}
            >
              Session Complete!
            </h2>
            <p
              className="mb-8 mx-auto max-w-[320px]"
              style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#6A7282' }}
            >
              Excellent work, Arjun! Your {subject?.title ?? 'subject'} cards have been updated in the spaced repetition schedule.
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
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 28, lineHeight: '36px', color: '#F59E0B' }}>90%</p>
                <p className="uppercase tracking-wide" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10, lineHeight: '14px', color: '#6A7282' }}>Mastery</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSessionComplete(false)}
                className="rounded-[10px] px-5 py-2.5 border"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: '20px',
                  textAlign: 'center',
                  color: '#364153',
                  background: '#FFFFFF',
                  border: '0.8px solid #D1D5DC',
                }}
              >
                Review Missed
              </button>
              <Link
                href="/dashboard/flashcards"
                className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: '20px',
                  textAlign: 'center',
                  color: '#FFFFFF',
                  background: 'linear-gradient(90deg, #F1AB01 0%, #FE6F01 100%)',
                }}
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
