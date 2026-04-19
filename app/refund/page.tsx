'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const sections = [
  { id: 'our-approach', num: '01', label: 'Our Approach' },
  { id: 'cancellations', num: '02', label: 'Cancellations' },
  { id: 'within-7-days', num: '03', label: 'Within 7 Days' },
  { id: 'after-7-days', num: '04', label: 'After 7 Days' },
  { id: 'how-to-request', num: '05', label: 'How to Request' },
  { id: 'mentorship', num: '06', label: 'Mentorship' },
  { id: 'contact', num: '07', label: 'Contact Us' },
];

const cancellationItems = [
  {
    title: 'How to cancel:',
    body: 'Go to Account Settings, then Billing, and select Cancel Plan. The process takes less than a minute.',
  },
  {
    title: 'What happens after cancellation:',
    body: 'Your access to paid features continues until the end of your current billing period. After that, your account moves to the free Starter plan and you keep your study data and streak history.',
  },
  {
    title: 'No cancellation fees:',
    body: 'There is no penalty or fee for cancelling at any time.',
  },
];

const within7Items = [
  {
    title: 'Full refund:',
    body: '100% of the amount you paid is returned to your original payment method.',
  },
  {
    title: 'No questions asked:',
    body: 'You do not need to provide a reason. We trust you to make that call.',
  },
  {
    title: 'All paid plans covered:',
    body: 'The 7-day window applies to Pro Aspirant and Mentorship Pro. It does not apply to renewal charges on an existing active subscription.',
  },
  {
    title: 'Processing time:',
    body: 'Refunds are processed within 5 to 7 business days to your original payment method, depending on your bank or card provider.',
  },
];

const willConsider = [
  'A technical issue on our end prevented you from accessing the platform and we were unable to resolve it in a reasonable time (supporting evidence required)',
  'A duplicate or erroneous charge occurred on your account',
  'A documented medical emergency prevented you from using the platform (documentation required)',
];

const notEligible = [
  'Change of mind or a decision to pause preparation',
  'Renewal charges on a subscription you forgot to cancel',
  'Partial use where features were available and working',
  'Mentorship session fees once a session has taken place',
];

const requestSteps = [
  {
    num: '1',
    title: 'Email us',
    body: (
      <>
        Write to{' '}
        <a href="mailto:billing@risewithjeet.in" className="text-blue-600 hover:underline">billing@risewithjeet.in</a>
        {' '}from your registered email address. Use the subject line &ldquo;Refund Request&rdquo; and include your full name and a brief explanation of why you are requesting a refund.
      </>
    ),
  },
  {
    num: '2',
    title: 'We review and respond',
    body: 'A real team member reviews your request. We may ask a follow-up question if needed to understand your situation better. For requests within the 7-day window, no explanation is needed.',
  },
  {
    num: '3',
    title: 'Refund processed',
    body: 'If approved, the refund is processed back to your original payment method within 5 to 7 business days. This timeline is governed by your bank or card provider and is outside our control once we initiate it.',
  },
];

const mentorshipItems = [
  {
    title: 'Before the session:',
    body: 'If you need to cancel or reschedule, please let us know at least 24 hours in advance and we will accommodate you.',
  },
  {
    title: 'No-shows:',
    body: 'If you do not attend a scheduled session without prior notice, the session is considered used and a refund is not applicable.',
  },
  {
    title: 'Our fault:',
    body: 'If a session did not happen due to an issue on our end, we will reschedule it or refund the session fee, whichever you prefer.',
  },
];

export default function RefundPage() {
  const [activeSection, setActiveSection] = useState('our-approach');

  useEffect(() => {
    const handleScroll = () => {
      for (const s of [...sections].reverse()) {
        const el = document.getElementById(s.id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(s.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white font-inter">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="w-full flex flex-col items-center justify-center text-center py-20 px-6"
        style={{ background: 'linear-gradient(135deg, #0E182D 0%, #1C2E45 100%)' }}
      >
        {/* Badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <span className="text-lg">📄</span>
          <span className="text-white font-semibold text-sm tracking-widest uppercase">Legal</span>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
          <span className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: '#C9973A' }}>
            TRANSPARENT AND FAIR
          </span>
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
        </div>

        {/* Title */}
        <h1 className="font-plus-jakarta font-bold text-white mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
          Refund and{' '}
          <em className="not-italic font-bold" style={{ color: '#C9973A', fontFamily: 'Georgia, serif' }}>Cancellation</em>
        </h1>

        {/* Dates */}
        <p className="text-sm" style={{ color: '#90a1b9' }}>
          <strong className="text-white">Effective date:</strong> February 1, 2025 &nbsp;·&nbsp;{' '}
          <strong className="text-white">Last updated:</strong> March 15, 2026
        </p>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-16 flex gap-12">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">CONTENTS</p>
            <nav className="flex flex-col gap-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all"
                  style={{
                    background: activeSection === s.id ? '#FFF9E6' : 'transparent',
                    color: activeSection === s.id ? '#1C2E45' : '#64748B',
                    fontWeight: activeSection === s.id ? 600 : 400,
                  }}
                >
                  <span className="text-xs" style={{ color: '#C9973A' }}>{s.num}</span>
                  {s.label}
                </button>
              ))}
            </nav>

            {/* Billing queries box */}
            <div
              className="mt-8 p-4 rounded-xl"
              style={{ background: '#FFF9E6', border: '1px solid #FDE68A' }}
            >
              <p className="text-xs font-semibold tracking-widest uppercase text-[#1C2E45] mb-2">BILLING QUERIES</p>
              <a
                href="mailto:billing@risewithjeet.in"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                billing@risewithjeet.in
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl flex flex-col gap-20">

          {/* 01 Our Approach */}
          <section id="our-approach" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>01</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-6">Our Approach</h2>

            <div
              className="flex gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">🧡</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>We want you to feel confident trying RiseWithJeet.</strong> If the platform is not right for you, we will do our best to make it right. This policy explains exactly how cancellations and refunds work.
              </p>
            </div>

            <p className="text-[#374151] leading-relaxed mb-4">
              We built RiseWithJeet with one belief: you should only pay for something that genuinely helps you prepare. We price the platform at what it costs to run, not what the market will bear. That same thinking applies to refunds. We are not in the business of trapping people into subscriptions they do not want.
            </p>
            <p className="text-[#374151] leading-relaxed mb-8">
              At the same time, running this platform, training AI models on UPSC-specific content, and maintaining infrastructure has real costs. This policy reflects that balance honestly.
            </p>

            {/* 7-Day Guarantee card */}
            <div
              className="rounded-xl p-6"
              style={{ background: '#0E182D' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#C9973A' }}
                >
                  <span className="text-lg">🛡</span>
                </div>
                <h3 className="font-plus-jakarta font-bold text-lg" style={{ color: '#FFD170' }}>
                  7-Day Money-Back Guarantee
                </h3>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                We offer a full, no-questions-asked refund within 7 days of your initial subscription payment. This applies to all paid plans: Pro Aspirant and Mentorship Pro.
              </p>
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#90a1b9' }}
              >
                To request:{' '}
                <a href="mailto:billing@risewithjeet.in" style={{ color: '#FFD170' }} className="hover:underline">
                  billing@risewithjeet.in
                </a>
                {' '}with subject line{' '}
                <span style={{ color: '#FFD170' }}>&ldquo;Refund Request&rdquo;</span>
              </div>
            </div>
          </section>

          {/* 02 Cancellations */}
          <section id="cancellations" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>02</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Cancellations</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              You can cancel your subscription at any time with no questions asked.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {cancellationItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 mt-1 text-sm" style={{ color: '#C9973A' }}>◆</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">💡</span>
              <p className="text-sm text-[#1C2E45]">
                If you are going through a tough period and need a break, consider pausing rather than cancelling. Write to us at{' '}
                <a href="mailto:billing@risewithjeet.in" className="text-blue-600 hover:underline">billing@risewithjeet.in</a>
                {' '}and we will see what we can do.
              </p>
            </div>
          </section>

          {/* 03 Within 7 Days */}
          <section id="within-7-days" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>03</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Within the 7-Day Window</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              If you request a refund within 7 days of your initial subscription payment, we will process it in full with no questions asked. This applies to both the Pro Aspirant and Mentorship Pro plans.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {within7Items.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 mt-1 text-sm" style={{ color: '#C9973A' }}>◆</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-[#1C2E45]">
                The 7-day window starts from the date of your initial payment, not from when you first log in or activate features.
              </p>
            </div>
          </section>

          {/* 04 After 7 Days */}
          <section id="after-7-days" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>04</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">After the 7-Day Window</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              After the initial 7 days, we do not offer pro-rated refunds for unused subscription time. However, we review every situation with common sense. We will evaluate refund requests case by case for the following:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Will consider */}
              <div
                className="p-5 rounded-xl border"
                style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✅</span>
                  <p className="font-semibold text-[#15803d] text-sm">We will consider a refund</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {willConsider.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#374151]">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: '#C9973A' }}>›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Not eligible */}
              <div
                className="p-5 rounded-xl border"
                style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✗</span>
                  <p className="font-semibold text-[#be123c] text-sm">Not eligible after 7 days</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {notEligible.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#374151]">
                      <span className="flex-shrink-0 mt-0.5 text-[#be123c]">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className="flex gap-3 p-4 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-xl">🗂️</span>
              <p className="text-sm text-[#374151]">
                If your situation is not listed here, please write to us anyway. We look at each request individually and respond fairly.
              </p>
            </div>
          </section>

          {/* 05 How to Request */}
          <section id="how-to-request" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>05</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">How to Request a Refund</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              The process is simple and handled by a real person, not a bot.
            </p>
            <div className="flex flex-col gap-4">
              {requestSteps.map((step, i) => (
                <div key={i} className="flex gap-5 p-5 rounded-xl border border-gray-100 bg-gray-50">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ background: '#1C2E45', color: 'white' }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1C2E45] mb-1">{step.title}</p>
                    <p className="text-sm text-[#374151]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 06 Mentorship Sessions */}
          <section id="mentorship" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>06</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Mentorship Sessions</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              Mentorship Pro sessions involve real time from our mentors. Because of this, session fees are generally non-refundable once a session has taken place.
            </p>
            <div className="flex flex-col gap-3">
              {mentorshipItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 mt-1 text-sm" style={{ color: '#C9973A' }}>◆</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 07 Contact */}
          <section id="contact" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>07</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Contact Us</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              For any billing or refund queries, please reach out directly. We respond as quickly as possible on working days.
            </p>
            <div
              className="flex gap-4 p-5 rounded-xl mb-6"
              style={{ background: '#FFF9E6', border: '1px solid #FDE68A' }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
                style={{ background: '#1C2E45' }}
              >
                <span className="text-xl">🏢</span>
              </div>
              <div>
                <p className="font-semibold text-[#1C2E45]">RiseWithJeet Edtech Pvt Ltd</p>
                <p className="text-sm text-[#374151] mt-1">
                  Billing and refunds:{' '}
                  <a href="mailto:billing@risewithjeet.in" className="text-blue-600 hover:underline">billing@risewithjeet.in</a>
                </p>
                <p className="text-sm text-[#374151]">
                  General support:{' '}
                  <a href="mailto:support@risewithjeet.in" className="text-blue-600 hover:underline">support@risewithjeet.in</a>
                </p>
              </div>
            </div>
            <p className="text-sm text-[#374151]">
              This policy may be updated from time to time. The &ldquo;Last updated&rdquo; date at the top of this page will reflect any changes.
            </p>
          </section>

        </main>
      </div>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section
        className="w-full py-20 px-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #0E182D 0%, #1C2E45 100%)' }}
      >
        <h2 className="font-plus-jakarta font-bold text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
          Need help with a
        </h2>
        <h2
          className="font-bold mb-4"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#C9973A', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          refund or cancellation?
        </h2>
        <p className="text-sm mb-8" style={{ color: '#90a1b9' }}>
          Write to us directly. A real person reads every message and gets back to you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:billing@risewithjeet.in"
            className="px-6 py-3 rounded-full font-semibold text-[#1C2E45] transition-all hover:scale-105"
            style={{ background: '#FFD170' }}
          >
            Email billing@risewithjeet.in
          </a>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-full font-semibold text-white border border-white/30 hover:bg-white/10 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        className="w-full py-6 px-8"
        style={{ background: '#0E182D', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: '#C9973A' }}
            >
              <span className="text-[#0f172b] font-serif text-sm font-bold">R</span>
            </div>
            <span className="text-white text-base font-semibold" style={{ fontFamily: 'Georgia, serif' }}>RiseWithJeet</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Contact Us', href: '/contact' },
              { label: 'Blog', href: '/blog' },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-[#90a1b9] text-sm hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-[#62748e] text-sm">
            © 2026 RiseWithJeet Edtech Pvt Ltd · Made with 💛 for every UPSC aspirant
          </p>
        </div>
      </footer>

    </div>
  );
}
