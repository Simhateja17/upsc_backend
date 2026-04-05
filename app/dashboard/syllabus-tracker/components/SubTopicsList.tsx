'use client';

import { Subject, Status, TrackerState } from '../page';

interface SubTopicsListProps {
  subject: Subject | null | undefined;
  selectedTopic: { subjectId: string; topicIndex: number } | null;
  filter: 'all' | 'pending' | 'done' | 'important';
  onFilterChange: (filter: 'all' | 'pending' | 'done' | 'important') => void;
  states: TrackerState;
  onQuickDone: (subjectId: string, topicIndex: number, subTopicIndex: number) => void;
  onOpenStatusModal: (subjectId: string, topicIndex: number, subTopicIndex: number, name: string) => void;
  onToggleImportant: (subjectId: string, topicIndex: number, subTopicIndex: number) => void;
  getKey: (subjectId: string, topicIndex: number, subTopicIndex: number) => string;
}

const statusLabels: Record<Status, string> = {
  'none': 'Not Started',
  'done': 'Done',
  'in-progress': 'Reading',
  'needs-revision': 'Needs Revision',
  'weak': 'Weak Area',
};

const statusIcons: Record<Status, string> = {
  'none': '○',
  'done': '✓',
  'in-progress': '·',
  'needs-revision': '↻',
  'weak': '⚠',
};

export default function SubTopicsList({
  subject,
  selectedTopic,
  filter,
  onFilterChange,
  states,
  onQuickDone,
  onOpenStatusModal,
  onToggleImportant,
  getKey,
}: SubTopicsListProps) {
  if (!selectedTopic || !subject) {
    return (
      <div className="flex-1 bg-white rounded-[14px] border-[1.5px] border-[#e0e8f4] flex flex-col overflow-hidden shadow-sm min-w-0">
        <div className="p-[11px_15px_10px] border-b-[1.5px] border-[#e0e8f4] flex-shrink-0 flex items-start justify-between gap-[10px]">
          <div>
            <div className="font-playfair text-[15px] text-[#0f1f3d] font-bold">
              Sub-Topics
            </div>
            <div className="text-[10.5px] text-[#8795ae] mt-[2px]">
              Select a topic to start tracking
            </div>
          </div>
          <div className="flex gap-[4px] flex-wrap flex-shrink-0">
            {['all', 'pending', 'done', 'important'].map(f => (
              <button
                key={f}
                onClick={() => onFilterChange(f as any)}
                className={`
                  px-[10px] py-[4px] rounded-[14px] border-[1.5px] text-[11px] font-semibold cursor-pointer transition-all duration-150
                  ${filter === f 
                    ? 'bg-[#0f1f3d] border-[#0f1f3d] text-white' 
                    : 'border-[#e0e8f4] bg-white text-[#8795ae] hover:border-[#0f1f3d] hover:text-[#0f1f3d]'
                  }
                `}
              >
                {f === 'important' ? '⭐' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-[#8795ae] gap-[10px] text-center p-[20px]">
          <div className="text-[34px] opacity-30">📖</div>
          <p className="text-[12.5px] max-w-[190px] leading-relaxed font-medium">
            Select a subject, then tap a topic to begin tracking progress.
          </p>
        </div>
      </div>
    );
  }

  const topic = subject.topics[selectedTopic.topicIndex];
  
  // Calculate stats
  let total = topic.subs.length;
  let done = 0;
  let active = 0;
  
  topic.subs.forEach((_, si) => {
    const key = getKey(selectedTopic.subjectId, selectedTopic.topicIndex, si);
    const status = states[key]?.status || 'none';
    if (status === 'done') done++;
    else if (status !== 'none') active++;
  });
  
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done - active;

  // Filter sub-topics
  const filteredSubs = topic.subs.filter((sub, si) => {
    const key = getKey(selectedTopic.subjectId, selectedTopic.topicIndex, si);
    const state = states[key];
    const status = state?.status || 'none';
    
    if (filter === 'pending' && status !== 'none') return false;
    if (filter === 'done' && status !== 'done') return false;
    if (filter === 'important' && !state?.important) return false;
    
    return true;
  });

  return (
    <div className="flex-1 bg-white rounded-[14px] border-[1.5px] border-[#e0e8f4] flex flex-col overflow-hidden shadow-sm min-w-0">
      {/* Header */}
      <div className="p-[11px_15px_10px] border-b-[1.5px] border-[#e0e8f4] flex-shrink-0 flex items-start justify-between gap-[10px]">
        <div>
          <div className="font-playfair text-[15px] text-[#0f1f3d] font-bold">
            {topic.name}
          </div>
          <div className="text-[10.5px] text-[#8795ae] mt-[2px]">
            {subject.name} · {done} done · {active} active · {remaining} remaining
          </div>
        </div>
        <div className="flex gap-[4px] flex-wrap flex-shrink-0">
          {['all', 'pending', 'done', 'important'].map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f as any)}
              className={`
                px-[10px] py-[4px] rounded-[14px] border-[1.5px] text-[11px] font-semibold cursor-pointer transition-all duration-150
                ${filter === f 
                  ? 'bg-[#0f1f3d] border-[#0f1f3d] text-white' 
                  : 'border-[#e0e8f4] bg-white text-[#8795ae] hover:border-[#0f1f3d] hover:text-[#0f1f3d]'
                }
              `}
            >
              {f === 'important' ? '⭐' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-[12px_15px]">
        {/* Progress Banner */}
        <div className="bg-[#0f1f3d] rounded-[11px] p-[13px_15px] mb-[12px] relative overflow-hidden">
          <div className="absolute -right-[10px] -top-[10px] w-[100px] h-[100px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(rgba(201,168,76,.14), transparent 70%)' }} />
          <div className="flex items-center justify-between mb-[7px] relative z-10">
            <div className="text-[10px] font-bold text-white/55 tracking-[0.4px] uppercase">
              {topic.name.toUpperCase()}
            </div>
            <div className="flex items-center gap-[8px]">
              <button
                className="bg-[rgba(232,168,32,.18)] border border-[rgba(232,168,32,.35)] rounded-[8px] px-[10px] py-[4px] text-[10px] font-bold text-[#e8a820] cursor-pointer transition-all duration-200 flex items-center gap-[4px] hover:bg-[rgba(232,168,32,.30)]"
                onClick={() => alert('Opening PYQs for: ' + topic.name)}
              >
                📜 PYQs
              </button>
              <div className="font-playfair text-[20px] text-[#e8a820] font-bold">
                {pct}%
              </div>
            </div>
          </div>
          <div className="h-[4.5px] bg-white/9 rounded-[6px] overflow-hidden relative z-10">
            <div
              className="h-full rounded-[6px] transition-all duration-900"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #c9921a, #e8a820)',
              }}
            />
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-[8px] mb-[12px]">
          <div className="bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[9px] p-[8px_11px] transition-all duration-150 hover:border-[rgba(201,146,26,.30)]">
            <div className="font-playfair text-[19px] font-bold text-[#0f1f3d]">{total}</div>
            <div className="text-[10px] text-[#8795ae] font-medium mt-[1px]">Total</div>
          </div>
          <div className="bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[9px] p-[8px_11px] transition-all duration-150 hover:border-[rgba(201,146,26,.30)]">
            <div className="font-playfair text-[19px] font-bold" style={{ color: '#16a34a' }}>{done}</div>
            <div className="text-[10px] text-[#8795ae] font-medium mt-[1px]">Done</div>
          </div>
          <div className="bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[9px] p-[8px_11px] transition-all duration-150 hover:border-[rgba(201,146,26,.30)]">
            <div className="font-playfair text-[19px] font-bold" style={{ color: '#d97706' }}>{active}</div>
            <div className="text-[10px] text-[#8795ae] font-medium mt-[1px]">Active</div>
          </div>
          <div className="bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[9px] p-[8px_11px] transition-all duration-150 hover:border-[rgba(201,146,26,.30)]">
            <div className="font-playfair text-[19px] font-bold text-[#8795ae]">{remaining}</div>
            <div className="text-[10px] text-[#8795ae] font-medium mt-[1px]">Left</div>
          </div>
        </div>

        {/* Sub-topics list */}
        {filteredSubs.length > 0 ? (
          topic.subs.map((sub, si) => {
            const key = getKey(selectedTopic.subjectId, selectedTopic.topicIndex, si);
            const state = states[key];
            const status = state?.status || 'none';
            const important = state?.important || false;
            const hasNote = !!state?.note;
            
            // Skip if filtered out
            if (filter === 'pending' && status !== 'none') return null;
            if (filter === 'done' && status !== 'done') return null;
            if (filter === 'important' && !important) return null;

            const statusIcon = statusIcons[status];
            const statusLabel = statusLabels[status];

            return (
              <div
                key={si}
                className={`
                  flex items-center gap-[8px] p-[8px_11px] rounded-[9px] mb-[3px] border-[1.5px] transition-all duration-150 cursor-default
                  ${status === 'done' ? 'bg-[#dcfce7] border-[rgba(21,128,61,.22)]' 
                    : status === 'in-progress' ? 'bg-[#fef3c7] border-[rgba(180,83,9,.22)]'
                    : status === 'needs-revision' ? 'bg-[#dbeafe] border-[rgba(29,111,164,.2)]'
                    : status === 'weak' ? 'bg-[#fee2e2] border-[rgba(185,28,28,.18)]'
                    : 'bg-white border-[#e0e8f4] hover:border-[#d8e4f5] hover:bg-[#edf2fc] hover:translate-x-[2px]'
                  }
                `}
                style={{ animation: `slideIn 0.16s cubic-bezier(0.4, 0, 0.2, 1) both ${si * 0.024}s` }}
              >
                {/* Quick Done Button */}
                <div
                  onClick={() => onQuickDone(selectedTopic.subjectId, selectedTopic.topicIndex, si)}
                  className={`
                    w-[24px] h-[24px] rounded-[7px] border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200 text-[11px]
                    ${status === 'done' 
                      ? 'bg-[#16a34a] border-[#16a34a] text-white' 
                      : 'border-[#e0e8f4] bg-white text-transparent hover:border-[#16a34a] hover:bg-[#dcfce7] hover:text-[#16a34a] hover:scale-110'
                    }
                  `}
                  title="Quick mark done"
                >
                  ✓
                </div>

                {/* Status Check */}
                <div
                  onClick={() => onOpenStatusModal(selectedTopic.subjectId, selectedTopic.topicIndex, si, sub)}
                  className={`
                    w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150 text-[10px] cursor-pointer
                    ${status === 'done' ? 'bg-[#16a34a] border-[#16a34a] text-white'
                      : status === 'in-progress' ? 'bg-[#fef3c7] border-[#d97706] text-[#d97706]'
                      : status === 'needs-revision' ? 'bg-[#dbeafe] border-[#1d6fa4] text-[#1d6fa4]'
                      : status === 'weak' ? 'bg-[#fee2e2] border-[#b91c1c] text-[#b91c1c]'
                      : 'border-[#e0e8f4]'
                    }
                  `}
                >
                  {statusIcon}
                </div>

                {/* Sub-topic name */}
                <div className={`flex-1 text-[12px] font-medium leading-tight ${
                  status === 'done' ? 'text-[#8795ae] line-through' : 'text-[#0f1f3d]'
                }`}>
                  {sub}
                  {important && (
                    <span className="inline-block ml-[3px] text-[8.5px] px-[6px] py-[1px] rounded-[7px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                      ⭐ IMP
                    </span>
                  )}
                  {hasNote && (
                    <span className="inline-block ml-[3px] text-[8.5px] px-[6px] py-[1px] rounded-[7px] font-bold bg-[#f3f6fb] text-[#8795ae] border border-[#e0e8f4]">
                      📝
                    </span>
                  )}
                </div>

                {/* Status Button */}
                <button
                  onClick={() => onOpenStatusModal(selectedTopic.subjectId, selectedTopic.topicIndex, si, sub)}
                  className={`
                    text-[10px] px-[9px] py-[3px] rounded-[8px] border-[1.5px] cursor-pointer transition-all duration-150 whitespace-nowrap font-semibold
                    ${status === 'done' ? 'bg-[#dcfce7] border-[rgba(21,128,61,.22)] text-[#15803d]'
                      : status === 'in-progress' ? 'bg-[#fef3c7] border-[rgba(180,83,9,.22)] text-[#b45309]'
                      : status === 'needs-revision' ? 'bg-[#dbeafe] border-[rgba(29,111,164,.2)] text-[#1d6fa4]'
                      : status === 'weak' ? 'bg-[#fee2e2] border-[rgba(185,28,28,.18)] text-[#b91c1c]'
                      : 'border-[#e0e8f4] bg-transparent text-[#8795ae]'
                    }
                  `}
                >
                  {statusLabel}
                </button>

                {/* More Menu */}
                <button
                  onClick={() => onToggleImportant(selectedTopic.subjectId, selectedTopic.topicIndex, si)}
                  className="w-[20px] h-[20px] border-none bg-transparent cursor-pointer text-[13px] text-[#8795ae] rounded-[4px] flex items-center justify-center transition-all duration-150 flex-shrink-0 hover:bg-[#f3f6fb]"
                  title={important ? 'Remove Important' : 'Mark as Important'}
                >
                  {important ? '⭐' : '☆'}
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-[20px] text-center text-[#8795ae] text-[12.5px]">
            No items match current filter.
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
