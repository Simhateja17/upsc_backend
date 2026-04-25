'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLLAPSED_ROUTE_PREFIXES = [
  '/dashboard/daily-answer/challenge',
  '/dashboard/daily-answer/challenge/attempt',
  '/dashboard/daily-mcq/challenge',
  '/dashboard/mock-tests/attempt',
  '/dashboard/test-series/attempt',
];

const Sidebar = ({ forceShow = false }: { forceShow?: boolean }) => {
  const pathname = usePathname();
  const isCollapsed = COLLAPSED_ROUTE_PREFIXES.some((p) => pathname?.startsWith(p));

  const navigationSections = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'overview', label: 'Overview', icon: '/sidebar-overview-new.png', path: '/dashboard' },
        { id: 'study-planner', label: 'Study Planner', icon: '/sidebar-study-planner.png', path: '/dashboard/study-planner' },
        { id: 'jeet-gpt', label: 'Jeet GPT', icon: '/sidebar-jeet-gpt.png', path: '/dashboard/jeet-gpt' },
        { id: 'syllabus-tracker', label: 'Syllabus Tracker', icon: '/sidebar-syllabus-new.png', path: '/dashboard/syllabus-tracker' },
      ],
    },
    {
      title: 'LEARNING',
      items: [
        { id: 'video-lectures', label: 'Video Lectures', icon: '/sidebar-video.png', path: '/dashboard/video-lectures' },
        { id: 'study-material', label: 'Study Material', icon: '/sidebar-study-material-new2.png', path: '/dashboard/library' },
        { id: 'current-affairs', label: 'Current Affairs', icon: '/sidebar-current-affairs.png', path: '/dashboard/daily-editorial' },
        { id: 'test-series', label: 'Test Series', icon: '/sidebar-test-series.png', path: '/dashboard/test-series' },
        { id: 'mentorship', label: 'Personal Mentorship', icon: '/sidebar-mentorship-new.png', path: '/dashboard/free-trial' },
      ],
    },
    {
      title: 'PRACTICE',
      items: [
        { id: 'daily-mcq', label: 'Daily MCQ', icon: '/sidebar-daily-mcq-new.png', path: '/dashboard/daily-mcq' },
        { id: 'daily-answer', label: 'Daily Answer Writing', icon: '/sidebar-daily-answer-new.png', path: '/dashboard/daily-answer' },
        { id: 'daily-editorial', label: 'Daily Editorial', icon: '/sidebar-current-affairs.png', path: '/dashboard/daily-editorial' },
        { id: 'mock-tests', label: 'Mock Tests', icon: '/sidebar-mock-tests-new.png', path: '/dashboard/mock-tests' },
        { id: 'pyq', label: 'Previous Year Questions', icon: '/sidebar-pyq-new.png', path: '/dashboard/pyq' },
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
        { id: 'spaced-repetition', label: 'Spaced Repetition', icon: '/sidebar-flashcards-new.png', path: '/dashboard/spaced-repetition' },
        { id: 'mindmap', label: 'Mindmaps', icon: '/sidebar-mindmap-new.png', path: '/dashboard/mindmap' },
      ],
    },
    {
      title: 'COMMUNITY',
      items: [
        { id: 'study-groups', label: 'Study Groups', icon: '/sidebar-mindmap.png', path: '/dashboard/study-groups' },
        { id: 'leaderboard', label: 'Leaderboard', icon: '/sidebar-study-groups.png', path: '/dashboard/leaderboard' },
        { id: 'discussion', label: 'Discussion', icon: '/sidebar-discussion.png', path: '/dashboard/discussion' },
        { id: 'qa-forum', label: 'Q&A Forum', icon: '/sidebar-qa-forum.png', path: '/dashboard/qa-forum' },
        { id: 'mental-health', label: 'Mental Health Buddy', icon: '/sidebar-mental-health-new.png', path: '/dashboard/mental-health' },
      ],
    },
  ];

  // Hide dashboard sidebar on Jeet GPT — it has its own sidebar (unless explicitly forced)
  if (!forceShow && pathname === '/dashboard/jeet-gpt') return null;

  const asideWidth = isCollapsed ? 'w-[60px] min-w-[60px]' : 'w-[260px] min-w-[260px]';

  return (
    <aside className={`${asideWidth} h-full bg-white overflow-y-auto flex-shrink-0`} style={{ boxShadow: '3px 0 12px rgba(0,0,0,0.06), 1px 0 3px rgba(0,0,0,0.04)', zIndex: 1, transition: 'width 200ms ease, min-width 200ms ease' }}>
      <nav className={isCollapsed ? 'pt-5 pb-8 px-2' : 'pt-5 pb-8 px-4'}>
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-5">
            {!isCollapsed && (
              <h3 className="text-[#999999] font-inter font-semibold text-[10px] uppercase tracking-[0.08em] mb-2 px-3">
                {section.title}
              </h3>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-[10px]
                      ${isCollapsed ? 'justify-center px-0 py-[9px]' : 'px-3 py-[9px]'}
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
                    {!isCollapsed && (
                      <span className="font-inter font-medium text-[13px] leading-none whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
