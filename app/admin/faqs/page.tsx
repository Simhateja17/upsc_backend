'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
}

const CATEGORIES = ['General', 'Study Planner', 'Jeet GPT', 'Syllabus', 'Daily MCQ', 'Mock Tests', 'Test Series', 'Pricing', 'Current Affairs', 'Technical'];

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ category: 'General', question: '', answer: '', order: 0 });

  const load = () => {
    setLoading(true);
    adminService.getFaqs()
      .then((res) => setFaqs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setMsg('');
    try {
      if (editing) {
        await adminService.updateFaq(editing.id, form);
        setMsg('FAQ updated!');
      } else {
        await adminService.createFaq(form);
        setMsg('FAQ created!');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ category: 'General', question: '', answer: '', order: 0 });
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleEdit = (f: FaqItem) => {
    setEditing(f);
    setForm({ category: f.category, question: f.question, answer: f.answer, order: f.order });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await adminService.deleteFaq(id);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (f: FaqItem) => {
    try {
      await adminService.updateFaq(f.id, { isActive: !f.isActive });
      load();
    } catch {}
  };

  const grouped = faqs.reduce<Record<string, FaqItem[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          FAQ Manager
        </h1>
        <button
          onClick={() => { setEditing(null); setForm({ category: 'General', question: '', answer: '', order: 0 }); setShowForm(!showForm); }}
          className="px-4 py-2 bg-[#101828] text-white rounded-lg font-inter font-medium text-sm hover:bg-[#1E2875] transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add FAQ'}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-inter ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="e.g. What is RiseWithJeet?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Write the answer here... HTML tags like <strong> are supported."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-[#101828] text-white rounded-lg font-inter font-medium text-sm hover:bg-[#1E2875] transition-colors"
            >
              {editing ? 'Update FAQ' : 'Create FAQ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-inter font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#0F172B] rounded-full animate-spin" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 font-inter">No FAQs yet. Click "Add FAQ" to create one.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="font-inter font-semibold text-gray-800 text-lg mb-3">{category}</h2>
              <div className="space-y-3">
                {items.map((f) => (
                  <div key={f.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-opacity ${f.isActive ? '' : 'opacity-50'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-inter font-medium text-[#111827] text-sm mb-1">{f.question}</p>
                        <p className="font-inter text-gray-600 text-sm" dangerouslySetInnerHTML={{ __html: f.answer }} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(f)}
                          className={`px-2 py-1 rounded text-xs font-medium ${f.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {f.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleEdit(f)}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
