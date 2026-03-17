'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

type Seed = { id: string; subject: string; topic: string | null; questionText: string; difficulty: string; createdAt: string };

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const emptySeedForm = { subject: '', topic: '', questionText: '', difficulty: 'Medium' };

export default function SpacedRepManager() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editSeed, setEditSeed] = useState<Seed | null>(null);
  const [form, setForm] = useState(emptySeedForm);

  const loadSeeds = (subject?: string) => {
    adminService.getSpacedRepSeeds(subject)
      .then((res) => {
        const data: Seed[] = res.data || [];
        setSeeds(data);
        const unique = Array.from(new Set(data.map((s) => s.subject))).sort();
        setSubjects(unique);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSeeds(); }, []);

  useEffect(() => { loadSeeds(filterSubject || undefined); }, [filterSubject]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const openCreate = () => { setEditSeed(null); setForm(emptySeedForm); setShowForm(true); };
  const openEdit = (s: Seed) => {
    setEditSeed(s);
    setForm({ subject: s.subject, topic: s.topic ?? '', questionText: s.questionText, difficulty: s.difficulty });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = { ...form, topic: form.topic.trim() || undefined };
    try {
      if (editSeed) {
        await adminService.updateSpacedRepSeed(editSeed.id, payload);
        flash('Seed updated!');
      } else {
        await adminService.createSpacedRepSeed(payload);
        flash('Seed created!');
      }
      setShowForm(false);
      loadSeeds(filterSubject || undefined);
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this seed question?')) return;
    try {
      await adminService.deleteSpacedRepSeed(id);
      flash('Seed deleted.');
      loadSeeds(filterSubject || undefined);
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const btnPrimary = 'px-4 py-2 rounded-lg text-white text-sm font-medium font-inter';
  const btnDanger = 'text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2]';
  const btnEdit = 'text-xs px-2 py-1 rounded text-[#6366F1] hover:bg-[#EEF2FF]';

  const difficultyStyle = (d: string) => ({
    background: d === 'Easy' ? '#ECFDF5' : d === 'Hard' ? '#FEF2F2' : '#FFF7ED',
    color: d === 'Easy' ? '#065F46' : d === 'Hard' ? '#991B1B' : '#92400E',
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Spaced Repetition Seeds
        </h1>
        <button onClick={openCreate} className={btnPrimary} style={{ background: '#6366F1' }}>
          Add Seed Question
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-inter" style={{
          background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
          color: msg.startsWith('Error') ? '#991B1B' : '#065F46',
          border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
        }}>
          {msg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">{editSeed ? 'Edit Seed Question' : 'Add Seed Question'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Indian Polity" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Topic (optional)</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Fundamental Rights" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Difficulty</label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className={inputCls}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[#6B7280] mb-1">Question Text *</label>
            <textarea value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              rows={4} className={inputCls} placeholder="Enter the revision question..." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className={btnPrimary} style={{ background: '#10B981' }}>
              {editSeed ? 'Save Changes' : 'Create Seed'}
            </button>
            <button onClick={() => setShowForm(false)} className={btnPrimary} style={{ background: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-[#6B7280]">Filter by subject:</label>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="text-sm text-[#9CA3AF]">{seeds.length} question{seeds.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
        {loading ? (
          <p className="text-sm text-[#6B7280] py-12 text-center">Loading...</p>
        ) : seeds.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-12 text-center">No seed questions yet. Click "Add Seed Question" to create one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Subject', 'Topic', 'Question', 'Difficulty', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seeds.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td className="px-4 py-3 font-medium text-[#111827]">{s.subject}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{s.topic ?? '—'}</td>
                  <td className="px-4 py-3 text-[#374151] max-w-xs">
                    <p className="truncate" title={s.questionText}>{s.questionText}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={difficultyStyle(s.difficulty)}>
                      {s.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className={btnEdit}>Edit</button>
                      <button onClick={() => handleDelete(s.id)} className={btnDanger}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
