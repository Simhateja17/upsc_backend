'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AdminSidebar = () => {
  const pathname = usePathname();

  const navigationSections = [
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

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <aside
      className="w-[clamp(240px,14vw,280px)] h-screen bg-white overflow-y-auto sticky top-0 left-0 flex flex-col"
      style={{ boxShadow: '3px 0 12px rgba(0,0,0,0.06)', zIndex: 1 }}
    >
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

      <nav className="py-[clamp(0.5rem,1vw,1rem)] px-[clamp(0.75rem,1vw,1rem)] flex-1">
        {navigationSections.map((section, idx) => (
          <div key={idx} className="mb-[clamp(1.5rem,2vw,2rem)]">
            <h3
              className="font-inter font-medium uppercase tracking-wider mb-[clamp(0.5rem,0.8vw,0.75rem)] px-[clamp(0.5rem,0.625vw,0.75rem)]"
              style={{ color: '#9CA3AF', fontSize: 'clamp(10px, 0.65vw, 12px)', letterSpacing: '0.08em' }}
            >
              {section.title}
            </h3>
            <ul className="space-y-[clamp(2px,0.3vw,4px)]">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.path}
                    className={`
                      flex items-center gap-[clamp(0.5rem,0.7vw,0.75rem)]
                      px-[clamp(0.5rem,0.625vw,0.75rem)]
                      py-[clamp(0.5rem,0.6vw,0.65rem)]
                      rounded-lg
                      transition-all duration-200
                      ${
                        isActive(item.path)
                          ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'text-[#374151] hover:bg-gray-50 hover:text-[#17223E]'
                      }
                    `}
                  >
                    <span style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>{item.icon}</span>
                    <span
                      className="font-inter font-medium"
                      style={{ fontSize: 'clamp(13px, 0.85vw, 16px)' }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Back to Dashboard */}
      <div className="px-[clamp(0.75rem,1vw,1rem)] pb-[clamp(1rem,1.5vw,2rem)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-gray-50 hover:text-[#374151] transition-colors"
          style={{ fontSize: 'clamp(12px, 0.8vw, 14px)' }}
        >
          <span>←</span>
          <span className="font-inter font-medium">Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
