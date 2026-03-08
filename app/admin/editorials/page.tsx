'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

export default function EditorialManager() {
  const [editorials, setEditorials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    source: 'The Hindu',
    author: '',
    category: 'Governance',
    sourceUrl: '',
  });

  const loadEditorials = () => {
    setLoading(true);
    adminService
      .getEditorials()
      .then((res) => setEditorials(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEditorials(); }, []);

  const handleScrape = async () => {
    setScraping(true);
    setMsg('');
    try {
      await adminService.triggerScrape();
      setMsg('Scraping complete! New editorials fetched.');
      loadEditorials();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setScraping(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setMsg('');
    try {
      await adminService.createEditorial(form);
      setMsg('Editorial created!');
      setShowForm(false);
      setForm({ title: '', content: '', source: 'The Hindu', author: '', category: 'Governance', sourceUrl: '' });
      loadEditorials();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSummarize = async (id: string) => {
    setMsg('');
    try {
      await adminService.triggerSummarize(id);
      setMsg('AI summary generated!');
      loadEditorials();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this editorial?')) return;
    try {
      await adminService.deleteEditorial(id);
      loadEditorials();
    } catch {}
  };

  const categories = ['Governance', 'Polity', 'Economy', 'Society', 'Ethics', 'IR', 'Environment', 'Science & Tech', 'History', 'Geography'];

  return (
    <div>
      <div className="flex items-center justify-between mb-[clamp(1.5rem,2vw,2rem)]">
        <h1
          className="font-inter font-bold text-[#111827]"
          style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}
        >
          Editorial Manager
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white disabled:opacity-50"
            style={{ background: '#8B5CF6' }}
          >
            {scraping ? 'Scraping...' : 'Scrape New Editorials'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white"
            style={{ background: '#6366F1' }}
          >
            {showForm ? 'Cancel' : 'Add Manually'}
          </button>
        </div>
      </div>

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

      {/* Manual Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)] mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
            Add Editorial Manually
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1 font-inter">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option>The Hindu</option>
                <option>Indian Express</option>
                <option>Livemint</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1 font-inter">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1 font-inter">Author</label>
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Author name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1 font-inter">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Editorial title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1 font-inter">Source URL</label>
            <input
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1 font-inter">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Paste the editorial content..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={8}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm disabled:opacity-50"
            style={{ background: '#10B981' }}
          >
            {creating ? 'Creating...' : 'Create Editorial'}
          </button>
        </div>
      )}

      {/* Editorials List */}
      <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
        <h2 className="font-inter font-semibold text-[#111827] mb-4" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
          Editorials ({editorials.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">Loading...</p>
        ) : editorials.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">
            No editorials yet. Scrape from newspapers or add manually.
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {editorials.map((ed: any) => (
              <div key={ed.id} className="p-4 rounded-xl" style={{ background: '#FAFAFA' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">{ed.source}</span>
                      {ed.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">{ed.category}</span>
                      )}
                      <span className="text-xs text-[#9CA3AF]">{ed.publishedAt || ed.createdAt}</span>
                    </div>
                    <p className="text-sm font-medium text-[#111827] mb-1">{ed.title}</p>
                    <p className="text-xs text-[#6B7280] line-clamp-2">
                      {ed.content?.substring(0, 200)}...
                    </p>
                    {ed.aiSummary && (
                      <p className="mt-2 text-xs text-[#059669] italic">AI Summary available</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleSummarize(ed.id)}
                      className="text-xs px-3 py-1 rounded-lg text-[#6366F1] hover:bg-[#EFF6FF] transition-colors"
                    >
                      Summarize
                    </button>
                    <button
                      onClick={() => handleDelete(ed.id)}
                      className="text-xs px-3 py-1 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
