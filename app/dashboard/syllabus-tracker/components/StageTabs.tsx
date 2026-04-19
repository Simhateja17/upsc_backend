'use client';

import { Mode, TrackerState, SyllabusData } from '../page';

interface StageTabsProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  states: TrackerState;
  syllabusData: SyllabusData;
}

export default function StageTabs({ mode, onModeChange, states, syllabusData }: StageTabsProps) {
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

  const tabs = [
    { key: 'prelims' as Mode, label: 'Prelims', icon: '🎯' },
    { key: 'mains' as Mode, label: 'Mains', icon: '✍️' },
    { key: 'optional' as Mode, label: 'Optional', icon: '📖' },
  ];

  return (
    <div
      className="inline-flex items-center w-full"
      style={{
        background: '#F1F3F9',
        borderRadius: '26843500px',
        padding: '4px',
        gap: '4px',
      }}
    >
      {tabs.map(tab => {
        const isActive = mode === tab.key;
        const pct = tab.key === 'prelims' ? prelimsPct : tab.key === 'mains' ? mainsPct : optionalPct;

        return (
          <button
            key={tab.key}
            onClick={() => onModeChange(tab.key)}
            className="flex items-center justify-center gap-2 flex-1 transition-all duration-200 whitespace-nowrap"
            style={{
              padding: '10px 20px',
              borderRadius: '26843500px',
              background: isActive ? '#0F172B' : 'transparent',
              color: isActive ? '#FFFFFF' : '#4A5565',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '1',
              boxShadow: isActive ? '0px 4px 12px rgba(15, 23, 43, 0.3)' : 'none',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: '1' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
