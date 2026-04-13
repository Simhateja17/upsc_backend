'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { testSeriesService } from '@/lib/services';

interface SeriesItem {
  id: string;
  title: string;
  description: string;
  examMode: string;
  subject?: string | null;
  difficulty: string;
  totalTests: number;
  questionsPerTest: number;
  price: number;
  isActive?: boolean;
  published?: boolean;
  listingStatus?: string;
  enrollmentCount?: number;
  thumbnailUrl?: string | null;
  categoryLabel?: string;
  durationLabel?: string;
  enrolledDisplay?: number;
  rating?: number;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  features?: { analytics?: boolean; aiAnalysis?: boolean; videoSolutions?: boolean };
  createdAt?: string;
}

type ProgressStep = { step: string; done: boolean; error?: string };

const emptyForm = {
  title: '',
  description: '',
  examMode: 'prelims',
  subject: '',
  difficulty: 'medium',
  totalTests: 10,
  questionsPerTest: 20,
  price: 0,
  published: false,
  listingStatus: 'open',
  thumbnailUrl: '',
  categoryLabel: 'GENERAL',
  durationLabel: 'Ongoing',
  enrolledDisplay: 0,
  rating: 4.5,
  compareAtPrice: '' as number | '',
  discountPercent: '' as number | '',
  featureAnalytics: true,
  featureAi: false,
  featureVideo: false,
  // PDF upload (create mode only)
  pdfFile: null as File | null,
  testTitle: 'Test 1',
  testTimeLimit: 60,
  // Detail page CMS
  tagline: '',
  tags: '',
  gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
  whyEnroll: [] as Array<{ t: string; d: string }>,
  achievements: [] as string[],
  syllabus: [] as Array<{ t: string; n: string; topics: string[] }>,
  faqs: [] as Array<{ q: string; a: string }>,
  includes: [] as string[],
};

export default function AdminTestSeriesPage() {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [msg, setMsg] = useState('');
  const [configErr, setConfigErr] = useState('');
  const [progress, setProgress] = useState<ProgressStep[]>([]);

  async function loadSeries() {
    setLoading(true);
    setConfigErr('');
    try {
      const res = await testSeriesService.listSeries();
      if (res.data) setSeries(res.data as SeriesItem[]);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : 'Failed to load';
      setConfigErr(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeries();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMsg('');
    setProgress([]);
  }

  function openEdit(s: SeriesItem) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description,
      examMode: s.examMode,
      subject: s.subject ?? '',
      difficulty: s.difficulty,
      totalTests: s.totalTests,
      questionsPerTest: s.questionsPerTest,
      price: s.price,
      published: s.published ?? s.isActive ?? true,
      listingStatus: s.listingStatus ?? 'open',
      thumbnailUrl: s.thumbnailUrl ?? '',
      categoryLabel: s.categoryLabel ?? 'GENERAL',
      durationLabel: s.durationLabel ?? 'Ongoing',
      enrolledDisplay: s.enrolledDisplay ?? s.enrollmentCount ?? 0,
      rating: s.rating ?? 4.5,
      compareAtPrice: s.compareAtPrice ?? '',
      discountPercent: s.discountPercent ?? '',
      featureAnalytics: s.features?.analytics !== false,
      featureAi: !!s.features?.aiAnalysis,
      featureVideo: !!s.features?.videoSolutions,
      tagline: (s as any).tagline ?? '',
      tags: Array.isArray((s as any).tags) ? (s as any).tags.join(', ') : '',
      gradient: (s as any).gradient ?? 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
      whyEnroll: (s as any).whyEnroll ?? [],
      achievements: (s as any).achievements ?? [],
      syllabus: (s as any).syllabus ?? [],
      faqs: (s as any).faqs ?? [],
      includes: (s as any).includes ?? [],
      pdfFile: null,
      testTitle: 'Test 1',
      testTimeLimit: 60,
    });
    setShowForm(true);
    setMsg('');
  }

  async function uploadThumb(file: File | null) {
    if (!file || !editingId) {
      setMsg('Save the series first, then upload a thumbnail (need series id).');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'thumbnail');
      fd.append('seriesId', editingId);
      const up = await testSeriesService.uploadAsset(fd);
      setForm((f) => ({ ...f, thumbnailUrl: up.data.url }));
      setMsg('Thumbnail uploaded — click Update to persist URL if needed.');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  async function handleSave() {
    if (!form.title || !form.description) {
      setMsg('Title and description are required.');
      return;
    }
    setSaving(true);
    setMsg('');
    setProgress([]);

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      examMode: form.examMode,
      subject: form.subject || null,
      difficulty: form.difficulty,
      questionsPerTest: form.questionsPerTest,
      price: form.price,
      published: form.published,
      listingStatus: form.listingStatus,
      thumbnailUrl: form.thumbnailUrl || null,
      categoryLabel: form.categoryLabel,
      durationLabel: form.durationLabel,
      enrolledDisplay: form.enrolledDisplay,
      rating: form.rating,
      compareAtPrice: form.compareAtPrice === '' ? null : form.compareAtPrice,
      discountPercent: form.discountPercent === '' ? null : form.discountPercent,
      features: {
        analytics: form.featureAnalytics,
        aiAnalysis: form.featureAi,
        videoSolutions: form.featureVideo,
      },
      tagline: form.tagline || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      gradient: form.gradient || null,
      whyEnroll: form.whyEnroll,
      achievements: form.achievements,
      syllabus: form.syllabus,
      faqs: form.faqs,
      includes: form.includes,
    };

    // ── Edit mode: simple update ──
    if (editingId) {
      try {
        await testSeriesService.updateSeries(editingId, payload);
        setMsg('Series updated successfully.');
        setShowForm(false);
        setEditingId(null);
        await loadSeries();
      } catch (err: unknown) {
        setMsg(err instanceof Error ? err.message : 'Failed to save series.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── Create mode WITHOUT PDF: simple create ──
    if (!form.pdfFile) {
      try {
        const created = await testSeriesService.createSeries(payload);
        setMsg('Series created successfully.');
        const newId = (created.data as { id?: string })?.id;
        await loadSeries();
        if (newId) {
          setEditingId(newId);
          setShowForm(true);
        } else {
          setShowForm(false);
        }
      } catch (err: unknown) {
        setMsg(err instanceof Error ? err.message : 'Failed to save series.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── Create mode WITH PDF: full pipeline ──
    const steps: ProgressStep[] = [];
    const track = (name: string, done: boolean, error?: string) => {
      const idx = steps.findIndex((s) => s.step === name);
      if (idx >= 0) steps[idx] = { step: name, done, error };
      else steps.push({ step: name, done, error });
      setProgress([...steps]);
    };

    try {
      // 1. Create series
      track('Creating series...', false);
      const created = await testSeriesService.createSeries(payload);
      const newSeriesId = (created.data as { id?: string })?.id;
      if (!newSeriesId) throw new Error('Series created but no ID returned');
      track('Creating series...', true);

      // 2. Create test
      track('Creating test...', false);
      const testRes = await testSeriesService.createTest(newSeriesId, {
        title: form.testTitle || 'Test 1',
        sortOrder: 1,
      });
      const newTestId = (testRes.data as { id?: string })?.id;
      if (!newTestId) throw new Error('Test created but no ID returned');
      track('Creating test...', true);

      // 3. Upload PDF
      track('Uploading PDF...', false);
      const fd = new FormData();
      fd.append('file', form.pdfFile);
      fd.append('kind', 'pdf');
      fd.append('seriesId', newSeriesId);
      fd.append('testId', newTestId);
      const uploadRes = await testSeriesService.uploadAsset(fd);
      const upData = uploadRes.data as { url?: string; path?: string };
      await testSeriesService.updateTest(newSeriesId, newTestId, {
        pdfUrl: upData.url,
        pdfPath: upData.path,
        timeLimitMinutes: form.testTimeLimit || 60,
      });
      track('Uploading PDF...', true);

      // 4. Extract text
      track('Extracting text from PDF...', false);
      await testSeriesService.extractPdfText(newSeriesId, newTestId);
      track('Extracting text from PDF...', true);

      // 5. AI parse questions (auto-save)
      track('Parsing questions with AI (may take a minute)...', false);
      const parseRes = await testSeriesService.parsePdfQuestions(newSeriesId, newTestId, true);
      const qCount = (parseRes.data as { totalParsed?: number })?.totalParsed ?? 0;
      track(`Parsed ${qCount} questions!`, true);

      setMsg(`Series created successfully with ${qCount} questions!`);
      setShowForm(false);
      await loadSeries();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed';
      const pending = steps.find((s) => !s.done);
      if (pending) {
        pending.error = errMsg;
        pending.done = true;
        setProgress([...steps]);
      }
      setMsg('Partial creation — use "Manage Tests" to fix remaining steps. Error: ' + errMsg);
      await loadSeries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test series? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await testSeriesService.deleteSeries(id);
      await loadSeries();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Failed to delete series.');
    } finally {
      setDeleting(null);
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 13,
    color: '#374151',
    borderBottom: '1px solid #F3F4F6',
    fontFamily: 'Inter, sans-serif',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: 24, color: '#111827', margin: 0 }}>🏆 Test Series CMS</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>
            Supabase + service role required. Run <code>supabase/test-series-schema.sql</code> and set{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + New Series
        </button>
      </div>

      {configErr && (
        <div style={{ background: '#FEF3C7', color: '#92400E', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          {configErr}
        </div>
      )}

      {msg && (
        <div
          style={{
            background: msg.includes('success') ? '#D1FAE5' : '#FEE2E2',
            color: msg.includes('success') ? '#065F46' : '#991B1B',
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#111827', margin: '0 0 20px' }}>
            {editingId ? 'Edit Series' : 'Create New Series'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title *</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Current Affairs Radar"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short card description"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Thumbnail URL (or upload after first save)</label>
              <input
                style={inputStyle}
                value={form.thumbnailUrl}
                onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
              />
              {editingId && (
                <label style={{ ...labelStyle, marginTop: 8 }}>
                  Upload image
                  <input type="file" accept="image/*" onChange={(e) => uploadThumb(e.target.files?.[0] ?? null)} style={{ marginLeft: 8 }} />
                </label>
              )}
            </div>
            <div>
              <label style={labelStyle}>Category label (card subtitle)</label>
              <input
                style={inputStyle}
                value={form.categoryLabel}
                onChange={(e) => setForm((f) => ({ ...f, categoryLabel: e.target.value }))}
                placeholder="CURRENT AFFAIRS"
              />
            </div>
            <div>
              <label style={labelStyle}>Duration label</label>
              <input
                style={inputStyle}
                value={form.durationLabel}
                onChange={(e) => setForm((f) => ({ ...f, durationLabel: e.target.value }))}
                placeholder="Ongoing"
              />
            </div>
            <div>
              <label style={labelStyle}>Listing status</label>
              <select
                style={inputStyle}
                value={form.listingStatus}
                onChange={(e) => setForm((f) => ({ ...f, listingStatus: e.target.value }))}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="published" style={{ ...labelStyle, margin: 0 }}>
                Published (visible in catalog when open)
              </label>
            </div>
            <div>
              <label style={labelStyle}>Exam mode</label>
              <select style={inputStyle} value={form.examMode} onChange={(e) => setForm((f) => ({ ...f, examMode: e.target.value }))}>
                <option value="prelims">Prelims</option>
                <option value="mains">Mains</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject (optional)</label>
              <input
                style={inputStyle}
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Polity, CA, …"
              />
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select style={inputStyle} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Total tests (planning)</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                value={form.totalTests}
                onChange={(e) => setForm((f) => ({ ...f, totalTests: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Questions / test (default)</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                max={200}
                value={form.questionsPerTest}
                onChange={(e) => setForm((f) => ({ ...f, questionsPerTest: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Price (₹)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Compare-at price (₹, optional)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={form.compareAtPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compareAtPrice: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Discount % (optional)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={100}
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPercent: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Enrolled display (marketing count)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={form.enrolledDisplay}
                onChange={(e) => setForm((f) => ({ ...f, enrolledDisplay: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Rating</label>
              <input
                style={inputStyle}
                type="number"
                step={0.1}
                min={0}
                max={5}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.featureAnalytics} onChange={(e) => setForm((f) => ({ ...f, featureAnalytics: e.target.checked }))} />
                Analytics
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.featureAi} onChange={(e) => setForm((f) => ({ ...f, featureAi: e.target.checked }))} />
                AI analysis (opt-in)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.featureVideo} onChange={(e) => setForm((f) => ({ ...f, featureVideo: e.target.checked }))} />
                Video solutions
              </label>
            </div>

            {/* ── PDF Upload (create mode only) ── */}
            {!editingId && (
              <div style={{ gridColumn: '1 / -1', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16, marginTop: 4 }}>
                <label style={{ ...labelStyle, fontSize: 14, color: '#047857', marginBottom: 8 }}>
                  Upload PDF with MCQ Questions
                </label>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>
                  Upload a PDF and questions will be automatically extracted and parsed by AI. The test will be ready for users immediately.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setForm((f) => ({ ...f, pdfFile: e.target.files?.[0] ?? null }))}
                      style={{ fontSize: 13 }}
                    />
                    {form.pdfFile && (
                      <span style={{ marginLeft: 12, fontSize: 12, color: '#047857', fontWeight: 600 }}>
                        {form.pdfFile.name} ({(form.pdfFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Test Title</label>
                    <input
                      style={inputStyle}
                      value={form.testTitle}
                      onChange={(e) => setForm((f) => ({ ...f, testTitle: e.target.value }))}
                      placeholder="Test 1"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Time Limit (minutes)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min={1}
                      value={form.testTimeLimit}
                      onChange={(e) => setForm((f) => ({ ...f, testTimeLimit: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Detail Page Content (collapsible) ── */}
            <details style={{ gridColumn: '1 / -1', marginTop: 8 }}>
              <summary style={{ ...labelStyle, cursor: 'pointer', fontSize: 14, color: '#4F46E5', marginBottom: 12 }}>
                ▸ Detail Page Content (tagline, why enroll, syllabus, FAQs…)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Tagline</label>
                  <input style={inputStyle} value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Build roots so strong, no examiner can shake you." />
                </div>
                <div>
                  <label style={labelStyle}>Tags (comma-separated)</label>
                  <input style={inputStyle} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="NCERT, All Subjects, Chapter-wise" />
                </div>
                <div>
                  <label style={labelStyle}>Gradient CSS</label>
                  <input style={inputStyle} value={form.gradient} onChange={(e) => setForm((f) => ({ ...f, gradient: e.target.value }))} />
                  {form.gradient && <div style={{ height: 8, borderRadius: 4, marginTop: 4, background: form.gradient }} />}
                </div>

                {/* Why Enroll */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Why Enroll (title + description pairs)</label>
                  {form.whyEnroll.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input style={{ ...inputStyle, flex: '1' }} value={item.t} placeholder="Title" onChange={(e) => { const next = [...form.whyEnroll]; next[i] = { ...next[i], t: e.target.value }; setForm((f) => ({ ...f, whyEnroll: next })); }} />
                      <input style={{ ...inputStyle, flex: '2' }} value={item.d} placeholder="Description" onChange={(e) => { const next = [...form.whyEnroll]; next[i] = { ...next[i], d: e.target.value }; setForm((f) => ({ ...f, whyEnroll: next })); }} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, whyEnroll: f.whyEnroll.filter((_, j) => j !== i) }))} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, whyEnroll: [...f.whyEnroll, { t: '', d: '' }] }))} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Add reason</button>
                </div>

                {/* Achievements */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Achievements (bullet points)</label>
                  {form.achievements.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input style={{ ...inputStyle, flex: 1 }} value={item} onChange={(e) => { const next = [...form.achievements]; next[i] = e.target.value; setForm((f) => ({ ...f, achievements: next })); }} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, achievements: f.achievements.filter((_, j) => j !== i) }))} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, achievements: [...f.achievements, ''] }))} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Add</button>
                </div>

                {/* Includes */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>What&apos;s Included (bullet points)</label>
                  {form.includes.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input style={{ ...inputStyle, flex: 1 }} value={item} onChange={(e) => { const next = [...form.includes]; next[i] = e.target.value; setForm((f) => ({ ...f, includes: next })); }} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, includes: f.includes.filter((_, j) => j !== i) }))} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, includes: [...f.includes, ''] }))} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Add</button>
                </div>

                {/* Syllabus */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Syllabus Modules</label>
                  {form.syllabus.map((mod, i) => (
                    <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <input style={{ ...inputStyle, flex: 2 }} value={mod.t} placeholder="Module title" onChange={(e) => { const next = [...form.syllabus]; next[i] = { ...next[i], t: e.target.value }; setForm((f) => ({ ...f, syllabus: next })); }} />
                        <input style={{ ...inputStyle, flex: 1 }} value={mod.n} placeholder="Note (e.g. 12 tests)" onChange={(e) => { const next = [...form.syllabus]; next[i] = { ...next[i], n: e.target.value }; setForm((f) => ({ ...f, syllabus: next })); }} />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, syllabus: f.syllabus.filter((_, j) => j !== i) }))} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                      <input style={{ ...inputStyle, fontSize: 12 }} value={mod.topics.join(', ')} placeholder="Topics (comma-separated)" onChange={(e) => { const next = [...form.syllabus]; next[i] = { ...next[i], topics: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }; setForm((f) => ({ ...f, syllabus: next })); }} />
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, syllabus: [...f.syllabus, { t: '', n: '', topics: [] }] }))} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Add module</button>
                </div>

                {/* FAQs */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>FAQs</label>
                  {form.faqs.map((faq, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input style={{ ...inputStyle, flex: 1 }} value={faq.q} placeholder="Question" onChange={(e) => { const next = [...form.faqs]; next[i] = { ...next[i], q: e.target.value }; setForm((f) => ({ ...f, faqs: next })); }} />
                      <input style={{ ...inputStyle, flex: 2 }} value={faq.a} placeholder="Answer" onChange={(e) => { const next = [...form.faqs]; next[i] = { ...next[i], a: e.target.value }; setForm((f) => ({ ...f, faqs: next })); }} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, faqs: f.faqs.filter((_, j) => j !== i) }))} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, faqs: [...f.faqs, { q: '', a: '' }] }))} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Add FAQ</button>
                </div>
              </div>
            </details>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? '#6B7280' : '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                fontWeight: 600,
                fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving
                ? (form.pdfFile && !editingId ? 'Processing...' : 'Saving...')
                : editingId
                  ? 'Update Series'
                  : form.pdfFile
                    ? 'Create Series & Parse PDF'
                    : 'Create Series'}
            </button>
            {editingId && (
              <Link
                href={`/admin/test-series/${editingId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Manage tests & PDFs →
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>

          {/* ── Progress Tracker ── */}
          {progress.length > 0 && (
            <div style={{ marginTop: 16, background: '#F9FAFB', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>Pipeline Progress</div>
              {progress.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  {p.error ? (
                    <span style={{ color: '#DC2626', fontWeight: 700, width: 20, textAlign: 'center' }}>✗</span>
                  ) : p.done ? (
                    <span style={{ color: '#059669', fontWeight: 700, width: 20, textAlign: 'center' }}>✓</span>
                  ) : (
                    <span style={{ width: 20, textAlign: 'center', color: '#6B7280' }}>⟳</span>
                  )}
                  <span style={{ color: p.error ? '#DC2626' : p.done ? '#059669' : '#374151' }}>
                    {p.step}
                  </span>
                  {p.error && (
                    <span style={{ fontSize: 11, color: '#991B1B', marginLeft: 4 }}>({p.error})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>Loading series...</div>
      ) : series.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No test series yet</div>
          <div style={{ fontSize: 13 }}>Click &quot;New Series&quot; to create the first one.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Title', 'Published', 'Tests', 'Price', 'Enrolled', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid #E5E7EB',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id} style={{ opacity: s.published === false ? 0.55 : 1 }}>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{s.title}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        marginTop: 2,
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.description}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    {s.published ? 'Yes' : 'No'} · {s.listingStatus ?? '—'}
                  </td>
                  <td style={cellStyle}>{s.totalTests}</td>
                  <td style={cellStyle}>{s.price === 0 ? <span style={{ color: '#065F46', fontWeight: 600 }}>Free</span> : `₹${s.price}`}</td>
                  <td style={cellStyle}>{s.enrollmentCount ?? 0}</td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/test-series/${s.id}`)}
                        style={{
                          background: '#047857',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Manage Tests
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: deleting === s.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {deleting === s.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
