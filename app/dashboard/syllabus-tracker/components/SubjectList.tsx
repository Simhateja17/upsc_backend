'use client';

import { Subject } from '@/data/syllabus/syllabusData';
import { Mode, TrackerState } from '../page';

interface SubjectListProps {
  subjects: Subject[];
  activeSubject: string | null;
  onSelectSubject: (subjectId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  states: TrackerState;
  mode: Mode;
}

export default function SubjectList({ 
  subjects, 
  activeSubject, 
  onSelectSubject, 
  searchQuery, 
  onSearchChange,
  states 
}: SubjectListProps) {
  // Calculate subject stats
  const getSubjectStats = (subject: Subject) => {
    let total = 0;
    let done = 0;

    subject.topics.forEach((topic, ti) => {
      topic.subs.forEach((_, si) => {
        total++;
        const key = `${subject.id}__${ti}__${si}`;
        if (states[key]?.status === 'done') done++;
      });
    });

    return { 
      total, 
      done, 
      pct: total > 0 ? Math.round((done / total) * 100) : 0 
    };
  };

  const filteredSubjects = subjects.filter(s => 
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[260px] min-w-[260px] bg-white rounded-[14px] border-[1.5px] border-[#e0e8f4] flex flex-col overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-[11px_13px_9px] border-b-[1.5px] border-[#e0e8f4] flex-shrink-0">
        <div className="text-[9px] font-extrabold tracking-[1.6px] text-[#8795ae] uppercase mb-[8px]">
          Subjects
        </div>
        <div className="relative">
          <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[#8795ae] text-[11px] pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter subjects..."
            className="w-full bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[8px] pl-[27px] pr-[10px] py-[6px] text-[11.5px] text-[#0f1f3d] outline-none transition-all duration-200 focus:border-[rgba(201,146,26,.30)] focus:bg-white"
          />
        </div>
      </div>

      {/* Subject List */}
      <div className="flex-1 overflow-y-auto p-[10px]">
        {filteredSubjects.map(subject => {
          const stats = getSubjectStats(subject);
          const isActive = activeSubject === subject.id;
          const r = 15;
          const circ = 2 * Math.PI * r;
          const off = circ - (circ * stats.pct / 100);
          const ringColor = stats.pct === 100 ? '#16a34a' : stats.pct > 50 ? '#c9921a' : subject.color;

          return (
            <div
              key={subject.id}
              onClick={() => onSelectSubject(subject.id)}
              className={`
                flex items-center gap-[11px] p-[11px_13px] rounded-[12px] cursor-pointer border-[1.5px] mb-[6px] relative overflow-hidden transition-all duration-200
                ${isActive 
                  ? 'border-[rgba(201,146,26,.30)] shadow-md' 
                  : 'border-[#e0e8f4] bg-white hover:border-[#d8e4f5] hover:bg-[#edf2fc] hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0 active:shadow-sm'
                }
              `}
              style={isActive ? {
                background: 'linear-gradient(135deg, rgba(232,168,32,.06), rgba(201,146,26,.03))',
                boxShadow: '0 4px 16px rgba(201,146,26,.16), 0 0 0 3px rgba(201,146,26,.08)'
              } : {
                boxShadow: '0 2px 8px rgba(15,31,61,.05)'
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-r-[2px]"
                     style={{ background: 'linear-gradient(180deg, #e8a820, #c9921a)' }} />
              )}

              {/* Subject after pseudo effect */}
              <div className="absolute inset-0 rounded-[12px] pointer-events-none"
                   style={{
                     boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8), inset 0 -1px 0 rgba(15,31,61,.06)'
                   }} />

              {/* Icon */}
              <div 
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[19px] flex-shrink-0"
                style={{
                  background: subject.bg,
                  boxShadow: '0 2px 8px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.3)'
                }}
              >
                {subject.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`text-[12.5px] font-bold mb-[2px] whitespace-nowrap overflow-hidden text-ellipsis ${
                  isActive ? 'text-[#0f1f3d]' : 'text-[#0f1f3d]'
                }`}>
                  {subject.name}
                </div>
                <div className="text-[10px] text-[#8795ae]">
                  {subject.topics.length} topics · {stats.done}/{stats.total}
                </div>
              </div>

              {/* Progress Ring */}
              <div className="flex-shrink-0 relative w-[36px] h-[36px]">
                <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke="#d8e4f5"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={circ.toFixed(2)}
                    strokeDashoffset={off.toFixed(2)}
                    style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-extrabold text-[#3c4f6d]">
                  {stats.pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
