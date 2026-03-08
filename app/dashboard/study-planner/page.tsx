'use client';

import React, { useState, useEffect } from 'react';
import { studyPlannerService } from '@/lib/services';

interface Task {
  id: string;
  title: string;
  subject?: string;
  type: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
}

export default function StudyPlannerPage() {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [studyType, setStudyType] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [weeklyStudied, setWeeklyStudied] = useState<number | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);
  const [syllabusCoverage, setSyllabusCoverage] = useState<{ subject: string; percentage: number }[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<{ title: string; completed: boolean }[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    studyPlannerService.getTodayTasks()
      .then(res => { if (res.data) setTasks(res.data); })
      .catch(() => {});
    studyPlannerService.getStreak()
      .then(res => {
        if (res.data) {
          setStreakDays(res.data.currentStreak || 0);
          setLongestStreak(res.data.longestStreak || 0);
          if (res.data.weeklyStudied !== undefined) setWeeklyStudied(res.data.weeklyStudied);
          if (res.data.weeklyTarget !== undefined) setWeeklyTarget(res.data.weeklyTarget);
        }
      })
      .catch(() => {});
    studyPlannerService.getSyllabusCoverage()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setSyllabusCoverage(res.data);
        } else if (res.data?.subjects && Array.isArray(res.data.subjects)) {
          setSyllabusCoverage(res.data.subjects);
        }
      })
      .catch(() => {});
    studyPlannerService.getWeeklyGoals()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setWeeklyGoals(res.data);
        } else if (res.data?.goals && Array.isArray(res.data.goals)) {
          setWeeklyGoals(res.data.goals);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setAdding(true);
    try {
      const res = await studyPlannerService.createTask({
        title: taskTitle,
        subject: taskSubject || undefined,
        type: studyType || 'study',
        startTime,
        endTime,
      });
      if (res.data) setTasks(prev => [...prev, res.data]);
      setTaskTitle('');
      setTaskSubject('');
      setStudyType('');
    } catch {}
    setAdding(false);
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await studyPlannerService.updateTask(id, { isCompleted: !completed });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !completed } : t));
    } catch {}
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await studyPlannerService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const prevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const nextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };

  // Generate calendar days dynamically for the current month
  const today = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const todayNum = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
    ? today.getDate() : -1;
  const calendarDays = Array.from({ length: Math.min(16, daysInMonth) }, (_, i) => ({
    day: i + 1,
    current: true,
    active: i + 1 <= (todayNum > 0 ? todayNum : daysInMonth),
    today: i + 1 === todayNum,
  }));

  const studyTypes = [
    { id: 'video', label: 'Video Lectures', icon: '/study-type-video.png' },
    { id: 'reading', label: 'Reading', icon: '/study-type-reading.png' },
    { id: 'practice', label: 'Practice', icon: '/practise.png' },
    { id: 'revision', label: 'Revision', icon: '/revision.png' },
    { id: 'test', label: 'Test', icon: '/study-type-test.png' },
    { id: 'notes', label: 'Note Making', icon: '/notes.png' },
    { id: 'answer', label: 'Answer Writing', icon: '/answer writing.png' },
    { id: 'other', label: 'Other', icon: '/others.png' },
  ];

  const quickAddRows = [
    ['Polity', 'History'],
    ['Science & Technology'],
    ['Economics', 'Geography'],
    ['Revision'],
    ['Environment', 'Ethics'],
    ['Mock Test'],
    ['Answer Writing'],
    ['GS1', 'GS2', 'GS3', 'GS4'],
  ];

  const timeOptions = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00', '22:30', '23:00',
  ];

  // Compute total study time from tasks that have start/end times
  const totalStudyMinutes = tasks.reduce((sum, task) => {
    if (task.startTime && task.endTime) {
      const [sh, sm] = task.startTime.split(':').map(Number);
      const [eh, em] = task.endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return sum + (diff > 0 ? diff : 0);
    }
    return sum;
  }, 0);
  const totalStudyHours = Math.floor(totalStudyMinutes / 60);
  const totalStudyMins = totalStudyMinutes % 60;
  const totalStudyLabel = totalStudyMinutes > 0
    ? `Total Study Time: ${totalStudyMinutes} minutes (${totalStudyHours}h ${totalStudyMins}m)`
    : 'Total Study Time: —';

  // Dynamic month/year display for calendar header
  const calendarMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Weekly streak display
  const weeklyStreakLabel = weeklyStudied !== null && weeklyTarget !== null
    ? `${weeklyStudied}/${weeklyTarget} This Week`
    : weeklyStudied !== null
    ? `${weeklyStudied} days this week`
    : null;

  return (
    <div className="flex flex-col bg-gray-50 overflow-x-hidden" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-5 p-6">

          {/* ═══════ Left Column (290px) ═══════ */}
          <div className="flex-shrink-0 flex flex-col gap-5" style={{ width: '290px' }}>

            {/* Study Streak Card */}
            <div
              style={{
                width: '290px',
                borderRadius: '16px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
                paddingTop: '24.8px',
                paddingRight: '24.8px',
                paddingBottom: '0.8px',
                paddingLeft: '24.8px',
              }}
            >
              <p className="font-arimo" style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 400, color: '#6A7282', marginBottom: '0' }}>
                Study Streak
              </p>
              <h2 className="font-arimo font-bold" style={{ fontSize: '48px', lineHeight: '48px', letterSpacing: '0px', color: '#312C85', marginBottom: '8px' }}>
                {streakDays} Days
              </h2>
                <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                <img src="/fire-icon.png" alt="Fire" style={{ width: '16px', height: '20px' }} />
                <span className="font-arimo font-bold" style={{ fontSize: '16px', lineHeight: '24px', letterSpacing: '0px', color: '#00BC7D' }}>
                  {weeklyStreakLabel || '—'}
                </span>
              </div>
              <p className="font-arimo" style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 400, letterSpacing: '0px', color: '#6A7282', marginBottom: '24px' }}>
                Longest: {longestStreak} Days
              </p>

              <p className="font-arimo font-bold" style={{ fontSize: '16px', lineHeight: '24px', letterSpacing: '0px', color: '#101828', marginBottom: '12px' }}>
                {calendarMonthYear}
              </p>

              <div className="grid grid-cols-7" style={{ marginBottom: '10px' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} className="font-arimo text-center" style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 400, color: '#6A7282' }}>
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7" style={{ gap: '6px 0', paddingBottom: '16px' }}>
                {calendarDays.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center font-arimo font-bold"
                    style={{
                      width: '27.5px',
                      height: '27.5px',
                      borderRadius: (item.active || item.today) ? '10px' : '0',
                      background: item.today ? '#FF6900' : item.active ? '#00BC7D' : 'transparent',
                      color: !item.current ? '#99A1AF' : (item.active || item.today) ? '#FFFFFF' : '#99A1AF',
                      fontSize: '14px',
                      lineHeight: '20px',
                      margin: '0 auto',
                    }}
                  >
                    {item.day}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Add to Plan */}
            <div
              style={{
                width: '290px',
                borderRadius: '16px',
                border: '0.8px solid #E5E7EB',
                background: '#FFFFFF',
                padding: '20px 16px',
              }}
            >
              {/* Header */}
              <div className="flex items-center" style={{ marginBottom: '16px', gap: '8px' }}>
                <img src="/plus.png" alt="Plus" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
                <span className="font-arimo font-bold" style={{ fontSize: '18px', lineHeight: '24px', color: '#101828' }}>
                  Quick Add to Plan
                </span>
              </div>

              {/* Quick Add Buttons — row-by-row layout */}
              <div className="flex flex-col" style={{ gap: '8px' }}>
                {quickAddRows.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="grid"
                    style={{
                      gridTemplateColumns: row.length === 4 ? 'repeat(4, 1fr)' : row.length === 2 ? 'repeat(2, 1fr)' : '1fr',
                      gap: '8px',
                    }}
                  >
                    {row.map((item) => (
                      <button
                        key={item}
                        className="flex items-center justify-center font-arimo hover:bg-gray-100 transition-colors"
                        style={{
                          height: '40px',
                          borderRadius: '10px',
                          border: '0.8px solid #E5E7EB',
                          background: '#F9FAFB',
                          fontSize: row.length === 4 ? '12px' : '14px',
                          lineHeight: '20px',
                          fontWeight: 400,
                          color: '#374151',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Distribution Card */}
            <div
              style={{
                width: '290px',
                borderRadius: '16px',
                border: '0.8px solid rgb(229, 231, 235)',
                background: '#FFFFFF',
                boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                padding: '24px',
                marginTop: '16px'
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                 {/* Donut Chart Icon / P Icon */}
                <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                    <div className="w-full h-full rounded-full border-4 border-t-yellow-400 border-r-red-400 border-b-green-400 border-l-blue-500"></div>
                </div>
                <h2 className="font-arimo font-bold text-[#17223E]" style={{ fontSize: '20px', lineHeight: '28px' }}>
                  Time Distribution
                </h2>
              </div>
              
              {/* Chart Container */}
              <div className="relative mb-4" style={{ height: '245px' }}>
                <div className="relative w-full h-full">
                    {/* Pie Chart Image */}
                    <img
                      src="/container-8.png"
                      alt="Time Distribution Chart"
                      className="w-full h-full object-contain"
                    />
                </div>
              </div>

               {/* Legend */}
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2DD4BF]"></span>
                    <span className="font-arimo text-[#374151] text-sm font-medium">Reading</span>
                  </div>
                  <span className="font-arimo font-bold text-[#111827] text-sm">2.0h</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E]"></span>
                    <span className="font-arimo text-[#374151] text-sm font-medium">Video Lectures</span>
                  </div>
                  <span className="font-arimo font-bold text-[#111827] text-sm">1.5h</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FBBF24]"></span>
                    <span className="font-arimo text-[#374151] text-sm font-medium">Practice</span>
                  </div>
                  <span className="font-arimo font-bold text-[#111827] text-sm">1.0h</span>
                </div>
              </div>

            </div>
          </div>

          {/* ═══════ Center + Right Area ═══════ */}
          <div className="flex-1 min-w-0">

            {/* Dark Banner */}
            <div
              className="rounded-[16px]"
              style={{
                background: 'linear-gradient(90deg, #0E182D 0%, #17223E 100%)',
                padding: '22px 28px',
                marginBottom: '16px',
              }}
            >
              <div className="flex items-center" style={{ gap: '10px', marginBottom: '4px' }}>
                <img src="/calendar-study-planner.png" alt="Calendar" style={{ width: '28px', height: '28px' }} />
                <h1 className="font-arimo font-bold text-white" style={{ fontSize: '26px', lineHeight: '32px' }}>
                  Study Planner
                </h1>
              </div>
              <p className="font-arimo" style={{ fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#E5E7EB' }}>
                Personalized study schedule with daily targets and progress tracking.
              </p>
            </div>

            {/* Date Picker */}
            <div
              className="inline-flex items-center"
              style={{
                height: '48px',
                borderRadius: '10px',
                background: '#1C50D40D',
                border: '1px solid #1C50D40D',
                padding: '0 14px',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <button onClick={prevDay} className="flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors" style={{ width: '24px', height: '24px' }}>
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="#17223E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="font-arimo font-bold whitespace-nowrap" style={{ fontSize: '15px', lineHeight: '24px', color: '#17223E' }}>
                {formatDate(currentDate)}
              </span>
              <button onClick={nextDay} className="flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors" style={{ width: '24px', height: '24px' }}>
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="#17223E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* ── Two Cards Side by Side ── */}
            <div className="flex" style={{ gap: '16px' }}>

              {/* Left Card: Build Your Study Plan */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: '10px',
                  border: '0.8px solid #E5E7EB',
                  background: '#FFFFFF',
                  boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                  padding: '24px',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <img src="/build.png" alt="Build" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    <h2 className="font-arimo font-bold" style={{ fontSize: '18px', lineHeight: '24px', color: '#101828' }}>
                      Build Your Study Plan
                    </h2>
                  </div>
                  <button
                    className="flex items-center gap-2 font-arimo font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ height: '34px', padding: '0 14px', borderRadius: '8px', background: '#17223E', fontSize: '13px' }}
                  >
                    <img src="/saved.png" alt="Save" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                    Save Plan
                  </button>
                </div>

                {/* Inner form area with light blue bg */}
                <div
                  style={{
                    borderRadius: '10px',
                    background: '#DAE2FF40',
                    padding: '20px',
                  }}
                >
                  {/* Task Title */}
                  <div style={{ marginBottom: '14px' }}>
                    <label className="font-arimo font-bold block" style={{ fontSize: '14px', lineHeight: '20px', color: '#101828', marginBottom: '6px' }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Polity Study Session"
                      className="w-full font-arimo outline-none transition-colors"
                      style={{ height: '44px', borderRadius: '10px', border: '0.8px solid #E5E7EB', padding: '0 14px', fontSize: '16px', color: '#0A0A0A', background: '#FFFFFF' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#4F78F6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 120, 246, 0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: '14px' }}>
                    <label className="font-arimo font-bold block" style={{ fontSize: '14px', lineHeight: '20px', color: '#101828', marginBottom: '6px' }}>
                      Subject
                    </label>
                    <div className="relative">
                      <select
                        value={taskSubject}
                        onChange={(e) => setTaskSubject(e.target.value)}
                        className="w-full font-arimo outline-none appearance-none cursor-pointer transition-colors"
                        style={{ height: '44px', borderRadius: '10px', border: '0.8px solid #E5E7EB', padding: '0 36px 0 14px', fontSize: '16px', color: taskSubject ? '#0A0A0A' : '#9CA3AF', background: '#FFFFFF' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#4F78F6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 120, 246, 0.15)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="" disabled>Select Subject</option>
                        <option value="Polity">Polity</option>
                        <option value="History">History</option>
                        <option value="Geography">Geography</option>
                        <option value="Economics">Economics</option>
                        <option value="Environment">Environment</option>
                        <option value="Science & Technology">Science &amp; Technology</option>
                        <option value="Ethics">Ethics</option>
                        <option value="Current Affairs">Current Affairs</option>
                        <option value="Essay">Essay</option>
                      </select>
                      <svg className="absolute pointer-events-none" style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
                        <path d="M6 9l6 6 6-6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Study Type */}
                  <div style={{ marginBottom: '14px' }}>
                    <label className="font-arimo font-bold block" style={{ fontSize: '14px', lineHeight: '20px', color: '#101828', marginBottom: '6px' }}>
                      Study Type
                    </label>
                    <div className="grid grid-cols-4" style={{ gap: '10px' }}>
                      {studyTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setStudyType(type.id)}
                          className="flex flex-col items-center justify-center font-arimo transition-colors"
                          style={{
                            width: '100%',
                            height: '80px',
                            borderRadius: '20px',
                            border: studyType === type.id ? '2px solid #17223E' : '1px solid #E5E7EB',
                            background: '#FFFFFF',
                            boxShadow: '0px 4px 4px 0px #00000040',
                            padding: '8px 6px',
                            gap: '4px',
                          }}
                        >
                          <img src={type.icon} alt={type.label} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                          <span
                            className="font-arimo text-center"
                            style={{
                              fontSize: '12px',
                              lineHeight: '16px',
                              fontWeight: 500,
                              color: '#374151',
                            }}
                          >
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Time + End Time */}
                  <div className="flex items-start" style={{ gap: '12px', marginBottom: '18px' }}>
                    <div className="flex-1">
                      <label className="font-arimo font-bold block" style={{ fontSize: '14px', lineHeight: '20px', color: '#101828', marginBottom: '6px' }}>
                        Start Time
                      </label>
                      <div className="relative">
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full font-arimo outline-none appearance-none cursor-pointer transition-colors"
                          style={{ height: '44px', borderRadius: '10px', border: '0.8px solid #E5E7EB', padding: '0 36px 0 14px', fontSize: '16px', color: '#0A0A0A', background: '#FFFFFF' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#4F78F6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 120, 246, 0.15)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg className="absolute pointer-events-none" style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
                          <path d="M6 9l6 6 6-6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="font-arimo font-bold block" style={{ fontSize: '14px', lineHeight: '20px', color: '#101828', marginBottom: '6px' }}>
                        End Time
                      </label>
                      <div className="relative">
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full font-arimo outline-none appearance-none cursor-pointer transition-colors"
                          style={{ height: '44px', borderRadius: '10px', border: '0.8px solid #E5E7EB', padding: '0 36px 0 14px', fontSize: '16px', color: '#0A0A0A', background: '#FFFFFF' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#4F78F6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 120, 246, 0.15)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg className="absolute pointer-events-none" style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
                          <path d="M6 9l6 6 6-6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Add to Plan Button */}
                  <button
                    onClick={handleAddTask}
                    disabled={adding || !taskTitle.trim()}
                    className="flex items-center justify-center gap-2 font-arimo font-bold text-white hover:opacity-90 transition-opacity w-full disabled:opacity-50"
                    style={{ height: '48px', borderRadius: '10px', background: '#17223E', fontSize: '16px' }}
                  >
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    {adding ? 'Adding...' : "Add to Today's Plan"}
                  </button>
                </div>
              </div>

              {/* Right Card: Today's Planned Tasks */}
              <div
                className="flex flex-col"
                style={{
                  width: '360px',
                  minWidth: '280px',
                  flexShrink: 0,
                  borderRadius: '10px',
                  border: '0.8px solid #E5E7EB',
                  background: '#FFFFFF',
                  boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                  padding: '24px',
                }}
              >
                {/* Tasks List or Empty State */}
                {tasks.length === 0 ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center text-center"
                  style={{
                    height: '477px',
                    borderRadius: '14px',
                    border: '1px dashed #D1D5DC',
                    padding: '20px',
                  }}
                >
                  <img
                    src="/empty-plan-calendar.png"
                    alt="Empty calendar"
                    style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '20px' }}
                  />
                  <p className="font-arimo font-bold" style={{ fontSize: '24px', lineHeight: '30px', color: '#4A5565', marginBottom: '8px' }}>
                    Your plan is empty
                  </p>
                  <p className="font-arimo" style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 400, color: '#4A5565' }}>
                    Add study tasks to build your<br />personalized schedule
                  </p>
                </div>
                ) : (
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '477px' }}>
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                        <button onClick={() => handleToggleTask(task.id, task.isCompleted)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {task.isCompleted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-arimo font-bold text-sm ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                          {task.startTime && <p className="font-arimo text-xs text-gray-500">{task.startTime} - {task.endTime || ''}</p>}
                        </div>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Bottom Stats */}
                <div style={{ paddingTop: '16px' }}>
                  {/* Total Study Time */}
                  <div
                    className="flex items-center justify-center font-arimo"
                    style={{
                      height: '38px',
                      borderRadius: '10px',
                      background: '#EEF2FF',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#312C85',
                      marginBottom: '10px',
                    }}
                  >
                    {totalStudyLabel}
                  </div>

                  {/* Start Focus Session */}
                  <button
                    className="flex items-center justify-center gap-2 font-arimo font-bold text-white hover:opacity-90 transition-opacity w-full"
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#00BC7D',
                      fontSize: '14px',
                    }}
                  >
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="white"/>
                      <path d="M10 8l6 4-6 4V8z" fill="#00BC7D"/>
                    </svg>
                    Start Focus Session with This Plan
                  </button>
                </div>
              </div>
            </div>

            {/* ── Bottom Row: 3 Cards ── */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              
                   {/* Card 1: Syllabus Coverage */}
              <div
                className="bg-white rounded-[16px] border-[0.8px] border-[#E5E7EB] p-6 shadow-[0px_1px_2px_-1px_#0000001A,0px_1px_3px_0px_#0000001A]"
                style={{ height: '230px' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <img src="/image-removebg-preview%20(60)%201.png" alt="Syllabus" style={{ width: '24px', height: '24px' }} />
                  <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: '16px', lineHeight: '24px' }}>
                    Syllabus Coverage
                  </h3>
                </div>

                <div className="space-y-3">
                  {syllabusCoverage.length > 0 ? (
                    syllabusCoverage.slice(0, 3).map((item) => (
                      <div key={item.subject}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-arimo text-[#101828]" style={{ fontSize: '13px' }}>{item.subject}</span>
                          <span className="font-arimo font-bold text-[#101828]" style={{ fontSize: '13px' }}>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div className="bg-[#17223E] h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="font-arimo text-[#6B7280] text-center" style={{ fontSize: '13px', paddingTop: '8px' }}>
                      No coverage data yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Card 2: Weekly Goals */}
              <div
                className="bg-white rounded-[16px] border-[0.8px] border-[#E5E7EB] p-6 shadow-[0px_1px_2px_-1px_#0000001A,0px_1px_3px_0px_#0000001A]"
                style={{ height: '230px' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  {/* Target Icon */}
                  <img src="/image-removebg-preview%20(61)%201%20(1).png" alt="Goals" style={{ width: '24px', height: '24px' }} />
                  <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: '16px', lineHeight: '24px' }}>
                    Weekly Goals
                  </h3>
                </div>

                <div className="space-y-3">
                  {weeklyGoals.length > 0 ? (
                    weeklyGoals.map((goal, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${goal.completed ? 'bg-green-500 border border-green-500' : 'border border-[#D1D5DB]'}`}
                        >
                          {goal.completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`font-arimo text-[#101828] ${goal.completed ? 'line-through text-gray-400' : ''}`} style={{ fontSize: '14px', lineHeight: '20px' }}>{goal.title}</span>
                      </div>
                    ))
                  ) : (
                    <p className="font-arimo text-[#6B7280] text-center" style={{ fontSize: '13px', paddingTop: '8px' }}>
                      No weekly goals set.
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: Planner Sync */}
              <div
                className="bg-white rounded-[16px] border-[0.8px] border-[#E5E7EB] shadow-[0px_1px_2px_-1px_#0000001A,0px_1px_3px_0px_#0000001A] flex flex-col justify-between"
                style={{ height: '230px', padding: '24px' }}
              >
                <div>
                    <div className="flex items-center gap-2 mb-4">
                      <img src="/image-removebg-preview%20(64)%201.png" alt="Sync" style={{ width: '24px', height: '24px' }} />
                      <h3 className="font-arimo font-bold text-[#101828]" style={{ fontSize: '16px', lineHeight: '24px' }}>
                        Planner Sync
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {/* Google Calendar */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                        <div className="flex items-center gap-3">
                          <img src="/Container%20(3).png" alt="GCal" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          <span className="font-arimo text-[#101828]" style={{ fontSize: '14px' }}>Google Calendar</span>
                        </div>
                        {/* Toggle ON */}
                        <div className="w-10 h-6 bg-[#101828] rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                        </div>
                      </div>

                      {/* Smart Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src="/Container%20(4).png" alt="Notifications" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          <span className="font-arimo text-[#101828]" style={{ fontSize: '14px' }}>Smart Notifications</span>
                        </div>
                        {/* Toggle ON */}
                         <div className="w-10 h-6 bg-[#101828] rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                        </div>
                      </div>
                    </div>
                </div>
                
                {/* Button */}
                <button
                    className="w-full bg-[#101828] text-white font-arimo font-bold rounded-[8px] hover:opacity-90 transition-opacity"
                    style={{ height: '40px', fontSize: '14px' }}
                >
                    Start Today&apos;s Session
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

