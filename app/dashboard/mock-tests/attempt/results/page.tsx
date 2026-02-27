'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  text: string;
  options: { label: string; text: string }[];
  correct: string;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1, subject: 'History', difficulty: 'Medium',
    text: 'The Doctrine of Lapse was most aggressively applied under which Governor-General?',
    options: [{ label: 'A', text: 'Lord Cornwallis' }, { label: 'B', text: 'Lord Dalhousie' }, { label: 'C', text: 'Lord Ripon' }, { label: 'D', text: 'Lord Curzon' }],
    correct: 'B',
    explanation: 'Lord Dalhousie (1848–56) applied the Doctrine of Lapse most aggressively, annexing Satara, Nagpur, Jhansi and others.',
  },
  {
    id: 2, subject: 'Polity', difficulty: 'Easy',
    text: 'Which article of the Indian Constitution deals with the Right to Equality?',
    options: [{ label: 'A', text: 'Article 12' }, { label: 'B', text: 'Article 14' }, { label: 'C', text: 'Article 19' }, { label: 'D', text: 'Article 21' }],
    correct: 'B',
    explanation: 'Article 14 guarantees equality before law and equal protection of laws to every person within India.',
  },
  {
    id: 3, subject: 'Geography', difficulty: 'Medium',
    text: 'Which of the following rivers originates from the Amarkantak plateau?',
    options: [{ label: 'A', text: 'Mahanadi' }, { label: 'B', text: 'Godavari' }, { label: 'C', text: 'Narmada' }, { label: 'D', text: 'Tapti' }],
    correct: 'C',
    explanation: 'The Narmada river originates from Amarkantak plateau in Madhya Pradesh and flows westward into the Arabian Sea.',
  },
  {
    id: 4, subject: 'Economy', difficulty: 'Hard',
    text: 'The concept of "Dutch Disease" in economics refers to which phenomenon?',
    options: [{ label: 'A', text: 'Hyperinflation caused by excessive money printing' }, { label: 'B', text: 'Decline of manufacturing due to natural resource boom' }, { label: 'C', text: 'Economic recession due to trade deficit' }, { label: 'D', text: 'Currency depreciation due to capital flight' }],
    correct: 'B',
    explanation: 'Dutch Disease refers to the decline in the manufacturing sector following the discovery of natural resources.',
  },
  {
    id: 5, subject: 'Science & Tech', difficulty: 'Medium',
    text: 'The Ramsar Convention is associated with the conservation of which type of ecosystems?',
    options: [{ label: 'A', text: 'Coral reefs' }, { label: 'B', text: 'Tropical rainforests' }, { label: 'C', text: 'Wetlands' }, { label: 'D', text: 'Mangroves' }],
    correct: 'C',
    explanation: 'The Ramsar Convention on Wetlands (1971) is an international treaty for the conservation and sustainable use of wetlands.',
  },
];

const subjects = ['History', 'Geography', 'Polity', 'Economy', 'Science & Tech'];

function CircleScore({ pct }: { pct: number }) {
  const r = 68;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: 'block' }}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx="80" cy="80" r={r} fill="none"
        stroke="#FDC700" strokeWidth="8"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text x="80" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="36" fontWeight="700" fontFamily="Inter">{pct}%</text>
      <text x="80" y="96" textAnchor="middle" fill="#99A1AF" fontSize="11" fontFamily="Inter" letterSpacing="1">SCORE</text>
    </svg>
  );
}

export default function MockTestResultsPage() {
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('testResults');
    if (stored) {
      const data = JSON.parse(stored);
      setSelectedOptions(data.selectedOptions || {});
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const total = sampleQuestions.length;
  const correct = sampleQuestions.filter((q, i) => selectedOptions[i] === q.correct).length;
  const wrong = Object.keys(selectedOptions).filter(i => selectedOptions[Number(i)] !== sampleQuestions[Number(i)].correct).length;
  const skipped = total - Object.keys(selectedOptions).length;
  const netScore = (correct * 2 - wrong * 0.67).toFixed(2);
  const scorePct = Math.round((correct / total) * 100);

  const perfLabel =
    scorePct >= 80 ? 'Excellent Work!' :
    scorePct >= 60 ? 'Good Job!' :
    scorePct >= 40 ? 'Keep Practising' :
    'Don\'t Give Up!';

  // Subject-wise stats
  const subjectStats = subjects.map(sub => {
    const qs = sampleQuestions.map((q, i) => ({ ...q, idx: i })).filter(q => q.subject === sub);
    const subCorrect = qs.filter(q => selectedOptions[q.idx] === q.correct).length;
    return { subject: sub, correct: subCorrect, total: qs.length };
  });

  const strongestSubject = subjectStats.reduce((a, b) => (a.correct / (a.total || 1)) >= (b.correct / (b.total || 1)) ? a : b);
  const weakestSubject = subjectStats.reduce((a, b) => (a.correct / (a.total || 1)) <= (b.correct / (b.total || 1)) ? a : b);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        width: '100%', height: '56px', background: '#0F172B',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#FDC700' }}>Prelims Practice</span>
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: '#fff' }}>P</div>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#FDC700' }}>Results</span>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Hero Card ── */}
        <div style={{
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1D293D 0%, #0F172B 50%, #162456 100%)',
          padding: '40px 48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            background: 'rgba(253,199,0,0.15)', border: '1px solid rgba(253,199,0,0.4)',
            borderRadius: '20px', padding: '4px 14px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '12px' }}>⭐</span>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#FDC700', letterSpacing: '0.5px' }}>TEST COMPLETE</span>
          </div>

          {/* Score Circle */}
          <CircleScore pct={scorePct} />

          {/* Title */}
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF', margin: '24px 0 8px', textAlign: 'center', lineHeight: '40px' }}>
            {perfLabel}
          </h1>
          <p style={{ fontSize: '16px', color: '#99A1AF', margin: 0, textAlign: 'center' }}>
            Prelims · Daily MCQ · {total} Questions
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
          {[
            { img: '/stat-icon-9.png',  value: correct,  label: 'Correct' },
            { img: '/stat-icon-11.png', value: wrong,    label: 'Wrong' },
            { img: '/stat-icon-2.png',  value: skipped,  label: 'Skipped' },
            { img: '/stat-icon-14.png', value: netScore, label: 'Net (-¼)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#FFFFFF', borderRadius: '16px', padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stat.img} alt={stat.label} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#101828', lineHeight: '40px' }}>{stat.value}</span>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#6A7282', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Subject-wise Breakdown ── */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#101828', letterSpacing: '0.35px', textTransform: 'uppercase' }}>Subject-wise Breakdown</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subjectStats.map(({ subject, correct: sc, total: st }) => {
              const pct = st > 0 ? (sc / st) * 100 : 0;
              const barColor = pct === 100 ? '#00C950' : pct > 0 ? '#FDC700' : '#FB2C36';
              const scoreColor = pct === 100 ? '#00A63E' : pct > 0 ? '#CA8A04' : '#E7000B';
              return (
                <div key={subject} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', color: '#364153', width: '110px', flexShrink: 0 }}>{subject}</span>
                  <div style={{ flex: 1, position: 'relative', height: '8px', background: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: barColor, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: scoreColor, width: '32px', textAlign: 'right', flexShrink: 0 }}>{sc}/{st}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Jeet Sir's Analysis ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: '16px',
          borderLeft: '4px solid #AD46FF',
          padding: '24px 24px 24px 28px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#101828', letterSpacing: '0.35px', textTransform: 'uppercase' }}>Jeet Sir&apos;s Analysis</span>
          </div>
          {[
            { emoji: '💪', text: <>Your strongest area is <strong>{strongestSubject.subject}</strong> — maintain momentum here.</> },
            { emoji: '🔥', text: <>Focus on <strong>{weakestSubject.subject}</strong> — 20 min daily for two weeks will show major gains.</> },
            { emoji: '🎯', text: <>Accuracy is <strong>improving</strong>. Attempt similar difficulty tests to consolidate.</> },
            { emoji: '🏆', text: <>Top rankers average <strong>82%+</strong>. You&apos;re building momentum!</> },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.emoji}</span>
              <span style={{ fontSize: '14px', color: '#364153', lineHeight: '20px' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* ── Bottom Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => router.push('/dashboard/mock-tests/next-steps')}
            style={{
              height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #1D293D 0%, #0F172B 50%, #162456 100%)',
              border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            💭 What would you like to do next?
          </button>
          <button
            onClick={() => router.push('/dashboard/mock-tests/attempt')}
            style={{
              height: '56px', borderRadius: '16px',
              background: '#FFFFFF',
              border: '1.6px solid #E5E7EB', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px', color: '#364153',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📄 Review Answers
          </button>
        </div>

      </div>
    </div>
  );
}
