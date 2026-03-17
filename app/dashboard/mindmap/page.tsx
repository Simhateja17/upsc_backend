'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { mindmapService } from '@/lib/services';

const Icons = {
  Polity: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21V7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 21V7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 7L12 3L19 7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21V11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V21" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Default: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#4B5563" strokeWidth="2" />
      <path d="M2 12H22" stroke="#4B5563" strokeWidth="2" />
    </svg>
  ),
};

const SUBJECT_COLORS: Record<string, string> = {
  'indian-polity': '#3B82F6',
  'geography': '#EC4899',
  'indian-economy': '#F59E0B',
  'modern-history': '#D97706',
  'environment': '#10B981',
  'science-and-tech': '#8B5CF6',
  'gs-iv-ethics': '#6366F1',
  'current-affairs': '#14B8A6',
};

type SubjectData = {
  id: string;
  name: string;
  icon: string;
  slug: string;
  total: number;
  explored: number;
  progress: number;
};

export default function MindmapPage() {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mindmapService.getSubjects()
      .then((res) => {
        if (res.status === 'success') setSubjects(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMaps = subjects.reduce((s, sub) => s + sub.total, 0);
  const totalExplored = subjects.reduce((s, sub) => s + sub.explored, 0);

  return (
    <div className="min-h-screen bg-[#F5F6FA] font-inter">
      <div
        className="w-full h-[281px] relative overflow-hidden p-8 rounded-[16px] mb-8"
        style={{ background: 'linear-gradient(90.14deg, #10182D 1.9%, #0F172B 97.25%)', margin: '32px', width: 'calc(100% - 64px)' }}
      >
        <div className="relative z-10 text-white">
          <div className="mb-2">
            <span className="text-[#FDC700] text-[11px] font-medium tracking-[0.05em] uppercase">REVISION — VISUAL LEARNING</span>
          </div>
          <h1 className="text-[48px] font-bold leading-tight mb-2">
            Your <span className="italic text-[#FDC700]">Mindmap</span> Library.
          </h1>
          <p className="text-[#D1D5DC] text-[14px] max-w-[610px] mb-8">
            See the big picture. Every topic structured as a visual tree — revise faster, remember longer.
          </p>
          <div className="flex gap-4">
            <div className="bg-[#1C273B] border border-[#1E29394D] rounded-[16px] p-4 flex flex-col justify-center min-w-[140px]">
              <div className="text-[#46ECD5] text-[36px] font-bold leading-none mb-1">{totalMaps}</div>
              <div className="text-[#99A1AF] text-[11px] uppercase tracking-wider">TOTAL MAPS</div>
            </div>
            <div className="bg-[#1C273B] border border-[#1E29394D] rounded-[16px] p-4 flex flex-col justify-center min-w-[140px]">
              <div className="text-[#DAB2FF] text-[36px] font-bold leading-none mb-1">{subjects.length}</div>
              <div className="text-[#99A1AF] text-[11px] uppercase tracking-wider">SUBJECTS</div>
            </div>
            <div className="bg-[#1C273B] border border-[#1E29394D] rounded-[16px] p-4 flex flex-col justify-center min-w-[140px]">
              <div className="text-[#FDC700] text-[36px] font-bold leading-none mb-1">{totalExplored}</div>
              <div className="text-[#99A1AF] text-[11px] uppercase tracking-wider">EXPLORED</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-12" style={{ margin: '0 32px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#10182D] text-white flex items-center justify-center font-semibold text-[14px]">1</div>
          <h2 className="text-[36px] font-bold text-[#10182D] font-serif">
            Choose a <span className="italic text-[#F0B100]">Subject</span>
          </h2>
        </div>
        <p className="text-[#6A7282] text-[14px] mb-8 ml-11">Select the subject whose mindmaps you want to study today</p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ml-11">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-[16px] h-[180px] animate-pulse" />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400 ml-11">
            <p className="text-lg font-semibold mb-2">No mindmap subjects yet</p>
            <p className="text-sm">Ask an admin to seed some mindmaps to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ml-11">
            {subjects.map((subject) => {
              const color = SUBJECT_COLORS[subject.slug] ?? '#6B7280';
              return (
                <Link key={subject.slug} href={`/dashboard/mindmap/${subject.slug}`} className="block">
                  <div className="bg-white rounded-[16px] overflow-hidden shadow-sm border border-gray-100 flex flex-col h-[180px] relative group hover:shadow-md transition-shadow">
                    <div className="h-[4px] w-full" style={{ backgroundColor: color }} />
                    <div className="p-6 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl">
                            {subject.icon}
                          </div>
                        </div>
                        <h3 className="text-[16px] font-bold text-[#1A1A1A] font-inter mb-1">{subject.name}</h3>
                        <p className="text-[12px] text-[#6B7280] font-inter">{subject.total} mindmaps</p>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between items-center text-[11px] font-medium mb-2">
                          <span className="text-[#374151] font-bold">{subject.progress}% explored</span>
                          <span className="px-2 py-0.5 rounded text-[10px] text-[#6B7280]" style={{ backgroundColor: `${color}15` }}>
                            {subject.explored === 0 ? 'Not started' : `${subject.explored} explored`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${subject.progress}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
