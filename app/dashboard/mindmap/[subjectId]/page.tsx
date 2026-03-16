'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { mindmapService } from '@/lib/services';

const CheckmarkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type MindmapStatus = 'Done' | 'Reviewed' | 'New';

type MindmapItem = {
  id: string;
  title: string;
  slug: string;
  branchCount: number;
  mastery: number;
  viewed: boolean;
};

function getStatus(mastery: number, viewed: boolean): MindmapStatus {
  if (mastery >= 80) return 'Done';
  if (viewed) return 'Reviewed';
  return 'New';
}

type PageProps = { params: { subjectId: string } };

export default function SubjectDetailPage({ params }: PageProps) {
  const { subjectId } = params;
  const [subjectMeta, setSubjectMeta] = useState<{ name: string; icon: string } | null>(null);
  const [maps, setMaps] = useState<MindmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    mindmapService.getMindmaps(subjectId)
      .then((res) => {
        if (res.status === 'success') {
          setSubjectMeta(res.data.subject);
          setMaps(res.data.maps);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  const subjectTitle = subjectMeta?.name ?? subjectId.replace(/-/g, ' ').replace(/\band\b/g, '&');

  const statusColors: Record<MindmapStatus, { bg: string; text: string }> = {
    Done: { bg: '#ECFDF5', text: '#10B981' },
    Reviewed: { bg: '#FFFBEB', text: '#F59E0B' },
    New: { bg: '#F0FDFA', text: '#2DD4BF' },
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] font-inter p-8">
      <Link href="/dashboard/mindmap" className="inline-flex items-center text-[#6B7280] text-[13px] hover:text-[#111827] mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
          <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Subjects
      </Link>

      <div className="max-w-[1200px] mx-auto">
        {/* Subject header */}
        <div className="bg-white rounded-[16px] p-6 mb-8 flex items-center shadow-sm">
          <div className="w-[80px] h-[80px] rounded-[16px] bg-[#F9FAFB] flex items-center justify-center mr-6 text-4xl">
            {subjectMeta?.icon ?? '🗺️'}
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[#111827] mb-1">{subjectTitle}</h1>
            <p className="text-[#6B7280] text-[14px]">
              {maps.length} mindmaps
            </p>
          </div>
        </div>

        <div className="flex items-center mb-1">
          <div className="flex items-center gap-2 bg-[#F0FDF4] px-3 py-1.5 rounded-full border border-[#DCFCE7] mr-4">
            <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center">
              <CheckmarkIcon />
            </div>
            <span className="text-[#15803D] text-[14px] font-medium">Subject selected</span>
          </div>
          <div className="h-[1px] w-8 bg-gray-300 mr-4" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#10182D] text-white flex items-center justify-center font-bold text-[14px]">2</div>
            <span className="text-[#111827] font-bold text-[18px]">Choose a Mindmap</span>
          </div>
        </div>
        <p className="text-[#6B7280] text-[14px] mb-8 ml-[235px]">Each map covers one key topic with all its branches</p>

        {/* Mindmap list */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-[12px] h-[80px] animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : maps.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No mindmaps found for this subject yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {maps.map((map) => {
              const status = getStatus(map.mastery, map.viewed);
              const statusStyle = statusColors[status];
              return (
                <Link key={map.slug} href={`/dashboard/mindmap/${subjectId}/${map.slug}`} className="block">
                  <div className="bg-white rounded-[12px] p-6 border border-gray-100 flex items-center justify-between hover:shadow-sm transition-shadow mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[8px] bg-[#F9FAFB] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 21H21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5 21V7" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M19 21V7" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5 7L12 3L19 7" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 21V11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-[#111827] font-bold text-[16px] mb-1">{map.title}</h3>
                        <p className="text-[#6B7280] text-[12px]">
                          {map.branchCount} branches
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${map.mastery}%`, backgroundColor: map.mastery === 0 ? 'transparent' : '#10B981' }} />
                      </div>
                      <span className="text-[14px] font-bold text-[#10B981]">{map.mastery}%</span>
                      <span
                        className="px-3 py-1 rounded-[6px] text-[11px] font-semibold min-w-[70px] text-center"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {status === 'Done' && <span className="mr-1">✓</span>}
                        {status}
                      </span>
                      <span className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
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
