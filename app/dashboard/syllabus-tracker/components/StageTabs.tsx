'use client';

import { Mode, TrackerState, SyllabusData } from '../page';

interface StageTabsProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  states: TrackerState;
  syllabusData: SyllabusData;
}

export default function StageTabs({ mode, onModeChange, states, syllabusData }: StageTabsProps) {
  // Calculate percentage for each mode
  const calculateModePct = (modeKey: Mode) => {
    const subjects = syllabusData[modeKey];
    let total = 0;
    let done = 0;

    subjects.forEach(subject => {
      subject.topics.forEach((topic, ti) => {
        topic.subs.forEach((_, si) => {
          total++;
          const key = `${subject.id}__${ti}__${si}`;
          if (states[key]?.status === 'done') done++;
        });
      });
    });

    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const prelimsPct = calculateModePct('prelims');
  const mainsPct = calculateModePct('mains');
  const optionalPct = calculateModePct('optional');

  return (
    <div className="flex bg-white border-[1.5px] border-[#e0e8f4] rounded-[11px] p-[4px] gap-[3px] shadow-sm">
      {/* Prelims Tab */}
      <button
        onClick={() => onModeChange('prelims')}
        className={`
          flex items-center gap-[6px] px-[18px] py-[7px] rounded-[8px] text-[12px] font-bold transition-all duration-200 whitespace-nowrap
          ${mode === 'prelims' 
            ? 'bg-[#0f1f3d] text-white shadow-md' 
            : 'bg-transparent text-[#8795ae] hover:bg-[#edf2fc] hover:text-[#3c4f6d]'
          }
        `}
      >
        🏛 Prelims
        <span className={`text-[9.5px] font-bold px-[7px] py-[1px] rounded-[8px] ${
          mode === 'prelims' ? 'bg-white/18' : 'bg-[#d8e4f5] text-[#8795ae]'
        }`}>
          {prelimsPct}%
        </span>
      </button>

      {/* Mains Tab */}
      <button
        onClick={() => onModeChange('mains')}
        className={`
          flex items-center gap-[6px] px-[18px] py-[7px] rounded-[8px] text-[12px] font-bold transition-all duration-200 whitespace-nowrap
          ${mode === 'mains'
            ? 'text-[#0f1f3d] shadow-md'
            : 'bg-transparent text-[#8795ae] hover:bg-[#edf2fc] hover:text-[#3c4f6d]'
          }
        `}
        style={mode === 'mains' ? {
          background: 'linear-gradient(135deg, #e8a820, #c9921a)',
          boxShadow: '0 2px 10px rgba(201,146,26,.28)'
        } : {}}
      >
        ✍️ Mains
        <span className={`text-[9.5px] font-bold px-[7px] py-[1px] rounded-[8px] ${
          mode === 'mains' ? 'bg-white/18' : 'bg-[#d8e4f5] text-[#8795ae]'
        }`}>
          {mainsPct}%
        </span>
      </button>

      {/* Optional Tab */}
      <button
        onClick={() => onModeChange('optional')}
        className={`
          flex items-center gap-[6px] px-[18px] py-[7px] rounded-[8px] text-[12px] font-bold transition-all duration-200 whitespace-nowrap
          ${mode === 'optional'
            ? 'text-white shadow-md'
            : 'bg-transparent text-[#8795ae] hover:bg-[#edf2fc] hover:text-[#3c4f6d]'
          }
        `}
        style={mode === 'optional' ? {
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          boxShadow: '0 2px 10px rgba(109,40,217,.28)'
        } : {}}
      >
        📖 Optional
        <span className={`text-[9.5px] font-bold px-[7px] py-[1px] rounded-[8px] ${
          mode === 'optional' ? 'bg-white/18' : 'bg-[#d8e4f5] text-[#8795ae]'
        }`}>
          {optionalPct}%
        </span>
      </button>
    </div>
  );
}
