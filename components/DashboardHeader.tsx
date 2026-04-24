'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    icon: '🔥',
    title: '47-day streak! Top 8% of aspirants',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    icon: '✅',
    title: 'Your answer has been evaluated — Score: 7.5/10',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '3',
    icon: '📰',
    title: "Today's current affairs are ready",
    time: 'This morning',
    read: true,
  },
  {
    id: '4',
    icon: '📌',
    title: 'New mock test available — GS Prelims Test 15',
    time: 'Yesterday',
    read: true,
  },
];

const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationModalRef = useRef<HTMLDivElement>(null);
  const isUpgradeActive = pathname === '/dashboard/free-trial' || pathname.startsWith('/dashboard/free-trial/');
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notificationModalRef.current && !notificationModalRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get display name
  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || 'User';

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <header className="w-full h-[clamp(56px,5.78vw,111px)] bg-gradient-to-r from-[#0E182D] to-[#17223E] flex items-center justify-between px-3 md:px-[clamp(1rem,2vw,2.5rem)] sticky top-0 z-50">
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger button — visible on mobile/tablet only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H19M3 11H19M3 16H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <Link href="/dashboard" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo...png"
            alt="RiseWithJeet Logo"
            className="w-[62px] h-[62px] object-contain"
          />
        </Link>
      </div>

      {/* Right Section - Upgrade + Bell + User Avatar */}
      <div className="flex items-center gap-3 md:gap-[clamp(1rem,1.5vw,2rem)]">
        {/* Upgrade Button */}
        <Link href="/dashboard/free-trial" className="hidden sm:block">
          <button
            className="inline-flex items-center gap-1.5 group"
            style={{
              padding: 'clamp(8px,0.7vw,12px) clamp(16px,1.2vw,24px)',
              borderRadius: '12px',
              border: isUpgradeActive ? '1.5px solid #FFD170' : '1.5px solid rgba(255,209,112,0.25)',
              background: 'transparent',
              color: '#FFD170',
              fontFamily: '"SF Pro", -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: 'clamp(13px, 1.1vw, 18px)',
              fontWeight: 600,
              lineHeight: '110%',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              boxShadow: isUpgradeActive ? '0 0 12px rgba(255,209,112,0.18)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#FFD170';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(255,209,112,0.18)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = isUpgradeActive ? '#FFD170' : 'rgba(255,209,112,0.25)';
              (e.currentTarget as HTMLElement).style.boxShadow = isUpgradeActive ? '0 0 12px rgba(255,209,112,0.18)' : 'none';
            }}
          >
            Upgrade
            <span style={{ fontSize: 'clamp(14px, 1.2vw, 20px)' }}>✨</span>
          </button>
        </Link>

        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifications((prev) => !prev)}
          className="relative flex items-center justify-center w-[clamp(38px,2.8vw,48px)] h-[clamp(38px,2.8vw,48px)] rounded-xl bg-[#1a2540] text-white hover:bg-[#243050] transition-colors flex-shrink-0"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill="currentColor"/>
            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" fill="currentColor"/>
          </svg>
          {/* Notification dot */}
          {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>

        {/* User Avatar - Simple gold circle with initials */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-[clamp(38px,2.8vw,48px)] h-[clamp(38px,2.8vw,48px)] rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity font-serif font-bold text-[#0E182D]"
            style={{
              background: 'linear-gradient(135deg, #FFD170 0%, #D4A843 100%)',
              fontSize: 'clamp(14px, 1.1vw, 18px)',
            }}
          >
            {initials}
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-2 z-50"
              style={{
                width: 'min(448px, calc(100vw - 1rem))',
                borderRadius: '16px',
                background: '#FFFFFF',
                borderTop: '0.8px solid #E2E8F0',
                boxShadow: '0px 4px 6px -4px #0000001A, 0px 10px 15px -3px #0000001A',
              }}
            >
              {/* User Info Section */}
              <div className="px-6 pt-8 pb-6">
                <div className="font-inter font-medium text-[18px] leading-[28px] text-[#1E293B]">
                  {displayName}
                </div>
                <div className="font-inter text-[14px] leading-[20px] text-[#94A3B8] mt-0.5">
                  {user?.email || ''}
                </div>
              </div>

              <hr className="border-[#E2E8F0] mx-0" />

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/human.png" alt="" className="w-6 h-6 object-contain" />
                  <span className="font-inter font-medium text-[18px] leading-[28px] text-[#45556C]">
                    My Profile
                  </span>
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/sett.png" alt="" className="w-6 h-6 object-contain" />
                  <span className="font-inter font-medium text-[18px] leading-[28px] text-[#45556C]">
                    Account Settings
                  </span>
                </Link>

                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/card.png" alt="" className="w-6 h-6 object-contain" />
                  <span className="font-inter font-medium text-[18px] leading-[28px] text-[#45556C]">
                    Billing
                  </span>
                </Link>

                <Link
                  href="/dashboard/feedback"
                  className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/tin.png" alt="" className="w-6 h-6 object-contain" />
                  <span className="font-inter font-medium text-[18px] leading-[28px] text-[#45556C]">
                    Feedback
                  </span>
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#45556C" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                    <span className="font-inter font-medium text-[18px] leading-[28px] text-[#A78BFA]">
                      Admin Panel
                    </span>
                  </Link>
                )}
              </div>

              <hr className="border-[#E2E8F0] mx-0" />

              {/* Sign Out */}
              <div className="py-3 px-6">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 text-[#EF4444] hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  <span className="font-inter font-medium text-[16px] leading-[24px]">
                    Sign out
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div
            ref={notificationModalRef}
            className="w-full max-w-[520px] rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-inter font-semibold text-[20px] leading-[28px] text-[#334155]">Notifications</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-md text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors flex items-center justify-center"
                aria-label="Close notifications"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {notifications.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{
                    background: index === 0 ? '#F8F2E8' : '#E9EEF8',
                    opacity: item.read ? 0.82 : 1,
                  }}
                >
                  <span className="text-[16px] leading-none mt-[2px]">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-[14px] leading-[20px] text-[#334155] font-medium truncate">{item.title}</p>
                    <p className="font-inter text-[12px] leading-[16px] text-[#94A3B8] mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                onClick={() => setShowNotifications(false)}
                className="px-4 py-2 rounded-lg border border-[#D8DFEC] bg-[#F2F5FB] text-[#64748B] font-inter text-[13px] leading-[18px] font-semibold hover:bg-[#E9EEF8] transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 rounded-lg border border-[#D8DFEC] bg-[#F2F5FB] text-[#334155] font-inter text-[13px] leading-[18px] font-semibold hover:bg-[#E9EEF8] transition-colors"
              >
                Mark all read
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
