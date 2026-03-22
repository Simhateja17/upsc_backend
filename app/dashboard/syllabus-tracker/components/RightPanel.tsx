'use client';

import { Subject } from '@/data/syllabus/syllabusData';
import { TrackerState } from '../page';

interface RightPanelProps {
  subjects: Subject[];
  states: TrackerState;
}

export default function RightPanel({ subjects, states }: RightPanelProps) {
  // Calculate subject progress
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

  return (
    <div className="w-[228px] min-w-[228px] flex flex-col gap-[11px] overflow-y-auto flex-shrink-0">
      {/* Subject Progress Card */}
      <div className="bg-white border-[1.5px] border-[#e0e8f4] rounded-[14px] p-[13px] shadow-sm">
        <div className="flex items-center justify-between mb-[11px]">
          <div className="flex items-center gap-[6px]">
            <div className="w-[3px] h-[13px] bg-[#c9921a] rounded-[2px]" />
            <div className="text-[9.5px] font-extrabold tracking-[1.2px] uppercase text-[#3c4f6d]">
              Subject Progress
            </div>
          </div>
          <a 
            href="#" 
            className="text-[11px] font-bold text-[#0f1f3d] cursor-pointer no-underline transition-colors duration-150 hover:text-[#c9921a]"
          >
            View all →
          </a>
        </div>
        
        <div>
          {subjects.map(subject => {
            const stats = getSubjectStats(subject);
            const progressColor = stats.pct === 100 ? '#16a34a' : subject.color;

            return (
              <div key={subject.id} className="flex items-center gap-[7px] mb-[9px] last:mb-0">
                <div className="text-[12px] flex-shrink-0 w-[14px] text-center">
                  {subject.icon}
                </div>
                <div className="text-[10.5px] font-semibold text-[#0f1f3d] flex-shrink-0 w-[56px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {subject.short}
                </div>
                <div className="flex-1">
                  <div className="h-[5px] bg-[#d8e4f5] rounded-[4px] overflow-hidden">
                    <div
                      className="h-full rounded-[4px] transition-all duration-900"
                      style={{ 
                        width: `${stats.pct}%`, 
                        background: progressColor 
                      }}
                    />
                  </div>
                </div>
                <div 
                  className="text-[10px] font-bold flex-shrink-0 w-[26px] text-right"
                  style={{ color: progressColor }}
                >
                  {stats.pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Planner CTA */}
      <div 
        className="border-[1.5px] border-dashed rounded-[13px] p-[16px_14px] text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor: 'rgba(201,146,26,.30)',
          background: 'linear-gradient(135deg, rgba(201,146,26,.04), rgba(201,146,26,.09))',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#c9921a';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,146,26,.09), rgba(201,146,26,.16))';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(201,146,26,.30)';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,146,26,.04), rgba(201,146,26,.09))';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => alert('Opening Study Planner...')}
      >
        <div className="text-[24px] mb-[8px]">📅</div>
        <div className="text-[12.5px] font-extrabold text-[#0f1f3d] mb-[4px]">
          Plan Today's Study
        </div>
        <div className="text-[10.5px] text-[#8795ae] mb-[12px] leading-relaxed">
          Set daily goals with Jeet AI and stay on track for UPSC 2026.
        </div>
        <button 
          className="inline-flex items-center gap-[5px] px-[18px] py-[8px] rounded-[9px] text-[11.5px] font-extrabold text-[#0f1f3d] cursor-pointer border-none transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #e8a820, #c9921a)',
            boxShadow: '0 2px 8px rgba(201,146,26,.28)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(201,146,26,.36)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(201,146,26,.28)';
          }}
        >
          + Add in Study Planner
        </button>
      </div>
    </div>
  );
}
