'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { dailyAnswerService } from '@/lib/services';

const STEPS = [
  {
    id: 1,
    icon: '/eval-structural.png',
    title: 'Structural Analysis',
    subtitle: 'Checking introduction-body-conclusion flow',
    key: 'structural',
  },
  {
    id: 2,
    icon: '/eval-content.png',
    title: 'Content Depth Assessment',
    subtitle: 'Evaluating conceptual clarity and dimensions',
    key: 'content',
  },
  {
    id: 3,
    icon: '/eval-balance.png',
    title: 'Balance & Perspective Check',
    subtitle: 'Ensuring multi-dimensional viewpoint',
    key: 'balance',
  },
  {
    id: 4,
    icon: '/eval-fact.png',
    title: 'Fact & Example Validation',
    subtitle: 'Cross-referencing with latest data',
    key: 'fact',
  },
  {
    id: 5,
    icon: '/eval-pillar.png',
    title: '6-Pillar Rubric Scoring',
    subtitle: 'Direct   Demand   Structure   Substantiation',
    key: 'scoring',
  },
];

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#22C55E" strokeWidth="2" fill="none" />
    <path d="M7 12.5L10.5 16L17 9" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="animate-spin"
  >
    <circle cx="12" cy="12" r="10" stroke="#D1D5DB" strokeWidth="2.5" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="#17223E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export default function EvaluatingPage() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<string>('evaluating');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll evaluation status every 3 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await dailyAnswerService.getEvaluationStatus();
        const data = res.data;

        if (data?.status) {
          setStatus(data.status);
        }
        if (data?.completedSteps) {
          setCompletedSteps(data.completedSteps);
        }

        if (data?.status === 'completed' && !navigatedRef.current) {
          navigatedRef.current = true;
          if (pollRef.current) clearInterval(pollRef.current);
          router.push('/dashboard/daily-answer/challenge/attempt/results');
        }
      } catch (err: any) {
        setError(err.message || 'Error checking evaluation status');
      }
    };

    // Initial call
    poll();

    // Poll every 3 seconds
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router]);

  // Elapsed timer for display
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const ESTIMATED_SECONDS = 60;
  const secondsRemaining = Math.max(0, ESTIMATED_SECONDS - elapsed);
  const progressPercent = Math.min(100, (elapsed / ESTIMATED_SECONDS) * 100);

  const isStepDone = (step: typeof STEPS[0]) =>
    completedSteps.includes(step.key);

  const isStepActive = (step: typeof STEPS[0], idx: number) => {
    if (isStepDone(step)) return false;
    if (idx === 0) return !isStepDone(step);
    return isStepDone(STEPS[idx - 1]) && !isStepDone(step);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-arimo"
      style={{ background: 'linear-gradient(180deg, #E6EAF0 0%, #DDE2EA 100%)' }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: '100%', maxWidth: '768px',
          borderRadius: '16px',
          background: '#FFFFFF',
          boxShadow: '0px 8px 10px -6px #0000001A, 0px 20px 25px -5px #0000001A',
          padding: '32px 40px 32px 40px',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <img
            src="/eval-header.png"
            alt="Evaluating"
            style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '12px' }}
          />
          <h1
            style={{
              fontFamily: 'Arimo',
              fontWeight: 700,
              fontSize: '26px',
              lineHeight: '32px',
              letterSpacing: '0px',
              color: '#1E2939',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            Evaluating Your Answer
          </h1>
          <p
            style={{
              fontFamily: 'Arimo',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '22px',
              color: '#4A5565',
              textAlign: 'center',
              marginBottom: '2px',
            }}
          >
            Analyzing with UPSC examiner&apos;s lens
          </p>
          <p
            style={{
              fontFamily: 'Arimo',
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: '18px',
              color: '#6A7282',
              textAlign: 'center',
            }}
          >
            This usually takes 30-60 seconds
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-center" style={{ fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Steps */}
        <div className="flex flex-col gap-0 mb-4">
          {STEPS.map((step, idx) => {
            const done = isStepDone(step);
            const active = isStepActive(step, idx);
            return (
              <div key={step.id}>
                <div className="flex items-center justify-between py-3">
                  {/* Left: icon + text */}
                  <div className="flex items-center gap-3">
                    <img
                      src={step.icon}
                      alt={step.title}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'contain',
                        opacity: done || active ? 1 : 0.4,
                        transition: 'opacity 0.4s',
                      }}
                    />
                    <div>
                      <p
                        style={{
                          fontFamily: 'Arimo',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '20px',
                          color: '#17223E',
                        }}
                      >
                        {step.title}
                      </p>
                      <p
                        style={{
                          fontFamily: 'Arimo',
                          fontWeight: 400,
                          fontSize: '13px',
                          lineHeight: '18px',
                          color: '#17223E',
                        }}
                      >
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: status icon */}
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckIcon />
                    ) : active ? (
                      <SpinnerIcon />
                    ) : (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: '2px solid #D1D5DB',
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Divider (skip after last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      width: '100%',
                      height: '1px',
                      background: '#B1B1B1',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom yellow card */}
        <div
          style={{
            borderRadius: '10px',
            borderLeft: '4px solid #FDC700',
            background: '#FEFCE8',
            padding: '18px 28px',
          }}
        >
          {/* Timer row */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/eval-timer.png" alt="Timer" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            <span
              style={{
                fontFamily: 'DM Sans',
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#101828',
              }}
            >
              {secondsRemaining > 0 ? `${secondsRemaining} Seconds Remaining` : 'Almost done...'}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="mx-auto mb-3"
            style={{
              width: '100%', maxWidth: '362px',
              height: '5px',
              borderRadius: '10px',
              background: '#D9D9D9',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                borderRadius: '10px',
                background: '#101828',
                transition: 'width 1s linear',
              }}
            />
          </div>

          {/* While you wait text */}
          <p
            className="text-center mb-2"
            style={{
              fontFamily: 'Arimo',
              fontSize: '13px',
              lineHeight: '18px',
              color: '#364153',
            }}
          >
            <strong>While you wait:</strong> This 60-second pause is deliberate. In the actual exam, this is the time you&apos;d
            spend reviewing your answer. Use this moment to mentally note one improvement you could make.
          </p>

          {/* Quote */}
          <p
            className="text-center"
            style={{
              fontFamily: 'Arimo',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: '11px',
              lineHeight: '15px',
              color: '#6A7282',
            }}
          >
            &quot;Consistency matters more than perfection. You&apos;re building a skill that compounds.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
