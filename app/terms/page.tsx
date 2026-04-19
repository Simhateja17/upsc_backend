'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const sections = [
  { id: 'acceptance', num: '01', label: 'Acceptance' },
  { id: 'who-can-use', num: '02', label: 'Who Can Use' },
  { id: 'your-account', num: '03', label: 'Your Account' },
  { id: 'subscriptions', num: '04', label: 'Subscriptions' },
  { id: 'permitted-use', num: '05', label: 'Permitted Use' },
  { id: 'prohibited-use', num: '06', label: 'Prohibited Use' },
  { id: 'our-content', num: '07', label: 'Our Content' },
  { id: 'ai-tools', num: '08', label: 'AI Tools' },
  { id: 'liability', num: '09', label: 'Liability' },
  { id: 'termination', num: '10', label: 'Termination' },
  { id: 'governing-law', num: '11', label: 'Governing Law' },
  { id: 'contact', num: '12', label: 'Contact' },
];

const accountRows = [
  {
    term: 'Accurate information:',
    body: 'You agree to provide accurate, current, and complete information when creating your account and to keep it updated.',
  },
  {
    term: 'One account per person:',
    body: 'You may not create multiple accounts or share a single account with other individuals.',
  },
  {
    term: 'Notify us of breaches:',
    body: 'If you suspect unauthorised access to your account, contact us at support@risewithjeet.in immediately.',
  },
];

const subscriptionRows = [
  {
    term: 'Billing:',
    body: 'Subscriptions are billed in advance on a monthly or annual basis as selected at checkout.',
  },
  {
    term: 'Cancellation:',
    body: 'You may cancel your subscription at any time from Account Settings. Access continues until the end of the current billing period.',
  },
  {
    term: 'Refunds:',
    body: 'Refunds are governed by our Refund Policy. We offer a refund window for eligible requests made shortly after purchase.',
  },
  {
    term: 'Price changes:',
    body: 'We may update pricing from time to time. We will notify you in advance before any price change affects your active subscription.',
  },
];

const permittedItems = [
  'Access platform features available under your subscription plan',
  'Submit answers, MCQ responses, and study data for your personal use',
  'Download materials explicitly marked as downloadable for personal offline use',
  'Share your own study notes and insights with the community, where that feature is available',
];

const prohibitedRows = [
  {
    term: 'Content scraping or copying:',
    body: 'Scraping, downloading in bulk, copying, reproducing, or redistributing any platform content, including questions, model answers, or videos, without written permission.',
  },
  {
    term: 'Account sharing:',
    body: 'Sharing your login credentials or allowing others to use your account.',
  },
  {
    term: 'AI misuse:',
    body: 'Submitting AI-generated text as your own answers in the Mains Evaluator to manipulate scores. The tool is designed to help you improve, not to be gamed.',
  },
  {
    term: 'Impersonation:',
    body: 'Impersonating RiseWithJeet staff, mentors, or other users.',
  },
  {
    term: 'Harmful activity:',
    body: 'Uploading malware, attempting to hack or disrupt the platform, or engaging in any activity that could harm other users.',
  },
  {
    term: 'Commercial use:',
    body: 'Using the platform or its content for commercial purposes, resale, or teaching without prior written consent.',
  },
];

const aiItems = [
  'AI-generated feedback, scores, and recommendations are for educational guidance only and do not constitute a guarantee of exam performance or selection.',
  'AI tools may occasionally produce inaccurate or incomplete responses. You should exercise your own judgment and not rely solely on AI output.',
  'RiseWithJeet is an educational preparation platform. We do not guarantee that use of the platform will result in UPSC selection or any specific outcome.',
];

const terminationRows = [
  {
    by: 'By you:',
    body: 'You may delete your account at any time from Account Settings. This ends your access to paid features at the close of your current billing period.',
  },
  {
    by: 'By us:',
    body: 'We may suspend or terminate your account if you violate these Terms, engage in prohibited activity, or if we have reason to believe your account has been compromised. We will notify you where reasonably possible.',
  },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');

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
          <span className="text-lg">📋</span>
          <span className="text-white font-semibold text-sm tracking-widest uppercase">Legal</span>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
          <span className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: '#C9973A' }}>
            PLEASE READ CAREFULLY
          </span>
          <div className="h-px w-12" style={{ background: '#C9973A' }} />
        </div>

        {/* Title */}
        <h1 className="font-plus-jakarta font-bold text-white mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
          Terms of{' '}
          <em className="not-italic font-bold" style={{ color: '#C9973A', fontFamily: 'Georgia, serif' }}>Service</em>
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
                href="mailto:legal@risewithjeet.in"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                legal@risewithjeet.in
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl flex flex-col gap-20">

          {/* 01 Acceptance */}
          <section id="acceptance" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>01</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-6">Acceptance of Terms</h2>
            <div
              className="flex gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <span className="text-xl">💡</span>
              <p className="text-sm text-[#1C2E45]">
                <strong>Short version:</strong> By creating an account or using RiseWithJeet, you agree to these terms. If you do not agree, please do not use the platform.
              </p>
            </div>
            <p className="text-[#374151] leading-relaxed mb-4">
              These Terms of Service ("Terms") form a legally binding agreement between you and RiseWithJeet Edtech Pvt Ltd ("RiseWithJeet", "we", "us", or "our"). They govern your access to and use of the RiseWithJeet platform, available at risewithjeet.in and through our mobile applications.
            </p>
            <p className="text-[#374151] leading-relaxed">
              By creating an account, accessing the platform, or using any of our features, you confirm that you have read, understood, and agree to be bound by these Terms along with our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* 02 Who Can Use */}
          <section id="who-can-use" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>02</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-6">Who Can Use RiseWithJeet</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              To use RiseWithJeet, you must be at least 18 years of age. By using the platform, you confirm that you meet this requirement.
            </p>
            <p className="text-[#374151] leading-relaxed">
              If you are accessing the platform on behalf of an institution or organisation, you represent that you have the authority to bind that entity to these Terms.
            </p>
          </section>

          {/* 03 Your Account */}
          <section id="your-account" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>03</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Your Account</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Please keep your password secure and do not share it with anyone.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <tbody>
                  {accountRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top whitespace-nowrap w-48">{row.term}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 04 Subscriptions */}
          <section id="subscriptions" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>04</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Subscriptions and Payments</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              Some features of RiseWithJeet require a paid subscription. By subscribing, you authorise us to charge the applicable fees through our payment processor, Razorpay.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <tbody>
                  {subscriptionRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top whitespace-nowrap w-36">{row.term}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 05 Permitted Use */}
          <section id="permitted-use" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>05</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Permitted Use</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              RiseWithJeet grants you a personal, non-transferable, non-exclusive licence to access and use the platform for your own UPSC preparation. You may:
            </p>
            <div className="flex flex-col gap-3">
              {permittedItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 mt-0.5" style={{ color: '#C9973A' }}>✦</span>
                  <p className="text-sm text-[#374151]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 06 Prohibited Use */}
          <section id="prohibited-use" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>06</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Prohibited Use</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              You agree not to use RiseWithJeet in any way that could harm the platform, other users, or the integrity of UPSC preparation. The following are strictly prohibited:
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
              <table className="w-full text-sm">
                <tbody>
                  {prohibitedRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top whitespace-nowrap w-48">
                        <span style={{ color: '#C9973A' }}>✦</span>{' '}{row.term}
                      </td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.body}</td>
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
                Violations may result in <strong>immediate account suspension</strong> or termination without refund, at our discretion.
              </p>
            </div>
          </section>

          {/* 07 Our Content */}
          <section id="our-content" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>07</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Our Content and Intellectual Property</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              All content on RiseWithJeet, including video lectures, MCQ questions, model answers, study notes, current affairs articles, and AI-generated feedback, is owned by or licensed to RiseWithJeet Edtech Pvt Ltd.
            </p>
            <p className="text-[#374151] leading-relaxed">
              Nothing in these Terms transfers any intellectual property rights to you. You may use platform content solely for your personal UPSC preparation and may not reproduce, distribute, or create derivative works from it without our written permission.
            </p>
          </section>

          {/* 08 AI Tools */}
          <section id="ai-tools" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>08</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">AI Tools and Educational Disclaimer</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              RiseWithJeet uses artificial intelligence to power features including the Mains Evaluator, adaptive test generation, and the Jeet AI assistant. You acknowledge that:
            </p>
            <div className="flex flex-col gap-3">
              {aiItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 mt-0.5" style={{ color: '#C9973A' }}>✦</span>
                  <p className="text-sm text-[#374151]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 09 Liability */}
          <section id="liability" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>09</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Limitation of Liability</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              RiseWithJeet provides the platform on an "as is" basis. To the fullest extent permitted by applicable law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
            <p className="text-[#374151] leading-relaxed mb-4">
              Our total liability to you for any claim arising out of or related to these Terms or the platform shall not exceed the total amount you paid to RiseWithJeet in the three months preceding the claim.
            </p>
            <p className="text-[#374151] leading-relaxed">
              We are not responsible for temporary outages, data loss due to technical failures, or interruptions beyond our reasonable control. We will make reasonable efforts to maintain availability and communicate planned downtime in advance.
            </p>
          </section>

          {/* 10 Termination */}
          <section id="termination" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>10</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Termination</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              Either party may terminate the relationship at any time:
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
              <table className="w-full text-sm">
                <tbody>
                  {terminationRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 font-semibold text-[#1C2E45] align-top whitespace-nowrap w-24">{row.by}</td>
                      <td className="px-4 py-4 text-[#374151] align-top">{row.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[#374151] leading-relaxed">
              On termination, your right to use the platform ceases. Sections of these Terms that by their nature should survive termination, including intellectual property rights and limitation of liability, will remain in effect.
            </p>
          </section>

          {/* 11 Governing Law */}
          <section id="governing-law" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>11</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Governing Law</h2>
            <p className="text-[#374151] leading-relaxed mb-4">
              These Terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.
            </p>
            <p className="text-[#374151] leading-relaxed">
              We encourage you to reach out to us directly before pursuing any formal legal action. Most concerns can be resolved quickly through a conversation.
            </p>
          </section>

          {/* 12 Contact */}
          <section id="contact" className="scroll-mt-24">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#C9973A' }}>12</p>
            <h2 className="font-plus-jakarta font-bold text-3xl text-[#1C2E45] mb-4">Contact Us</h2>
            <p className="text-[#374151] leading-relaxed mb-6">
              If you have questions about these Terms or need clarification on anything, please get in touch.
            </p>
            <div
              className="flex gap-4 p-5 rounded-xl mb-6"
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
                  Email: <a href="mailto:legal@risewithjeet.in" className="text-blue-600 hover:underline">legal@risewithjeet.in</a>
                </p>
                <p className="text-sm text-[#374151]">
                  General support: <a href="mailto:support@risewithjeet.in" className="text-blue-600 hover:underline">support@risewithjeet.in</a>
                </p>
              </div>
            </div>
            <p className="text-sm text-[#374151]">
              We may update these Terms from time to time. When we do, we will update the "Last updated" date above and notify you if the changes are material. Continued use of the platform after changes are posted means you accept the updated Terms.
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
          Questions about our
        </h2>
        <h2
          className="font-bold mb-4"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#C9973A', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          Terms of Service?
        </h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: '#90a1b9' }}>
          We are happy to clarify anything. Reach out and a real person will respond.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:legal@risewithjeet.in"
            className="px-6 py-3 rounded-full font-semibold text-[#1C2E45] transition-all hover:scale-105"
            style={{ background: '#FFD170' }}
          >
            Email legal@risewithjeet.in
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
