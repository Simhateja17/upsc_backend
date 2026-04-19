'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const sections = [
  { id: 'what-are-cookies', num: '01', label: 'What Are Cookies' },
  { id: 'what-we-use', num: '02', label: 'What We Use' },
  { id: 'cookie-table', num: '03', label: 'Cookie Table' },
  { id: 'your-choices', num: '04', label: 'Your Choices' },
  { id: 'changes', num: '05', label: 'Changes' },
  { id: 'contact', num: '06', label: 'Contact' },
];

// Highlighted "cookies" word — yellow background like in Figma
const C = () => (
  <mark className="px-0.5 rounded" style={{ background: '#FFD170', color: '#1C2E45', fontWeight: 600 }}>
    cookies
  </mark>
);

const cookieTypes = [
  {
    icon: '🔒',
    title: 'Essential',
    body: 'These are required for the platform to function. They keep you logged in, protect against CSRF attacks, and manage your session securely. You cannot opt out of these without logging out.',
  },
  {
    icon: '⚙️',
    title: 'Preference',
    body: 'These remember settings you have chosen, like your language preference or notification settings, so you do not have to reset them every time you visit. You can turn these off from Account Settings.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    body: 'These help us understand how aspirants use the platform. Which features are most useful? Where do people get stuck? The data is anonymised and used only to improve the product. You can opt out from Account Settings or your browser settings.',
  },
  {
    icon: '🚫',
    title: 'Marketing',
    body: 'We do not use marketing or advertising cookies. We do not run ads and we do not share your data with ad networks.',
  },
];

const cookieTableRows = [
  {
    type: 'Essential',
    does: 'Keeps you logged in, protects against CSRF attacks, manages your active session',
    setBy: 'RiseWithJeet',
    optOut: { label: 'Required', color: '#16a34a', bg: '#dcfce7' },
  },
  {
    type: 'Preference',
    does: 'Remembers your language, timezone, and notification preferences between sessions',
    setBy: 'RiseWithJeet',
    optOut: { label: 'Optional', color: '#16a34a', bg: '#dcfce7' },
  },
  {
    type: 'Analytics',
    does: 'Tracks anonymised usage patterns such as page views, feature usage, and session duration to help us improve the platform',
    setBy: 'RiseWithJeet / third-party tools',
    optOut: { label: 'Optional', color: '#16a34a', bg: '#dcfce7' },
  },
  {
    type: 'Authentication',
    does: 'Manages your login state and secure token when using Google or Microsoft sign-in',
    setBy: 'Firebase / OAuth provider',
    optOut: { label: 'Required', color: '#16a34a', bg: '#dcfce7' },
  },
  {
    type: 'Marketing',
    does: 'Not used. We do not run ads or use advertising trackers.',
    setBy: 'None',
    optOut: { label: 'Not applicable', color: '#64748b', bg: '#f1f5f9' },
  },
];

const choiceItems = [
  {
    icon: '⚙️',
    title: 'Account Settings:',
    body: <>Go to Account Settings and select Privacy. You can turn off optional analytics and preference <C /> from there without affecting your core experience.</>,
  },
  {
    icon: '🌐',
    title: 'Browser settings:',
    body: <>Every major browser lets you view, delete, and block <C />. Note that blocking essential <C /> will log you out and may affect how the platform works. Check your browser&apos;s help documentation for specific steps.</>,
  },
  {
    icon: '🗑️',
    title: 'Clearing cookies:',
    body: <>You can clear all stored <C /> from your browser at any time. You will need to log in again after doing so.</>,
  },
];

export default function CookiePolicyPage() {
  const [activeSection, setActiveSection] = useState('what-are-cookies');

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
          <span className="text-lg">🍪</span>
          <span className="text-white font-semibold text-sm tracking-widest uppercase">Legal</span>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
          <span className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: '#C9973A' }}>
            NO SURPRISES
          </span>
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
        </div>

        {/* Title */}
        <h1 className="font-plus-jakarta font-bold text-white mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
          Cookie{' '}
          <em className="not-italic font-bold" style={{ color: '#C9973A', fontFamily: 'Georgia, serif' }}>Policy</em>
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

            {/* Questions box */}
            <div
              className="mt-8 p-4 rounded-xl"
              style={{ background: '#FFF9E6', border: '1px solid #FDE68A' }}
            >
              <p className="text-xs font-semibold tracking-widest uppercase text-[#1C2E45] mb-2">QUESTIONS?</p>
              <a
                href="mailto:privacy@risewithjeet.in"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                privacy@risewithjeet.in
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl flex flex-col gap-20">

          {/* 01 What Are Cookies */}
          <section id="what-are-cookies" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>01</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-6">
              What Are <mark className="px-1 rounded" style={{ background: '#FFD170', color: '#1C2E45' }}>Cookies</mark>
            </h2>
            <div
              className="flex gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">💡</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>Short version:</strong> <C /> are small files stored on your device that help the platform remember you and work properly. We use them minimally and only for things that genuinely improve your experience.
              </p>
            </div>
            <p className="text-[#374151] leading-relaxed mb-4">
              When you visit RiseWithJeet, small text files called <C /> may be stored on your browser or device. These help the platform recognise you between sessions, remember your preferences, and understand how features are being used so we can keep improving them.
            </p>
            <p className="text-[#374151] leading-relaxed">
              We also use similar technologies like local storage and session tokens for authentication purposes. In this policy, we refer to all of these collectively as &ldquo;<C />&rdquo; for simplicity.
            </p>
          </section>

          {/* 02 What We Use and Why */}
          <section id="what-we-use" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>02</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">What We Use and Why</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We keep our cookie usage lean. Here is a plain-language breakdown of what we use and why:
            </p>
            <div className="flex flex-col gap-4">
              {cookieTypes.map((item, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-[#1C2E45] mb-1">
                      {item.title}{' '}
                      <mark className="px-0.5 rounded" style={{ background: '#FFD170', color: '#1C2E45' }}>cookies</mark>:
                    </p>
                    <p className="text-sm text-[#374151]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 03 Cookie Reference Table */}
          <section id="cookie-table" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>03</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Cookie Reference Table</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              A clear breakdown of every category of cookie we use:
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0E182D' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase" style={{ color: '#C9973A' }}>TYPE</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">WHAT IT DOES</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">SET BY</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">CAN YOU OPT OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieTableRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top">{row.type}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.does}</td>
                      <td className="px-4 py-4 text-[#374151] align-top whitespace-nowrap">{row.setBy}</td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: row.optOut.bg, color: row.optOut.color }}
                        >
                          {row.optOut.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-[#1C2E45]">
                We do not use <C /> to track you across other websites, build advertising profiles, or sell your data to any third party.
              </p>
            </div>
          </section>

          {/* 04 Your Choices */}
          <section id="your-choices" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>04</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Your Choices</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              You are always in control. Here are the ways you can manage <C /> on RiseWithJeet:
            </p>
            <div className="flex flex-col gap-4 mb-6">
              {choiceItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
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
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-[#1C2E45]">
                Disabling essential or authentication <C /> will prevent you from staying logged in. The core features of the platform require these to function correctly.
              </p>
            </div>
          </section>

          {/* 05 Changes */}
          <section id="changes" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>05</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Changes to This Policy</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              If we add new <C /> or change how we use existing ones, we will update this page and revise the &ldquo;Last updated&rdquo; date above. If the changes are significant, we will let you know through the platform or by email.
            </p>
            <p className="text-[#374151] leading-relaxed">
              Continued use of RiseWithJeet after an update means you are comfortable with the changes. If you are not, you can manage your preferences from Account Settings or reach out to us.
            </p>
          </section>

          {/* 06 Contact */}
          <section id="contact" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>06</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Contact Us</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              If you have questions about how we use <C /> or want to understand more about a specific technology we use, please get in touch.
            </p>
            <div
              className="flex gap-4 p-5 rounded-xl"
              style={{ background: '#F0F4FF', border: '1px solid #C7D7FE' }}
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
                  Privacy and cookie queries:{' '}
                  <a href="mailto:privacy@risewithjeet.in" className="text-blue-600 hover:underline">privacy@risewithjeet.in</a>
                </p>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section
        className="w-full py-20 px-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #0E182D 0%, #1C2E45 100%)' }}
      >
        <h2 className="font-plus-jakarta font-bold text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
          Questions about
        </h2>
        <h2
          className="font-bold mb-4"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          <mark className="px-2 rounded" style={{ background: '#FFD170', color: '#1C2E45' }}>cookies</mark>
          <span style={{ color: '#C9973A' }}> or privacy?</span>
        </h2>
        <p className="text-sm mb-8" style={{ color: '#90a1b9' }}>
          We keep it simple and honest. Reach out if anything is unclear.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:privacy@risewithjeet.in"
            className="px-6 py-3 rounded-full font-semibold text-[#1C2E45] transition-all hover:scale-105"
            style={{ background: '#FFD170' }}
          >
            Email privacy@risewithjeet.in
          </a>
          <Link
            href="/privacy"
            className="px-6 py-3 rounded-full font-semibold text-white border border-white/30 hover:bg-white/10 transition-all"
          >
            Read Privacy Policy
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
