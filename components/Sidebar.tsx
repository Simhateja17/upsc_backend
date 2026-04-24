'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  forceShow?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationSections = [
  {
    title: 'DASHBOARD',
    items: [
      { id: 'overview', label: 'Overview', icon: '/sidebar-overview.png', path: '/dashboard' },
      { id: 'study-planner', label: 'Study Planner', icon: '/sidebar-study-planner.png', path: '/dashboard/study-planner' },
      { id: 'jeet-ai', label: 'Jeet AI', icon: '/sidebar-jeet-gpt.png', path: '/dashboard/jeet-gpt' },
      { id: 'syllabus-tracker', label: 'Syllabus Tracker', icon: '/sidebar-syllabus-new.png', path: '/dashboard/syllabus-tracker' },
    ],
  },
  {
    title: 'PREPARE',
    items: [
      { id: 'video-lectures', label: 'Video Lectures', icon: '/sidebar-video.png', path: '/dashboard/video-lectures' },
      { id: 'study-material', label: 'Study Material', icon: '/sidebar-study-material-new2.png', path: '/dashboard/library' },
      { id: 'current-affairs', label: 'Current Affairs', icon: '/sidebar-current-affairs.png', path: '/dashboard/current-affairs' },
      { id: 'test-series', label: 'Test Series', icon: '/sidebar-test-series.png', path: '/dashboard/test-series' },
      { id: 'mentorship', label: 'Personal Mentorship', icon: '/sidebar-mentorship-new.png', path: '/dashboard/free-trial' },
    ],
  },
  {
    title: 'PRACTICE',
    items: [
      { id: 'daily-mcq', label: 'Daily MCQ', icon: '/sidebar-daily-mcq-new.png', path: '/dashboard/daily-mcq' },
      { id: 'daily-answer', label: 'Daily Answer Writing', icon: '/sidebar-daily-answer-new.png', path: '/dashboard/daily-answer' },
      { id: 'mock-tests', label: 'Mock Tests', icon: '/sidebar-mock-tests-new.png', path: '/dashboard/mock-tests' },
      { id: 'pyq', label: 'Previous Year Questions', icon: '/sidebar-pyq.png', path: '/dashboard/pyq' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'performance', label: 'Performance Analytics', icon: '/sidebar-performance-new.png', path: '/dashboard/performance' },
      { id: 'test-analytics', label: 'Test Analytics', icon: '/sidebar-analytics-new.png', path: '/dashboard/test-analytics' },
    ],
  },
  {
    title: 'REVISION TOOLS',
    items: [
      { id: 'flashcards', label: 'Flashcards', icon: '/sidebar-flashcards-new.png', path: '/dashboard/flashcards' },
      { id: 'mindmap', label: 'Mindmaps', icon: '/sidebar-mindmap-new.png', path: '/dashboard/mindmap' },
      { id: 'spaced-repetition', label: 'Spaced Repetition', icon: '/sidebar-spaced-repetition.png', path: '/dashboard/spaced-repetition' },
    ],
  },
  {
    title: 'COMMUNITY',
    items: [
      { id: 'study-groups', label: 'Study Groups', icon: '/sidebar-mindmap.png', path: '/dashboard/study-groups' },
      { id: 'leaderboard', label: 'Leaderboard', icon: '/sidebar-study-groups.png', path: '/dashboard/leaderboard' },
      { id: 'discussion', label: 'Discussion Forum', icon: '/sidebar-discussion.png', path: '/dashboard/discussion' },
      { id: 'mental-health', label: 'Mental Health Buddy', icon: '/sidebar-mental-health-new.png', path: '/dashboard/mental-health' },
    ],
  },
];

const NavContent = ({ pathname, onClose }: { pathname: string; onClose?: () => void }) => (
  <nav className="pt-5 pb-8 px-4">
    {navigationSections.map((section, sectionIndex) => (
      <div key={sectionIndex} className="mb-5">
        <h3 className="text-[#999999] font-inter font-semibold text-[10px] uppercase tracking-[0.08em] mb-2 px-3">
          {section.title}
        </h3>
        <ul className="space-y-0.5">
          {section.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-[10px]
                  px-3 py-[9px]
                  rounded-[6px]
                  transition-all duration-200
                  ${
                    pathname === item.path
                      ? 'bg-[#EFF6FF] text-[#17223E]'
                      : 'text-[#1A1A1A] hover:bg-gray-50 hover:text-[#17223E]'
                  }
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-[18px] h-[18px] flex-shrink-0 object-contain"
                />
                <span className="font-inter font-medium text-[13px] leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
);

const Sidebar = ({ forceShow = false, isOpen = false, onClose }: SidebarProps) => {
  const pathname = usePathname();

  // Hide dashboard sidebar on Jeet AI — it has its own sidebar (unless explicitly forced)
  if (!forceShow && pathname === '/dashboard/jeet-gpt') return null;

  return (
    <>
      {/* ── Desktop sidebar: always visible on lg+ ── */}
      <aside
        className="hidden lg:flex w-[260px] min-w-[260px] h-full bg-white overflow-y-auto flex-shrink-0"
        style={{ boxShadow: '3px 0 12px rgba(0,0,0,0.06), 1px 0 3px rgba(0,0,0,0.04)', zIndex: 1 }}
      >
        <div className="w-full">
          <NavContent pathname={pathname} />
        </div>
      </aside>

      {/* ── Mobile drawer: slide in from left on < lg ── */}
      <div className="lg:hidden">
        {/* Backdrop overlay — tap to close */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer panel — full height, 80% width max 300px */}
        <aside
          className={`fixed left-0 top-0 h-[100dvh] z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: 'min(300px, 85vw)' }}
        >
          {/* Header row with logo area + close button */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(to right, #0E182D, #17223E)' }}
          >
            <span className="font-inter font-semibold text-white text-sm tracking-wide">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
              aria-label="Close navigation menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Scrollable nav content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <NavContent pathname={pathname} onClose={onClose} />
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
