'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

type MindmapSubject = { id: string; name: string; slug: string; icon: string; _count: { maps: number } };
type Mindmap = { id: string; subjectId: string; title: string; slug: string; branches: any; nodes: any; quizData: any; subject?: { name: string; slug: string } };

const emptySubjectForm = { name: '', slug: '', icon: '🗺️' };
const emptyMapForm = { subjectSlug: '', title: '', slug: '', branches: '[]', nodes: '[]', quizData: '' };

export default function MindmapManager() {
  const [tab, setTab] = useState<'subjects' | 'mindmaps'>('subjects');
  const [subjects, setSubjects] = useState<MindmapSubject[]>([]);
  const [maps, setMaps] = useState<Mindmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editSubject, setEditSubject] = useState<MindmapSubject | null>(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);

  const [showMapForm, setShowMapForm] = useState(false);
  const [editMap, setEditMap] = useState<Mindmap | null>(null);
  const [mapForm, setMapForm] = useState(emptyMapForm);
  const [jsonErrors, setJsonErrors] = useState<{ branches?: string; nodes?: string; quizData?: string }>({});

  const loadSubjects = () => {
    adminService.getMindmapSubjects()
      .then((res) => setSubjects(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadMaps = () => {
    adminService.getAdminMindmaps()
      .then((res) => setMaps(res.data || []))
      .catch(() => {});
  };

  useEffect(() => { loadSubjects(); }, []);

  useEffect(() => {
    if (tab === 'mindmaps') loadMaps();
  }, [tab]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  // Subject handlers
  const openCreateSubject = () => { setEditSubject(null); setSubjectForm(emptySubjectForm); setShowSubjectForm(true); };
  const openEditSubject = (s: MindmapSubject) => { setEditSubject(s); setSubjectForm({ name: s.name, slug: s.slug, icon: s.icon }); setShowSubjectForm(true); };

  const handleSaveSubject = async () => {
    try {
      if (editSubject) {
        await adminService.updateMindmapSubject(editSubject.id, subjectForm);
        flash('Subject updated!');
      } else {
        await adminService.createMindmapSubject(subjectForm);
        flash('Subject created!');
      }
      setShowSubjectForm(false);
      loadSubjects();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject and all its mindmaps?')) return;
    try {
      await adminService.deleteMindmapSubject(id);
      flash('Subject deleted.');
      loadSubjects();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  // Mindmap handlers
  const validateJson = (str: string, field: string): boolean => {
    if (!str.trim()) return true;
    try { JSON.parse(str); setJsonErrors((e) => ({ ...e, [field]: undefined })); return true; }
    catch (err: any) { setJsonErrors((e) => ({ ...e, [field]: err.message })); return false; }
  };

  const openCreateMap = () => { setEditMap(null); setMapForm(emptyMapForm); setJsonErrors({}); setShowMapForm(true); };
  const openEditMap = (m: Mindmap) => {
    setEditMap(m);
    setMapForm({
      subjectSlug: m.subject?.slug ?? '',
      title: m.title,
      slug: m.slug,
      branches: JSON.stringify(m.branches, null, 2),
      nodes: JSON.stringify(m.nodes, null, 2),
      quizData: m.quizData ? JSON.stringify(m.quizData, null, 2) : '',
    });
    setJsonErrors({});
    setShowMapForm(true);
  };

  const handleSaveMap = async () => {
    const branchesOk = validateJson(mapForm.branches, 'branches');
    const nodesOk = validateJson(mapForm.nodes, 'nodes');
    const quizOk = !mapForm.quizData.trim() || validateJson(mapForm.quizData, 'quizData');
    if (!branchesOk || !nodesOk || !quizOk) return;

    const payload = {
      subjectSlug: mapForm.subjectSlug,
      title: mapForm.title,
      slug: mapForm.slug,
      branches: JSON.parse(mapForm.branches),
      nodes: JSON.parse(mapForm.nodes),
      quizData: mapForm.quizData.trim() ? JSON.parse(mapForm.quizData) : undefined,
    };

    try {
      if (editMap) {
        await adminService.updateAdminMindmap(editMap.id, payload);
        flash('Mindmap updated!');
      } else {
        await adminService.createAdminMindmap(payload);
        flash('Mindmap created!');
      }
      setShowMapForm(false);
      loadMaps();
      loadSubjects();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const handleDeleteMap = async (id: string) => {
    if (!confirm('Delete this mindmap?')) return;
    try {
      await adminService.deleteAdminMindmap(id);
      flash('Mindmap deleted.');
      loadMaps();
      loadSubjects();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const btnPrimary = 'px-4 py-2 rounded-lg text-white text-sm font-medium font-inter';
  const btnDanger = 'text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2]';
  const btnEdit = 'text-xs px-2 py-1 rounded text-[#6366F1] hover:bg-[#EEF2FF]';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Mindmap Manager
        </h1>
        <button
          onClick={tab === 'subjects' ? openCreateSubject : openCreateMap}
          className={btnPrimary}
          style={{ background: '#6366F1' }}
        >
          {tab === 'subjects' ? 'Add Subject' : 'Add Mindmap'}
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

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['subjects', 'mindmaps'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2.5 text-sm font-medium font-inter capitalize transition-colors"
            style={{
              borderBottom: tab === t ? '2px solid #6366F1' : '2px solid transparent',
              color: tab === t ? '#6366F1' : '#6B7280',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Subject form */}
      {showSubjectForm && tab === 'subjects' && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">{editSubject ? 'Edit Subject' : 'Add Subject'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Name *</label>
              <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="e.g. Indian History" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Slug *</label>
              <input value={subjectForm.slug} onChange={(e) => setSubjectForm({ ...subjectForm, slug: e.target.value })}
                placeholder="e.g. indian-history" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Icon emoji</label>
              <input value={subjectForm.icon} onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })}
                placeholder="🗺️" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveSubject} className={btnPrimary} style={{ background: '#10B981' }}>
              {editSubject ? 'Save Changes' : 'Create Subject'}
            </button>
            <button onClick={() => setShowSubjectForm(false)} className={btnPrimary} style={{ background: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mindmap form */}
      {showMapForm && tab === 'mindmaps' && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">{editMap ? 'Edit Mindmap' : 'Add Mindmap'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Subject *</label>
              <select value={mapForm.subjectSlug} onChange={(e) => setMapForm({ ...mapForm, subjectSlug: e.target.value })}
                className={inputCls}>
                <option value="">Select subject...</option>
                {subjects.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Title *</label>
              <input value={mapForm.title} onChange={(e) => setMapForm({ ...mapForm, title: e.target.value })}
                placeholder="e.g. Ancient India Overview" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Slug *</label>
              <input value={mapForm.slug} onChange={(e) => setMapForm({ ...mapForm, slug: e.target.value })}
                placeholder="e.g. ancient-india-overview" className={inputCls} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#6B7280] mb-1">Branches JSON *</label>
            <textarea value={mapForm.branches}
              onChange={(e) => { setMapForm({ ...mapForm, branches: e.target.value }); validateJson(e.target.value, 'branches'); }}
              rows={4} className={`${inputCls} font-mono text-xs`} placeholder="[]" />
            {jsonErrors.branches && <p className="text-xs text-red-600 mt-1">{jsonErrors.branches}</p>}
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#6B7280] mb-1">Nodes JSON *</label>
            <textarea value={mapForm.nodes}
              onChange={(e) => { setMapForm({ ...mapForm, nodes: e.target.value }); validateJson(e.target.value, 'nodes'); }}
              rows={4} className={`${inputCls} font-mono text-xs`} placeholder="[]" />
            {jsonErrors.nodes && <p className="text-xs text-red-600 mt-1">{jsonErrors.nodes}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[#6B7280] mb-1">Quiz Data JSON (optional)</label>
            <textarea value={mapForm.quizData}
              onChange={(e) => { setMapForm({ ...mapForm, quizData: e.target.value }); if (e.target.value.trim()) validateJson(e.target.value, 'quizData'); }}
              rows={3} className={`${inputCls} font-mono text-xs`} placeholder="Leave empty if none" />
            {jsonErrors.quizData && <p className="text-xs text-red-600 mt-1">{jsonErrors.quizData}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveMap} className={btnPrimary} style={{ background: '#10B981' }}>
              {editMap ? 'Save Changes' : 'Create Mindmap'}
            </button>
            <button onClick={() => setShowMapForm(false)} className={btnPrimary} style={{ background: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subjects tab */}
      {tab === 'subjects' && (
        <div className="bg-white rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
          {loading ? (
            <p className="text-sm text-[#6B7280] py-12 text-center">Loading...</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-12 text-center">No subjects yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  {['Icon', 'Name', 'Slug', 'Maps', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-4 py-3 text-lg">{s.icon}</td>
                    <td className="px-4 py-3 font-medium text-[#111827]">{s.name}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{s.slug}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{s._count?.maps ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditSubject(s)} className={btnEdit}>Edit</button>
                        <button onClick={() => handleDeleteSubject(s.id)} className={btnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Mindmaps tab */}
      {tab === 'mindmaps' && (
        <div className="bg-white rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
          {maps.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-12 text-center">No mindmaps yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  {['Title', 'Subject', 'Slug', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maps.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-4 py-3 font-medium text-[#111827]">{m.title}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{m.subject?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{m.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditMap(m)} className={btnEdit}>Edit</button>
                        <button onClick={() => handleDeleteMap(m.id)} className={btnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
