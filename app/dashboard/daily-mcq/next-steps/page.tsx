'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyMcqService } from '@/lib/services';

interface Recommendation {
  type: string;
  title: string;
  description: string;
  action: string;
  link: string;
}

const bgColors: Record<string, string> = {
  study: 'linear-gradient(135deg, #C27AFF 0%, #AD46FF 100%)',
  practice: 'linear-gradient(135deg, #05DF72 0%, #00C950 100%)',
  editorial: '#FF9500',
  answer: '#FFF6D4',
};

const icons: Record<string, string> = {
  study: '/📚.png',
  practice: '/🎯.png',
  editorial: '/📰.png',
  answer: '/📅.png',
};

export default function NextStepsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dailyMcqService.getRecommendations()
      .then(res => setRecommendations(res.data.recommendations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen panel-recessed">
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen panel-recessed">
      <main className="flex-1 flex items-center justify-center py-[clamp(2rem,4vw,4rem)] px-[clamp(1rem,2vw,3rem)]">
        <div className="card-elevated rounded-[clamp(8px,0.52vw,10px)]"
          style={{ width: 'clamp(700px,46.67vw,896px)', padding: 'clamp(2rem,2.08vw,2.5rem)' }}>

          <div className="text-center mb-[clamp(2rem,2.6vw,3.25rem)]">
            <h1 className="font-arimo font-bold text-[#101828] mb-[clamp(0.5rem,0.625vw,0.75rem)]"
              style={{ fontSize: 'clamp(20px,1.25vw,24px)', lineHeight: 'clamp(28px,1.67vw,32px)' }}>
              What would you like to do next?
            </h1>
            <p className="font-arimo text-[#4A5565]"
              style={{ fontSize: 'clamp(13px,0.73vw,14px)', lineHeight: 'clamp(18px,1.04vw,20px)' }}>
              Smart recommendations based on your performance
            </p>
          </div>

          <div className="grid grid-cols-2 mb-[clamp(2rem,2.6vw,3.25rem)]"
            style={{ gap: 'clamp(1.25rem,1.67vw,2rem)' }}>
            {recommendations.map((item, index) => (
              <Link key={index} href={item.link}>
                <div className="bg-white border border-[#E5E7EB] rounded-[clamp(8px,0.52vw,10px)] hover:shadow-md transition-all cursor-pointer relative"
                  style={{ padding: 'clamp(1.5rem,1.88vw,2.25rem) clamp(1.25rem,1.67vw,2rem)' }}>
                  <div className="rounded-[clamp(12px,0.83vw,16px)] flex items-center justify-center mb-[clamp(1rem,1.25vw,1.5rem)] mx-auto"
                    style={{ width: 'clamp(52px,3.33vw,64px)', height: 'clamp(52px,3.33vw,64px)', background: bgColors[item.type] || '#E5E7EB' }}>
                    <img src={icons[item.type] || '/🎯.png'} alt={item.title}
                      style={{ width: 'clamp(24px,1.56vw,30px)', height: 'clamp(29px,1.88vw,36px)', objectFit: 'contain' }} />
                  </div>
                  <h3 className="font-arimo font-bold text-[#101828] text-center mb-[clamp(0.5rem,0.625vw,0.75rem)]"
                    style={{ fontSize: 'clamp(14px,0.83vw,16px)', lineHeight: 'clamp(20px,1.25vw,24px)' }}>
                    {item.title}
                  </h3>
                  <p className="font-arimo text-[#4A5565] text-center"
                    style={{ fontSize: 'clamp(12px,0.73vw,14px)', lineHeight: 'clamp(17px,1.04vw,20px)' }}>
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex justify-center">
            <Link href="/dashboard">
              <button className="flex items-center justify-center gap-2 bg-white hover:opacity-70 transition-opacity font-arimo"
                style={{ width: '212px', height: '51.2px', borderRadius: '10px', border: '1.6px solid #2B7FFF', fontSize: '16px', fontWeight: 400, color: '#155DFC' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="#155DFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
