'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService, userService } from '@/lib/services';

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      const extra = (user as any).profile || {};
      setState(extra.state || '');
      setTargetYear(extra.targetYear || '');
      setOptionalSubject(extra.optionalSubject || '');
    }
  }, [user]);

  // Load full profile from backend to get extra fields
  useEffect(() => {
    userService.getProfile().then((res) => {
      const d = res.data;
      if (d) {
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setPhone(d.phone || '');
        setState(d.state || '');
        setTargetYear(d.targetYear || '');
        setOptionalSubject(d.optionalSubject || '');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    dashboardService.getDashboard().then((res) => {
      if (res.data) setStats(res.data);
    }).catch(() => {});
  }, []);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'User';

  const handleDiscard = () => {
    userService.getProfile().then((res) => {
      const d = res.data;
      if (d) {
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setPhone(d.phone || '');
        setState(d.state || '');
        setTargetYear(d.targetYear || '');
        setOptionalSubject(d.optionalSubject || '');
      }
    }).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      await userService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        state: state.trim(),
        targetYear: targetYear.trim(),
        optionalSubject: optionalSubject.trim(),
      });
      setToast({ kind: 'success', msg: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setToast({ kind: 'error', msg: err?.message || 'Could not save profile. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handlePhoneChange = (raw: string) => {
    // Allow only digits, cap at 10. Strip a leading +91 silently.
    const cleaned = raw.replace(/\D/g, '').replace(/^91/, '').slice(0, 10);
    setPhone(cleaned);
  };

  const daysOnPlatform = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-6 py-8 relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 rounded-[12px] px-5 py-4 flex items-start gap-3 shadow-lg"
          style={{
            background: toast.kind === 'success' ? '#0F172B' : '#7F1D1D',
            color: '#FFFFFF',
            border: `1px solid ${toast.kind === 'success' ? '#22C55E' : '#FCA5A5'}`,
            minWidth: 280,
          }}
        >
          <span style={{ fontSize: 18 }}>{toast.kind === 'success' ? '✅' : '⚠️'}</span>
          <div className="flex-1">
            <div className="font-semibold text-[14px]">{toast.kind === 'success' ? 'Success' : 'Could not save'}</div>
            <div className="text-[13px] opacity-90">{toast.msg}</div>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#62748e] hover:text-[#314158]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-medium text-[14px] leading-[20px] text-[#0f172b]">Profile</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-[30px] leading-[36px] text-[#0f172b] mb-8" style={{ fontFamily: "'Georgia', serif" }}>
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
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-white font-normal text-[16px] leading-[24px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#d08700] focus:border-transparent"
                  />
                  {phone && phone.length !== 10 && (
                    <span className="text-[12px] text-[#DC2626]">Enter exactly 10 digits</span>
                  )}
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

            {(() => {
              // Only render badges for milestones the user has actually
              // hit. Empty state encourages action and avoids the
              // hardcoded "Top 10" / "1000 MCQs" lie when nothing is done.
              const earned: { icon: string; label: string }[] = [];
              if ((stats?.streak ?? 0) >= 3) earned.push({ icon: '/icons/fire.png', label: `${stats.streak}-day streak` });
              const mcqs = stats?.mcqsAttempted ?? 0;
              if (mcqs >= 100) earned.push({ icon: '/icons/target.png', label: `${mcqs.toLocaleString()} MCQs` });
              const answers = stats?.answersEvaluated ?? 0;
              if (answers >= 10) earned.push({ icon: '/icons/pencil.png', label: `${answers} Answers` });
              const mocks = stats?.mockTestsTaken ?? 0;
              if (mocks >= 5) earned.push({ icon: '/icons/trophy2.png', label: `${mocks} Mock Tests` });
              if (stats?.rank && stats?.totalUsers && stats.rank / stats.totalUsers <= 0.1) {
                earned.push({ icon: '/icons/trophy2.png', label: `Top 10% rank` });
              }

              if (earned.length === 0) {
                return (
                  <div className="text-center py-4 px-2">
                    <div className="text-[28px] mb-2">🌱</div>
                    <p className="font-medium text-[14px] text-[#0f172b] mb-1">No badges yet</p>
                    <p className="text-[12px] text-[#62748e]">
                      Maintain a 3-day streak, attempt 100 MCQs, or evaluate 10 answers to earn your first badge.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3">
                  {earned.map((achievement) => (
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
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
