'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dailyAnswerService } from '@/lib/services';

interface ResultsData {
  score: number;
  maxScore: number;
  metrics: {
    id: string;
    label: string;
    value: string;
    icon: string;
    bg: string;
    borderColor: string;
    iconColor: string;
    valueColor: string;
  }[];
  didWell: string[];
  areasToImprove: string[];
  valueAddIdeas: string[];
}

const FALLBACK_METRICS = [
  {
    id: 'structure',
    label: 'STRUCTURE',
    value: 'Well Organized',
    icon: '\u2713',
    bg: '#F0FDF4',
    borderColor: '#B9F8CF',
    iconColor: '#0D542B',
    valueColor: '#0D542B',
  },
  {
    id: 'content',
    label: 'CONTENT DEPTH',
    value: 'Needs Examples',
    icon: '\u26A0',
    bg: '#FEFCE8',
    borderColor: '#FFF085',
    iconColor: '#A16207',
    valueColor: '#713F12',
  },
  {
    id: 'clarity',
    label: 'CLARITY',
    value: 'Clear Articulation',
    icon: '\u2713',
    bg: '#F0FDF4',
    borderColor: '#B9F8CF',
    iconColor: '#0D542B',
    valueColor: '#0D542B',
  },
  {
    id: 'timemgmt',
    label: 'TIME MGMT',
    value: 'Good Pace',
    icon: '\u26A1',
    bg: '#F9FAFB',
    borderColor: '#E5E7EB',
    iconColor: '#374151',
    valueColor: '#101828',
  },
];

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dailyAnswerService.getResults()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen font-arimo flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen font-arimo flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load results</h2>
          <p className="text-gray-500 mb-4">{error || 'Please try again later.'}</p>
          <Link href="/dashboard/daily-answer" className="text-blue-600 hover:underline">Back to Challenge</Link>
        </div>
      </div>
    );
  }

  const score = data.score ?? 0;
  const maxScore = data.maxScore ?? 10;
  const metrics = data.metrics ?? FALLBACK_METRICS;
  const didWell = data.didWell ?? [];
  const areasToImprove = data.areasToImprove ?? [];
  const valueAddIdeas = data.valueAddIdeas ?? [];

  return (
    <div
      className="min-h-screen font-arimo"
      style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
    >
      {/* Main Content */}
      <div className="flex flex-col items-center py-10 px-6 gap-6">

        {/* Score Card */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            width: '988px',
            height: '168px',
            borderRadius: '14px',
            background: 'linear-gradient(90deg, #101828 0%, #17223E 100%)',
          }}
        >
          <p
            style={{
              fontFamily: 'Arimo',
              fontWeight: 700,
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '0.35px',
              textTransform: 'uppercase',
              color: '#D1D5DC',
              marginBottom: '4px',
            }}
          >
            SCORE
          </p>
          <div className="flex items-baseline gap-1">
            <span
              style={{
                fontFamily: 'Arimo',
                fontWeight: 700,
                fontSize: '82px',
                lineHeight: '72px',
                color: '#FDC700',
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: 'Arimo',
                fontWeight: 700,
                fontSize: '35px',
                lineHeight: '48px',
                color: '#FDC70087',
              }}
            >
              /{maxScore}
            </span>
          </div>
        </div>

        {/* Feedback Card */}
        <div
          style={{
            width: '988px',
            borderRadius: '14px',
            background: '#FFFFFF',
            boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
            padding: '32px 32px 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Feedback Header Row */}
          <img
            src="/feedback-header.png"
            alt="Personalized Feedback"
            style={{
              width: '924px',
              objectFit: 'fill',
            }}
          />

          {/* Subtitle */}
          <img
            src="/feedback-subtitle.png"
            alt="Actionable insights to help you improve, not just a score"
            style={{
              width: '924px',
              objectFit: 'fill',
            }}
          />

          {/* 4 Metric Cards */}
          {metrics.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex flex-col items-center justify-center rounded-[10px] p-4"
                  style={{
                    background: metric.bg,
                    border: `1px solid ${metric.borderColor}`,
                  }}
                >
                  <span style={{ fontSize: '20px', color: metric.iconColor, marginBottom: '4px' }}>{metric.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6A7282', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{metric.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: metric.valueColor }}>{metric.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <img
              src="/metrics-container.png"
              alt="Metrics"
              style={{
                width: '924px',
                objectFit: 'fill',
              }}
            />
          )}

          {/* 3 Feedback Columns */}
          {(didWell.length > 0 || areasToImprove.length > 0 || valueAddIdeas.length > 0) ? (
            <div className="grid grid-cols-3 gap-6">
              {/* What You Did Well */}
              <div className="rounded-[10px] border border-[#B9F8CF] bg-[#F0FDF4] p-5">
                <h3 className="font-bold text-[#0D542B] mb-3" style={{ fontSize: '15px' }}>What You Did Well</h3>
                <ul className="space-y-2">
                  {didWell.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#0D542B]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="rounded-[10px] border border-[#FFF085] bg-[#FEFCE8] p-5">
                <h3 className="font-bold text-[#713F12] mb-3" style={{ fontSize: '15px' }}>Areas to Improve</h3>
                <ul className="space-y-2">
                  {areasToImprove.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#713F12]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#9888;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Value-Add Ideas */}
              <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <h3 className="font-bold text-[#101828] mb-3" style={{ fontSize: '15px' }}>Value-Add Ideas</h3>
                <ul className="space-y-2">
                  {valueAddIdeas.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#374151]" style={{ fontSize: '13px', lineHeight: '20px' }}>
                      <span className="mt-0.5 flex-shrink-0">&#128161;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <img
              src="/feedback-container.png"
              alt="Feedback"
              style={{
                width: '924px',
                height: '387.2px',
                objectFit: 'fill',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
