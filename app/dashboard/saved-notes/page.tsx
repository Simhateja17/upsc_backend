'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { editorialService } from '@/lib/services';

interface SavedEditorial {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  category: string;
  tags: string[];
  savedAt?: string;
}

const categoryColors: Record<string, { color: string; bg: string }> = {
  'Polity': { color: '#7C3AED', bg: '#EDE9FE' },
  'Economy': { color: '#EA580C', bg: '#FFF7ED' },
  'Environment': { color: '#16A34A', bg: '#F0FDF4' },
  'Technology': { color: '#7C3AED', bg: '#EDE9FE' },
  'Judiciary': { color: '#DC2626', bg: '#FEF2F2' },
  'International Relations': { color: '#EA580C', bg: '#FFF7ED' },
};

export default function SavedNotesPage() {
  const [savedNotes, setSavedNotes] = useState<SavedEditorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');

  useEffect(() => {
    editorialService.getStats()
      .then(res => {
        if (res.data?.savedItems && Array.isArray(res.data.savedItems)) {
          setSavedNotes(res.data.savedItems);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (id: string) => {
    try {
      await editorialService.toggleSave(id);
      setSavedNotes(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 sm:px-6 py-6 md:py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#62748e] hover:text-[#314158]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <Link href="/dashboard/profile" className="font-normal text-[14px] leading-[20px] text-[#62748e] hover:text-[#314158]">
          Profile
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-medium text-[14px] leading-[20px] text-[#0f172b]">Saved Notes</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-xl md:text-2xl lg:text-[30px] leading-[36px] text-[#0f172b] mb-6 md:mb-8" style={{ fontFamily: "'Georgia', serif" }}>
        Saved Notes & Bookmarks
      </h1>

      {/* Tab bar */}
      <div style={{ borderBottom: '2px solid #E5E7EB', marginBottom: '24px' }}>
        <div className="flex" style={{ gap: '24px' }}>
          {(['notes', 'bookmarks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="font-arimo font-bold"
              style={{
                fontSize: '15px',
                color: activeTab === tab ? '#155DFC' : '#6A7282',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #155DFC' : '2px solid transparent',
                padding: '12px 0',
                marginBottom: '-2px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      ) : savedNotes.length === 0 ? (
        <div className="text-center py-16">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📌</div>
          <h3 className="font-semibold text-[18px] text-[#0f172b] mb-2">No saved notes yet</h3>
          <p className="text-[14px] text-[#62748e] mb-6">
            Start saving editorials from the Daily Editorial page to build your collection.
          </p>
          <Link href="/dashboard/daily-editorial">
            <button
              style={{
                background: '#101828',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Browse Editorials
            </button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {savedNotes.map((note) => {
            const tagList = note.tags?.length > 0 ? note.tags : [note.category];
            return (
              <div
                key={note.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
                }}
              >
                {/* Tags row + source */}
                <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                  <div className="flex items-center flex-wrap" style={{ gap: '8px' }}>
                    {tagList.map((tag) => {
                      const colors = categoryColors[tag] || { color: '#1E40AF', bg: '#DBEAFE' };
                      return (
                        <span
                          key={tag}
                          className="font-arimo font-medium"
                          style={{
                            fontSize: '13px',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: colors.bg,
                            color: colors.color,
                          }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                  <span className="font-arimo shrink-0" style={{ color: '#6A7282', fontSize: '13px' }}>
                    {note.source}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="font-arimo font-bold"
                  style={{
                    fontSize: '18px',
                    color: '#101828',
                    marginBottom: '8px',
                  }}
                >
                  {note.title}
                </h3>

                {/* Summary */}
                {note.summary && (
                  <p
                    className="font-arimo"
                    style={{
                      fontSize: '14px',
                      color: '#4A5565',
                      marginBottom: '16px',
                    }}
                  >
                    {note.summary}
                  </p>
                )}

                {/* Divider */}
                <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '12px' }} />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="font-arimo" style={{ fontSize: '12px', color: '#6A7282' }}>
                    {note.savedAt ? new Date(note.savedAt).toLocaleDateString('en-IN') : 'Saved recently'}
                  </span>
                  <button
                    onClick={() => handleUnsave(note.id)}
                    className="font-arimo"
                    style={{
                      padding: '6px 16px',
                      borderRadius: '26843500px',
                      border: '0.8px solid #FEE2E2',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
