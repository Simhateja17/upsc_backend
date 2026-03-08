'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockTestService } from '@/lib/services';

/* ─── Fallback data used when API is unavailable ─── */

const fallbackCards = [
  {
    icon: '🔄',
    iconBg: '#2B7FFF',
    imgSrc: '/emoji-12.png',
    title: 'Retake this test',
    desc: 'Same config, fresh attempt. Ideal for reinforcing weak areas.',
    badge: 'Recommended',
    badgeBg: 'rgba(49,65,88,0.6)',
    badgeColor: '#DBEAFE',
    dark: true,
    href: '/dashboard/mock-tests/attempt',
  },
  {
    icon: '+',
    iconBg: '#F3E8FF',
    iconColor: '#0F172B',
    title: 'Build a new test',
    desc: 'Change subject, difficulty or source. Keep the variety going.',
    badge: 'Most popular',
    badgeBg: '#F3E8FF',
    badgeColor: '#8200DB',
    dark: false,
    href: '/dashboard/mock-tests',
  },
  {
    icon: '✍️',
    iconBg: '#FEF9C3',
    title: 'Try Mains Writing',
    desc: 'Practice answer writing with AI markup feedback. Build answer skills.',
    badge: 'Mains prep',
    badgeBg: '#DBEAFE',
    badgeColor: '#1447E6',
    dark: false,
    href: '/dashboard/daily-answer',
  },
  {
    icon: '🚀',
    iconBg: '#FCE7F3',
    imgSrc: '/emoji-13.png',
    title: 'Unlock Pro Practice',
    desc: 'Remove limits — full 100-Q papers, unlimited subjects, PYQ archives.',
    badge: 'Upgrade',
    badgeBg: '#F3E8FF',
    badgeColor: '#8200DB',
    dark: false,
    href: '/dashboard/free-trial',
  },
];

interface CardItem {
  icon: string;
  iconBg: string;
  iconColor?: string;
  imgSrc?: string;
  title: string;
  desc: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  dark: boolean;
  href: string;
}

interface StreakData {
  days: number;
  percentile: number;
  message?: string;
}

interface RecommendationsData {
  cards: CardItem[];
  streak?: StreakData;
  heroTitle?: string;
  heroSubtitle?: string;
}

function NextStepsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');

  const [cards, setCards] = useState<CardItem[]>(fallbackCards);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [heroTitle, setHeroTitle] = useState('Great session!');
  const [heroSubtitle, setHeroSubtitle] = useState("You've completed today's practice. Here's what the best aspirants do next to keep climbing.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) {
      // No testId - use fallback data, no need to load
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadRecommendations() {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getRecommendations(testId!);
        if (cancelled) return;

        const data: RecommendationsData = res.data;
        if (!data) {
          throw new Error('No recommendations data returned.');
        }

        if (data.cards && data.cards.length > 0) {
          // Ensure retake card links back with testId
          const processedCards = data.cards.map((card: CardItem) => {
            if (card.href && card.href.includes('/attempt') && !card.href.includes('testId')) {
              return { ...card, href: `${card.href}?testId=${testId}` };
            }
            return card;
          });
          setCards(processedCards);
        }
        if (data.streak) {
          setStreak(data.streak);
        }
        if (data.heroTitle) {
          setHeroTitle(data.heroTitle);
        }
        if (data.heroSubtitle) {
          setHeroSubtitle(data.heroSubtitle);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load recommendations:', err);
          setError(err.message || 'Failed to load recommendations.');
          // Keep fallback cards visible
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRecommendations();
    return () => { cancelled = true; };
  }, [testId]);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading recommendations...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Header ── */}
      <header style={{
        width: '100%', height: '56px', background: '#0F172B',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#FDC700' }}>Prelims Practice</span>
        </div>
        <div style={{ width: '80px' }} />
      </header>

      {/* ── Content ── */}
      <div style={{
        maxWidth: '896px',
        margin: '0 auto',
        padding: '40px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>

        {/* ── Error Banner ── */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontSize: '14px', color: '#991B1B' }}>{error}</span>
          </div>
        )}

        {/* ── Hero Card ── */}
        <div style={{
          borderRadius: '32px',
          background: '#1D293D',
          boxShadow: '0 8px 10px -6px rgba(0,0,0,0.1), 0 20px 25px -5px rgba(0,0,0,0.1)',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emoji-6.png" alt="celebration" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#FFFFFF', margin: 0, textAlign: 'center', lineHeight: '48px' }}>
            {heroTitle}
          </h1>
          <p style={{ fontSize: '18px', color: '#BEDBFF', margin: 0, textAlign: 'center', lineHeight: '28px', whiteSpace: 'nowrap' }}>
            {heroSubtitle}
          </p>
        </div>

        {/* ── 2x2 Option Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {cards.map((card) => (
            <div
              key={card.title}
              onClick={() => router.push(card.href)}
              style={{
                borderRadius: '32px',
                background: card.dark ? '#1D293D' : '#FFFFFF',
                boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.15), 0 16px 24px -3px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px -4px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1)';
              }}
            >
              {/* Icon */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: card.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: card.icon === '+' ? '36px' : '26px',
                fontWeight: 700,
                color: card.iconColor || '#fff',
                overflow: 'hidden',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {card.imgSrc
                  ? <img src={card.imgSrc} alt={card.title} style={{ width: '30px', height: '36px', objectFit: 'contain' }} />
                  : <span style={{ lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</span>
                }
              </div>

              {/* Title */}
              <h2 style={{
                fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: '32px',
                color: card.dark ? '#FFFFFF' : '#0F172B',
              }}>
                {card.title}
              </h2>

              {/* Description */}
              <p style={{
                fontSize: '14px', margin: 0, lineHeight: '22.75px',
                color: card.dark ? '#BEDBFF' : '#4A5565',
                flex: 1,
              }}>
                {card.desc}
              </p>

              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: card.badgeBg,
                borderRadius: '999px',
                padding: '6px 16px',
                alignSelf: 'flex-start',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: card.badgeColor, lineHeight: '16px' }}>
                  {card.badge}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Streak Card ── */}
        <div style={{
          borderRadius: '32px',
          background: '#FFFFFF',
          boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1)',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fire-emoji.png" alt="streak" style={{ width: '52px', height: '52px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172B', margin: 0, lineHeight: '28px' }}>
              {streak
                ? `${streak.days}-day streak — you're in the top ${streak.percentile}%!`
                : "12-day streak — you're in the top 18%!"}
            </h3>
            <p style={{ fontSize: '16px', color: '#364153', margin: 0, lineHeight: '26px' }}>
              {streak?.message || (
                <>
                  Come back tomorrow to extend your streak.{' '}
                  <strong style={{ fontWeight: 600 }}>Consistent practice</strong>{' '}
                  is the biggest predictor of clearing Prelims. See you tomorrow!
                </>
              )}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function NextStepsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTopColor: '#0F172B',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '16px', color: '#6B7280' }}>Loading...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <NextStepsInner />
    </Suspense>
  );
}
