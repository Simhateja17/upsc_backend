'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* Leaf/feather logo for sidebar */
const LeafLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
    <path
      d="M12 2C8 8 12 14 12 20c0 0 4-6 8-12-4 4-8 8-12 10-2-2-4-4-4-6 0-4 4-8 8-12z"
      fill="#4ADE80"
      stroke="#4ADE80"
      strokeWidth="0.5"
    />
  </svg>
);

const suggestionCards = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#92400E]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7h8M8 11h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    iconBg: '#FFF7ED',
    title: 'Explain a UPSC topic',
    subtitle: 'Deep explanation with dimensions, UPSC angle & related questions',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#7C3AED]">
        <path d="M12 2v4M8 6l4 4 4-4M12 6v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22h16M4 22l3-8M20 22l-3-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: '#FAF5FF',
    title: 'Ethics case study I should know',
    subtitle: 'Real-world ethics + how to frame and structure your answer',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#DC2626]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: '#FEF2F2',
    title: 'Build my study plan',
    subtitle: 'Personalized schedule based on your exam date and syllabus gaps',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2563EB]">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: '#EFF6FF',
    title: 'Study strategy & planner',
    subtitle: 'Personalized roadmap, daily schedules + all-topic prioritization',
  },
];

const conversationHistory = {
  today: [
    { icon: '📚', title: 'Bhakti Movement — socio-relig...' },
  ],
  yesterday: [
    { icon: '⚖️', title: 'Fundamental Rights vs DPSP ...' },
    { icon: '💰', title: '10 MCQs — Indian Economy Pre...' },
  ],
  earlier: [
    { icon: '🌍', title: "India's Climate Commitments c..." },
    { icon: '📝', title: 'Essay structure: Democracy in I...' },
    { icon: '🏛️', title: 'Temple architecture — Art & Cul...' },
  ],
};

function formatTime() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${am ? 'am' : 'pm'}`;
}

const DAILY_QUERY_LIMIT = 10;

export default function JeetGPTPage() {
  const [inputValue, setInputValue] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [lastTime, setLastTime] = useState('');
  const [proCardDismissed, setProCardDismissed] = useState(false);
  const [queriesUsed, setQueriesUsed] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setQueriesUsed((prev) => prev + 1);
    setLastQuery(trimmed);
    setLastTime(formatTime());
    setShowChat(true);
    setInputValue('');
  };

  const startNewConversation = () => {
    setShowChat(false);
    setLastQuery('');
    setInputValue('');
  };

  const queriesExhausted = queriesUsed >= DAILY_QUERY_LIMIT;

  return (
    <div
      className="flex overflow-hidden bg-white"
      style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}
    >
      {/* Left Sidebar - Dark */}
      <aside
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{ width: '266px', background: '#0A1628' }}
      >
        {/* Logo with leaf icon */}
        <div className="pt-6 px-4 pb-2">
          <Link href="/dashboard" className="flex items-start gap-2">
            <LeafLogo />
            <div>
              <div className="font-inter font-bold text-[18px] leading-7 text-white">
                Rise with Jeet IAS
              </div>
              <div
                className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mt-0.5"
                style={{ color: '#99A1AF' }}
              >
                India&apos;s Premier UPSC Platform
              </div>
            </div>
          </Link>
        </div>

        {/* New Conversation Button */}
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[10px] font-inter font-semibold text-[14px] leading-5 text-white"
            style={{ background: 'linear-gradient(90deg, #F0B100 0%, #FF6900 100%)' }}
          >
            ⚡ New Conversation
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>
              Today
            </div>
            {conversationHistory.today.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 px-3 rounded-[10px] mb-1 cursor-pointer hover:bg-white/5"
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-inter text-[12px] leading-4 truncate" style={{ color: '#D1D5DC' }}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>
              Yesterday
            </div>
            {conversationHistory.yesterday.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 px-3 rounded-[10px] mb-1 cursor-pointer hover:bg-white/5"
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-inter text-[12px] leading-4 truncate" style={{ color: '#D1D5DC' }}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>
              Earlier
            </div>
            {conversationHistory.earlier.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 px-3 rounded-[10px] mb-1 cursor-pointer hover:bg-white/5"
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-inter text-[12px] leading-4 truncate" style={{ color: '#D1D5DC' }}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Queries */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>
            Daily Queries
          </div>
          <div
            className="rounded-[10px] p-3 mb-3"
            style={{ border: '1px solid #787C82', background: 'rgba(217, 217, 217, 0.1)' }}
          >
            <div className="flex justify-between items-center font-inter text-[12px]" style={{ color: '#D1D5DC' }}>
              <span>4/10</span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: '40%', background: '#3B82F6' }} />
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 p-2 rounded-[10px] hover:bg-white/5 cursor-pointer">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-inter font-bold text-[10px] leading-[15px] text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #51A2FF 0%, #155DFC 100%)' }}
            >
              AS
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-inter font-semibold text-[12px] leading-4 text-white truncate">
                Arjun Sharma
              </div>
              <div className="font-inter text-[10px] leading-[15px]" style={{ color: '#99A1AF' }}>
                Free user
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-white/70">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFFFFF' }}>
        {/* Header - Jeet AI — Your UPSC Mentor + tagline */}
        <header
          className="flex-shrink-0 flex flex-col gap-0.5 py-3 px-6"
          style={{ borderBottom: '0.8px solid #E5E7EB' }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-inter font-bold text-[18px] leading-7" style={{ color: '#101828' }}>Jeet AI</span>
            <span className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>—</span>
            <span className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>Your UPSC Mentor</span>
          </div>
          <div className="font-inter text-[12px] leading-4" style={{ color: '#99A1AF' }}>
            Ask anything about UPSC preparation
          </div>
        </header>

        {queriesExhausted ? (
          /* Daily Queries limit reached - dark card */
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
            <div
              className="w-full max-w-[672px] rounded-[24px] border p-6 flex flex-col gap-5"
              style={{
                border: '0.8px solid transparent',
                borderTop: '0.8px solid #364153',
                background: 'linear-gradient(180deg, #0F1A2E 0%, #1A2942 100%)',
                boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-inter font-bold text-[14px] leading-5 uppercase tracking-[1.4px]"
                  style={{ color: '#99A1AF' }}
                >
                  Daily Queries
                </span>
                <span className="font-inter font-bold text-[48px] leading-[48px] text-right">
                  <span style={{ color: '#FDC700' }}>10</span>
                  <span style={{ color: '#99A1AF' }}>/10 used</span>
                </span>
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, #FB2C36 0%, #FF6900 50%, #E7000B 100%)',
                }}
              />
              <p
                className="font-inter text-[14px] leading-5 text-center"
                style={{ color: '#99A1AF' }}
              >
                Resets daily at midnight
              </p>
            </div>
          </div>
        ) : !showChat ? (
          /* Welcome Section */
          <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-8">
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl mb-6"
              style={{
                background: '#1E3A5F',
                boxShadow: '0px 4px 6px -4px rgba(0,0,0,0.1), 0px 10px 15px -3px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h1 className="font-inter font-bold text-[30px] leading-9 text-center mb-4" style={{ color: '#101828' }}>
              Hi Arjun, I&apos;m <span className="font-bold italic" style={{ color: '#D08700' }}>Jeet AI</span>.
            </h1>
            <p className="font-inter text-[16px] leading-6 text-center max-w-[561px] mb-4" style={{ color: '#4A5565' }}>
              I&apos;m Jeet AI, your intelligent UPSC preparation partner — from ancient history to current affairs,
              revision strategy, or just thinking through a topic together.
            </p>
            <p className="font-inter text-[18px] leading-5 mb-10" style={{ color: '#99A1AF' }}>
              How can I help you today in your preparation?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] w-full mb-10">
              {suggestionCards.map((card, i) => (
                <button
                  key={i}
                  className="text-left p-6 rounded-[16px] border transition-colors hover:border-[#D08700]/50 hover:shadow-md"
                  style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF' }}
                >
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center mb-4" style={{ background: card.iconBg }}>
                    {card.icon}
                  </div>
                  <h3 className="font-inter font-bold text-[18px] leading-[27px] mb-2" style={{ color: '#101828' }}>{card.title}</h3>
                  <p className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>{card.subtitle}</p>
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="w-full max-w-[968px]">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[16px]" style={{ border: '0.8px solid #E5E7EB', background: '#F9FAFB' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your preparation..."
                  className="flex-1 bg-transparent font-inter text-[16px] outline-none placeholder:font-normal"
                  style={{ color: '#101828' }}
                />
                <button type="submit" className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: '#1E3A5F' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
              <p className="font-inter text-[12px] leading-4 text-center mt-3 italic" style={{ color: '#99A1AF' }}>
                Jeet AI can make mistakes. Verify important facts from NCERT & official sources.{' '}
                <span className="font-semibold not-italic cursor-pointer hover:underline" style={{ color: '#D08700' }}>Usage guidelines</span>
              </p>
            </form>
          </div>
        ) : (
          /* Chat View: user bubble + AI response card */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* User message bubble - right aligned */}
              <div className="flex justify-end mb-4">
                <div
                  className="max-w-[672px] py-3 px-6 rounded-[24px] font-inter text-[14px] leading-5 text-white"
                  style={{ background: '#0F1C2E' }}
                >
                  {lastQuery}
                </div>
              </div>
              <div className="flex justify-end mb-1">
                <span className="font-inter text-[12px] leading-4" style={{ color: '#99A1AF' }}>{lastTime}</span>
              </div>

              {/* AI response card */}
              <div
                className="max-w-[840px] rounded-[16px] p-6 border overflow-hidden"
                style={{
                  border: '0.8px solid #E5E7EB',
                  background: '#FFFFFF',
                  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
                }}
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1E3A5F' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0B100" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-inter font-bold text-[18px] leading-7 mb-3" style={{ color: '#101828' }}>Understanding Your Topic</h2>
                    <p className="font-inter text-[14px] leading-[22.75px] mb-5" style={{ color: '#364153' }}>
                      Great question! Let me break this down through the UPSC lens — covering all dimensions that an examiner would reward.
                    </p>

                    {/* UPSC HIGH-PRIORITY ALERT */}
                    <div
                      className="rounded-[10px] p-4 mb-5"
                      style={{ borderLeft: '4px solid #FF8904', background: 'linear-gradient(90deg, #FFF7ED 0%, #FFFBEB 100%)' }}
                    >
                      <div className="font-inter font-bold text-[12px] leading-4 uppercase tracking-[0.6px] mb-2" style={{ color: '#F54900' }}>UPSC HIGH-PRIORITY ALERT</div>
                      <p className="font-inter text-[14px] leading-5" style={{ color: '#364153' }}>
                        This topic has appeared <strong style={{ color: '#364153' }}>4 times in Prelims (2017-2024)</strong> and in <strong style={{ color: '#364153' }}>Mains GS Paper I! High-probability for 2025 too.</strong>
                      </p>
                    </div>

                    {/* Key Dimensions to Cover */}
                    <h3 className="font-inter font-bold text-[16px] leading-6 mb-3" style={{ color: '#101828' }}>Key Dimensions to Cover</h3>
                    <ul className="space-y-3 mb-5">
                      <li className="flex gap-3 font-inter">
                        <span style={{ color: '#364153' }}>•</span>
                        <span><span className="font-semibold text-[16px] leading-6" style={{ color: '#101828' }}>Historical context:</span><span className="text-[14px] leading-5" style={{ color: '#364153' }}> Origins and evolution — the foundation of any strong UPSC answer.</span></span>
                      </li>
                      <li className="flex gap-3 font-inter">
                        <span style={{ color: '#364153' }}>•</span>
                        <span><span className="font-semibold text-[16px] leading-6" style={{ color: '#101828' }}>Constitutional/Administrative angle:</span><span className="text-[14px] leading-5" style={{ color: '#364153' }}> How policy frameworks engage with this topic. Critical for GS Paper-I–III.</span></span>
                      </li>
                      <li className="flex gap-3 font-inter">
                        <span style={{ color: '#364153' }}>•</span>
                        <span><span className="font-semibold text-[16px] leading-6" style={{ color: '#101828' }}>Contemporary relevance:</span><span className="text-[14px] leading-5" style={{ color: '#364153' }}> Links to current affairs, governance, and India&apos;s developmental priorities.</span></span>
                      </li>
                      <li className="flex gap-3 font-inter">
                        <span style={{ color: '#364153' }}>•</span>
                        <span><span className="font-semibold text-[16px] leading-6" style={{ color: '#101828' }}>Critical perspective:</span><span className="text-[14px] leading-5" style={{ color: '#364153' }}> Challenges, gaps, and the way forward — this is where toppers score extra marks.</span></span>
                      </li>
                    </ul>

                    {/* EXAMINER'S TIP */}
                    <div
                      className="rounded-[14px] p-4 mb-5 border"
                      style={{ border: '0.8px solid #BEDBFF', background: '#EFF6FF' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <span className="font-inter font-bold text-[12px] leading-4 uppercase tracking-[0.6px]" style={{ color: '#193CB8' }}>Examiner&apos;s Tip</span>
                      </div>
                      <p className="font-inter text-[14px] leading-[22.75px]" style={{ color: '#364153' }}>
                        Always write with a <em>multi-dimensional lens</em>. Most aspirants cover only 1–2 dimensions. Covering 4 dimensions in a structured way — even briefly — signals a prepared, <em>thinking candidate.</em>
                      </p>
                    </div>

                    {/* Related tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button type="button" className="font-inter font-semibold text-[12px] leading-4 py-1 px-3 rounded-full" style={{ background: '#F3F4F6', color: '#364153' }}>📚 NCERT Themes in History</button>
                      <button type="button" className="font-inter font-semibold text-[12px] leading-4 py-1 px-3 rounded-full" style={{ background: '#F3E8FF', color: '#8200DB' }}>📝 UPSC 2023 GS-I</button>
                      <button type="button" className="font-inter font-semibold text-[12px] leading-4 py-1 px-3 rounded-full" style={{ background: '#DBEAFE', color: '#1447E6' }}>📅 Jan 2025 Current Affairs</button>
                    </div>

                    <span className="font-inter text-[12px] leading-4" style={{ color: '#99A1AF' }}>{lastTime}</span>
                  </div>
                </div>
              </div>

              {/* Query limit notification card */}
              <div
                className="max-w-[896px] mt-6 rounded-[24px] border flex gap-4 p-6 flex-shrink-0"
                style={{
                  border: '1.6px solid transparent',
                  borderTop: '1.6px solid #BEDBFF',
                  background: '#EFF6FF',
                  boxShadow: '0px 4px 6px -4px rgba(0,0,0,0.1), 0px 10px 15px -3px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-[16px] flex items-center justify-center font-inter font-bold text-[24px] leading-8 text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FDC700 0%, #FF6900 100%)' }}
                >
                  J
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-inter font-semibold text-[12px] leading-4 uppercase tracking-[0.6px] mb-2" style={{ color: '#6A7282' }}>— Jeet AI</div>
                  <p className="font-inter font-medium text-[18px] leading-7 mb-3" style={{ color: '#101828' }}>
                    You&apos;ve used <strong className="font-bold">all 10 queries</strong> for today — great study session! 🎉
                  </p>
                  <p className="font-inter text-[16px] leading-6 mb-2" style={{ color: '#364153' }}>
                    Your queries reset at midnight. Until then, review your previous conversations or explore the <strong className="font-semibold">PYQ Bank</strong> for more practice.
                  </p>
                  <p className="font-inter text-[16px] leading-6" style={{ color: '#364153' }}>
                    <strong className="font-bold">Pro members</strong> get <strong className="font-bold">unlimited queries</strong> + <strong className="font-bold">priority response</strong>. No pressure — it&apos;s here when you need it.
                  </p>
                </div>
              </div>

              {/* Pro membership promotion card - dismissible */}
              {!proCardDismissed && (
                <div
                  className="max-w-[896px] mt-4 rounded-[24px] border flex items-center justify-between gap-4 p-5 flex-shrink-0"
                  style={{
                    border: '1.6px solid transparent',
                    borderTop: '1.6px solid #FFD6A8',
                    background: 'linear-gradient(90deg, #FFFBEB 0%, #FFF7ED 100%)',
                    boxShadow: '0px 2px 4px -2px rgba(0,0,0,0.1), 0px 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                >
                  <div
                    className="w-9 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 text-white text-lg"
                    style={{ background: 'linear-gradient(135deg, #FF8904 0%, #FB2C36 100%)' }}
                  >
                    ✨
                  </div>
                  <p className="font-inter text-[14px] leading-5 flex-1 min-w-0" style={{ color: '#364153' }}>
                    You&apos;re making great progress! <strong className="font-bold">Pro members</strong> get unlimited queries, saved notes, and priority answer evaluation.
                  </p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link href="/dashboard/free-trial">
                      <button
                        type="button"
                        className="font-inter font-bold text-[14px] leading-5 text-white py-2.5 px-5 rounded-[14px] whitespace-nowrap"
                        style={{
                          background: 'linear-gradient(90deg, #FF6900 0%, #FB2C36 100%)',
                          boxShadow: '0px 2px 4px -2px rgba(0,0,0,0.1), 0px 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      >
                        Explore Pro →
                      </button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setProCardDismissed(true)}
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-colors"
                      style={{ background: '#E5E7EB' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input bar - chat view: Ask Jeet AI anything about UPSC... + mic, pencil, send */}
            <div className="flex-shrink-0 pt-4 px-6 pb-6 border-t" style={{ borderTop: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
              <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3.5 rounded-[16px]" style={{ border: '0.8px solid #E5E7EB', background: '#F9FAFB', paddingRight: '96px' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Jeet AI anything about UPSC..."
                  className="flex-1 bg-transparent font-inter text-[14px] outline-none placeholder:font-normal min-w-0"
                  style={{ color: '#101828' }}
                />
                <button type="button" className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="M12 9v4M12 13h.01" /></svg>
                </button>
                <button type="button" className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button type="submit" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white flex-shrink-0" style={{ background: '#1E3A5F' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </form>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
