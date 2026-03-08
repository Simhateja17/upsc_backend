'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

export default function DailyContentManager() {
  const [activeTab, setActiveTab] = useState<'mcq' | 'mains'>('mcq');
  const [mcqSets, setMcqSets] = useState<any[]>([]);
  const [mainsQuestions, setMainsQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  // MCQ form
  const [mcqForm, setMcqForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    topic: '',
    questionsJson: '',
  });

  // Mains form
  const [mainsForm, setMainsForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Governance',
    questionText: '',
    marks: 10,
    wordLimit: 150,
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminService.getDailyMCQSets().catch(() => ({ data: [] })),
      adminService.getDailyMainsQuestions().catch(() => ({ data: [] })),
    ]).then(([mcqRes, mainsRes]) => {
      setMcqSets(mcqRes.data || []);
      setMainsQuestions(mainsRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateMCQ = async () => {
    setCreating(true);
    setMsg('');
    try {
      let questions;
      try {
        questions = JSON.parse(mcqForm.questionsJson);
      } catch {
        setMsg('Invalid JSON for questions');
        setCreating(false);
        return;
      }
      await adminService.createDailyMCQ({
        date: mcqForm.date,
        title: mcqForm.title,
        topic: mcqForm.topic,
        tags: [mcqForm.topic],
        questions,
      });
      setMsg('Daily MCQ created!');
      setMcqForm({ ...mcqForm, title: '', topic: '', questionsJson: '' });
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMCQ = async () => {
    setGenerating(true);
    setMsg('');
    try {
      await adminService.generateDailyMCQ();
      setMsg('Daily MCQ auto-generated from PYQ bank!');
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateMains = async () => {
    setCreating(true);
    setMsg('');
    try {
      await adminService.createDailyMains(mainsForm);
      setMsg('Daily Mains question created!');
      setMainsForm({ ...mainsForm, questionText: '' });
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMains = async () => {
    setGenerating(true);
    setMsg('');
    try {
      await adminService.generateDailyMains();
      setMsg('Daily Mains question auto-generated!');
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const categories = ['Governance', 'Polity', 'Economy', 'Society', 'Ethics', 'IR', 'Environment', 'Science & Tech', 'History', 'Geography'];

  return (
    <div>
      <h1
        className="font-inter font-bold text-[#111827] mb-[clamp(1.5rem,2vw,2rem)]"
        style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}
      >
        Daily Content Manager
      </h1>

      {msg && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm font-inter"
          style={{
            background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
            color: msg.startsWith('Error') ? '#991B1B' : '#065F46',
            border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
          }}
        >
          {msg}
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit" style={{ border: '1px solid #E5E7EB' }}>
        {(['mcq', 'mains'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-sm font-inter font-medium transition-colors"
            style={{
              background: activeTab === tab ? '#6366F1' : 'transparent',
              color: activeTab === tab ? '#FFF' : '#6B7280',
            }}
          >
            {tab === 'mcq' ? 'Daily MCQ' : 'Daily Mains'}
          </button>
        ))}
      </div>

      {/* MCQ Tab */}
      {activeTab === 'mcq' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-inter font-semibold text-[#111827]" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
                Create Daily MCQ
              </h2>
              <button
                onClick={handleGenerateMCQ}
                disabled={generating}
                className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white disabled:opacity-50"
                style={{ background: '#8B5CF6' }}
              >
                {generating ? 'Generating...' : 'Auto-Generate from PYQ Bank'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Date</label>
                <input
                  type="date"
                  value={mcqForm.date}
                  onChange={(e) => setMcqForm({ ...mcqForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Title</label>
                <input
                  value={mcqForm.title}
                  onChange={(e) => setMcqForm({ ...mcqForm, title: e.target.value })}
                  placeholder="Daily Challenge - Polity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Topic</label>
                <input
                  value={mcqForm.topic}
                  onChange={(e) => setMcqForm({ ...mcqForm, topic: e.target.value })}
                  placeholder="Indian Polity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-[#6B7280] mb-1 font-inter">Questions (JSON array)</label>
              <textarea
                value={mcqForm.questionsJson}
                onChange={(e) => setMcqForm({ ...mcqForm, questionsJson: e.target.value })}
                placeholder={`[\n  {\n    "questionText": "Which article...",\n    "category": "Polity",\n    "difficulty": "Medium",\n    "options": [{"id":"A","text":"Option A"},{"id":"B","text":"Option B"},{"id":"C","text":"Option C"},{"id":"D","text":"Option D"}],\n    "correctOption": "A",\n    "explanation": "Because..."\n  }\n]`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                rows={8}
              />
            </div>
            <button
              onClick={handleCreateMCQ}
              disabled={creating}
              className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm disabled:opacity-50"
              style={{ background: '#10B981' }}
            >
              {creating ? 'Creating...' : 'Create Daily MCQ'}
            </button>
          </div>

          {/* Existing MCQ Sets */}
          <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="font-inter font-semibold text-[#111827] mb-4" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
              Existing MCQ Sets ({mcqSets.length})
            </h2>
            {loading ? (
              <p className="text-sm text-[#6B7280] py-4 text-center">Loading...</p>
            ) : mcqSets.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-4 text-center">No MCQ sets yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mcqSets.map((set: any) => (
                  <div key={set.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#FAFAFA' }}>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{set.title || 'Untitled'}</p>
                      <p className="text-xs text-[#6B7280]">{set.date} &middot; {set.topic || 'General'} &middot; {set.questions?.length || 0} questions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mains Tab */}
      {activeTab === 'mains' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-inter font-semibold text-[#111827]" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
                Create Daily Mains Question
              </h2>
              <button
                onClick={handleGenerateMains}
                disabled={generating}
                className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white disabled:opacity-50"
                style={{ background: '#8B5CF6' }}
              >
                {generating ? 'Generating...' : 'Auto-Generate with AI'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Date</label>
                <input
                  type="date"
                  value={mainsForm.date}
                  onChange={(e) => setMainsForm({ ...mainsForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Category</label>
                <select
                  value={mainsForm.category}
                  onChange={(e) => setMainsForm({ ...mainsForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Marks</label>
                <input
                  type="number"
                  value={mainsForm.marks}
                  onChange={(e) => setMainsForm({ ...mainsForm, marks: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1 font-inter">Word Limit</label>
                <input
                  type="number"
                  value={mainsForm.wordLimit}
                  onChange={(e) => setMainsForm({ ...mainsForm, wordLimit: parseInt(e.target.value) || 150 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-[#6B7280] mb-1 font-inter">Question</label>
              <textarea
                value={mainsForm.questionText}
                onChange={(e) => setMainsForm({ ...mainsForm, questionText: e.target.value })}
                placeholder="Discuss the role of civil society in ensuring transparency..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={4}
              />
            </div>
            <button
              onClick={handleCreateMains}
              disabled={creating}
              className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm disabled:opacity-50"
              style={{ background: '#10B981' }}
            >
              {creating ? 'Creating...' : 'Create Daily Mains'}
            </button>
          </div>

          {/* Existing Mains Questions */}
          <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="font-inter font-semibold text-[#111827] mb-4" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
              Existing Mains Questions ({mainsQuestions.length})
            </h2>
            {loading ? (
              <p className="text-sm text-[#6B7280] py-4 text-center">Loading...</p>
            ) : mainsQuestions.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-4 text-center">No mains questions yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mainsQuestions.map((q: any) => (
                  <div key={q.id} className="p-3 rounded-lg" style={{ background: '#FAFAFA' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#6B7280]">{q.date}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">{q.category}</span>
                      <span className="text-xs text-[#6B7280]">{q.marks} marks &middot; {q.wordLimit} words</span>
                    </div>
                    <p className="text-sm text-[#374151]">{q.questionText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
