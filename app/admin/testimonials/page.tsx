'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

export default function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const emptyForm = { name: '', title: '', content: '', avatarUrl: '', rating: 5, order: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    adminService.getTestimonials()
      .then((res) => setTestimonials(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setMsg('');
    try {
      if (editing) {
        await adminService.updateTestimonial(editing.id, form);
        setMsg('Testimonial updated!');
      } else {
        await adminService.createTestimonial(form);
        setMsg('Testimonial created!');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, title: t.title, content: t.content, avatarUrl: t.avatarUrl || '', rating: t.rating, order: t.order });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await adminService.deleteTestimonial(id);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (t: any) => {
    try {
      await adminService.updateTestimonial(t.id, { isActive: !t.isActive });
      load();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-[clamp(1.5rem,2vw,2rem)]">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Testimonials Manager
        </h1>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(!showForm); }}
          className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white"
          style={{ background: '#6366F1' }}
        >
          {showForm && !editing ? 'Cancel' : 'Add Testimonial'}
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

      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">
            {editing ? 'Edit Testimonial' : 'Add Testimonial'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Priya Sharma" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. IAS 2024 - AIR 45" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#6B7280] mb-1">Avatar URL</label>
              <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Rating (1-5)</label>
              <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1">Testimonial Content *</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="What did they say about the platform?" rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[#6B7280] mb-1">Display Order</label>
            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit}
              className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm" style={{ background: '#10B981' }}>
              {editing ? 'Update' : 'Create'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setShowForm(false); setForm(emptyForm); }}
                className="px-5 py-2 rounded-lg font-inter font-medium text-sm text-[#6B7280] border border-gray-300">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
        <h2 className="font-inter font-semibold text-[#111827] mb-4">Testimonials ({testimonials.length})</h2>
        {loading ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">Loading...</p>
        ) : testimonials.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">No testimonials yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {testimonials.map((t: any) => (
              <div key={t.id} className="p-4 rounded-xl" style={{ background: '#FAFAFA' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-[#111827]">{t.name}</span>
                      <span className="text-xs text-[#6B7280]">{t.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: t.isActive ? '#ECFDF5' : '#F3F4F6',
                        color: t.isActive ? '#065F46' : '#6B7280',
                      }}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-[#374151] line-clamp-2">{t.content}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Rating: {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)} · Order: {t.order}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(t)}
                      className="text-xs px-3 py-1 rounded-lg text-[#6366F1] hover:bg-[#EFF6FF] transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleToggleActive(t)}
                      className="text-xs px-3 py-1 rounded-lg text-[#F59E0B] hover:bg-[#FFFBEB] transition-colors">
                      {t.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="text-xs px-3 py-1 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
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
