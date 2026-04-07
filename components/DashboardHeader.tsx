'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const DashboardHeader = () => {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
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

  return (
    <header className="w-full h-[clamp(90px,5.78vw,111px)] bg-gradient-to-r from-[#0E182D] to-[#17223E] flex items-center justify-between px-[clamp(1rem,2vw,2.5rem)] sticky top-0 z-50">
      {/* Logo Section */}
      <Link href="/dashboard" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo...png"
          alt="RiseWithJeet Logo"
          className="w-[clamp(100px,6vw,120px)] h-[clamp(100px,6vw,120px)] object-contain"
        />
      </Link>

      {/* Right Section - Button + User Profile */}
      <div className="flex items-center gap-[clamp(1rem,1.5vw,2rem)]">
        {/* Start Free Trial Button */}
        <Link href="/dashboard/free-trial">
          <button
            className="inline-flex items-center justify-end"
            style={{
              padding: '15px 24px 14px 24px',
              borderRadius: '30px',
              background: '#FFD170',
              boxShadow: '0 4px 17.1px 0 rgba(255, 255, 255, 0.06) inset',
              color: '#000',
              textAlign: 'center',
              fontFamily: '"SF Pro", -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: 'clamp(18px, 1.3vw, 25px)',
              fontWeight: 590,
              lineHeight: '110%',
              letterSpacing: '-0.375px',
              whiteSpace: 'nowrap',
            }}
          >
            Start Free Trial
          </button>
        </Link>

        {/* User Profile Section */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          {/* Poojitha's conic-gradient border pill */}
          <div
            className="rounded-[36px]"
            style={{
              padding: '1px',
              background: 'conic-gradient(from 0deg, #B19E66 14%, rgba(255,255,255,0.04) 35%, #FFFFFF 65%, rgba(255,255,255,0.07) 85%, #B19E66 100%)',
              minWidth: 'clamp(180px,11.6vw,223px)',
              height: 'clamp(48px,2.97vw,57px)',
            }}
          >
            {/* Inner gradient pill - clickable to open dropdown */}
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-[clamp(0.5rem,0.8vw,1rem)] px-[clamp(0.75rem,1.2vw,1.5rem)] py-[clamp(0.5rem,0.6vw,0.75rem)] rounded-[35px] w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: 'linear-gradient(180deg, #1E2875 0%, #1E2875 100%)',
                boxShadow: '0px 16px 64px 0px rgba(104, 1, 255, 0.12)',
              }}
            >
              {/* Real User Avatar */}
              <div
                className="w-[clamp(35px,2.6vw,50px)] h-[clamp(32px,2.3vw,45px)] flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
                style={{
                  background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : '#6366F1',
                  fontSize: 'clamp(12px, 0.9vw, 16px)',
                }}
              >
                {!user?.avatarUrl && initials}
              </div>

              {/* Real User Info */}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div
                  className="text-white font-poppins font-medium leading-[100%] truncate"
                  style={{ fontSize: 'clamp(14px, 1.02vw, 19.58px)' }}
                >
                  {isLoading ? 'Loading...' : displayName}
                </div>
                <div
                  className="text-white font-poppins font-medium leading-[100%] truncate mt-[clamp(2px,0.3vw,4px)]"
                  style={{ fontSize: 'clamp(9px, 0.6vw, 11.52px)' }}
                >
                  {user?.email || 'UPSC Aspirant'}
                </div>
              </div>

              {/* Dropdown Arrow */}
              <div className={`flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`}>
                <svg
                  width={`clamp(10px, 0.68vw, 13px)`}
                  height={`clamp(6px, 0.37vw, 7.13px)`}
                  viewBox="0 0 13 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[clamp(10px,0.68vw,13px)] h-auto"
                >
                  <path
                    d="M1 1L6.5 6.5L12 1"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-3 w-[300px] rounded-2xl shadow-2xl overflow-hidden z-50"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* User Info Header */}
              <div className="px-6 pt-6 pb-4">
                <p className="text-[#111827] font-semibold text-lg leading-7">{displayName}</p>
                <p className="text-[#6B7280] text-sm mt-1">{user?.email || ''}</p>
              </div>

              <hr className="border-[#F3F4F6]" />

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-4 px-6 py-3.5 text-[#45556C] hover:bg-[#F9FAFB] transition-colors"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/human.png" alt="" width={24} height={24} className="w-6 h-6 object-contain" />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-4 px-6 py-3.5 text-[#45556C] hover:bg-[#F9FAFB] transition-colors"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/sett.png" alt="" width={24} height={24} className="w-6 h-6 object-contain" />
                  Account Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-4 px-6 py-3.5 text-[#45556C] hover:bg-[#F9FAFB] transition-colors"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                  onClick={() => setShowDropdown(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/card.png" alt="" width={24} height={24} className="w-6 h-6 object-contain" />
                  Billing
                </Link>
                <Link
                  href="/dashboard/feedback"
                  className="flex items-center gap-4 px-6 py-3.5 text-[#45556C] hover:bg-[#F9FAFB] transition-colors"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                  onClick={() => setShowDropdown(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  Feedback
                </Link>
              </div>

              {user?.role === 'admin' && (
                <>
                  <hr className="border-[#F3F4F6]" />
                  <div className="py-2">
                    <Link
                      href="/admin"
                      className="flex items-center gap-4 px-6 py-3.5 text-[#7C3AED] hover:bg-[#F9FAFB] transition-colors font-medium"
                      style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Admin Panel
                    </Link>
                  </div>
                </>
              )}

              <hr className="border-[#F3F4F6]" />

              {/* Sign Out */}
              <div className="py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-4 w-full text-left px-6 py-3.5 text-red-500 hover:bg-[#FEF2F2] transition-colors"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: '28px' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
