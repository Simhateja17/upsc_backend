'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mindmapService, userService, pricingService } from '@/lib/services';

const CheckmarkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21H16" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17V21" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 4H7C5.89543 4 5 4.89543 5 6V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V6C19 4.89543 18.1046 4 17 4Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 4H20C21.1046 4 22 4.89543 22 6V9C22 10.1046 21.1046 11 20 11H19" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 4H4C2.89543 4 2 4.89543 2 6V9C2 10.1046 2.89543 11 4 11H5" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Branch = { name: string; count: number; color: string };
type QuizQuestion = { question: string; options: string[]; correctAnswer: string };
type NodeDef = { x: string; y: string; label: string; color: string };
type NodeData = { center: string; branches: NodeDef[] };

type MindmapData = {
  id: string;
  title: string;
  subject: string;
  branches: Branch[];
  nodes: NodeData;
  quizData: QuizQuestion[] | null;
  mastery: number;
  viewed: boolean;
};

type PageParams = { params: { subjectId: string; mindmapId: string } };

export default function MindmapViewPage({ params }: PageParams) {
  const { subjectId, mindmapId } = params;
  const router = useRouter();

  const [data, setData] = useState<MindmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Pricing/features pulled from admin pricing API (falls back to defaults).
  const [proPricing, setProPricing] = useState<{
    monthly: number;
    annualMonthly: number;
    annualTotal: number;
    features: string[];
  }>({
    monthly: 299,
    annualMonthly: 199,
    annualTotal: 2388,
    features: [
      'All 42+ Mindmaps across 8 subjects',
      'Custom Mindmap Builder — unlimited saves',
      'Topic Quizzes + Branch-by-Branch Revision',
      'Send maps to Flashcards + Spaced Repetition',
      'Schedule Revision + Planner sync',
    ],
  });

  // Load admin-defined pricing if available so the modal stays editable
  // from /admin/pricing without code changes.
  useEffect(() => {
    pricingService.getPlans()
      .then((res: any) => {
        const plans = res?.data || [];
        const monthly = plans.find((p: any) => /month/i.test(p.duration || ''));
        const annual = plans.find((p: any) => /year|annual/i.test(p.duration || ''));
        if (monthly || annual) {
          setProPricing((prev) => ({
            monthly: monthly?.price ?? prev.monthly,
            annualTotal: annual?.price ?? prev.annualTotal,
            annualMonthly: annual?.price ? Math.round(annual.price / 12) : prev.annualMonthly,
            features: (annual?.features || monthly?.features || prev.features).filter(Boolean),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleStartTrial = async () => {
    try {
      await userService.startTrial();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('proTrialEnd', trialEnd);
        localStorage.setItem('userPlan', 'trial');
      }
      setShowProModal(false);
      router.push('/dashboard/billing?trial=started');
    } catch (err: any) {
      alert(err?.message || 'Could not start trial. Please try again.');
    }
  };

  useEffect(() => {
    if (!subjectId || !mindmapId) return;
    mindmapService.getMindmap(subjectId, mindmapId)
      .then((res) => {
        if (res.status === 'success') {
          setData(res.data);
          // Mark as viewed
          if (!res.data.viewed) {
            mindmapService.updateProgress(res.data.id, res.data.mastery, true).catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId, mindmapId]);

  const handleAnswer = () => {
    const questions = data?.quizData ?? [];
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizCompleted(true);
      setShowProModal(true);
      // Save mastery on quiz complete
      if (data) {
        mindmapService.updateProgress(data.id, 100, true).catch(() => {});
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading mindmap...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Mindmap not found.</p>
        <Link href={`/dashboard/mindmap/${subjectId}`} className="text-blue-400 underline text-sm">
          ← Back to subject
        </Link>
      </div>
    );
  }

  const branches: Branch[] = Array.isArray(data.branches) ? data.branches : [];
  const nodes: NodeData = data.nodes as NodeData;
  const quizQuestions: QuizQuestion[] = data.quizData ?? [];
  const currentQuestion = quizQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#0B1020] text-white font-inter">
      {showProModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-inter">
          <div className="absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-sm" />
          <div className="relative bg-white rounded-[24px] overflow-hidden w-full max-w-[500px] shadow-2xl">
            <div className="bg-[#10182D] p-6 pb-8 text-center relative">
              <button
                onClick={() => { setShowProModal(false); setQuizCompleted(false); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
              <div className="flex justify-center mb-3"><span className="text-[32px]">👑</span></div>
              <h2 className="text-[24px] font-bold text-white mb-2">Unlock Pro Access</h2>
              <p className="text-[#9CA3AF] text-[14px] leading-relaxed max-w-[340px] mx-auto">
                You&apos;ve completed this mindmap! Upgrade for unlimited access to all maps, the builder, quizzes and more.
              </p>
            </div>
            <div className="p-6 -mt-4 bg-white rounded-t-[24px] relative z-10">
              <div className="space-y-4 mb-8">
                {proPricing.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[18px]">✨</span>
                    <span className="text-[#374151] text-[14px] font-medium">{feat}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-[12px] border border-gray-200 text-center">
                  <div className="text-[12px] font-semibold text-gray-500 mb-1">Monthly</div>
                  <div className="text-[24px] font-bold text-[#10182D]">₹{proPricing.monthly}</div>
                  <div className="text-[11px] text-gray-400">per month</div>
                </div>
                <div className="p-4 rounded-[12px] border-2 border-[#10182D] bg-[#F9FAFB] text-center relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#10182D] text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">Best Value</div>
                  <div className="text-[12px] font-semibold text-gray-500 mb-1">Annual</div>
                  <div className="text-[28px] font-bold text-[#10182D]">₹{proPricing.annualMonthly}</div>
                  <div className="text-[11px] text-gray-400">per month, billed ₹{proPricing.annualTotal.toLocaleString('en-IN')}/yr</div>
                </div>
              </div>
              <button
                onClick={handleStartTrial}
                className="w-full bg-[#10182D] text-white py-4 rounded-[12px] font-bold text-[16px] flex items-center justify-center gap-2 hover:bg-[#1F2937] transition-all mb-4"
              >
                <span>⭐</span> Start Free 7-day Trial
              </button>
              <div className="text-center">
                <button onClick={() => { setShowProModal(false); setQuizCompleted(false); }} className="text-[#6B7280] text-[13px] hover:text-[#111827] transition-colors">
                  Maybe later — keep free plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto py-6 px-8">
        <Link href={`/dashboard/mindmap/${subjectId}`} className="inline-flex items-center text-[#9CA3AF] text-[13px] hover:text-white mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {data.subject}
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[24px] font-bold text-white mb-1">{data.title}</h1>
            <p className="text-[#9CA3AF] text-[13px]">
              {data.subject} · {branches.length} branches
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F172A] border border-[#1F2937]">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckmarkIcon />
              </div>
              <span className="text-[12px] text-[#D1FAE5] font-medium">{data.mastery}% mastered</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F97316]/10 text-[#FDBA74] border border-[#FB923C]/40 text-[12px] font-medium">
              <TrophyIcon />
              <span>Jeet Score {Math.round(data.mastery * 0.92)}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-6 items-start">
          <div>
            {/* Mindmap visualization */}
            <div className="bg-[#0F172A] rounded-[20px] p-6 shadow-xl border border-[#111827] relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">🧠</span>
                  <h2 className="text-[14px] font-semibold text-white">Mindmap View</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Interactive branches</span>
                </div>
              </div>

              <div className="relative bg-[#020617] rounded-[16px] border border-[#1F2937] overflow-hidden h-[360px] flex items-center justify-center">
                {/* Center node */}
                <div className="z-20 bg-[#10182D] text-white flex items-center justify-center font-bold shadow-lg border-[#1E2939] text-[12px] text-center px-2" style={{ width: 159, height: 47, borderRadius: 16, borderWidth: 1.6, position: 'relative' }}>
                  {data.title.length > 18 ? data.title.slice(0, 16) + '...' : data.title}
                </div>

                {/* SVG lines */}
                <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                  {nodes?.branches?.map((node, i) => (
                    <line key={i} x1="50%" y1="50%" x2={node.x} y2={node.y} stroke={node.color} strokeWidth="2" />
                  ))}
                </svg>

                {/* Branch nodes */}
                <div className="absolute inset-0 pointer-events-none">
                  {nodes?.branches?.map((node, i) => (
                    <div key={i} className="absolute pointer-events-auto" style={{ top: node.y, left: node.x, transform: 'translate(-50%, -50%)' }}>
                      <div
                        className="px-5 py-2.5 rounded-[12px] text-[14px] font-semibold shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105 min-w-[100px] text-center border"
                        style={{
                          background: `${node.color}15`,
                          color: node.color,
                          borderColor: node.color,
                        }}
                      >
                        {node.label}
                      </div>
                    </div>
                  ))}

                  {/* Fallback: show branches without node positions */}
                  {(!nodes?.branches || nodes.branches.length === 0) && branches.map((b, i) => {
                    const positions = [
                      { top: '25%', left: '30%' },
                      { top: '25%', left: '70%' },
                      { top: '50%', left: '15%' },
                      { top: '75%', left: '35%' },
                      { top: '75%', left: '65%' },
                    ];
                    const pos = positions[i % positions.length];
                    return (
                      <div key={b.name} className="absolute pointer-events-auto" style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}>
                        <div
                          className="px-5 py-2.5 rounded-[12px] text-[14px] font-semibold shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105 min-w-[100px] text-center border"
                          style={{ background: `${b.color}15`, color: b.color, borderColor: b.color }}
                        >
                          {b.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-[#9CA3AF]">
                <span>Branches explored</span>
                <span className="text-[#22C55E]">{branches.length} / {branches.length}</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${data.mastery}%` }} />
              </div>
            </div>

            {/* Quick Quiz */}
            {quizQuestions.length > 0 && (
              <div className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-100 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[16px]">🧩</span>
                  <h3 className="text-[14px] font-bold text-[#101828]">Quick Quiz</h3>
                </div>
                {!quizCompleted && currentQuestion ? (
                  <div className="space-y-4">
                    <p className="text-[16px] font-bold text-[#101828] leading-snug">
                      {currentQuestion.question}
                    </p>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <button
                          key={option}
                          onClick={handleAnswer}
                          className="w-full text-left p-4 rounded-[8px] border border-gray-200 text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition-all text-[14px]"
                        >
                          <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span> {option}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] mt-4">
                      Question {currentQuestionIndex + 1} of {quizQuestions.length}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-green-600 font-semibold py-4">Quiz completed! 🎉</p>
                )}
              </div>
            )}
          </div>

          {/* Branches sidebar */}
          <div className="w-full max-w-[300px] bg-white rounded-[16px] p-6 shadow-sm border border-gray-100 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[16px]">📂</span>
              <h3 className="text-[14px] font-bold text-[#101828]">Branches</h3>
            </div>
            {branches.length === 0 ? (
              <p className="text-gray-400 text-sm">No branch data available.</p>
            ) : (
              <ul className="space-y-4">
                {branches.map((branch) => (
                  <li key={branch.name} className="flex justify-between items-center text-[13px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: branch.color }} />
                      <span className="text-[#374151]">{branch.name}</span>
                    </div>
                    <span className="text-[#9CA3AF] text-[11px]">{branch.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
