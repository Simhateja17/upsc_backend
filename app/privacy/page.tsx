'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const sections = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'what-we-collect', num: '02', label: 'What We Collect' },
  { id: 'how-we-use', num: '03', label: 'How We Use It' },
  { id: 'sharing', num: '04', label: 'Sharing Your Data' },
  { id: 'security', num: '05', label: 'Security' },
  { id: 'your-rights', num: '06', label: 'Your Rights' },
  { id: 'cookies', num: '07', label: 'Cookies' },
  { id: 'children', num: '08', label: 'Children' },
  { id: 'changes', num: '09', label: 'Changes' },
  { id: 'contact', num: '10', label: 'Contact Us' },
];

const whatWeCollect = [
  { category: 'Account information', includes: 'Name, email address, phone number, profile photo', why: 'To create and manage your account' },
  { category: 'Study data', includes: 'MCQ responses, test scores, answers submitted, time spent, streak activity', why: 'To power analytics, AI evaluation, and personalised recommendations' },
  { category: 'Payment data', includes: 'Transaction ID, plan purchased, billing date. Card details are processed by Razorpay and are never stored by us.', why: 'Subscription management and invoicing' },
  { category: 'Device and usage data', includes: 'IP address, browser type, device model, OS, pages visited, session duration', why: 'Platform security, performance, and debugging' },
  { category: 'Communications', includes: 'Support tickets, feedback messages, emails sent to us', why: 'To respond to your queries and improve the platform' },
  { category: 'Uploaded content', includes: 'Handwritten or typed answer images uploaded for AI evaluation', why: 'To run the Jeet AI Mains Evaluator and return your score' },
];

const howWeUse = [
  { icon: '🖥️', title: 'Running the platform:', body: 'Processing your answers, generating performance reports, powering the AI Mains Evaluator, and serving your daily MCQs and current affairs.' },
  { icon: '📊', title: 'Personalisation:', body: 'Identifying your weak areas, building adaptive test sets, and generating your AI study planner based on your actual progress data.' },
  { icon: '🔒', title: 'Account and security:', body: 'Authenticating your login, sending password reset emails, detecting suspicious activity, and protecting your account.' },
  { icon: '📢', title: 'Communication:', body: 'Sending study reminders, streak alerts, evaluation results, and important platform updates. You can opt out of non-essential communications from Account Settings at any time.' },
  { icon: '📈', title: 'Platform improvement:', body: 'Aggregated and anonymised usage data helps us understand which features are most useful and what to build next.' },
  { icon: '⚖️', title: 'Legal and compliance:', body: 'Maintaining records required under applicable Indian law, responding to lawful authority requests, and enforcing our Terms of Service.' },
];

const sharingData = [
  { icon: '🔧', title: 'Service providers:', body: 'We work with trusted third parties to operate the platform, including Razorpay (payments), AWS or Google Cloud (infrastructure), and Firebase (authentication). All service providers are bound by data processing agreements and may only use your data to provide services to us.' },
  { icon: '🎓', title: 'Mentors (Mentorship Pro only):', body: 'If you are enrolled in Mentorship Pro, your name, submitted answers, and progress data are shared with your assigned mentor to enable personalised sessions.' },
  { icon: '📊', title: 'Aggregated statistics:', body: 'We may share anonymised, aggregated data (for example, overall platform accuracy rates). This data cannot identify you individually.' },
  { icon: '⚖️', title: 'Legal requirements:', body: 'We may disclose your information if required by law, court order, or government authority, or if we believe in good faith that disclosure is necessary to protect the rights or safety of RiseWithJeet or its users.' },
  { icon: '🏢', title: 'Business transfers:', body: 'In the event of a merger or acquisition, your data may be transferred to the acquiring entity. We will make reasonable efforts to inform you of any such change.' },
];

const securityItems = [
  { icon: '🔒', title: 'Encryption in transit:', body: 'All data transmitted between your device and our servers is encrypted using TLS 1.3.' },
  { icon: '🗄️', title: 'Encryption at rest:', body: 'Stored data including your account information and study records is encrypted using AES-256.' },
  { icon: '👥', title: 'Access control:', body: 'Only team members who genuinely need access to perform their duties can access user data. Access is role-based and logged.' },
  { icon: '💳', title: 'Payment security:', body: 'We do not store your card details. All payment processing is handled by Razorpay, which is PCI-DSS compliant.' },
  { icon: '🔍', title: 'Ongoing security:', body: 'We conduct periodic internal security reviews and take prompt action in the event of any suspected data security incident.' },
];

const rights = [
  { icon: '🔍', title: 'Access', body: 'Request a copy of all personal data we hold about you, in a readable format.' },
  { icon: '✏️', title: 'Correction', body: 'Ask us to correct inaccurate or incomplete data in your account at any time.' },
  { icon: '🗑️', title: 'Deletion', body: 'Request deletion of your account and all associated personal data. We will process this promptly.' },
  { icon: '📦', title: 'Portability', body: 'Export your study data, scores, and evaluation history in a portable format.' },
  { icon: '🚫', title: 'Restriction', body: 'Ask us to stop processing your data for specific purposes, such as analytics or promotional communications.' },
  { icon: '🔕', title: 'Opt-out', body: 'Unsubscribe from non-essential emails and notifications at any time from Account Settings.' },
];

const cookies = [
  { cookie: 'Essential', purpose: 'Login session, CSRF protection, security tokens', optOut: 'No, these are required for the platform to function' },
  { cookie: 'Preference', purpose: 'Language settings, timezone, theme preference', optOut: 'Yes, via Account Settings' },
  { cookie: 'Analytics', purpose: 'Page views, feature usage, session duration (anonymised)', optOut: 'Yes, via Account Settings or browser settings' },
  { cookie: 'Marketing', purpose: 'We do not currently use marketing or advertising cookies', optOut: 'Not applicable' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('overview');

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
          <span className="text-lg">🔒</span>
          <span className="text-white font-semibold text-sm tracking-widest uppercase">LEGAL</span>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
          <span className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: '#C9973A' }}>
            YOUR PRIVACY MATTERS
          </span>
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
        </div>

        {/* Title */}
        <h1 className="font-plus-jakarta font-bold text-white mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
          Privacy{' '}
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
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl flex flex-col gap-20">

          {/* 01 Overview */}
          <section id="overview" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>01</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-6">Overview</h2>
            <div
              className="flex gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">💡</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>Short version:</strong> We collect only what we need to make RiseWithJeet work well for you. We never sell your data. You are always in control.
              </p>
            </div>
            <p className="text-[#374151] leading-relaxed mb-4">
              RiseWithJeet Edtech Pvt Ltd ("RiseWithJeet", "we", "us", or "our") operates the RiseWithJeet platform available at risewithjeet.in and through our mobile applications. This Privacy Policy explains what personal data we collect, why we collect it, how we use it, and the rights you have over it.
            </p>
            <p className="text-[#374151] leading-relaxed mb-4">
              We take your privacy seriously and have written this policy in plain language. If anything is unclear, write to us at{' '}
              <a href="mailto:privacy@risewithjeet.in" className="text-blue-600 hover:underline">privacy@risewithjeet.in</a>
              {' '}and we will explain it.
            </p>
            <p className="text-[#374151] leading-relaxed">
              By using the platform, you agree to the practices described here. If you do not agree, please discontinue use of the platform.
            </p>
          </section>

          {/* 02 What We Collect */}
          <section id="what-we-collect" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>02</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">What We Collect</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We collect information you give us directly, and information that is generated when you use the platform.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0E182D' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase" style={{ color: '#C9973A' }}>CATEGORY</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">WHAT IT INCLUDES</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">WHY WE COLLECT IT</th>
                  </tr>
                </thead>
                <tbody>
                  {whatWeCollect.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top">{row.category}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.includes}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl mt-6"
              style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
            >
              <span className="text-xl">🔥</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>We do not collect</strong> your Aadhaar number, PAN card, caste, religion, or any other sensitive personal identifiers. We collect only what is necessary to run the platform.
              </p>
            </div>
          </section>

          {/* 03 How We Use */}
          <section id="how-we-use" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>03</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">How We Use Your Information</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              Everything we collect is used to make RiseWithJeet better for you. Here is exactly how:
            </p>
            <div className="flex flex-col gap-3">
              {howWeUse.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl mt-6"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <span className="text-xl">🚫</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>We do not use your data for advertising.</strong> RiseWithJeet does not run ads, and we do not share your personal data with ad networks.
              </p>
            </div>
          </section>

          {/* 04 Sharing */}
          <section id="sharing" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>04</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Sharing Your Data</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We never sell your personal data. We share it only in the following limited circumstances:
            </p>
            <div className="flex flex-col gap-3">
              {sharingData.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 05 Security */}
          <section id="security" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>05</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Data Security</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We apply the following safeguards to protect your data:
            </p>
            <div className="flex flex-col gap-3">
              {securityItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-sm text-[#374151]">
                    <strong className="text-[#1C2E45]">{item.title}</strong>{' '}{item.body}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="flex gap-3 p-4 rounded-xl mt-6"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
            >
              <span className="text-xl">🛡️</span>
              <p className="text-sm text-[#1C2E45]">
                If you discover a security vulnerability, please report it responsibly to{' '}
                <a href="mailto:security@risewithjeet.in" className="text-blue-600 hover:underline">security@risewithjeet.in</a>
                {' '}before disclosing it publicly. We take all responsible disclosures seriously.
              </p>
            </div>
          </section>

          {/* 06 Your Rights */}
          <section id="your-rights" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>06</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Your Rights</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              You have meaningful control over your personal data. Here are the rights you can exercise at any time:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rights.map((r, i) => (
                <div key={i} className="flex flex-col gap-2 p-5 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl">{r.icon}</span>
                  <p className="font-semibold text-[#1C2E45]">{r.title}</p>
                  <p className="text-sm text-[#64748B]">{r.body}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#374151] mt-6">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@risewithjeet.in" className="text-blue-600 hover:underline">privacy@risewithjeet.in</a>
              {' '}from your registered email address. There is no charge for exercising your rights.
            </p>
          </section>

          {/* 07 Cookies */}
          <section id="cookies" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>07</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Cookies</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We use cookies to keep you logged in, remember your preferences, and understand how the platform is being used.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0E182D' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase" style={{ color: '#C9973A' }}>COOKIE</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">PURPOSE</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-gray-300">CAN YOU OPT OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top">{row.cookie}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.purpose}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.optOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-[#374151] mt-4">
              You can also control cookies through your browser settings. Note that disabling essential cookies will log you out of the platform.
            </p>
          </section>

          {/* 08 Children */}
          <section id="children" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>08</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Children's Privacy</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              RiseWithJeet is intended for users who are 18 years of age or older. We do not knowingly collect personal data from anyone under the age of 18.
            </p>
            <p className="text-[#374151] leading-relaxed">
              If you are a parent or guardian and believe your child has provided personal data to us without your consent, please contact us at{' '}
              <a href="mailto:privacy@risewithjeet.in" className="text-blue-600 hover:underline">privacy@risewithjeet.in</a>
              {' '}and we will promptly delete that information from our systems.
            </p>
          </section>

          {/* 09 Changes */}
          <section id="changes" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>09</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Changes to This Policy</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              We may update this Privacy Policy from time to time as our platform evolves. When we make changes, we will:
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-xl">📅</span>
                <p className="text-sm text-[#374151]">Update the "Last updated" date at the top of this page</p>
              </div>
              <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-xl">📧</span>
                <p className="text-sm text-[#374151]">Send a notification to your registered email address if the changes are material</p>
              </div>
            </div>
          </section>

          {/* 10 Contact */}
          <section id="contact" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>10</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Contact Us</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              If you have any questions, concerns, or requests related to your privacy, please reach out to us. We take every message seriously.
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
                <p className="text-sm text-[#64748B]">Privacy Officer</p>
                <p className="text-sm text-[#374151] mt-1">
                  Email: <a href="mailto:privacy@risewithjeet.in" className="text-blue-600 hover:underline">privacy@risewithjeet.in</a>
                </p>
                <p className="text-sm text-[#374151]">
                  Security issues: <a href="mailto:security@risewithjeet.in" className="text-blue-600 hover:underline">security@risewithjeet.in</a>
                </p>
              </div>
            </div>
            <p className="text-sm text-[#374151] mt-6">
              If you feel your concern has not been adequately addressed, you have the right to lodge a complaint with the relevant data protection authority in India.
            </p>
          </section>

        </main>
      </div>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section
        className="w-full py-20 px-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #0E182D 0%, #1C2E45 100%)' }}
      >
        <h2 className="font-plus-jakarta font-bold text-white mb-3" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
          Have a question about
        </h2>
        <h2
          className="font-bold mb-4"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#C9973A', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          your data or privacy?
        </h2>
        <p className="text-sm mb-8" style={{ color: '#90a1b9' }}>
          No bots, no templates. A real person reads every message.
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
            href="#contact"
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
