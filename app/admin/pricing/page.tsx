'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

export default function PricingManager() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [featuresInput, setFeaturesInput] = useState('');

  const emptyForm = { name: '', price: '', duration: '', isPopular: false, order: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    adminService.getPricingPlans()
      .then((res) => setPlans(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setMsg('');
    try {
      const features = featuresInput.split('\n').map(f => f.trim()).filter(Boolean);
      const data = { ...form, price: parseInt(form.price) || 0, features };
      if (editing) {
        await adminService.updatePricingPlan(editing.id, data);
        setMsg('Plan updated!');
      } else {
        await adminService.createPricingPlan(data);
        setMsg('Plan created!');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setFeaturesInput('');
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), duration: p.duration, isPopular: p.isPopular, order: p.order });
    setFeaturesInput((p.features || []).join('\n'));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing plan?')) return;
    try {
      await adminService.deletePricingPlan(id);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (p: any) => {
    try {
      await adminService.updatePricingPlan(p.id, { isActive: !p.isActive });
      load();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-[clamp(1.5rem,2vw,2rem)]">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Pricing Plans Manager
        </h1>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setFeaturesInput(''); setShowForm(!showForm); }}
          className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white"
          style={{ background: '#6366F1' }}
        >
          {showForm && !editing ? 'Cancel' : 'Add Plan'}
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
            {editing ? 'Edit Plan' : 'Add Pricing Plan'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Plan Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Foundation" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Price (₹) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 4999" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Duration *</label>
              <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="e.g. 3 months" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Display Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-[#374151] font-inter">Mark as Popular</span>
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[#6B7280] mb-1">Features (one per line)</label>
            <textarea value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder={"Daily MCQ Practice\nAnswer Writing with AI Feedback\nFull Mock Tests"}
              rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit}
              className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm" style={{ background: '#10B981' }}>
              {editing ? 'Update Plan' : 'Create Plan'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setShowForm(false); setForm(emptyForm); setFeaturesInput(''); }}
                className="px-5 py-2 rounded-lg font-inter font-medium text-sm text-[#6B7280] border border-gray-300">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
        <h2 className="font-inter font-semibold text-[#111827] mb-4">Pricing Plans ({plans.length})</h2>
        {loading ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">Loading...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">No pricing plans yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p: any) => (
              <div key={p.id} className="p-4 rounded-xl" style={{ border: `2px solid ${p.isPopular ? '#6366F1' : '#E5E7EB'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#111827]">{p.name}</p>
                      {p.isPopular && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: '#6366F1' }}>Popular</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-[#111827]">₹{p.price.toLocaleString()}</p>
                    <p className="text-sm text-[#6B7280]">{p.duration}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: p.isActive ? '#ECFDF5' : '#F3F4F6',
                    color: p.isActive ? '#065F46' : '#6B7280',
                  }}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <ul className="space-y-1 mb-3">
                  {(p.features || []).map((f: string, i: number) => (
                    <li key={i} className="text-xs text-[#374151] flex items-start gap-1">
                      <span className="text-[#10B981] flex-shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => handleEdit(p)}
                    className="text-xs px-2 py-1 rounded text-[#6366F1] hover:bg-[#EFF6FF]">Edit</button>
                  <button onClick={() => handleToggleActive(p)}
                    className="text-xs px-2 py-1 rounded text-[#F59E0B] hover:bg-[#FFFBEB]">
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2]">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
