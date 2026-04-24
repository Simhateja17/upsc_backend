'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService, studyPlannerService } from '@/lib/services';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardData {
  daysRemaining?: number;
  trio?: {
    mcq?: { status?: string; topic?: string; questionCount?: number };
    editorial?: { status?: string; topic?: string };
    mains?: { status?: string; topic?: string };
  };
}

interface StudyTask {
  _id?: string;
  id?: string;
  title: string;
  type?: string;
  subject?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  completed?: boolean;
  priority?: string;
}

const borderColors: Record<string, string> = {
  high: '#FF6467',
  medium: '#22C55E',
  low: '#EAB308',
};

const borderColorsFallback = ['#FF6467', '#22C55E', '#EAB308'];

interface NotificationItem {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  time: string;
  read: boolean;
}

const notificationsData: NotificationItem[] = [
  {
    id: '1',
    icon: '🔥',
    iconBg: '#FEF3C7',
    title: '7-day streak! Top 8% of aspirants',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    icon: '✅',
    iconBg: '#D1FAE5',
    title: 'Your answer has been evaluated — Score: 7.5/10',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '3',
    icon: '📰',
    iconBg: '#E9EEF5',
    title: "Today's current affairs are ready",
    time: 'This morning',
    read: true,
  },
  {
    id: '4',
    icon: '📝',
    iconBg: '#E9EEF5',
    title: 'New mock test available — GS Prelims Test 15',
    time: 'Yesterday',
    read: true,
  },
];

const NotificationModal = ({ onClose }: { onClose: () => void }) => {
  const [notifications, setNotifications] = useState(notificationsData);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-[440px] mx-4 relative overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
          <h2 className="font-inter font-bold text-[18px] text-[#1A1A1A]">Notifications</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">✕</button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`px-6 py-4 flex items-start gap-3 border-b border-[#F3F4F6] ${notif.read ? 'opacity-70' : ''}`}
              style={notif.read ? {} : { background: '#FAFBFE' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: notif.iconBg }}
              >
                {notif.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-inter text-[14px] text-[#1A1A1A] leading-[20px]">{notif.title}</p>
                <p className="font-inter text-[12px] text-[#9CA3AF] mt-1">{notif.time}</p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-[#6366F1] flex-shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-[#E5E7EB] bg-[#FAFBFE]">
          <button
            onClick={onClose}
            className="font-inter text-[13px] text-[#6B7280] hover:text-[#374151] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={markAllRead}
            className="font-inter text-[13px] text-[#6366F1] font-medium hover:text-[#4F46E5] px-4 py-2 rounded-lg hover:bg-[#EEF2FF] transition-colors"
          >
            Mark all read
          </button>
        </div>
      </div>
    </div>
  );
};

const AddTaskModal = ({ onClose, onTaskAdded }: { onClose: () => void; onTaskAdded: (task: StudyTask) => void }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let duration: number | undefined;
      if (startTime && endTime) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) duration = diff;
      }
      const res = await studyPlannerService.createTask({
        title: title.trim(),
        subject: subject || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        duration,
      });
      const created: StudyTask = res?.data ?? { title: title.trim(), subject, startTime, endTime, duration };
      onTaskAdded(created);
      onClose();
    } catch {
      setError('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 w-full max-w-[520px] mx-4 relative"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-inter font-bold text-[22px] text-[#17223E]">Add Custom Study Task</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 font-medium text-[16px]"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mb-5">
          <label className="block font-inter font-medium text-[14px] text-[#6366F1] mb-2">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Complete Polity Chapter 5"
            className="w-full border-2 border-[#6366F1] rounded-xl px-4 py-3 font-inter text-[14px] text-gray-500 outline-none focus:border-[#4F46E5] transition-colors"
          />
        </div>

        <div className="mb-5">
          <label className="block font-inter font-medium text-[14px] text-[#6366F1] mb-2">Subject</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 font-inter text-[14px] text-gray-500 outline-none focus:border-[#6366F1] bg-white transition-colors appearance-auto"
          >
            <option value="">Select Subject</option>
            <option value="indian-polity">Indian Polity</option>
            <option value="history">History</option>
            <option value="geography">Geography</option>
            <option value="economics">Economics</option>
            <option value="environment">Environment</option>
            <option value="current-affairs">Current Affairs</option>
            <option value="science-tech">Science & Technology</option>
          </select>
        </div>

        <div className="mb-7">
          <label className="block font-inter font-medium text-[14px] text-[#6366F1] mb-2">Time</label>
          <div className="flex gap-4">
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 font-inter text-[14px] text-gray-700 outline-none focus:border-[#6366F1] transition-colors"
            />
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 font-inter text-[14px] text-gray-700 outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border-2 border-gray-200 rounded-xl py-3 font-inter font-medium text-[15px] text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>✕</span> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl py-3 font-inter font-medium text-[15px] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {saving ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {saving ? 'Saving...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ResponsiveDashboardContent = () => {
  const { user } = useAuth();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  const userName = user?.firstName || 'Rahul';
  const greeting = getGreeting();

  useEffect(() => {
    let mounted = true;
    async function fetchDashboard() {
      try {
        const res = await dashboardService.getDashboard();
        if (mounted && res?.data) {
          setDashboardData(res.data);
        }
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchTasks() {
      try {
        const res = await studyPlannerService.getTodayTasks();
        if (mounted && res?.data) {
          setTasks(Array.isArray(res.data) ? res.data : res.data.tasks || []);
        }
      } catch {
      } finally {
        if (mounted) setTasksLoading(false);
      }
    }
    fetchTasks();
    return () => { mounted = false; };
  }, []);

  const trio = dashboardData?.trio;
  const daysRemaining = dashboardData?.daysRemaining ?? null;

  const mcqStatus = trio?.mcq?.status || null;
  const mcqTopic = trio?.mcq?.topic || null;
  const mcqCount = trio?.mcq?.questionCount || 10;
  const editorialStatus = trio?.editorial?.status || null;
  const editorialTopic = trio?.editorial?.topic || null;
  const mainsStatus = trio?.mains?.status || null;
  const mainsTopic = trio?.mains?.topic || null;

  const isMcqCompleted = mcqStatus?.toLowerCase() === 'completed';

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const displayTasks = tasks;

  function handleStartFocusSession() {
    // Navigate to focus session or show modal
    alert('Focus session feature coming soon!');
  }

  function formatDuration(mins?: number) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `(${h}h ${m}m)`;
    if (h > 0) return `(${h}h)`;
    return `(${m}m)`;
  }

  return (
    <>
    <div className="w-full min-h-screen py-[clamp(0.75rem,1.25vw,1.5rem)] px-[clamp(0.75rem,1.25vw,1.5rem)]" style={{ background: '#FAFBFE' }}>
      <div className="max-w-[1400px] mx-auto">

        {/* Greeting Card */}
        <div
          className="w-full rounded-[16px] p-[clamp(1rem,1.5vw,1.5rem)] mb-[clamp(0.5rem,0.75vw,0.75rem)] relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #0D1F3C 50%, #0A1628 100%)',
            boxShadow: '0px 4px 20px rgba(7, 17, 36, 0.32)',
          }}
        >
          {/* Grid Pattern Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="relative z-10">
            <h1
              className="mb-[clamp(0.35rem,0.55vw,0.55rem)] text-left"
              style={{
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: '28px',
                fontStyle: 'normal',
                fontWeight: 800,
                lineHeight: '42px',
                letterSpacing: '-0.8px',
                color: '#FFF',
              }}
            >
              {greeting}, <span style={{ color: '#F5A623' }}>{userName}!</span>
            </h1>

            <div
              className="font-arimo text-left mb-[clamp(0.9rem,1.1vw,1.2rem)]"
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0px',
              }}
            >
              <p className="text-white/90">Welcome to your personalized command center for UPSC 2026 preparation.</p>
              <p className="text-white/90 font-bold">Ready to rise up? Let&apos;s make today count.</p>
            </div>

            <div
              className="relative h-[45px] w-full rounded-[4px]"
              style={{
                background: '#161C2D',
                borderLeft: '4px solid #FF8904',
              }}
            >
              <img
                src="/calendar-icon.png"
                alt="Calendar"
                className="absolute left-[14px] top-[13px] w-[21px] h-[18px] object-contain"
              />
              <p
                className="absolute left-[37px] top-[13px] font-arimo font-normal leading-[20px] text-white"
                style={{
                  fontSize: '16px',
                }}
              >
                UPSC Prelims 2026: {daysRemaining !== null ? `${daysRemaining} days remaining` : '-- days remaining'}.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar & Schedule Button */}
        <div className="flex flex-wrap gap-[clamp(0.75rem,1vw,1rem)] items-center mb-[clamp(1rem,1.5vw,1.5rem)]">
          <div
            className="flex-1 min-w-[280px] flex items-center gap-[clamp(0.5rem,0.68vw,0.75rem)] px-[clamp(1rem,1.25vw,1.25rem)] rounded-[40px]"
            style={{
              height: 'clamp(44px,2.6vw,50px)',
              background: '#E8ECFF',
            }}
          >
            <svg
              className="w-[clamp(16px,0.9vw,18px)] h-[clamp(16px,0.9vw,18px)] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="7" stroke="#6B7280" strokeWidth="2"/>
              <path d="M20 20L16.5 16.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Ask jeet AI: 'Explain current affairs'"
              className="flex-1 bg-transparent outline-none font-inter text-[#1A1A1A] placeholder:text-[#6B7280]"
              style={{
                fontSize: 'clamp(13px,0.8vw,14px)',
                lineHeight: '1',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  window.location.href = '/dashboard/jeet-gpt';
                }
              }}
            />
          </div>

          <Link href="/dashboard/study-planner">
            <button
              className="px-[clamp(1rem,1.25vw,1.5rem)] rounded-[40px] font-inter font-medium border-2 flex items-center gap-2 hover:bg-[#17223E] hover:text-white transition-colors"
              style={{
                height: 'clamp(44px,2.6vw,50px)',
                fontSize: 'clamp(13px,0.8vw,14px)',
                background: '#FFFFFF',
                borderColor: '#17223E',
                color: '#17223E',
              }}
            >
              <svg className="w-[clamp(14px,0.8vw,16px)] h-[clamp(14px,0.8vw,16px)]" viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M8 2.5V6.5M16 2.5V6.5M3.5 9.5H20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Schedule</span>
            </button>
          </Link>
        </div>

        {/* Today's Trio Section */}
        <div
          className="mb-[clamp(1rem,1.5vw,1.5rem)] rounded-[16px] p-[clamp(0.75rem,1vw,1rem)]"
          style={{
            background: '#FFFFFF',
            border: '0.8px solid #E5E7EB',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-[clamp(0.75rem,1vw,1.25rem)]">
            <div className="flex items-center gap-2.5">
              <img src="/icons/dashboard/trio-header.png" alt="Today's Trio" className="w-[clamp(18px,1.2vw,22px)] h-[clamp(18px,1.2vw,22px)]" />
              <h2 className="font-inter font-bold text-[clamp(17px,1.2vw,20px)] text-[#1A1A1A]">
                Today's Trio
              </h2>
            </div>
            <Link href="/dashboard" className="font-inter text-[14px] text-[#6366F1] font-medium hover:text-[#4F46E5] transition-colors">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17223E]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[clamp(0.75rem,1vw,1.25rem)]">
              {/* Daily MCQ Card */}
              <Link
                href="/dashboard/daily-mcq"
                aria-label="Open Daily MCQ"
                className="block rounded-[14px] relative cursor-pointer h-full min-h-[240px] flex flex-col transition-all hover:shadow-md"
                style={{
                  background: '#F9FAFB',
                  border: '0.8px solid #E5E7EB',
                  padding: '18px 20px 20px 20px',
                }}
              >
                {isMcqCompleted && (
                  <div className="absolute top-[16px] right-[16px] w-7 h-7 bg-[#00C950] rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                <div className="flex items-center gap-[10px] mb-[16px]">
                  <img src="/image-removebg-preview (26) 2.svg" alt="Daily MCQ icon" className="w-9 h-9 object-contain" />
                  <h3 className="font-arimo font-bold text-[18px] text-[#101828]" style={{ lineHeight: '28px' }}>
                    Daily MCQ
                  </h3>
                </div>

                <p className="font-arimo font-normal text-[14px] text-[#00A63E] mb-[8px]" style={{ lineHeight: '20px' }}>
                  Status: {isMcqCompleted ? 'Completed' : 'Pending'}
                </p>
                <p className="font-arimo font-normal text-[14px] text-[#364153] mb-[20px] flex-grow" style={{ lineHeight: '20px' }}>
                  {mcqCount} Questions{mcqTopic ? ` - ${mcqTopic}` : ' - Policy & Economy'}
                </p>

                <div
                  className="rounded-[8px] flex items-center justify-center gap-[8px] transition-all hover:opacity-90"
                  style={{ background: '#0E182D', color: '#FFFFFF', height: '32px', width: '126px' }}
                  role="button"
                >
                  {isMcqCompleted ? (
                    <>
                      <img src="/image-removebg-preview (48) 1.svg" alt="Completed" className="w-[24px] h-[24px] object-contain" />
                      <span className="font-arimo font-normal text-[14px]" style={{ lineHeight: '20px' }}>Completed</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-arimo font-normal text-[14px]" style={{ lineHeight: '20px' }}>Start Now</span>
                    </>
                  )}
                </div>
              </Link>

{/* Daily Editorial Card */}
              <Link href="/dashboard/daily-editorial" className="block h-full">
              <div
                className="rounded-[14px] h-full flex flex-col transition-all hover:shadow-md relative"
                style={{
                  background: '#F9FAFB',
                  border: '0.8px solid #E5E7EB',
                  padding: '16px 20px 20px 20px',
                }}
              >
                <div className="flex items-center gap-[10px] mb-[16px]">
                  <span className="text-[24px]">📰</span>
                  <h3 className="font-arimo font-bold text-[18px] text-[#101828]" style={{ lineHeight: '28px' }}>
                    Daily Editorial
                  </h3>
                </div>

                <p className="font-arimo font-normal text-[14px] text-[#6B7280] mb-[8px]" style={{ lineHeight: '20px' }}>
                  Status: {editorialStatus === 'available' ? 'Pending' : (editorialStatus || 'Pending')}
                </p>
                <p className="font-arimo font-normal text-[14px] text-[#364153] mb-[20px] flex-grow" style={{ lineHeight: '20px' }}>
                  {editorialTopic || 'India-US Trade Relations'}
                </p>

                <div
                  className="rounded-[8px] flex items-center justify-center gap-[8px] transition-all hover:opacity-90"
                  style={{ background: '#0E182D', color: '#FFFFFF', height: '32px', width: '126px' }}
                  role="button"
                >
                  <span className="text-[16px]">📖</span>
                  <span className="font-arimo font-normal text-[14px]" style={{ lineHeight: '20px' }}>Read Now</span>
                </div>
              </div>
              </Link>

              {/* Mains Question Card */}
              <Link href="/dashboard/daily-answer" className="block h-full">
              <div
                className="rounded-[14px] h-full flex flex-col transition-all hover:shadow-md relative"
                style={{
                  background: '#F9FAFB',
                  border: '0.8px solid #E5E7EB',
                  padding: '12px 20px 20px 20px',
                }}
              >
                {/* AI Evaluation Badge */}
                <div className="mb-[10px]">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#D1FAE5] text-[#059669]">
                    AI Evaluation
                  </span>
                </div>

                <div className="flex items-center gap-[10px] mb-[16px]">
                  <span className="text-[24px]">✏️</span>
                  <h3 className="font-arimo font-bold text-[18px] text-[#101828]" style={{ lineHeight: '28px' }}>
                    Mains Question
                  </h3>
                </div>

                <p className="font-arimo font-normal text-[14px] text-[#6B7280] mb-[8px]" style={{ lineHeight: '20px' }}>
                  Status: {mainsStatus === 'available' ? 'Pending' : (mainsStatus || 'Pending')}
                </p>
                <p className="font-arimo font-normal text-[14px] text-[#364153] mb-[20px] flex-grow" style={{ lineHeight: '20px' }}>
                  {mainsTopic || 'Local Self Governance'}
                </p>

                <button
                  className="rounded-[8px] flex items-center justify-center gap-[8px] transition-all hover:opacity-90"
                  style={{ background: '#0E182D', color: '#FFFFFF', height: '32px', width: '126px' }}
                >
                  <span className="text-[16px]">✏️</span>
                  <span className="font-arimo font-normal text-[14px]" style={{ lineHeight: '20px' }}>Attempt Now</span>
                </button>
              </div>
              </Link>
            </div>
          )}
        </div>

        {/* Today's Study Tasks Section */}
        <div
          className="mb-[clamp(1rem,1.5vw,1.5rem)] rounded-[16px] p-[clamp(1rem,1.5vw,1.5rem)]"
          style={{
            background: '#FFFFFF',
            border: '0.8px solid #E5E7EB',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-[clamp(0.75rem,1vw,1.25rem)]">
            <div className="flex items-center gap-[8px]">
              <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="20" height="18" rx="2" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5"/>
                <path d="M2 9H22" stroke="#9CA3AF" strokeWidth="1.5"/>
                <rect x="5" y="2" width="3" height="4" rx="1" fill="#EF4444"/>
                <rect x="16" y="2" width="3" height="4" rx="1" fill="#EF4444"/>
                <rect x="6" y="12" width="2" height="2" rx="0.5" fill="#9CA3AF"/>
                <rect x="11" y="12" width="2" height="2" rx="0.5" fill="#9CA3AF"/>
                <rect x="16" y="12" width="2" height="2" rx="0.5" fill="#9CA3AF"/>
                <rect x="6" y="16" width="2" height="2" rx="0.5" fill="#9CA3AF"/>
                <rect x="11" y="16" width="2" height="2" rx="0.5" fill="#EF4444"/>
                <rect x="16" y="16" width="2" height="2" rx="0.5" fill="#9CA3AF"/>
              </svg>
              <h2 className="font-arimo font-bold text-[18px] text-[#101828]" style={{ lineHeight: '28px' }}>
                Today's Study Tasks
              </h2>
            </div>
            <div className="flex items-center gap-[16px]">
              <button className="w-[32px] h-[32px] rounded-full border border-[#B1B1B1] flex items-center justify-center hover:bg-gray-50 transition-colors">
                <img src="/icons/Arrows/arrow-right.svg" alt="Previous" className="w-4 h-4 rotate-180" />
              </button>
              <span className="font-semibold text-[20px] text-[#B1B1B1]" style={{ fontFamily: '"Archivo", "Plus Jakarta Sans", sans-serif', lineHeight: '100%' }}>
                Today • {todayStr}
              </span>
              <button className="w-[32px] h-[32px] rounded-full border border-[#B1B1B1] flex items-center justify-center hover:bg-gray-50 transition-colors">
                <img src="/icons/Arrows/arrow-right.svg" alt="Next" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17223E]"></div>
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <svg className="w-8 h-8 mb-2 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="font-inter text-[13px]">No tasks scheduled for today.</p>
              <p className="font-inter text-[12px] mt-1">Add a custom task to get started.</p>
            </div>
          ) : (
            <>
              {displayTasks.map((task, index) => {
                const leftBorderColor = task.priority
                  ? (borderColors[task.priority] || borderColorsFallback[index % 3])
                  : borderColorsFallback[index % 3];
                const timeLabel = task.startTime && task.endTime
                  ? `${task.startTime} - ${task.endTime} ${formatDuration(task.duration)}`
                  : task.duration ? formatDuration(task.duration) : '';

                return (
                  <div
                    key={task._id || task.id || index}
                    className="rounded-[10px] border border-[#E5E7EB] border-l-[4px] p-[clamp(0.75rem,1vw,1rem)] mb-[clamp(0.5rem,0.75vw,0.75rem)] flex items-start justify-between bg-[#FAFBFE] hover:bg-[#F9FAFB] transition-colors"
                    style={{ borderLeftColor: leftBorderColor }}
                  >
                    <div className="flex-1">
                      <h3 className="font-inter font-semibold text-[clamp(13px,0.83vw,14px)] text-[#1A1A1A] mb-2">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[clamp(10px,0.6vw,11px)] font-medium text-blue-600" style={{ background: '#DBEAFE' }}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h8.5L20 8.5V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {task.type || 'Reading'}
                        </span>
                        {timeLabel && (
                          <span className="inline-flex items-center gap-1.5 text-gray-600 text-[clamp(10px,0.6vw,11px)]">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {timeLabel}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[clamp(10px,0.6vw,11px)] font-medium text-purple-700" style={{ background: '#F3E8FF' }}>
                          {task.subject || 'General'}
                        </span>
                      </div>
                    </div>
                    <button className="ml-3 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* Add Custom Task */}
          <div
            className="rounded-[16px] border border-[#E5E7EB] p-[16px] mb-[12px] flex items-center justify-between"
            style={{ background: '#FFFFFF' }}
          >
            <div className="flex items-center gap-[12px]">
              <div className="w-[48px] h-[48px] bg-[#17223E] rounded-[12px] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3 className="font-arimo font-bold text-[16px] text-[#101828]" style={{ lineHeight: '24px' }}>
                  Add Custom Task
                </h3>
                <p className="font-arimo text-[13px] text-[#6B7280]" style={{ lineHeight: '20px' }}>
                  Create your own study task for today
                </p>
              </div>
            </div>
            <button onClick={() => setShowAddTaskModal(true)} className="px-[14px] h-[32px] bg-[#17223E] text-white rounded-[8px] font-arimo font-normal text-[14px] hover:bg-[#1E2875] transition-colors flex items-center gap-[8px] flex-shrink-0" style={{ lineHeight: '20px' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Add Task
            </button>
          </div>

          {/* Start Focus Session Button */}
          <button
            onClick={handleStartFocusSession}
            className="w-full text-white rounded-[10px] flex items-center justify-center gap-[10px] hover:opacity-90 transition-opacity"
            style={{ background: '#0E182D', height: '48px' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" fill="white"/>
            </svg>
            <span className="font-arimo font-bold text-[16px]" style={{ lineHeight: '24px' }}>Start Focus Session (25 Mins)</span>
          </button>
        </div>

      </div>
    </div>

      {showAddTaskModal && (
        <AddTaskModal
          onClose={() => setShowAddTaskModal(false)}
          onTaskAdded={(task) => setTasks(prev => [...prev, task])}
        />
      )}

      {showNotificationModal && (
        <NotificationModal
          onClose={() => setShowNotificationModal(false)}
        />
      )}
    </>
  );
};

export default ResponsiveDashboardContent;
