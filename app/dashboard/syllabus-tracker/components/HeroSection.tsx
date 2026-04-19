'use client';

import { Mode, TrackerState, SyllabusData } from '../page';

interface HeroSectionProps {
  mode: Mode;
  states: TrackerState;
  syllabusData: SyllabusData;
  userName?: string;
}

export default function HeroSection({ mode, states, syllabusData, userName }: HeroSectionProps) {
  const calculateModeStats = (modeKey: Mode) => {
    const subjects = syllabusData[modeKey];
    let total = 0;
    let done = 0;
    let reading = 0;
    let revision = 0;

    subjects.forEach(subject => {
      subject.topics.forEach((topic, ti) => {
        topic.subs.forEach((_, si) => {
          total++;
          const key = `${subject.id}__${ti}__${si}`;
          const status = states[key]?.status || 'none';
          if (status === 'done') done++;
          if (status === 'in-progress') reading++;
          if (status === 'needs-revision') revision++;
        });
      });
    });

    return { total, done, reading, revision, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const prelimsStats = calculateModeStats('prelims');
  const mainsStats = calculateModeStats('mains');
  const optionalStats = calculateModeStats('optional');

  const allTotal = prelimsStats.total + mainsStats.total + optionalStats.total;
  const allDone = prelimsStats.done + mainsStats.done + optionalStats.done;
  const allReading = prelimsStats.reading + mainsStats.reading + optionalStats.reading;
  const allRevision = prelimsStats.revision + mainsStats.revision + optionalStats.revision;
  const overallPct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

  const stageCards = [
    { id: 'prelims', label: 'Prelims GS', icon: '🎯', stats: prelimsStats, color: '#e8a820' },
    { id: 'mains', label: 'Mains', icon: '✍️', stats: mainsStats, color: '#60a5fa' },
    { id: 'optional', label: 'Optional', icon: '📚', stats: optionalStats, color: '#c4b5fd' },
  ];

  return (
    <div className="mx-[18px] mt-[14px] rounded-[16px] border border-white/5 overflow-hidden relative" 
         style={{
           background: 'linear-gradient(115deg, #0a1628 0%, #0d1e38 40%, #112347 70%, #0d1d3a 100%)',
           padding: '22px 24px 20px',
         }}>
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(rgba(255,255,255,.028) 1px, transparent 1px)',
             backgroundSize: '22px 22px',
           }} />
      
      {/* Glow effect */}
      <div className="absolute left-[35%] -top-[40px] w-[280px] h-[280px] rounded-full pointer-events-none"
           style={{
             background: 'radial-gradient(circle, rgba(201,168,76,.10) 0%, transparent 65%)',
           }} />

      <div className="flex gap-[28px] items-stretch relative z-10">
        {/* Left Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-[7px] mb-[8px]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#c9921a]" />
              <div className="text-[9px] font-extrabold tracking-[2.8px] text-[#e8a820] uppercase">
                PERSONALIZED SYLLABUS TRACKER
              </div>
            </div>
            
            <h1 className="font-playfair text-[27px] text-white mb-[7px] leading-tight font-bold">
              Know Exactly Where<br />You Stand, <em className="italic text-[#e8a820]">{userName || 'Aspirant'}.</em>
            </h1>
            
            <p className="text-[11.5px] text-white/40 max-w-[400px] leading-relaxed mb-[14px]">
              Your UPSC syllabus, fully mapped. Track every topic across Prelims, Mains and Optional, see what's done, what's pending, and what to conquer next.
            </p>
            
            <div className="inline-flex items-center gap-[8px] bg-white/7 border border-white/10 rounded-[8px] px-[13px] py-[7px] text-[11.5px] font-semibold text-white/70 mb-[14px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="white" strokeWidth="2" />
                <path d="M8 2.5V6.5M16 2.5V6.5M3.5 9.5H20.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              UPSC Prelims 2026: {Math.max(0, Math.ceil((new Date(2026, 4, 24).getTime() - Date.now()) / 86400000))} days remaining.
            </div>
          </div>

          {/* Stats Strip */}
          <div className="flex gap-0 rounded-[10px] overflow-hidden" style={{ border: '0.8px solid #364153' }}>
            <div className="flex-1 p-[8px_12px] text-center" style={{ background: '#1C273B', borderRight: '0.8px solid #364153' }}>
              <div className="font-playfair text-[18px] font-bold leading-none" style={{ color: '#e8a820' }}>{overallPct}%</div>
              <div className="text-[9px] font-bold tracking-[0.8px] uppercase mt-[2px]" style={{ color: '#6A7282' }}>Overall</div>
            </div>
            <div className="flex-1 p-[8px_12px] text-center" style={{ background: '#1C273B', borderRight: '0.8px solid #364153' }}>
              <div className="font-playfair text-[18px] font-bold leading-none" style={{ color: '#4ade80' }}>{allDone}</div>
              <div className="text-[9px] font-bold tracking-[0.8px] uppercase mt-[2px]" style={{ color: '#6A7282' }}>Done</div>
            </div>
            <div className="flex-1 p-[8px_12px] text-center" style={{ background: '#1C273B', borderRight: '0.8px solid #364153' }}>
              <div className="font-playfair text-[18px] font-bold leading-none" style={{ color: '#e8a820' }}>{allReading}</div>
              <div className="text-[9px] font-bold tracking-[0.8px] uppercase mt-[2px]" style={{ color: '#6A7282' }}>Revising</div>
            </div>
            <div className="flex-1 p-[8px_12px] text-center" style={{ background: '#1C273B' }}>
              <div className="font-playfair text-[18px] font-bold leading-none" style={{ color: '#4ade80' }}>{allTotal - allDone - allReading}</div>
              <div className="text-[9px] font-bold tracking-[0.8px] uppercase mt-[2px]" style={{ color: '#6A7282' }}>Remaining</div>
            </div>
          </div>
        </div>

        {/* Right Section - Your Overall Progress */}
        <div className="w-[300px] min-w-[300px] flex flex-col gap-[8px] justify-center">
          <span
            style={{
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 12,
              lineHeight: '16px',
              color: '#FF8904',
              width: 'fit-content',
            }}
          >
            YOUR OVERALL PROGRESS
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stageCards.map(card => {
              const isActive = mode === card.id;
              return (
                <div
                  key={card.id}
                  className={`bg-white/6 border border-white/9 rounded-[12px] p-[11px_13px] cursor-pointer transition-all duration-200 relative overflow-hidden ${
                    isActive ? 'bg-white/8 border-white/14' : 'hover:bg-white/9 hover:border-white/15 hover:translate-x-[2px]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-[7px]">
                    <div className="flex items-center gap-[9px]">
                      <span className="text-[16px]">{card.icon}</span>
                      <span className="text-[13px] font-bold text-white">{card.label}</span>
                      {isActive && (
                        <span className="text-[9px] font-extrabold px-[8px] py-[2px] rounded-[20px] tracking-[0.4px] uppercase bg-green-400/20 text-green-400 border border-green-400/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="font-playfair text-[20px] font-bold leading-none" style={{ color: card.color }}>
                      {card.stats.pct}%
                    </div>
                  </div>
                  <div className="text-[10.5px] text-white/40 mb-[7px]">
                    {card.stats.done} of {card.stats.total} topics done
                  </div>
                  <div className="h-[3px] bg-white/8 rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px] transition-all duration-900"
                      style={{
                        width: `${card.stats.pct}%`,
                        background: card.id === 'prelims' 
                          ? 'linear-gradient(90deg, #c9921a, #e8a820)' 
                          : card.id === 'mains'
                          ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                          : 'linear-gradient(90deg, #8b5cf6, #c4b5fd)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
