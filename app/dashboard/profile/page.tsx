'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService } from '@/lib/services';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    dashboardService.getDashboard().then((res) => {
      if (res.data) setStats(res.data);
    }).catch(() => {});
  }, []);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'User';

  const handleDiscard = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setState('');
      setTargetYear('');
      setOptionalSubject('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await refreshUser();
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const daysOnPlatform = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 sm:px-6 py-6 md:py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#62748e] hover:text-[#314158]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-medium text-[14px] leading-[20px] text-[#0f172b]">Profile</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-xl md:text-2xl lg:text-[30px] leading-[36px] text-[#0f172b] mb-6 md:mb-8" style={{ fontFamily: "'Georgia', serif" }}>
        My Profile
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Profile Form */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-white rounded-[14px] pt-8 px-8 pb-8 flex flex-col gap-8"
            style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)' }}
          >
            {/* Avatar + Name Header */}
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-[24px] leading-[32px]"
                  style={{ background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : '#d08700' }}
                >
                  {!user?.avatarUrl && initials}
                </div>
                <div className="absolute left-[48px] top-[48px] w-4 h-4 bg-[#90a1b9] border-[1.6px] border-solid border-white rounded-full" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">{displayName}</h2>
                <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">{user?.email}</p>
                <span
                  className="inline-block mt-1 px-3 py-1 rounded-[4px] font-medium text-[12px] leading-[16px] text-[#a65f00]"
                  style={{ background: '#fef9c2' }}
                >
                  {user?.role === 'admin' ? 'Admin' : 'Pro Aspirant'}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-6">
              {/* First name / Last name */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="font-medium text-[14px] leading-[20px] text-[#314158]">
                  Email{' '}
                  {user?.emailVerified !== false && (
                    <span className="text-[12px] leading-[16px] text-[#00a63e]">✓ Verified</span>
                  )}
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-[#f8fafc] font-normal text-[16px] leading-[24px] text-[#62748e] cursor-not-allowed"
                />
              </div>

              {/* Phone / State */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Target year / Optional subject */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">Target year</label>
                  <input
                    type="text"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-medium text-[14px] leading-[20px] text-[#314158]">Optional subject</label>
                  <input
                    type="text"
                    value={optionalSubject}
                    onChange={(e) => setOptionalSubject(e.target.value)}
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleDiscard}
                  className="h-[45.6px] px-6 rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-medium text-[16px] leading-[24px] text-[#314158] hover:bg-[#f8fafc] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-[44px] px-6 rounded-[10px] font-semibold text-[16px] leading-[24px] text-[#0f172b] transition-colors hover:opacity-90"
                  style={{ background: '#f0b100' }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats + Achievements */}
        <div className="w-full lg:w-[339px] flex flex-col gap-6">
          {/* My Stats Card */}
          <div
            className="bg-white rounded-[14px] pt-6 px-6 pb-6 flex flex-col gap-6"
            style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/stats.png" alt="" width={28} height={28} className="w-7 h-7 object-contain" />
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">My Stats</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-normal text-[14px] leading-[20px] text-[#45556c]">Days on platform</span>
                <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">{daysOnPlatform} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[14px] leading-[20px] text-[#45556c]">MCQs attempted</span>
                <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">{stats?.mcqsAttempted?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[14px] leading-[20px] text-[#45556c]">Answers evaluated</span>
                <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">{stats?.answersEvaluated?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[14px] leading-[20px] text-[#45556c]">Mock tests taken</span>
                <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">{stats?.mockTestsTaken?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-2">
                <span className="font-normal text-[14px] leading-[20px] text-[#45556c]">Current rank</span>
                <span className="font-semibold text-[14px] leading-[20px] text-[#d08700]">
                  {stats?.rank ? `#${stats.rank.toLocaleString()} / ${stats.totalUsers?.toLocaleString() || '50,000'}` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Achievements Card */}
          <div
            className="bg-white rounded-[14px] pt-6 px-6 pb-6 flex flex-col gap-6"
            style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/trophy.png" alt="" width={28} height={28} className="w-7 h-7 object-contain" />
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Achievements</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '/icons/fire.png', label: `${stats?.streak || 0}-day streak` },
                { icon: '/icons/target.png', label: `${stats?.mcqsAttempted ? '1000' : '0'} MCQs` },
                { icon: '/icons/pencil.png', label: `${stats?.answersEvaluated || 0} Answers` },
                { icon: '/icons/trophy2.png', label: stats?.rank ? `Top ${stats.rank}` : 'Top 10' },
              ].map((achievement) => (
                <div
                  key={achievement.label}
                  className="flex flex-col items-center bg-[#f8fafc] rounded-[10px] pt-4 pb-4"
                >
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={achievement.icon} alt="" width={36} height={36} className="w-9 h-9 object-contain" />
                  </div>
                  <span className="font-normal text-[12px] leading-[16px] text-[#45556c] text-center">{achievement.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Notes Card */}
          <Link href="/dashboard/saved-notes">
            <div
              className="bg-white rounded-[14px] pt-6 px-6 pb-6 flex flex-col gap-4 cursor-pointer hover:shadow-md transition-shadow"
              style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '28px' }}>📌</span>
                <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Saved Notes & Bookmarks</h3>
              </div>
              <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">
                View all your saved editorials and bookmarked articles in one place.
              </p>
              <div className="flex items-center gap-1 text-[#155DFC] font-medium text-[14px]">
                View all <span>→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
