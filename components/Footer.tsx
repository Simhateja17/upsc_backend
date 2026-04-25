'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCmsContent } from '@/hooks/useCmsContent';

const defaultFooterLinks = {
  company: ['About Us', 'How it works', 'Popular Course', 'Services'],
  courses: ['Categories', 'Offline Course', 'Video Course'],
  support: ['FAQ', 'Help Center', 'Career', 'Privacy Policy'],
};

const defaultContactInfo = {
  whatsapp: '+91 83570 56891',
  whatsapp_link: 'https://wa.me/918357056891',
  telegram_handle: '@togetherrisewithjeet',
  telegram_link: 'https://t.me/togetherrisewithjeet',
};

const footerLinkClass = 'footer-nav-link font-roboto font-normal text-white text-[25px] leading-[100%] whitespace-nowrap';

const normalizeFooterLabel = (label: string) => {
  const map: Record<string, string> = {
    'Our Story': 'About Us',
    'How to work?': 'How it works',
    'Populer Course': 'Popular Course',
    'Service': 'Services',
    'Ofline Course': 'Offline Course',
    'Vidio Course': 'Video Course',
    'Your Privacy Matters': 'Privacy Policy',
  };
  return map[label] || label;
};

const defaults = {
  footer_contact_title: 'Still have some doubt?',
  footer_contact_subtitle: "Let's solve it together. Get personal guidance from our mentors and experts.",
  footer_links: defaultFooterLinks,
  footer_contact_info: defaultContactInfo,
};

const Footer = () => {
  const [showModal, setShowModal] = useState(false);
  const { get } = useCmsContent('home', defaults);
  const footerLinks = get('footer_links', defaultFooterLinks);
  const contactInfo = get('footer_contact_info', defaultContactInfo);

  return (
    <footer className="w-full relative overflow-hidden bg-[#F8FAFC]">
      {/* 1. Contact Section - Card Style */}
      <div
        className="w-full flex justify-center"
        style={{
          paddingTop: 'clamp(2rem, 5vw, 70px)',
          paddingBottom: 'clamp(2rem, 5vw, 70px)',
          paddingLeft: 'clamp(1rem, 4vw, 60px)',
          paddingRight: 'clamp(1rem, 4vw, 60px)',
        }}
      >
        {/* Card Container */}
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            maxWidth: '900px',
            padding: 'clamp(2rem, 4vw, 50px) clamp(2rem, 5vw, 60px)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 245, 255, 0.9) 100%)',
            border: '1px solid rgba(200, 210, 230, 0.5)',
            boxShadow: '0 8px 40px rgba(100, 120, 180, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #c7d2fe, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #a5b4fc, transparent 70%)' }}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Heading */}
            <h2
              className="font-plus-jakarta font-bold text-[#1C2E45]"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                lineHeight: '140%',
                marginBottom: 'clamp(0.5rem, 1vw, 0.75rem)',
              }}
            >
              {get('footer_contact_title')}
            </h2>

            {/* Subtext */}
            <p
              className="font-inter text-[#64748B]"
              style={{
                fontSize: 'clamp(0.9rem, 1.1vw, 1.1rem)',
                lineHeight: '160%',
                marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
              }}
            >
              {get('footer_contact_subtitle')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg"
                style={{
                  padding: 'clamp(0.7rem, 1vw, 0.85rem) clamp(1.25rem, 2vw, 1.75rem)',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  borderRadius: '50px',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span
                  className="font-plus-jakarta font-semibold text-white"
                  style={{ fontSize: 'clamp(0.85rem, 1vw, 1rem)' }}
                >
                  Contact us
                </span>
              </button>

              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-2 text-[#64748B] hover:text-[#6366F1] transition-colors"
                style={{ fontSize: 'clamp(0.85rem, 1vw, 1rem)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-inter">or send an email</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-plus-jakarta font-bold text-[#1C2E45] text-xl">Get in touch</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Contact Options */}
            <div className="flex flex-col gap-3">
              {/* Email */}
              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6366F1]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6L12 13L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-plus-jakarta font-semibold text-[#1C2E45]">Email us</p>
                  <p className="font-inter text-sm text-[#6366F1]">{contactInfo.email}</p>
                </div>
              </a>

              {/* Phone */}
              <a
                href={`tel:${contactInfo.phone}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6366F1]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92V19.92C22 20.48 21.56 20.93 21 20.98C20.65 21.01 20.31 21.03 19.96 21.03C10.52 21.03 2.97 13.48 2.97 4.04C2.97 3.69 2.99 3.35 3.02 3C3.07 2.44 3.52 2 4.08 2H7.08C7.59 2 8.03 2.39 8.08 2.9C8.12 3.36 8.2 3.81 8.32 4.24C8.45 4.7 8.33 5.2 7.99 5.54L6.54 6.99C7.92 9.63 10.08 11.79 12.72 13.17L14.17 11.72C14.51 11.38 15.01 11.26 15.47 11.39C15.9 11.51 16.35 11.59 16.81 11.63C17.32 11.68 17.71 12.12 17.71 12.63V15.63C17.71 16.19 17.27 16.64 16.71 16.69C16.36 16.72 16.02 16.74 15.67 16.74C14.58 16.74 13.52 16.59 12.51 16.31" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-plus-jakarta font-semibold text-[#1C2E45]">Call us</p>
                  <p className="font-inter text-sm text-[#6366F1]">{contactInfo.phone}</p>
                </div>
              </a>

              {/* Response Time */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6366F1]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-plus-jakarta font-semibold text-[#1C2E45]">Response time</p>
                  <p className="font-inter text-sm text-gray-500">Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Footer - Full Width Dark Section */}
      <div
        className="w-full flex justify-center items-start pt-[80px] pb-[80px]"
        style={{
          background: 'linear-gradient(93.39deg, #0E182D 10.35%, #1C2E45 95.5%)',
          minHeight: '446px',
        }}
      >
        <div className="w-full max-w-[1920px] px-8 md:px-16 flex flex-col lg:flex-row justify-between items-start gap-12 lg:gap-0">

          {/* Logo Section */}
          <div className="flex-shrink-0">
            <div className="relative w-[171px] h-[137px]">
              <Image
                src="/footer-logo.png"
                alt="RiseWithJeet"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Links Container */}
          <div className="flex-grow grid w-full lg:w-auto grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-10 md:gap-14 xl:gap-20">

            {/* Company Column */}
            <div className="flex flex-col gap-6">
              <h3 className="font-roboto font-semibold text-white text-[30px] leading-[100%]">Company</h3>
              <ul className="flex flex-col gap-5">
                {(footerLinks.company || defaultFooterLinks.company).map((link: string, i: number) => (
                  <li key={i}>
                    {(() => {
                      const fixedLink = normalizeFooterLabel(link);
                      const href = fixedLink === 'About Us' ? '/our-story' : '#';
                      return (
                    <a
                      href={href}
                      className={footerLinkClass}
                    >
                      {fixedLink}
                    </a>
                      );
                    })()}
                  </li>
                ))}
              </ul>

              {/* Telegram QR Code */}
              <div className="mt-4">
                <a
                  href={contactInfo.telegram_link || defaultContactInfo.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-[100px] h-[100px] rounded-lg overflow-hidden hover:scale-105 transition-transform"
                >
                  <Image
                    src="/telegram-qr.png"
                    alt="Join our Telegram Community @RISEWITHJEET"
                    width={100}
                    height={100}
                    className="object-cover"
                  />
                </a>
              </div>
            </div>

            {/* Courses Column */}
            <div className="flex flex-col gap-6">
              <h3 className="font-roboto font-semibold text-white text-[30px] leading-[100%]">Courses</h3>
              <ul className="flex flex-col gap-5">
                {(footerLinks.courses || defaultFooterLinks.courses).map((link: string, i: number) => (
                  <li key={i}><a href="#" className={footerLinkClass}>{normalizeFooterLabel(link)}</a></li>
                ))}
              </ul>
            </div>

            {/* Support Column */}
            <div className="flex flex-col gap-6">
              <h3 className="font-roboto font-semibold text-white text-[30px] leading-[100%]">Support</h3>
              <ul className="flex flex-col gap-5">
                {(footerLinks.support || defaultFooterLinks.support).map((link: string, i: number) => (
                  <li key={i}>
                    {(() => {
                      const fixedLink = normalizeFooterLabel(link);
                      const href = fixedLink === 'Privacy Policy' ? '/privacy' : fixedLink === 'Terms of Service' ? '/terms' : fixedLink === 'Cookie Policy' ? '/cookies' : fixedLink === 'Refund Policy' ? '/refund' : fixedLink === 'FAQ' ? '/faq' : '#';
                      return (
                    <Link
                      href={href}
                      className={footerLinkClass}
                    >
                      {fixedLink}
                    </Link>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us Column */}
            <div className="flex flex-col gap-6">
              <a href="/contact" className="font-roboto font-semibold text-white text-[30px] leading-[100%] hover:text-[#FFD170] transition-colors">Contact Us</a>
              <div className="flex flex-col gap-5">
                <div>
                  <div className="contact-label">WHATSAPP</div>
                  <a href={contactInfo.whatsapp_link || defaultContactInfo.whatsapp_link} target="_blank" rel="noopener noreferrer" className="contact-value">
                    <span>💬</span>
                    <span>{contactInfo.whatsapp || defaultContactInfo.whatsapp}</span>
                  </a>
                  <a href={contactInfo.whatsapp_link || defaultContactInfo.whatsapp_link} target="_blank" rel="noopener noreferrer" className="contact-pill contact-pill-wa">
                    <span>🟢</span>
                    <span>Text on WhatsApp</span>
                  </a>
                </div>
                <div>
                  <div className="contact-label">TELEGRAM SUPPORT</div>
                  <a href={contactInfo.telegram_link || defaultContactInfo.telegram_link} target="_blank" rel="noopener noreferrer" className="contact-value">
                    <span>📨</span>
                    <span>{contactInfo.telegram_handle || defaultContactInfo.telegram_handle}</span>
                  </a>
                  <a href={contactInfo.telegram_link || defaultContactInfo.telegram_link} target="_blank" rel="noopener noreferrer" className="contact-pill contact-pill-tg">
                    <span>🔵</span>
                    <span>Join Telegram Community</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <style jsx>{`
        .footer-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          transition: color 0.13s ease, padding-left 0.15s ease, transform 0.15s ease;
        }
        .footer-nav-link::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%) scale(0.7);
          width: 0;
          height: 0;
          border-left: 3.5px solid #ffd170;
          border-top: 2.5px solid transparent;
          border-bottom: 2.5px solid transparent;
          opacity: 0;
          transition: opacity 0.13s ease, transform 0.15s ease;
        }
        .footer-nav-link:hover {
          color: #ffd170;
          padding-left: 11px;
          transform: translateY(-1px);
        }
        .footer-nav-link:hover::before {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }
        .contact-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
        }
        .contact-value {
          display: flex;
          gap: 8px;
          align-items: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(18px, 1.5vw, 32px);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.88);
          text-decoration: none;
          transition: color 0.15s ease;
          margin-bottom: 8px;
          width: fit-content;
        }
        .contact-value:hover {
          color: #ffd170;
        }
        .contact-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }
        .contact-pill-wa {
          color: #4ade80;
          background: rgba(37, 211, 102, 0.12);
          border-color: rgba(37, 211, 102, 0.28);
        }
        .contact-pill-wa:hover {
          background: rgba(37, 211, 102, 0.2);
          border-color: rgba(37, 211, 102, 0.45);
        }
        .contact-pill-tg {
          color: #7dd3fc;
          background: rgba(41, 182, 246, 0.12);
          border-color: rgba(41, 182, 246, 0.28);
        }
        .contact-pill-tg:hover {
          background: rgba(41, 182, 246, 0.2);
          border-color: rgba(41, 182, 246, 0.45);
        }
      `}</style>
    </footer>
  );
};

export default Footer;
