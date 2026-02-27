'use client';

import { useRouter } from 'next/navigation';

const cards = [
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

export default function NextStepsPage() {
  const router = useRouter();

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
            Great session!
          </h1>
          <p style={{ fontSize: '18px', color: '#BEDBFF', margin: 0, textAlign: 'center', lineHeight: '28px', whiteSpace: 'nowrap' }}>
            You&apos;ve completed today&apos;s practice. Here&apos;s what the best aspirants do next to keep climbing.
          </p>
        </div>

        {/* ── 2×2 Option Cards ── */}
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
                {(card as { imgSrc?: string }).imgSrc
                  ? <img src={(card as { imgSrc?: string }).imgSrc} alt={card.title} style={{ width: '30px', height: '36px', objectFit: 'contain' }} />
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
              12-day streak — you&apos;re in the top 18%!
            </h3>
            <p style={{ fontSize: '16px', color: '#364153', margin: 0, lineHeight: '26px' }}>
              Come back tomorrow to extend your streak.{' '}
              <strong style={{ fontWeight: 600 }}>Consistent practice</strong>{' '}
              is the biggest predictor of clearing Prelims. See you tomorrow!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
