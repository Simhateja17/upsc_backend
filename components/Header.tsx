'use client';

import { useState } from 'react';
import Link from 'next/link';

// Dropdown menu items with Lucide-style icons
const dropdownMenus = {
  prepare: [
    { label: 'Study Planner', href: '/dashboard/study-planner', icon: 'calendar' },
    { label: 'Syllabus Tracker', href: '/dashboard/syllabus-tracker', icon: 'checklist' },
    { label: 'Video Lectures', href: '/dashboard/video-lectures', icon: 'video' },
  ],
  practice: [
    { label: 'Mock Tests', href: '/dashboard/mock-tests', icon: 'clock' },
    { label: 'Previous Year Questions', href: '/dashboard/pyq', icon: 'file-text' },
    { label: 'Test Series', href: '/dashboard/test-series', icon: 'layers' },
    { label: 'Daily MCQs', href: '/dashboard/daily-mcq', icon: 'help-circle' },
    { label: 'Daily Mains Answer', href: '/dashboard/daily-answer', icon: 'edit' },
  ],
  revision: [
    { label: 'Spaced Repetition', href: '/dashboard/spaced-repetition', icon: 'refresh' },
    { label: 'Flashcards', href: '/dashboard/flashcards', icon: 'layout' },
    { label: 'Mindmaps', href: '/dashboard/mindmap', icon: 'brain' },
    { label: 'Library', href: '/dashboard/library', icon: 'book-open' },
  ],
};

// Icon components
const icons = {
  calendar: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  checklist: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  'file-text': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  layers: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  'help-circle': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  edit: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  layout: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  brain: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.46 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 01-1.32-4.24 3 3 0 01-.34-5.58A2.5 2.5 0 019.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.46 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 001.32-4.24 3 3 0 00.34-5.58A2.5 2.5 0 0014.5 2z" />
    </svg>
  ),
  'book-open': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleDropdownEnter = (dropdown: string) => {
    setActiveDropdown(dropdown);
  };

  const handleDropdownLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <nav className="w-full bg-transparent absolute top-0 left-0 pt-4 pb-2 px-4 md:px-8 flex items-center justify-between z-50 border-b border-[#D8C784]/30 relative">
      {/* Logo Section */}
      <Link href="/" className="flex flex-col items-center flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo...png" alt="RiseWithJeet Logo" className="w-[62px] md:w-[62px] h-auto object-contain" />
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        {/* Jeet AI - Simple link */}
        <Link
          href="/dashboard/jeet-gpt"
          className="text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap"
        >
          Jeet AI
        </Link>

        {/* Daily Mains Challenge - Simple link */}
        <Link
          href="/dashboard/daily-answer/challenge"
          className="text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap"
        >
          Daily Mains Challenge
        </Link>

        {/* Prepare Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleDropdownEnter('prepare')}
          onMouseLeave={handleDropdownLeave}
        >
          <button className="flex items-center gap-1 text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap">
            Prepare
            {icons.chevronDown}
          </button>
          {activeDropdown === 'prepare' && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
              {dropdownMenus.prepare.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span className="text-blue-600">{icons[item.icon as keyof typeof icons]}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Practice Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleDropdownEnter('practice')}
          onMouseLeave={handleDropdownLeave}
        >
          <button className="flex items-center gap-1 text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap">
            Practice
            {icons.chevronDown}
          </button>
          {activeDropdown === 'practice' && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
              {dropdownMenus.practice.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span className="text-blue-600">{icons[item.icon as keyof typeof icons]}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Revision Tools Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleDropdownEnter('revision')}
          onMouseLeave={handleDropdownLeave}
        >
          <button className="flex items-center gap-1 text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap">
            Revision Tools
            {icons.chevronDown}
          </button>
          {activeDropdown === 'revision' && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
              {dropdownMenus.revision.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span className="text-blue-600">{icons[item.icon as keyof typeof icons]}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Community - Simple link */}
        <Link
          href="/community"
          className="text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap"
        >
          Community
        </Link>

        {/* Pricing - Simple link */}
        <Link
          href="/pricing"
          className="text-white text-sm lg:text-lg font-serif font-semibold hover:text-[#F5C75D] transition-colors whitespace-nowrap"
        >
          Pricing
        </Link>
      </div>

      {/* Desktop Auth Buttons */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login?tab=login"
          className="px-4 py-2 border-2 border-white text-white text-sm font-semibold rounded-md hover:bg-white hover:text-black transition-all duration-200 whitespace-nowrap"
        >
          Login
        </Link>
        <Link
          href="/login?tab=signup"
          className="px-4 py-2 bg-[#F5C75D] text-black text-sm font-semibold rounded-md hover:bg-[#FFC557] transition-all duration-200 whitespace-nowrap"
        >
          Sign Up
        </Link>
      </div>

      {/* Mobile: Auth buttons (compact) + Hamburger */}
      <div className="flex md:hidden items-center gap-2">
        <Link
          href="/login?tab=login"
          className="px-3 py-1.5 border border-white text-white text-xs font-semibold rounded-md hover:bg-white hover:text-black transition-all duration-200"
        >
          Login
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2L18 18M18 2L2 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6H19M3 11H19M3 16H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#0E182D]/95 backdrop-blur-sm border-t border-[#D8C784]/20 flex flex-col z-50 shadow-xl max-h-[80vh] overflow-y-auto">
          {/* Simple Links */}
          <Link
            href="/dashboard/jeet-gpt"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white text-base font-serif font-semibold hover:text-[#F5C75D] hover:bg-white/5 transition-colors px-6 py-3 border-b border-white/5"
          >
            Jeet AI
          </Link>
          <Link
            href="/dashboard/daily-answer/challenge"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white text-base font-serif font-semibold hover:text-[#F5C75D] hover:bg-white/5 transition-colors px-6 py-3 border-b border-white/5"
          >
            Daily Mains Challenge
          </Link>

          {/* Prepare Section */}
          <div className="border-b border-white/5">
            <div className="px-6 py-3 text-[#F5C75D] font-semibold text-sm uppercase tracking-wider">Prepare</div>
            {dropdownMenus.prepare.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-2.5 text-white/80 hover:text-[#F5C75D] hover:bg-white/5 transition-colors text-sm"
              >
                <span className="text-[#F5C75D]">{icons[item.icon as keyof typeof icons]}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Practice Section */}
          <div className="border-b border-white/5">
            <div className="px-6 py-3 text-[#F5C75D] font-semibold text-sm uppercase tracking-wider">Practice</div>
            {dropdownMenus.practice.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-2.5 text-white/80 hover:text-[#F5C75D] hover:bg-white/5 transition-colors text-sm"
              >
                <span className="text-[#F5C75D]">{icons[item.icon as keyof typeof icons]}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Revision Tools Section */}
          <div className="border-b border-white/5">
            <div className="px-6 py-3 text-[#F5C75D] font-semibold text-sm uppercase tracking-wider">Revision Tools</div>
            {dropdownMenus.revision.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-2.5 text-white/80 hover:text-[#F5C75D] hover:bg-white/5 transition-colors text-sm"
              >
                <span className="text-[#F5C75D]">{icons[item.icon as keyof typeof icons]}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Simple Links */}
          <Link
            href="/community"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white text-base font-serif font-semibold hover:text-[#F5C75D] hover:bg-white/5 transition-colors px-6 py-3 border-b border-white/5"
          >
            Community
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white text-base font-serif font-semibold hover:text-[#F5C75D] hover:bg-white/5 transition-colors px-6 py-3 border-b border-white/5"
          >
            Pricing
          </Link>

          <div className="px-6 py-4 flex items-center gap-3">
            <Link
              href="/login?tab=signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center px-4 py-2.5 bg-[#F5C75D] text-black text-sm font-semibold rounded-md hover:bg-[#FFC557] transition-all duration-200"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
