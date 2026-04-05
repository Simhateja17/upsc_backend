'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { contactService } from '@/lib/services';

const contactOptions = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    iconBg: '#D4A043',
    title: 'Live Chat',
    description: 'Fastest response. Available in the app and website. Avg wait: 3 mins.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 6L12 13L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    iconBg: '#6366F1',
    title: 'Support',
    description: '@risewithjeet.com · Replies within 4 hours on business days.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M22 16.92V19.92C22.0011 20.4813 21.7951 21.0228 21.4215 21.4375C21.0479 21.8522 20.5357 22.1098 19.98 22.16C17.3855 22.4218 14.8823 21.5985 12.9 20.01C11.0494 18.5553 9.45593 16.7036 8.24999 14.59C6.64847 12.5988 5.82451 10.0726 6.09999 7.43999C6.14982 6.88592 6.40582 6.37459 6.81888 6.00143C7.23194 5.62827 7.77 5.42216 8.32999 5.41999H11.33C12.3239 5.40983 13.1776 6.09648 13.35 7.07999C13.4974 7.90569 13.7348 8.71238 14.06 9.48999C14.3277 10.1376 14.1613 10.8775 13.65 11.36L12.41 12.6C13.5475 14.7579 15.2921 16.5025 17.45 17.64L18.69 16.4C19.1725 15.8887 19.9124 15.7223 20.56 15.99C21.3376 16.3152 22.1443 16.5526 22.97 16.7C23.9561 16.8745 24.6442 17.7329 24.62 18.73" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    iconBg: '#0E8A8A',
    title: 'Phone Support (Pro/Mentorship)',
    description: '+91 98365 43291 · Mon–Sat 10 AM – 6 PM IST. Pro & Mentorship plans only.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 11.37C16.1234 12.2022 15.9813 13.0522 15.5938 13.799C15.2063 14.5458 14.5932 15.1514 13.8416 15.5297C13.0901 15.9079 12.2385 16.0396 11.4078 15.9059C10.5771 15.7723 9.80977 15.3801 9.21485 14.7852C8.61993 14.1902 8.22774 13.4229 8.09408 12.5922C7.96042 11.7615 8.09208 10.9099 8.47034 10.1584C8.8486 9.40685 9.4542 8.79374 10.201 8.40624C10.9478 8.01874 11.7978 7.87658 12.63 8L12.63 8.00001C13.4789 8.1319 14.2649 8.52274 14.8717 9.12957C15.4785 9.7364 15.8694 10.5224 16.001 11.371L16 11.37Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17.5 6.5H17.51" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    iconBg: '#64748B',
    title: 'Social Media',
    description: '@RiseWithJeet on Twitter/X & Instagram. We reply within 24 hrs.',
  },
];

const communityLinks = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.02C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4582 14.006 10.4251 13.9973 10.3938C13.9886 10.3624 13.9724 10.3337 13.95 10.31C13.89 10.26 13.81 10.28 13.74 10.29C13.65 10.31 12.25 11.24 9.52 13.08C9.12 13.35 8.76 13.49 8.44 13.48C8.08 13.47 7.4 13.28 6.89 13.11C6.26 12.91 5.77 12.8 5.81 12.45C5.83 12.27 6.08 12.09 6.55 11.9C9.47 10.63 11.41 9.79 12.38 9.39C15.16 8.23 15.73 8.03 16.11 8.03C16.19 8.03 16.38 8.05 16.5 8.15C16.6 8.23 16.63 8.34 16.64 8.42C16.63 8.48 16.65 8.66 16.64 8.8Z" fill="#2AABEE"/>
      </svg>
    ),
    iconBg: '#1A2744',
    title: 'Telegram Community',
    subtitle: 't.me/risewithjeet · 5,000+ members',
    href: 'https://t.me/risewithjeet',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M22.54 6.42C22.4212 5.94541 22.1793 5.51057 21.8387 5.15941C21.498 4.80824 21.0708 4.55318 20.6 4.42C18.88 4 12 4 12 4C12 4 5.12 4 3.4 4.46C2.92925 4.59318 2.50198 4.84824 2.16135 5.19941C1.82072 5.55057 1.57879 5.98541 1.46 6.46C1.14521 8.20556 0.991235 9.97631 1 11.75C0.988787 13.537 1.14277 15.3213 1.46 17.08C1.59096 17.5398 1.83831 17.9581 2.17814 18.2945C2.51798 18.6308 2.93882 18.8738 3.4 19C5.12 19.46 12 19.46 12 19.46C12 19.46 18.88 19.46 20.6 19C21.0708 18.8668 21.498 18.6118 21.8387 18.2606C22.1793 17.9094 22.4212 17.4746 22.54 17C22.8524 15.2676 23.0063 13.5103 23 11.75C23.0112 9.96295 22.8573 8.1787 22.54 6.42Z" fill="#FF0000"/>
        <path d="M9.75 15.02L15.5 11.75L9.75 8.48V15.02Z" fill="white"/>
      </svg>
    ),
    iconBg: '#1A2744',
    title: 'YouTube Channel',
    subtitle: 'youtube · 1M+ views',
    href: 'https://youtube.com/@risewithjeet',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433"/>
            <stop offset="25%" stopColor="#e6683c"/>
            <stop offset="50%" stopColor="#dc2743"/>
            <stop offset="75%" stopColor="#cc2366"/>
            <stop offset="100%" stopColor="#bc1888"/>
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
        <path d="M12 7.5C9.51 7.5 7.5 9.51 7.5 12C7.5 14.49 9.51 16.5 12 16.5C14.49 16.5 16.5 14.49 16.5 12C16.5 9.51 14.49 7.5 12 7.5ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15Z" fill="white"/>
        <circle cx="16.8" cy="7.2" r="1.2" fill="white"/>
      </svg>
    ),
    iconBg: '#1A2744',
    title: 'Instagram',
    subtitle: '@risewithjeet · Daily updates',
    href: 'https://instagram.com/risewithjeet',
  },
];

const subjectOptions = [
  'General Inquiry',
  'Technical Issue',
  'Billing & Subscription',
  'Mentorship Programs',
  'Platform Feedback',
  'Partnership',
  'Other',
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await contactService.submit(formData);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setFormData({ firstName: '', lastName: '', email: '', subject: '', message: '' });
    } catch {
      // silently handle
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      {/* ── Hero ── */}
      <section
        className="w-full flex flex-col items-center justify-center text-center pt-36 pb-20 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(93.39deg, #0E182D 10.35%, #1C2E45 95.5%)' }}
      >
        {/* Subtle background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4A043 0%, transparent 70%)' }}
        />

        <p className="font-roboto text-xs font-semibold tracking-[3px] uppercase text-[#D4A043] mb-5">
          Contact Us
        </p>

        <h1 className="font-roboto font-bold text-white text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] mb-4">
          We&apos;d love to
        </h1>
        <h1
          className="font-roboto font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] mb-8"
          style={{ fontStyle: 'italic', color: '#D4A043' }}
        >
          hear from you
        </h1>

        <p className="font-roboto text-[#94A3B8] text-[clamp(0.9rem,1.2vw,1.1rem)] leading-relaxed max-w-lg mb-14">
          Whether it&apos;s a question about the platform, a technical issue, feedback for the team,
          or just a doubt you want to clear, reach out. Every message is read by a real person.
        </p>

        {/* Chevron */}
        <a href="#contact-content" className="text-[#D4A043] opacity-70 hover:opacity-100 transition-opacity">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </section>

      {/* ── Contact Options + Form ── */}
      <section
        id="contact-content"
        className="w-full bg-white py-20 px-6"
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left – Contact Options */}
          <div>
            <p className="font-roboto text-[11px] font-semibold tracking-[3px] uppercase text-[#D4A043] mb-4">
              Contact Options
            </p>
            <h2 className="font-roboto font-bold text-[#0E182D] text-[clamp(1.6rem,2.5vw,2.1rem)] leading-[1.2] mb-4">
              Choose How You&apos;d Like<br />to Reach Us
            </h2>
            <p className="font-roboto text-[#64748B] text-sm leading-relaxed mb-10">
              Our support team is available Monday–Saturday, 9 AM – 8 PM IST. For
              urgent issues, use live chat.
            </p>

            <div className="flex flex-col gap-4">
              {contactOptions.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-xl border border-[#E8EDF3] hover:border-[#D4A043]/40 hover:shadow-sm transition-all"
                >
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-full flex-shrink-0"
                    style={{ background: opt.iconBg }}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <p className="font-roboto font-semibold text-[#0E182D] text-[0.95rem] mb-1">{opt.title}</p>
                    <p className="font-roboto text-[#64748B] text-sm leading-relaxed">{opt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Send a Message */}
          <div
            className="rounded-2xl p-8 shadow-[0_8px_40px_rgba(14,24,45,0.12)]"
            style={{ background: '#FFFFFF', border: '1px solid #E8EDF3' }}
          >
            <h3 className="font-roboto font-bold text-[#0E182D] text-2xl mb-1">Send a Message</h3>
            <p className="font-roboto text-[#64748B] text-sm mb-7">
              Fill in the form and we&apos;ll get back to you shortly.
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-roboto font-semibold">
                ✓ Message sent! We&apos;ll get back to you within 4 hours.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-xs font-semibold text-[#374151] tracking-wide uppercase">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Rahul"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    className="font-roboto text-[0.9rem] text-[#0E182D] placeholder-[#94A3B8] border border-[#D1D9E0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#D4A043] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-xs font-semibold text-[#374151] tracking-wide uppercase">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Sharma"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    className="font-roboto text-[0.9rem] text-[#0E182D] placeholder-[#94A3B8] border border-[#D1D9E0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#D4A043] transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="font-roboto text-xs font-semibold text-[#374151] tracking-wide uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="font-roboto text-[0.9rem] text-[#0E182D] placeholder-[#94A3B8] border border-[#D1D9E0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#D4A043] transition-colors"
                />
              </div>

              {/* Subject dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="font-roboto text-xs font-semibold text-[#374151] tracking-wide uppercase">
                  What&apos;s this about?
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.subject}
                    onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                    className="w-full appearance-none font-roboto text-[0.9rem] border border-[#D1D9E0] rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-[#D4A043] transition-colors cursor-pointer"
                    style={{
                      background: '#1C2E45',
                      color: formData.subject ? '#FFFFFF' : '#94A3B8',
                    }}
                  >
                    <option value="" disabled style={{ color: '#94A3B8', background: '#1C2E45' }}>Select a topic</option>
                    {subjectOptions.map(opt => (
                      <option key={opt} value={opt} style={{ color: '#FFFFFF', background: '#1C2E45' }}>{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="font-roboto text-xs font-semibold text-[#374151] tracking-wide uppercase">
                  Message
                </label>
                <textarea
                  rows={5}
                  placeholder="Tell us how we can help you..."
                  required
                  value={formData.message}
                  onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                  className="font-roboto text-[0.9rem] text-[#0E182D] placeholder-[#94A3B8] border border-[#D1D9E0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#D4A043] transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full font-roboto font-bold text-[#0E182D] text-base py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                style={{ background: '#D4A043' }}
              >
                Send Message
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="#0E182D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <p className="font-roboto text-xs text-center text-[#94A3B8]">
                By submitting, you agree to our{' '}
                <Link href="#" className="text-[#D4A043] hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── Stay Connected / Community ── */}
      <section
        className="w-full py-24 px-6"
        style={{ background: 'linear-gradient(93.39deg, #0E182D 10.35%, #1C2E45 95.5%)' }}
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left – Text */}
          <div>
            <p className="font-roboto text-[11px] font-semibold tracking-[3px] uppercase text-[#D4A043] mb-5">
              Stay Connected
            </p>
            <h2 className="font-roboto font-bold text-white text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.2] mb-3">
              Join the community that
            </h2>
            <h2
              className="font-roboto font-bold text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.2] mb-8"
              style={{ fontStyle: 'italic', color: '#D4A043' }}
            >
              never stops learning
            </h2>
            <p className="font-roboto text-[#94A3B8] text-[0.95rem] leading-relaxed max-w-md">
              50,000 aspirants. Daily discussions, live doubt sessions, notes,
              and the kind of peer support that keeps you going on the tough days.
            </p>
          </div>

          {/* Right – Community Links */}
          <div className="flex flex-col gap-4">
            {communityLinks.map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 p-5 rounded-xl hover:brightness-110 transition-all group"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  {link.icon}
                </div>
                <div className="flex-grow">
                  <p className="font-roboto font-semibold text-white text-[0.95rem]">{link.title}</p>
                  <p className="font-roboto text-[#94A3B8] text-sm">{link.subtitle}</p>
                </div>
                <svg
                  className="text-[#94A3B8] group-hover:text-[#D4A043] transition-colors flex-shrink-0"
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                >
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
