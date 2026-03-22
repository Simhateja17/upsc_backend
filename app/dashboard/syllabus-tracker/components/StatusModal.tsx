'use client';

import { useState, useEffect } from 'react';
import { Status } from '../page';

interface StatusModalProps {
  isOpen: boolean;
  subTopicName: string;
  currentStatus: Status;
  currentNote: string;
  onClose: () => void;
  onSave: (status: Status, note: string) => void;
}

const statusOptions = [
  {
    value: 'done' as Status,
    icon: '✅',
    title: 'Completed',
    description: 'Fully understood. Ready to attempt questions.',
    bg: '#dcfce7',
    iconBg: '#bbf7d0',
    border: 'rgba(21,128,61,.22)',
  },
  {
    value: 'in-progress' as Status,
    icon: '📖',
    title: 'In Progress',
    description: 'Currently reading or studying this topic.',
    bg: '#fef3c7',
    iconBg: '#fde68a',
    border: 'rgba(180,83,9,.22)',
  },
  {
    value: 'needs-revision' as Status,
    icon: '🔄',
    title: 'Needs Revision',
    description: 'Done once, but needs another pass.',
    bg: '#dbeafe',
    iconBg: '#bfdbfe',
    border: 'rgba(29,111,164,.2)',
  },
  {
    value: 'weak' as Status,
    icon: '⚠️',
    title: 'Weak Area',
    description: 'Struggling with this. Flag for focused prep.',
    bg: '#fee2e2',
    iconBg: '#fecaca',
    border: 'rgba(185,28,28,.18)',
  },
  {
    value: 'none' as Status,
    icon: '○',
    title: 'Not Started',
    description: 'Clear status — mark as pending.',
    bg: '#f3f6fb',
    iconBg: 'rgba(15,31,61,.08)',
    border: '#e0e8f4',
  },
];

export default function StatusModal({
  isOpen,
  subTopicName,
  currentStatus,
  currentNote,
  onClose,
  onSave,
}: StatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<Status>(currentStatus);
  const [note, setNote] = useState(currentNote);

  useEffect(() => {
    setSelectedStatus(currentStatus);
    setNote(currentNote);
  }, [currentStatus, currentNote, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedStatus, note);
  };

  return (
    <div 
      className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ 
        background: 'rgba(10,20,40,.6)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[22px] w-[355px] max-w-[95vw] overflow-hidden"
        style={{
          boxShadow: '0 12px 40px rgba(15,31,61,.18), 0 4px 12px rgba(15,31,61,.10)',
          animation: 'fadeUp 0.26s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0f1f3d] p-[18px_20px_17px] relative">
          <div className="font-playfair text-[18px] text-white mb-[3px] font-bold">
            Update Topic Status
          </div>
          <div className="text-[11.5px] text-white/45 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]">
            {subTopicName}
          </div>
          <button
            onClick={onClose}
            className="absolute top-[14px] right-[14px] w-[28px] h-[28px] rounded-[8px] bg-white/10 border-none text-white/70 cursor-pointer text-[14px] flex items-center justify-center transition-all duration-150 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-[14px_14px_16px]">
          {/* Status Options */}
          {statusOptions.map(option => (
            <div
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className="flex items-center gap-[11px] p-[12px_13px] rounded-[13px] border-[1.5px] mb-[7px] cursor-pointer transition-all duration-200 relative hover:-translate-y-[1px] hover:shadow-md"
              style={{
                background: option.bg,
                borderColor: option.border,
              }}
            >
              <div
                className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-[19px] flex-shrink-0"
                style={{ background: option.iconBg }}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#0f1f3d] mb-[2px]">
                  {option.title}
                </div>
                <div className="text-[11px] text-[#8795ae] leading-tight">
                  {option.description}
                </div>
              </div>
              <div
                className={`
                  w-[22px] h-[22px] rounded-[7px] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 text-[12px]
                  ${selectedStatus === option.value 
                    ? 'bg-[#0f1f3d] border-[#0f1f3d] text-white' 
                    : 'border-[#e0e8f4] bg-white text-transparent'
                  }
                `}
              >
                {selectedStatus === option.value && '✓'}
              </div>
            </div>
          ))}

          {/* Note Textarea */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional) — e.g. 'read from NCERT Ch 6-7'…"
            className="w-full bg-[#f3f6fb] border-[1.5px] border-[#e0e8f4] rounded-[10px] p-[10px_13px] text-[12.5px] text-[#0f1f3d] font-inter outline-none resize-none h-[66px] mt-[8px] mb-[13px] transition-all duration-200 focus:border-[rgba(201,146,26,.30)]"
          />

          {/* Actions */}
          <div className="flex gap-[8px]">
            <button
              onClick={onClose}
              className="flex-shrink-0 px-[20px] py-[10px] rounded-[11px] border-[1.5px] border-[#e0e8f4] bg-[#f3f6fb] text-[#3c4f6d] text-[13px] font-bold cursor-pointer transition-all duration-200 hover:border-[#8795ae] hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-[10px] py-[10px] rounded-[11px] bg-[#0f1f3d] border-none text-white text-[13px] font-extrabold cursor-pointer transition-all duration-200 tracking-[0.2px] hover:bg-[#1c3058]"
            >
              Save Status
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
