'use client';

import React, { useState, useEffect } from 'react';
import { pricingService } from '@/lib/services';
import PurchaseModal from '@/components/PurchaseModal';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const heroPills = [
  { label: 'End-to-End Guidance', emoji: '✅' },
  { label: 'WhatsApp Access', emoji: '💬' },
  { label: 'Personalized Strategy', emoji: '🎯' },
  { label: "Mentees' Sample Plans", emoji: '👥' },
  { label: 'Limited Seats', emoji: '🔒' },
];

const heroStats = [
  { value: '94K+', label: 'Community' },
  { value: '400+', label: 'Mentees' },
  { value: '4.9', label: 'Rating' },
  { value: 'Free', label: 'First Call', highlight: true },
];

const mentorTags = [
  { label: '✦ Solo Mentor', gold: true },
  { label: 'UPSC Strategy' },
  { label: 'Answer Writing' },
  { label: 'Interview Prep' },
  { label: 'Mains GS I–IV' },
];

const mentorStats = [
  { value: '94K+', label: 'FOLLOWERS' },
  { value: '280+', label: 'FREE PDFS' },
  { value: '3 yrs', label: 'TEACHING' },
];

const PLAN_EMOJIS = ['🚀', '🔥', '🏆'];
const PLAN_STYLES = [
  { tagColor: '#155DFC', tagBg: '#DBEAFE', ctaStyle: 'dark' as const },
  { tagColor: '#C68A0B', tagBg: '#FEF3C7', ctaStyle: 'gold' as const },
  { tagColor: '#155DFC', tagBg: '#DBEAFE', ctaStyle: 'dark' as const },
];

function transformPlan(plan: any, index: number) {
  const style = PLAN_STYLES[index] ?? PLAN_STYLES[0];
  const priceNum = Number(plan.price);
  return {
    name: plan.name,
    emoji: PLAN_EMOJIS[index] ?? '✨',
    subtitle: plan.duration,
    price: `₹${priceNum.toLocaleString('en-IN')}`,
    period: '/per month',
    tagColor: plan.isPopular ? '#C68A0B' : style.tagColor,
    tagBg: plan.isPopular ? '#FEF3C7' : style.tagBg,
    tags: (plan.features ?? []).slice(0, 3),
    features: (plan.features ?? []).map((f: string) => ({ text: f, subtext: null, badge: null })),
    cta: `Get Started → ₹${priceNum.toLocaleString('en-IN')} →`,
    ctaStyle: plan.isPopular ? 'gold' as const : style.ctaStyle,
    highlight: plan.isPopular ?? false,
    note: null,
  };
}

const whyFeatures = [
  {
    emoji: '🗺️',
    title: 'A Real Roadmap',
    description: 'Not a generic PDF — a living plan built around your weak areas, your schedule, and your target year.',
  },
  {
    emoji: '✍️',
    title: 'Answer Writing That Improves',
    description: 'Get line-by-line feedback on your Mains answers from someone who knows what examiners look for.',
  },
  {
    emoji: '🎤',
    title: 'Interview Stage Support',
    description: 'Mock interviews, DAF analysis, and confidence-building — so you walk in ready, not nervous.',
  },
  {
    emoji: '💬',
    title: 'No Question Too Small',
    description: 'WhatsApp access means you never stay stuck. Ask about sources, schedules, or strategy anytime.',
  },
  {
    emoji: '📊',
    title: 'Accountability That Works',
    description: 'Weekly check-ins, monthly reviews, and honest progress tracking that keeps you on course.',
  },
  {
    emoji: '🔍',
    title: 'Someone Spots Your Gaps',
    description: 'A mentor who reads your answers and watches your pattern catches blind spots you can\'t see yourself.',
  },
];

const TESTIMONIAL_COLORS = ['#155DFC', '#C68A0B', '#16A34A', '#8B5CF6', '#EF4444'];

function transformTestimonial(t: any, index: number) {
  const initials = t.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  return {
    initials,
    name: t.name,
    credential: t.title,
    quote: t.content,
    color: TESTIMONIAL_COLORS[index % TESTIMONIAL_COLORS.length],
  };
}

const faqItems = [
  {
    question: 'How is this different from just watching Jeet Sir on YouTube?',
    answer: 'YouTube gives you the "what" — mentorship gives you the "how, when, and why for YOU." In 1-on-1 sessions, we analyze your specific weak areas, build a personalized roadmap around your schedule, and adjust it every week based on your progress. YouTube is a broadcast; mentorship is a conversation.',
  },
  {
    question: '₹12,999 is a lot. How do I know it\'s worth it?',
    answer: 'Most aspirants spend ₹1–2 lakh on coaching that treats everyone the same. Here, every rupee goes toward strategy built for your stage — whether you\'re 6 months or 18 months from the exam. Plus, the free discovery call lets you experience the approach before committing a single rupee.',
  },
  {
    question: 'What if I don\'t clear even with mentorship?',
    answer: 'No one can guarantee a rank — and anyone who does is lying. What mentorship guarantees is that you\'ll prepare smarter, waste less time, and give your best attempt. Many of our mentees say the biggest value was clarity and confidence, even beyond the result.',
  },
  {
    question: 'I\'m a working professional with 2–3 hours a day. Is this realistic for me?',
    answer: 'Absolutely — in fact, that\'s where mentorship shines most. We\'ll build a plan that fits your 2–3 hour window, prioritize high-yield topics, and cut the noise so you\'re studying what actually matters for your target year. Several of our working-professional mentees have cleared Prelims on their first attempt.',
  },
  {
    question: 'Is the free discovery call actually free with no catch?',
    answer: 'Yes, 100%. It\'s a 20-minute call where we understand your background, your target, and your current preparation. You\'ll walk away with a rough strategy outline whether you join or not. There\'s no hard sell — if it\'s not a fit, we\'ll tell you honestly.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FreeTrialPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  /* ---- API-backed state ---- */
  const [apiPlans, setApiPlans] = useState<any[] | null>(null);
  const [apiTestimonials, setApiTestimonials] = useState<any[] | null>(null);

  /* ---- Booking modal state ---- */
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  /* ---- Dynamic seats left ---- */
  const [seatsLeft, setSeatsLeft] = useState(4);
  useEffect(() => {
    // Simulate slowly decreasing seats; in production this should come from API
    const stored = localStorage.getItem('mentorshipSeatsLeft');
    const storedTime = localStorage.getItem('mentorshipSeatsTime');
    const now = Date.now();
    if (stored && storedTime) {
      const elapsed = now - parseInt(storedTime, 10);
      const hoursPassed = Math.floor(elapsed / (1000 * 60 * 60));
      const decrease = Math.min(hoursPassed, 4); // decrease by up to 4 over time
      const base = Math.max(1, parseInt(stored, 10) - decrease);
      setSeatsLeft(base);
    } else {
      const initial = 4;
      localStorage.setItem('mentorshipSeatsLeft', String(initial));
      localStorage.setItem('mentorshipSeatsTime', String(now));
      setSeatsLeft(initial);
    }
  }, []);

  /* ---- Fetch plans & testimonials on mount ---- */
  useEffect(() => {
    pricingService.getPlans()
      .then((res: any) => {
        const plans = res?.data ?? [];
        setApiPlans(Array.isArray(plans) ? plans : []);
      })
      .catch(() => setApiPlans([]));

    pricingService.getTestimonials()
      .then((res: any) => {
        const items = res?.data ?? [];
        setApiTestimonials(Array.isArray(items) ? items : []);
      })
      .catch(() => setApiTestimonials([]));
  }, []);

  /* ---- Booking handler ---- */
  const handleBookCall = async () => {
    if (!bookingName.trim() || !bookingEmail.trim()) {
      setBookingError('Please provide your name and email.');
      return;
    }
    setBookingSubmitting(true);
    setBookingError('');
    try {
      await pricingService.bookCall({
        name: bookingName.trim(),
        email: bookingEmail.trim(),
        phone: bookingPhone.trim() || undefined,
        message: bookingMessage.trim() || undefined,
      });
      setBookingSuccess(true);
    } catch (err: any) {
      setBookingError(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const displayPlans = (apiPlans ?? []).map(transformPlan);
  const displayTestimonials = (apiTestimonials ?? []).map(transformTestimonial);

  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    plan: any;
  }>({ open: false, plan: null });

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: 'clamp(960px, 75vw, 1200px)',
          margin: '0 auto',
          padding: 'clamp(32px, 4vw, 60px) clamp(16px, 2vw, 30px)',
        }}
      >

        {/* ================================================================ */}
        {/*  SECTION 1: HERO                                                  */}
        {/* ================================================================ */}
        <section style={{ textAlign: 'center', marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          {/* Gold label */}
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(198, 138, 11, 0.08)',
              border: '1px solid rgba(198, 138, 11, 0.25)',
              borderRadius: '26843500px',
              padding: 'clamp(6px, 0.5vw, 8px) clamp(14px, 1.2vw, 20px)',
              fontSize: 'clamp(10px, 0.8vw, 12px)',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#C68A0B',
              textTransform: 'uppercase' as const,
              marginBottom: 'clamp(16px, 1.5vw, 24px)',
            }}
            className="font-arimo"
          >
            ⚡ JEET · PERSONALIZED MENTORSHIP
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(32px, 3.5vw, 52px)',
              fontWeight: 700,
              color: '#101828',
              lineHeight: 1.15,
              marginBottom: 'clamp(16px, 1.5vw, 24px)',
            }}
            className="font-arimo"
          >
            The guidance that turns<br />
            <span className="font-tinos italic" style={{ color: '#C68A0B' }}>aspirants</span>{' '}
            into officers.
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 'clamp(15px, 1.1vw, 18px)',
              color: '#4A5565',
              lineHeight: 1.7,
              maxWidth: '560px',
              margin: '0 auto',
              marginBottom: 'clamp(24px, 2vw, 36px)',
            }}
            className="font-arimo"
          >
            1-on-1 sessions for 3–12 months — tailored to your stage &amp; your timeline.<br />
            Mentored by Jeet Singh.
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              justifyContent: 'center',
              gap: 'clamp(8px, 0.7vw, 12px)',
              marginBottom: 'clamp(28px, 2.5vw, 40px)',
            }}
          >
            {heroPills.map((pill) => (
              <div
                key={pill.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '26843500px',
                  padding: 'clamp(8px, 0.6vw, 10px) clamp(14px, 1vw, 18px)',
                  fontSize: 'clamp(12px, 0.85vw, 14px)',
                  fontWeight: 500,
                  color: '#374151',
                }}
                className="font-arimo"
              >
                <span>{pill.emoji}</span> {pill.label}
              </div>
            ))}
          </div>

          {/* Stats card */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'clamp(20px, 2.5vw, 40px)',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '16px',
              padding: 'clamp(16px, 1.5vw, 24px) clamp(24px, 2.5vw, 40px)',
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.06)',
              flexWrap: 'wrap' as const,
              justifyContent: 'center',
            }}
          >
            {heroStats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && (
                  <div style={{ width: '1px', height: '32px', background: '#E5E7EB' }} />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 'clamp(20px, 1.6vw, 26px)',
                      fontWeight: 700,
                      color: stat.highlight ? '#C68A0B' : '#101828',
                    }}
                    className="font-arimo"
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(11px, 0.75vw, 13px)',
                      color: '#6A7282',
                      fontWeight: 500,
                      marginTop: '2px',
                    }}
                    className="font-arimo"
                  >
                    {stat.label}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 2: JEET SIR MENTOR CARD                                  */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #162456 0%, #0F172B 50%, #030712 100%)',
              borderRadius: '24px',
              padding: 'clamp(28px, 3vw, 44px)',
              color: '#FFFFFF',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap' as const,
                gap: 'clamp(20px, 2vw, 32px)',
                marginBottom: 'clamp(24px, 2vw, 36px)',
              }}
            >
              {/* Left: Avatar + info */}
              <div style={{ flex: '1 1 400px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1vw, 16px)', marginBottom: 'clamp(12px, 1vw, 16px)' }}>
                  {/* Yellow "J" avatar */}
                  <div
                    style={{
                      width: 'clamp(48px, 3.5vw, 56px)',
                      height: 'clamp(48px, 3.5vw, 56px)',
                      background: '#FDC700',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(22px, 1.8vw, 28px)',
                      fontWeight: 700,
                      color: '#101828',
                    }}
                    className="font-arimo"
                  >
                    J
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 'clamp(20px, 1.6vw, 26px)',
                        fontWeight: 700,
                      }}
                      className="font-arimo"
                    >
                      Jeet Sir
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(13px, 0.9vw, 15px)',
                        color: '#94A3B8',
                        marginTop: '2px',
                      }}
                      className="font-arimo"
                    >
                      UPSC Educator · YouTuber · Mentor
                    </div>
                  </div>
                </div>

                {/* Skill tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 'clamp(6px, 0.5vw, 8px)' }}>
                  {mentorTags.map((tag) => (
                    <span
                      key={tag.label}
                      style={{
                        display: 'inline-block',
                        padding: 'clamp(5px, 0.4vw, 7px) clamp(10px, 0.8vw, 14px)',
                        borderRadius: '26843500px',
                        fontSize: 'clamp(11px, 0.75vw, 13px)',
                        fontWeight: 600,
                        ...(tag.gold
                          ? { background: 'rgba(253, 199, 0, 0.15)', color: '#FDC700', border: '1px solid rgba(253, 199, 0, 0.3)' }
                          : { background: 'transparent', color: '#94A3B8', border: '1px solid #4A5565' }),
                      }}
                      className="font-arimo"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Stats panel */}
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: 'clamp(16px, 1.5vw, 24px) clamp(20px, 2vw, 32px)',
                  display: 'flex',
                  gap: 'clamp(20px, 2.5vw, 40px)',
                  flexWrap: 'wrap' as const,
                }}
              >
                {mentorStats.map((stat, i) => (
                  <React.Fragment key={stat.label}>
                    {i > 0 && (
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 'clamp(20px, 1.6vw, 26px)',
                          fontWeight: 700,
                          color: '#C68A0B',
                        }}
                        className="font-arimo"
                      >
                        {stat.value}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(10px, 0.7vw, 12px)',
                          fontWeight: 600,
                          letterSpacing: '1px',
                          color: '#94A3B8',
                          marginTop: '4px',
                        }}
                        className="font-arimo"
                      >
                        {stat.label}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Bottom bar */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: 'clamp(12px, 1vw, 16px) clamp(16px, 1.5vw, 24px)',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap' as const,
                gap: 'clamp(12px, 1vw, 16px)',
              }}
            >
              {/* Green dot + text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 'clamp(12px, 0.85vw, 14px)',
                    color: '#FFFFFF',
                    fontWeight: 500,
                  }}
                  className="font-arimo"
                >
                  Accepting mentees · Limited seats for June 2025 batch
                </span>
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 'clamp(6px, 0.5vw, 8px)' }}>
                <span
                  style={{
                    padding: 'clamp(4px, 0.3vw, 6px) clamp(10px, 0.8vw, 14px)',
                    borderRadius: '26843500px',
                    fontSize: 'clamp(11px, 0.7vw, 12px)',
                    fontWeight: 600,
                    color: '#FDC700',
                    border: '1px solid rgba(253, 199, 0, 0.3)',
                  }}
                  className="font-arimo"
                >
                  ✦ Only {seatsLeft} seats left
                </span>
                <span
                  style={{
                    padding: 'clamp(4px, 0.3vw, 6px) clamp(10px, 0.8vw, 14px)',
                    borderRadius: '26843500px',
                    fontSize: 'clamp(11px, 0.7vw, 12px)',
                    fontWeight: 500,
                    color: '#94A3B8',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  className="font-arimo"
                >
                  Next batch: June 1
                </span>
                <span
                  style={{
                    padding: 'clamp(4px, 0.3vw, 6px) clamp(10px, 0.8vw, 14px)',
                    borderRadius: '26843500px',
                    fontSize: 'clamp(11px, 0.7vw, 12px)',
                    fontWeight: 500,
                    color: '#94A3B8',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  className="font-arimo"
                >
                  Sat &amp; Sun sessions
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 3: PRICING                                               */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          {/* Label */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(12px, 1vw, 16px)',
              fontSize: 'clamp(10px, 0.8vw, 12px)',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#C68A0B',
              textTransform: 'uppercase' as const,
            }}
            className="font-arimo"
          >
            🏆 CHOOSE YOUR PLAN
          </div>

          {/* Heading */}
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(26px, 2.8vw, 40px)',
              fontWeight: 700,
              color: '#101828',
              marginBottom: 'clamp(10px, 0.8vw, 14px)',
            }}
            className="font-arimo"
          >
            One program. Your entire journey.
          </h2>

          {/* Subheading */}
          <p
            style={{
              textAlign: 'center',
              fontSize: 'clamp(14px, 1vw, 16px)',
              color: '#6A7282',
              lineHeight: 1.6,
              marginBottom: 'clamp(32px, 3vw, 48px)',
            }}
            className="font-arimo"
          >
            Pick the plan that matches your stage — or book a free call and let Jeet Sir recommend the right fit.
          </p>

          {/* 3-col flex */}
          {apiPlans === null ? (
            <div style={{ display: 'flex', gap: 'clamp(16px, 1.5vw, 24px)', justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ flex: '1 1 280px', height: '480px', background: '#F3F4F6', borderRadius: '24px', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : displayPlans.length === 0 ? (
            <p className="font-arimo text-center text-[#6B7280] py-12">No pricing plans available yet.</p>
          ) : (
          <div
            style={{
              display: 'flex',
              gap: 'clamp(16px, 1.5vw, 24px)',
              justifyContent: 'center',
              alignItems: 'stretch',
            }}
          >
            {displayPlans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 'clamp(20px, 1.8vw, 24px)',
                  border: plan.highlight ? '1.6px solid #C68A0B' : '1.6px solid #E5E7EB',
                  padding: 'clamp(20px, 1.8vw, 28px)',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  flex: '1 1 clamp(280px, 25.6vw, 342px)',
                  boxShadow: plan.highlight
                    ? '0px 8px 10px -6px #FFEDD4, 0px 20px 25px -5px #FFEDD4'
                    : '0px 1px 3px 0px rgba(0,0,0,0.06)',
                  position: 'relative' as const,
                }}
              >
                {/* Emoji */}
                <div
                  style={{
                    fontSize: 'clamp(24px, 1.8vw, 30px)',
                    marginBottom: 'clamp(8px, 0.6vw, 10px)',
                  }}
                >
                  {plan.emoji}
                </div>

                {/* Plan name */}
                <div
                  style={{
                    fontSize: 'clamp(18px, 1.4vw, 22px)',
                    fontWeight: 700,
                    color: '#101828',
                    marginBottom: 'clamp(2px, 0.2vw, 4px)',
                  }}
                  className="font-arimo"
                >
                  {plan.name}
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontSize: 'clamp(12px, 0.85vw, 14px)',
                    color: '#6A7282',
                    marginBottom: 'clamp(14px, 1.2vw, 20px)',
                  }}
                  className="font-arimo"
                >
                  {plan.subtitle}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 'clamp(16px, 1.2vw, 20px)' }}>
                  <span
                    style={{
                      fontSize: 'clamp(28px, 2.2vw, 36px)',
                      fontWeight: 700,
                      color: '#101828',
                    }}
                    className="font-arimo"
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(13px, 0.9vw, 15px)',
                      color: '#6A7282',
                      fontWeight: 500,
                      marginLeft: '4px',
                    }}
                    className="font-arimo"
                  >
                    {plan.period}
                  </span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: 'clamp(18px, 1.4vw, 24px)' }}>
                  {plan.tags.map((tag: string) => (
                    <span
                      key={tag}
                      style={{
                        padding: 'clamp(3px, 0.25vw, 5px) clamp(8px, 0.7vw, 12px)',
                        borderRadius: '26843500px',
                        fontSize: 'clamp(10px, 0.7vw, 12px)',
                        fontWeight: 600,
                        color: plan.tagColor,
                        background: plan.tagBg,
                      }}
                      className="font-arimo"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: '#E5E7EB', marginBottom: 'clamp(18px, 1.4vw, 24px)' }} />

                {/* Features */}
                <div style={{ flex: 1, marginBottom: 'clamp(20px, 1.5vw, 28px)' }}>
                  {plan.features.map((feat: any) => (
                    <div
                      key={feat.text}
                      style={{
                        marginBottom: 'clamp(12px, 1vw, 16px)',
                      }}
                      className="font-arimo"
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: 'clamp(13px, 0.9vw, 15px)',
                          color: '#374151',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span style={{ flex: 1 }}>{feat.text}</span>
                        {feat.badge && (
                          <span
                            style={{
                              padding: '1px 8px',
                              borderRadius: '26843500px',
                              fontSize: 'clamp(9px, 0.6vw, 10px)',
                              fontWeight: 700,
                              color: plan.tagColor,
                              background: plan.tagBg,
                              whiteSpace: 'nowrap' as const,
                              flexShrink: 0,
                            }}
                          >
                            {feat.badge}
                          </span>
                        )}
                      </div>
                      {feat.subtext && (
                        <div
                          style={{
                            fontSize: 'clamp(11px, 0.75vw, 12px)',
                            color: '#9CA3AF',
                            marginLeft: 'calc(8px + clamp(13px, 0.9vw, 15px))',
                            marginTop: '2px',
                          }}
                        >
                          {feat.subtext}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => setPurchaseModal({ open: true, plan })}
                  style={{
                    width: '100%',
                    padding: 'clamp(12px, 1vw, 16px)',
                    borderRadius: 'clamp(10px, 0.9vw, 12px)',
                    border: 'none',
                    fontSize: 'clamp(14px, 1vw, 16px)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    ...(plan.ctaStyle === 'gold'
                      ? { background: '#FDC700', color: '#101828' }
                      : { background: '#101828', color: '#FFFFFF' }),
                  }}
                  className="font-arimo"
                >
                  {plan.cta}
                </button>

                {/* Note */}
                {plan.note && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 'clamp(11px, 0.7vw, 12px)',
                      color: plan.highlight ? '#C68A0B' : '#155DFC',
                      marginTop: 'clamp(8px, 0.6vw, 12px)',
                      fontWeight: 500,
                    }}
                    className="font-arimo"
                  >
                    {plan.note}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}

          {/* Below pricing: links */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 'clamp(24px, 2vw, 36px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: 'clamp(12px, 1.5vw, 24px)',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(13px, 0.9vw, 15px)',
                color: '#6A7282',
              }}
              className="font-arimo"
            >
              Still deciding?
            </span>
            <button
              style={{
                padding: 'clamp(8px, 0.6vw, 10px) clamp(16px, 1.2vw, 22px)',
                borderRadius: '10px',
                border: 'none',
                background: '#101828',
                color: '#FFFFFF',
                fontSize: 'clamp(13px, 0.9vw, 15px)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              className="font-arimo"
            >
              Compare All Plans →
            </button>
            <button
              onClick={() => { setBookingSuccess(false); setBookingError(''); setShowBookingModal(true); }}
              style={{
                padding: 'clamp(8px, 0.6vw, 10px) clamp(16px, 1.2vw, 22px)',
                borderRadius: '10px',
                border: '1.5px solid #C68A0B',
                background: 'transparent',
                color: '#C68A0B',
                fontSize: 'clamp(13px, 0.9vw, 15px)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              className="font-arimo"
            >
              🤙 Free Discovery Call
            </button>
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 4: WHY MENTORSHIP WORKS + FEATURE CARDS                  */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          {/* Dark banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #162456 0%, #0F172B 50%, #030712 100%)',
              borderRadius: '24px',
              padding: 'clamp(28px, 3vw, 44px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: 'clamp(20px, 2vw, 32px)',
              marginBottom: 'clamp(28px, 2.5vw, 40px)',
            }}
          >
            <div style={{ flex: '1 1 500px' }}>
              {/* Gold label */}
              <div
                style={{
                  fontSize: 'clamp(10px, 0.8vw, 12px)',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  color: '#C68A0B',
                  textTransform: 'uppercase' as const,
                  marginBottom: 'clamp(12px, 1vw, 16px)',
                }}
                className="font-arimo"
              >
                ★ WHY{' '}
                <span style={{ background: '#C68A0B', color: '#0F172B', padding: '1px 5px', borderRadius: '3px' }}>MENTORSHIP</span>
                {' '}WORKS
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontSize: 'clamp(24px, 2.4vw, 36px)',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1.25,
                  marginBottom: 'clamp(12px, 1vw, 16px)',
                }}
                className="font-arimo"
              >
                A coach who knows you<br />beats a{' '}
                <span style={{ color: '#C68A0B' }}>
                  course that doesn&apos;t.
                </span>
              </h2>

              {/* Description */}
              <p
                style={{
                  fontSize: 'clamp(14px, 1vw, 16px)',
                  color: '#94A3B8',
                  lineHeight: 1.7,
                  maxWidth: '480px',
                }}
                className="font-arimo"
              >
                UPSC prep is personal. Jeet Sir&apos;s{' '}
                <span style={{ background: '#C68A0B', color: '#0F172B', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>mentorship</span>
                {' '}is built around you — not a batch schedule.
              </p>
            </div>

            {/* Right side: large 1-on-1 text */}
            <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
              <div
                style={{
                  fontSize: 'clamp(48px, 5vw, 72px)',
                  fontWeight: 700,
                  color: '#C68A0B',
                  lineHeight: 1,
                }}
                className="font-arimo"
              >
                1-on-1
              </div>
              <div
                style={{
                  fontSize: 'clamp(13px, 0.9vw, 15px)',
                  color: '#94A3B8',
                  fontWeight: 500,
                  marginTop: '8px',
                }}
                className="font-arimo"
              >
                Utterly personal.<br />Never generic.
              </div>
            </div>
          </div>

          {/* 6 feature cards (3x2 grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'clamp(16px, 1.5vw, 24px)',
            }}
          >
            {whyFeatures.map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '0.8px solid #E5E7EB',
                  padding: 'clamp(20px, 1.8vw, 28px)',
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(28px, 2.2vw, 36px)',
                    marginBottom: 'clamp(10px, 0.8vw, 14px)',
                  }}
                >
                  {feat.emoji}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(15px, 1.1vw, 18px)',
                    fontWeight: 700,
                    color: '#101828',
                    marginBottom: 'clamp(6px, 0.5vw, 8px)',
                  }}
                  className="font-arimo"
                >
                  {feat.title}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(13px, 0.85vw, 14px)',
                    color: '#4A5565',
                    lineHeight: 1.65,
                  }}
                  className="font-arimo"
                >
                  {feat.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 5: TESTIMONIALS                                          */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 2.5vw, 40px)' }}>
            <h2
              style={{
                fontSize: 'clamp(26px, 2.8vw, 40px)',
                fontWeight: 700,
                color: '#101828',
                marginBottom: 'clamp(6px, 0.5vw, 8px)',
              }}
              className="font-arimo"
            >
              What UPSC Aspirants Say
            </h2>
            <p
              style={{
                fontSize: 'clamp(14px, 1vw, 16px)',
                color: '#6A7282',
              }}
              className="font-arimo"
            >
              From Jeet Sir&apos;s Mentees
            </p>
          </div>

          {/* 3-col grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'clamp(16px, 1.5vw, 24px)',
            }}
          >
            {displayTestimonials.map((t) => (
              <div
                key={t.initials}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '0.8px solid #E5E7EB',
                  padding: 'clamp(24px, 2vw, 32px)',
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column' as const,
                }}
              >
                {/* 5 gold stars */}
                <div style={{ fontSize: 'clamp(14px, 1vw, 18px)', marginBottom: 'clamp(12px, 1vw, 16px)' }}>
                  {'★'.repeat(5).split('').map((s, i) => (
                    <span key={i} style={{ color: '#FDC700' }}>{s}</span>
                  ))}
                </div>

                {/* Quote */}
                <p
                  style={{
                    fontSize: 'clamp(13px, 0.9vw, 15px)',
                    color: '#374151',
                    lineHeight: 1.7,
                    fontStyle: 'italic',
                    flex: 1,
                    marginBottom: 'clamp(16px, 1.5vw, 24px)',
                  }}
                  className="font-arimo"
                >
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 0.8vw, 12px)' }}>
                  <div
                    style={{
                      width: 'clamp(36px, 2.8vw, 44px)',
                      height: 'clamp(36px, 2.8vw, 44px)',
                      borderRadius: '50%',
                      background: t.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(12px, 0.9vw, 14px)',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                    className="font-arimo"
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 'clamp(13px, 0.9vw, 15px)',
                        fontWeight: 600,
                        color: '#101828',
                      }}
                      className="font-arimo"
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(11px, 0.75vw, 13px)',
                        color: '#6A7282',
                      }}
                      className="font-arimo"
                    >
                      {t.credential}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 6: CTA BANNER                                            */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #FF8904 0%, #FFAA30 100%)',
              borderRadius: '24px',
              padding: 'clamp(28px, 3vw, 44px) clamp(32px, 3.5vw, 52px)',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative' as const,
            }}
          >
            {/* Left content */}
            <div style={{ flex: '1 1 400px', position: 'relative' as const, zIndex: 1 }}>
              <h2
                style={{
                  fontSize: 'clamp(22px, 2.2vw, 32px)',
                  fontWeight: 700,
                  color: '#101828',
                  lineHeight: 1.25,
                  marginBottom: 'clamp(10px, 0.8vw, 14px)',
                }}
                className="font-arimo"
              >
                Limited seats. Real results.<br />
                Start with a free call.
              </h2>

              {/* Description */}
              <p
                style={{
                  fontSize: 'clamp(13px, 0.9vw, 15px)',
                  color: '#1C1C1C',
                  lineHeight: 1.6,
                  marginBottom: 'clamp(16px, 1.5vw, 24px)',
                  maxWidth: '420px',
                }}
                className="font-arimo"
              >
                Book a free 15-minute discovery call with Jeet Sir — no pressure, no sales pitch.
                Just an honest conversation about your prep and what you actually need.
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 'clamp(8px, 0.8vw, 12px)' }}>
                <button
                  onClick={() => { setBookingSuccess(false); setBookingError(''); setShowBookingModal(true); }}
                  style={{
                    padding: 'clamp(12px, 1vw, 16px) clamp(20px, 1.8vw, 28px)',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#101828',
                    color: '#FFFFFF',
                    fontSize: 'clamp(14px, 1vw, 16px)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  className="font-arimo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.81-1.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Book Free Discovery Call
                </button>
                <button
                  style={{
                    padding: 'clamp(12px, 1vw, 16px) clamp(20px, 1.8vw, 28px)',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#101828',
                    fontSize: 'clamp(14px, 1vw, 16px)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  className="font-arimo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
                  Watch on YouTube First
                </button>
              </div>
            </div>

            {/* Decorative circles — absolutely positioned on the right */}
            <div
              style={{
                position: 'absolute' as const,
                right: '-40px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '260px',
                height: '260px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.18)',
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: 'absolute' as const,
                right: '60px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.13)',
                zIndex: 0,
              }}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/*  SECTION 7: FAQ                                                   */}
        {/* ================================================================ */}
        <section style={{ marginBottom: 'clamp(48px, 5vw, 80px)' }}>
          {/* Label */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 'clamp(10px, 0.8vw, 12px)',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#C68A0B',
              textTransform: 'uppercase' as const,
              marginBottom: 'clamp(8px, 0.6vw, 12px)',
            }}
            className="font-arimo"
          >
            BEFORE YOU DECIDE
          </div>

          {/* Heading */}
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(26px, 2.8vw, 40px)',
              fontWeight: 700,
              color: '#101828',
              marginBottom: 'clamp(32px, 3vw, 48px)',
            }}
            className="font-arimo"
          >
            The questions you&apos;re actually thinking
          </h2>

          {/* Accordion */}
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 'clamp(10px, 0.8vw, 14px)',
            }}
          >
            {faqItems.map((item, index) => (
              <div
                key={index}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '0.8px solid #E5E7EB',
                  overflow: 'hidden',
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.04)',
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  style={{
                    width: '100%',
                    padding: 'clamp(16px, 1.3vw, 22px) clamp(20px, 1.8vw, 28px)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left' as const,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(14px, 1vw, 16px)',
                      fontWeight: 600,
                      color: '#101828',
                      lineHeight: 1.5,
                    }}
                    className="font-arimo"
                  >
                    {item.question}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(18px, 1.3vw, 22px)',
                      color: '#6A7282',
                      flexShrink: 0,
                      transform: expandedFaq === index ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                </button>

                {/* Answer */}
                {expandedFaq === index && (
                  <div
                    style={{
                      padding: '0 clamp(20px, 1.8vw, 28px) clamp(16px, 1.3vw, 22px)',
                      fontSize: 'clamp(13px, 0.9vw, 15px)',
                      color: '#4A5565',
                      lineHeight: 1.75,
                    }}
                    className="font-arimo"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ================================================================ */}
      {/*  BOOKING MODAL                                                    */}
      {/* ================================================================ */}
      {showBookingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowBookingModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: 'clamp(28px, 3vw, 40px)',
              width: '100%',
              maxWidth: '460px',
              margin: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowBookingModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#6A7282',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {bookingSuccess ? (
              /* ---- Success state ---- */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3
                  style={{ fontSize: '22px', fontWeight: 700, color: '#101828', marginBottom: '8px' }}
                  className="font-arimo"
                >
                  Call Booked!
                </h3>
                <p
                  style={{ fontSize: '15px', color: '#4A5565', lineHeight: 1.6, marginBottom: '24px' }}
                  className="font-arimo"
                >
                  We&apos;ll reach out to you shortly to confirm your free discovery call with Jeet Sir.
                </p>
                <button
                  onClick={() => setShowBookingModal(false)}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#101828',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  className="font-arimo"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ---- Form state ---- */
              <>
                <h3
                  style={{
                    fontSize: 'clamp(20px, 1.6vw, 24px)',
                    fontWeight: 700,
                    color: '#101828',
                    marginBottom: '4px',
                  }}
                  className="font-arimo"
                >
                  🤙 Book Your Free Discovery Call
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#6A7282',
                    marginBottom: 'clamp(20px, 2vw, 28px)',
                    lineHeight: 1.5,
                  }}
                  className="font-arimo"
                >
                  20-minute call with Jeet Sir — no commitment, no hard sell.
                </p>

                {/* Name */}
                <label
                  style={{ display: 'block', marginBottom: '14px' }}
                  className="font-arimo"
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  <input
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="e.g. Priya Rajan"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#101828',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {/* Email */}
                <label
                  style={{ display: 'block', marginBottom: '14px' }}
                  className="font-arimo"
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Email <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  <input
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    placeholder="e.g. priya@gmail.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#101828',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {/* Phone (optional) */}
                <label
                  style={{ display: 'block', marginBottom: '14px' }}
                  className="font-arimo"
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Phone <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
                  </span>
                  <input
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setBookingPhone(val);
                    }}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#101828',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                {/* Message (optional) */}
                <label
                  style={{ display: 'block', marginBottom: '20px' }}
                  className="font-arimo"
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Message <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
                  </span>
                  <textarea
                    value={bookingMessage}
                    onChange={(e) => setBookingMessage(e.target.value)}
                    placeholder="Any specific questions or your current preparation stage..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#101828',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </label>

                {/* Error message */}
                {bookingError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#DC2626',
                      marginBottom: '16px',
                    }}
                    className="font-arimo"
                  >
                    {bookingError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleBookCall}
                  disabled={bookingSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: bookingSubmitting ? '#9CA3AF' : '#101828',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: bookingSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  className="font-arimo"
                >
                  {bookingSubmitting ? 'Booking...' : 'Book Free Call'}
                </button>

                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9CA3AF',
                    marginTop: '12px',
                  }}
                  className="font-arimo"
                >
                  100% free · No commitment · We&apos;ll confirm via email
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <PurchaseModal
        open={purchaseModal.open}
        onClose={() => setPurchaseModal({ open: false, plan: null })}
        itemType="plan"
        itemId={purchaseModal.plan?.name || ''}
        itemName={purchaseModal.plan?.name || ''}
        amount={Number(purchaseModal.plan?.price?.replace?.(/[^0-9]/g, '')) || 0}
      />
    </div>
  );
}
