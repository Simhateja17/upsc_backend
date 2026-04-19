'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: '📊' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { id: 'pyq', label: 'PYQ Manager', path: '/admin/pyq', icon: '📚' },
      { id: 'daily-content', label: 'Daily Content', path: '/admin/daily-content', icon: '📅' },
      { id: 'editorials', label: 'Editorials', path: '/admin/editorials', icon: '📰' },
      { id: 'videos', label: 'Video Lectures', path: '/admin/videos', icon: '🎥' },
      { id: 'flashcards', label: 'Flashcards', path: '/admin/flashcards', icon: '🃏' },
      { id: 'mindmaps', label: 'Mindmaps', path: '/admin/mindmaps', icon: '🗺️' },
      { id: 'spaced-rep', label: 'Spaced Rep', path: '/admin/spaced-repetition', icon: '🔁' },
      { id: 'test-series', label: 'Test Series', path: '/admin/test-series', icon: '🏆' },
      { id: 'rag-manager', label: 'RAG Manager', path: '/admin/rag-manager', icon: '🧠' },
    ],
  },
  {
    title: 'CMS',
    items: [
      { id: 'cms-hub', label: 'Content Hub', path: '/admin/cms/hub', icon: '🏠' },
      { id: 'cms-home', label: 'Home Page', path: '/admin/cms/home', icon: '🏡' },
      { id: 'cms-login', label: 'Login Page', path: '/admin/cms/login', icon: '🔑' },
      {
        id: 'cms-dashboard',
        label: 'Dashboard Pages',
        path: '/admin/cms/dashboard',
        icon: '📋',
        children: [
          { id: 'cms-dash-overview', label: 'Overview', path: '/admin/cms/dashboard', icon: '📊' },
          { id: 'cms-dash-mcq', label: 'Daily MCQ', path: '/admin/cms/dashboard%2Fdaily-mcq', icon: '✅' },
          { id: 'cms-dash-answer', label: 'Daily Answer', path: '/admin/cms/dashboard%2Fdaily-answer', icon: '✍️' },
          { id: 'cms-dash-editorial', label: 'Editorial', path: '/admin/cms/dashboard%2Fdaily-editorial', icon: '📰' },
          { id: 'cms-dash-mock', label: 'Mock Tests', path: '/admin/cms/dashboard%2Fmock-tests', icon: '📝' },
          { id: 'cms-dash-test-series', label: 'Test Series', path: '/admin/cms/dashboard%2Ftest-series', icon: '🏆' },
          { id: 'cms-dash-library', label: 'Library', path: '/admin/cms/dashboard%2Flibrary', icon: '📖' },
          { id: 'cms-dash-video', label: 'Video Lectures', path: '/admin/cms/dashboard%2Fvideo-lectures', icon: '🎥' },
          { id: 'cms-dash-jeet', label: 'Jeet GPT', path: '/admin/cms/dashboard%2Fjeet-gpt', icon: '⚡' },
          { id: 'cms-dash-planner', label: 'Study Planner', path: '/admin/cms/dashboard%2Fstudy-planner', icon: '📆' },
          { id: 'cms-dash-pyq', label: 'PYQ Bank', path: '/admin/cms/dashboard%2Fpyq', icon: '🗂️' },
          { id: 'cms-dash-perf', label: 'Performance', path: '/admin/cms/dashboard%2Fperformance', icon: '📈' },
        ],
      },
      { id: 'cms-all', label: 'All Pages', path: '/admin/cms', icon: '📄' },
    ],
  },
  {
    title: 'PLATFORM',
    items: [
      { id: 'testimonials', label: 'Testimonials', path: '/admin/testimonials', icon: '⭐' },
      { id: 'pricing', label: 'Pricing Plans', path: '/admin/pricing', icon: '💳' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'users', label: 'Users', path: '/admin/users', icon: '👥' },
    ],
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ isOpen = false, onClose }: AdminSidebarProps) => {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    if (path === '/admin/cms') return pathname === '/admin/cms';
    return pathname.startsWith(path);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-expand group if a child is active
  const isGroupActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.path));
  };

  const renderItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedGroups[item.id] || isGroupActive(item);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => toggleGroup(item.id)}
            className={`
              w-full flex items-center gap-[clamp(0.5rem,0.7vw,0.75rem)]
              px-[clamp(0.5rem,0.625vw,0.75rem)]
              py-[clamp(0.4rem,0.5vw,0.55rem)]
              rounded-lg transition-all duration-200
              ${active ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'text-[#374151] hover:bg-gray-50'}
            `}
          >
            <span style={{ fontSize: 'clamp(14px, 0.9vw, 17px)' }}>{item.icon}</span>
            <span className="font-inter font-medium flex-1 text-left" style={{ fontSize: 'clamp(12px, 0.8vw, 14px)' }}>
              {item.label}
            </span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              style={{ color: '#9CA3AF' }}
            >
              <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {expanded && (
            <ul className="mt-0.5 space-y-0.5 ml-3 border-l border-gray-100 pl-2">
              {item.children!.map((child) => renderItem(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.id}>
        <Link
          href={item.path}
          className={`
            flex items-center gap-[clamp(0.4rem,0.6vw,0.65rem)]
            px-[clamp(0.5rem,0.625vw,0.75rem)]
            py-[clamp(0.35rem,0.45vw,0.5rem)]
            rounded-lg transition-all duration-200
            ${active ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'text-[#374151] hover:bg-gray-50 hover:text-[#17223E]'}
          `}
        >
          <span style={{ fontSize: depth > 0 ? 'clamp(12px, 0.75vw, 15px)' : 'clamp(14px, 0.9vw, 17px)' }}>{item.icon}</span>
          <span
            className="font-inter font-medium"
            style={{ fontSize: depth > 0 ? 'clamp(12px, 0.75vw, 13px)' : 'clamp(13px, 0.85vw, 15px)' }}
          >
            {item.label}
          </span>
        </Link>
      </li>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Admin Badge */}
      <div className="px-[clamp(1rem,1.2vw,1.5rem)] pt-[clamp(1.5rem,2vw,2rem)] pb-[clamp(0.75rem,1vw,1rem)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
        >
          <span style={{ fontSize: 'clamp(11px, 0.7vw, 13px)', color: '#1D4ED8', fontWeight: 600 }}>
            ADMIN PANEL
          </span>
        </div>
      </div>

      <nav className="py-[clamp(0.5rem,1vw,1rem)] px-[clamp(0.75rem,1vw,1rem)] flex-1 overflow-y-auto">
        {navigationSections.map((section, idx) => (
          <div key={idx} className="mb-[clamp(1.25rem,1.5vw,1.75rem)]">
            <h3
              className="font-inter font-medium uppercase tracking-wider mb-[clamp(0.4rem,0.6vw,0.6rem)] px-[clamp(0.5rem,0.625vw,0.75rem)]"
              style={{ color: '#9CA3AF', fontSize: 'clamp(10px, 0.6vw, 11px)', letterSpacing: '0.08em' }}
            >
              {section.title}
            </h3>
            <ul className="space-y-[clamp(1px,0.2vw,3px)]">
              {section.items.map((item) => renderItem(item))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Back to Dashboard */}
      <div className="px-[clamp(0.75rem,1vw,1rem)] pb-[clamp(1rem,1.5vw,2rem)]">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-gray-50 hover:text-[#374151] transition-colors"
          style={{ fontSize: 'clamp(12px, 0.8vw, 14px)' }}
        >
          <span>←</span>
          <span className="font-inter font-medium">Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[clamp(240px,14vw,280px)] h-full bg-white overflow-y-auto flex-shrink-0"
        style={{ boxShadow: '3px 0 12px rgba(0,0,0,0.06)', zIndex: 1 }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer */}
        <aside
          className={`fixed left-0 top-0 h-full w-[280px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-inter font-semibold text-[#1D4ED8] text-sm uppercase tracking-wide">Admin Panel</span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="h-[calc(100%-56px)]">
            <SidebarContent />
          </div>
        </aside>
      </div>
    </>
  );
};

export default AdminSidebar;
