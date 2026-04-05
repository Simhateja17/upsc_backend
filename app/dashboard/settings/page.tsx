'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/services';

const SIDEBAR_ITEMS = [
  { id: 'profile', label: 'Profile', icon: '/mAN.png' },
  { id: 'security', label: 'Security', icon: '/LOCKK.png' },
  { id: 'notifications', label: 'Notifications', icon: '/belll.png' },
  { id: 'preferences', label: 'Preferences', icon: '/paintt.png' },
  { id: 'privacy', label: 'Privacy', icon: '/piracy.png' },
];

const cardStyle = { boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)' };
const inputClass = "w-full h-[45.6px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] placeholder:text-[#90a1b9] focus:outline-none focus:ring-2 focus:ring-[#1d293d] focus:border-transparent";
const labelClass = "font-medium text-[14px] leading-[20px] text-[#314158]";
const btnPrimary = "h-[44px] px-6 rounded-[10px] bg-[#1d293d] font-medium text-[16px] leading-[24px] text-white hover:bg-[#2a3a52] transition-colors";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-[#1d293d]' : 'bg-[#cad5e2]'}`}
    >
      <div
        className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-transform shadow-sm ${enabled ? 'left-[22px]' : 'left-[2px]'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email] = useState(user?.email || '');
  const [bio, setBio] = useState('');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification toggles
  const [notifMcq, setNotifMcq] = useState(true);
  const [notifAnswer, setNotifAnswer] = useState(true);
  const [notifDigest, setNotifDigest] = useState(true);
  const [notifStreak, setNotifStreak] = useState(false);
  const [notifPromo, setNotifPromo] = useState(true);

  // Preferences state
  const [dailyTarget, setDailyTarget] = useState('');
  const [answerReminder, setAnswerReminder] = useState('');
  const [language, setLanguage] = useState('');

  // Privacy toggles
  const [privLeaderboard, setPrivLeaderboard] = useState(true);
  const [privStudyRoom, setPrivStudyRoom] = useState(true);
  const [privAnalytics, setPrivAnalytics] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Load profile & settings from backend
  useEffect(() => {
    userService.getProfile().then(res => {
      const d = res.data;
      if (d.firstName) setFirstName(d.firstName);
      if (d.lastName) setLastName(d.lastName);
      if (d.bio) setBio(d.bio);
      const s = d.settings || {};
      if (s.notifications) {
        setNotifMcq(s.notifications.mcq ?? true);
        setNotifAnswer(s.notifications.answer ?? true);
        setNotifDigest(s.notifications.digest ?? true);
        setNotifStreak(s.notifications.streak ?? false);
        setNotifPromo(s.notifications.promo ?? true);
      }
      if (s.preferences) {
        setDailyTarget(s.preferences.dailyTarget || '');
        setAnswerReminder(s.preferences.answerReminder || '');
        setLanguage(s.preferences.language || '');
      }
      if (s.privacy) {
        setPrivLeaderboard(s.privacy.leaderboard ?? true);
        setPrivStudyRoom(s.privacy.studyRoom ?? true);
        setPrivAnalytics(s.privacy.analytics ?? true);
      }
    }).catch(() => {});
  }, []);

  const showSaved = (msg = 'Saved!') => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({ firstName, lastName, bio });
      showSaved();
    } catch { setSaveMsg('Error saving'); }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await userService.updateSettings({
        notifications: { mcq: notifMcq, answer: notifAnswer, digest: notifDigest, streak: notifStreak, promo: notifPromo },
      });
      showSaved();
    } catch { setSaveMsg('Error saving'); }
    setSaving(false);
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await userService.updateSettings({
        preferences: { dailyTarget, answerReminder, language },
      });
      showSaved();
    } catch { setSaveMsg('Error saving'); }
    setSaving(false);
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await userService.updateSettings({
        privacy: { leaderboard: privLeaderboard, studyRoom: privStudyRoom, analytics: privAnalytics },
      });
      showSaved();
    } catch { setSaveMsg('Error saving'); }
    setSaving(false);
  };

  const renderProfileTab = () => (
    <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-8 flex flex-col gap-6" style={cardStyle}>
      <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Profile Information</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <label className={labelClass}>First name</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label className={labelClass}>Last name</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Email</label>
        <input type="email" value={email} disabled className={`${inputClass} cursor-not-allowed`} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full h-[118px] px-4 py-[10px] rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] resize-none focus:outline-none focus:ring-2 focus:ring-[#1d293d] focus:border-transparent" />
      </div>
      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-8 flex flex-col gap-6" style={cardStyle}>
      <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Security &amp; Password</h2>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Current password</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>New password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className={inputClass} />
        <div className="flex flex-col gap-1">
          <p className="font-normal text-[12px] leading-[16px] text-[#62748e]">At least 8 characters</p>
          <p className="font-normal text-[12px] leading-[16px] text-[#62748e]">Contains a number</p>
          <p className="font-normal text-[12px] leading-[16px] text-[#62748e]">Contains a symbol (@ # $ !)</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Confirm new password</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputClass} />
      </div>
      <div><button className={btnPrimary}>Update password</button></div>

      <div className="border-t border-[#e2e8f0] pt-8 mt-4 flex flex-col gap-6">
        <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Active Sessions</h2>
        <div className="flex flex-col gap-3">
          <div className="bg-[#f8fafc] border-[0.8px] border-[#e2e8f0] rounded-[10px] px-4 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[16px] leading-[24px] text-[#0f172b]">Chrome - macOS - Delhi, IN</p>
              <p className="font-medium text-[14px] leading-[20px] text-[#00a63e]">● Current session</p>
            </div>
          </div>
          <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] px-4 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[16px] leading-[24px] text-[#0f172b]">Safari - iPhone 15</p>
              <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">Last seen 2d ago</p>
            </div>
            <button className="h-[37.6px] px-4 rounded-[10px] border-[0.8px] border-[#ffc9c9] font-medium text-[14px] leading-[20px] text-[#e7000b] hover:bg-[#fef2f2] transition-colors">
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-8 flex flex-col gap-6" style={cardStyle}>
      <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Notifications</h2>

      {[
        { label: 'Daily MCQ reminder', desc: 'Remind to complete daily practice', enabled: notifMcq, toggle: () => setNotifMcq(!notifMcq) },
        { label: 'Answer evaluation complete', desc: 'When AI finishes evaluating', enabled: notifAnswer, toggle: () => setNotifAnswer(!notifAnswer) },
        { label: 'Current affairs morning digest', desc: 'Daily at 7 AM', enabled: notifDigest, toggle: () => setNotifDigest(!notifDigest) },
        { label: 'Streak at risk', desc: 'Alert before streak breaks', enabled: notifStreak, toggle: () => setNotifStreak(!notifStreak) },
        { label: 'Promotional emails', desc: 'Updates and offers', enabled: notifPromo, toggle: () => setNotifPromo(!notifPromo) },
      ].map((item) => (
        <div key={item.label} className="flex items-center justify-between border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-[16px] leading-[24px] text-[#0f172b]">{item.label}</p>
            <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">{item.desc}</p>
          </div>
          <Toggle enabled={item.enabled} onChange={item.toggle} />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={handleSaveNotifications} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-8 flex flex-col gap-6" style={cardStyle}>
      <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Preferences</h2>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Daily MCQ target</label>
        <input type="text" value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Answer writing reminder</label>
        <input type="text" value={answerReminder} onChange={(e) => setAnswerReminder(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Language</label>
        <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass} />
      </div>

      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={handleSavePreferences} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-8 flex flex-col gap-6" style={cardStyle}>
      <h2 className="font-semibold text-[20px] leading-[28px] text-[#0f172b]">Privacy Settings</h2>

      {[
        { label: 'Show on leaderboard', desc: 'Others can view your rank', enabled: privLeaderboard, toggle: () => setPrivLeaderboard(!privLeaderboard) },
        { label: 'Share study room activity', desc: 'Visible to room members', enabled: privStudyRoom, toggle: () => setPrivStudyRoom(!privStudyRoom) },
        { label: 'Analytics data usage', desc: 'Help improve recommendations', enabled: privAnalytics, toggle: () => setPrivAnalytics(!privAnalytics) },
      ].map((item) => (
        <div key={item.label} className="flex items-center justify-between border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-[16px] leading-[24px] text-[#0f172b]">{item.label}</p>
            <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">{item.desc}</p>
          </div>
          <Toggle enabled={item.enabled} onChange={item.toggle} />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={handleSavePrivacy} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
      </div>

      <div>
        <button className="h-[44px] px-5 rounded-[10px] border-[0.8px] border-[#155dfc] bg-white font-medium text-[16px] leading-[24px] text-[#155dfc] hover:bg-[#eff6ff] transition-colors flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 12h10" stroke="#155dfc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export my data (GDPR)
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-6 py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#62748e] hover:text-[#314158]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">/</span>
        <span className="font-medium text-[14px] leading-[20px] text-[#314158]">Account Settings</span>
      </nav>

      <h1 className="font-bold text-[30px] leading-[36px] text-[#0f172b] mb-8">Account Settings</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[256px] bg-white border-[0.8px] border-[#e2e8f0] rounded-[10px] p-2 flex-shrink-0 h-fit" style={cardStyle}>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 h-[48px] rounded-[10px] font-medium text-[16px] leading-[24px] transition-colors ${
                activeTab === item.id ? 'bg-[#f1f5f9] text-[#0f172b]' : 'text-[#45556c] hover:bg-[#f8fafc]'
              }`}
            >
              <Image src={item.icon} alt={item.label} width={20} height={20} />
              {item.label}
            </button>
          ))}
          <div className="border-t border-[#e2e8f0] mx-0 my-0" />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-3 px-4 h-[48px] rounded-[10px] font-medium text-[16px] leading-[24px] text-[#e7000b] hover:bg-[#fef2f2] transition-colors"
          >
            <Image src="/bin.png" alt="Delete Account" width={20} height={20} />
            Delete Account
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowDeleteModal(false)}>
          <div
            className="bg-white rounded-[16px] w-[474px] p-8 flex flex-col gap-6"
            style={{ boxShadow: '0px 25px 50px 0px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-[24px] leading-[32px] text-[#0f172b]">Delete account</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-[#62748e] hover:text-[#0f172b] transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Warning banner */}
            <div className="bg-[#fef2f2] border-[0.8px] border-[#ffc9c9] rounded-[10px] px-3 py-4 flex items-center gap-2">
              <Image src="/warning-triangle.png" alt="warning" width={20} height={20} className="flex-shrink-0" />
              <p className="text-[14px] leading-[20px] whitespace-nowrap">
                <span className="font-semibold text-[#82181a]">Permanent.</span>
                <span className="font-normal text-[#c10007]"> All data, scores and progress will be erased.</span>
              </p>
            </div>

            {/* Confirm input */}
            <div className="flex flex-col gap-[6px]">
              <label className="font-normal text-[14px] leading-[20px] text-[#45556c]">Type DELETE to confirm</label>
              <div className="relative">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full h-[51.2px] px-4 py-3 rounded-[10px] border-[1.6px] border-[#2b7fff] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] placeholder:text-[#cad5e2] focus:outline-none"
                />
                <div className="absolute -bottom-4 left-4 translate-y-full w-8 h-8 rounded-full bg-[#2b7fff] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="8" rx="1.5" fill="white"/>
                    <path d="M5 7V5a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <circle cx="8" cy="11" r="1" fill="#2b7fff"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 h-[49.6px] rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-medium text-[16px] leading-[24px] text-[#314158] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirm !== 'DELETE'}
                className={`flex-1 rounded-[10px] font-medium text-[16px] leading-[24px] text-white text-center transition-colors ${
                  deleteConfirm === 'DELETE' ? 'bg-[#e7000b] hover:bg-[#c50a0a]' : 'bg-[#e7000b]/60 cursor-not-allowed'
                }`}
                style={{ padding: '10.6px 42.212px 15px 40.763px' }}
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
