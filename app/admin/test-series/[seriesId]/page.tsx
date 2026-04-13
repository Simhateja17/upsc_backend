'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { testSeriesService } from '@/lib/services';

type TestRow = {
  id: string;
  title: string;
  sortOrder: number;
  pdfUrl: string | null;
  pdfPath: string | null;
  extractedText: string | null;
  timeLimitMinutes: number;
  videoSolutionUrl: string | null;
  questionCount: number;
};

type QuestionDraft = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const emptyQ = (): QuestionDraft => ({
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
});

export default function AdminTestSeriesDetailPage() {
  const params = useParams();
  const seriesId = params?.seriesId as string;

  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft[]>>({});
  const [jsonImport, setJsonImport] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await testSeriesService.listAdminTests(seriesId);
      setTests((res.data as TestRow[]) ?? []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTest() {
    setMsg('');
    try {
      await testSeriesService.createTest(seriesId, { title: `Test ${tests.length + 1}` });
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function uploadPdf(testId: string, file: File | null) {
    if (!file) return;
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'pdf');
      fd.append('seriesId', seriesId);
      fd.append('testId', testId);
      const up = await testSeriesService.uploadAsset(fd);
      await testSeriesService.updateTest(seriesId, testId, {
        pdfUrl: up.data.url,
        pdfPath: up.data.path,
      });
      setMsg('PDF uploaded.');
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  async function extractPdf(testId: string) {
    setMsg('');
    try {
      const res = await testSeriesService.extractPdfText(seriesId, testId);
      setMsg(`Extracted ${(res.data as { charCount?: number })?.charCount ?? 0} characters. Check preview in API or re-open test editor.`);
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Extract failed');
    }
  }

  async function aiParsePdf(testId: string) {
    setParsing(testId);
    setMsg('');
    try {
      const res = await testSeriesService.parsePdfQuestions(seriesId, testId);
      const qs = (res.data?.questions ?? []) as Array<{
        prompt: string;
        options: string[];
        correct_index: number;
        explanation: string;
      }>;
      if (qs.length === 0) {
        setMsg('AI found 0 questions. Check the extracted text or try a different PDF.');
      } else {
        setDrafts((d) => ({
          ...d,
          [testId]: qs.map((q) => ({
            prompt: q.prompt,
            options: [...q.options, '', '', '', ''].slice(0, 4),
            correctIndex: q.correct_index,
            explanation: q.explanation ?? '',
          })),
        }));
        setExpanded(testId);
        setMsg(`AI parsed ${qs.length} questions. Review below and click "Save questions" when ready.`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'AI parse failed');
    } finally {
      setParsing(null);
    }
  }

  async function saveQuestions(testId: string) {
    const list = drafts[testId];
    if (!list?.length) {
      setMsg('Add at least one question row.');
      return;
    }
    setMsg('');
    try {
      await testSeriesService.putQuestions(
        seriesId,
        testId,
        list.map((q, i) => ({
          prompt: q.prompt,
          options: q.options.filter(Boolean),
          correctIndex: q.correctIndex,
          explanation: q.explanation || null,
          sortOrder: i,
        }))
      );
      setMsg('Questions saved.');
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function importJson(testId: string) {
    const raw = jsonImport[testId];
    if (!raw?.trim()) return;
    setMsg('');
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      await testSeriesService.putQuestions(seriesId, testId, parsed as Record<string, unknown>[]);
      setMsg('Imported questions from JSON.');
      setJsonImport((j) => ({ ...j, [testId]: '' }));
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  async function loadEditor(testId: string) {
    try {
      const res = await testSeriesService.getAdminTest(seriesId, testId);
      const data = res.data as {
        questions?: {
          prompt: string;
          options: unknown;
          correctIndex: number;
          explanation: string | null;
        }[];
      };
      const qs = (data.questions ?? []).map((q) => ({
        prompt: q.prompt,
        options: [...(Array.isArray(q.options) ? (q.options as string[]) : []), '', '', '', ''].slice(0, 4),
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? '',
      }));
      setDrafts((d) => ({ ...d, [testId]: qs.length ? qs : [emptyQ()] }));
      setExpanded(testId);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Load failed');
    }
  }

  function openNewEditor(testId: string) {
    setDrafts((d) => ({ ...d, [testId]: d[testId]?.length ? d[testId] : [emptyQ()] }));
    setExpanded(testId);
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/test-series" style={{ color: '#1D4ED8', fontSize: 14, textDecoration: 'none' }}>
          ← Back to Test Series
        </Link>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Manage tests</h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
        Series ID: <code style={{ fontSize: 12 }}>{seriesId}</code> — upload PDFs, extract text, then map questions manually or paste JSON.
      </p>

      {msg && (
        <div
          style={{
            background: msg.includes('failed') || msg.includes('Invalid') ? '#FEE2E2' : '#D1FAE5',
            color: msg.includes('failed') || msg.includes('Invalid') ? '#991B1B' : '#065F46',
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      <button
        type="button"
        onClick={addTest}
        style={{
          background: '#111827',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 18px',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        + Add test
      </button>

      {loading ? (
        <p style={{ color: '#6B7280' }}>Loading…</p>
      ) : tests.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No tests yet. Add one to upload a question PDF.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tests.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 14,
                padding: 16,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ color: '#111827' }}>{t.title}</strong>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{t.questionCount} questions</span>
                {t.pdfUrl && (
                  <a href={t.pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D4ED8' }}>
                    View PDF
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#374151' }}>
                  PDF:
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ marginLeft: 8 }}
                    onChange={(e) => uploadPdf(t.id, e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => extractPdf(t.id)}
                  style={{
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Extract text from PDF
                </button>
                <button
                  type="button"
                  onClick={() => aiParsePdf(t.id)}
                  disabled={parsing === t.id}
                  style={{
                    background: parsing === t.id ? '#C7D2FE' : '#4F46E5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: parsing === t.id ? 'wait' : 'pointer',
                    opacity: parsing === t.id ? 0.7 : 1,
                  }}
                >
                  {parsing === t.id ? 'AI Parsing…' : 'AI Parse Questions'}
                </button>
                <button
                  type="button"
                  onClick={() => (expanded === t.id ? setExpanded(null) : loadEditor(t.id))}
                  style={{
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {expanded === t.id ? 'Close editor' : 'Edit questions'}
                </button>
                <button
                  type="button"
                  onClick={() => openNewEditor(t.id)}
                  style={{
                    background: '#FEF3C7',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  New manual draft
                </button>
              </div>

              {t.extractedText && (
                <details style={{ marginBottom: 12, fontSize: 12, color: '#4B5563' }}>
                  <summary style={{ cursor: 'pointer' }}>Extracted text (preview)</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto', background: '#F9FAFB', padding: 8 }}>
                    {t.extractedText.slice(0, 4000)}
                    {t.extractedText.length > 4000 ? '…' : ''}
                  </pre>
                </details>
              )}

              {expanded === t.id && drafts[t.id] && (
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                    JSON import (array of{' '}
                    <code>prompt, options[], correctIndex, explanation?</code>):
                  </p>
                  <textarea
                    value={jsonImport[t.id] ?? ''}
                    onChange={(e) => setJsonImport((j) => ({ ...j, [t.id]: e.target.value }))}
                    placeholder='[{"prompt":"...","options":["A","B","C","D"],"correctIndex":0}]'
                    style={{ width: '100%', minHeight: 72, fontSize: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #E5E7EB', padding: 8 }}
                  />
                  <button
                    type="button"
                    onClick={() => importJson(t.id)}
                    style={{ marginBottom: 16, background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
                  >
                    Import JSON
                  </button>

                  {drafts[t.id].map((q, qi) => (
                    <div key={qi} style={{ marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 10 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Question {qi + 1}</label>
                      <textarea
                        value={q.prompt}
                        onChange={(e) => {
                          const next = [...drafts[t.id]];
                          next[qi] = { ...next[qi], prompt: e.target.value };
                          setDrafts((d) => ({ ...d, [t.id]: next }));
                        }}
                        style={{ width: '100%', minHeight: 56, fontSize: 13, marginBottom: 8, borderRadius: 8, border: '1px solid #E5E7EB' }}
                      />
                      {q.options.map((opt, oi) => (
                        <input
                          key={oi}
                          value={opt}
                          placeholder={`Option ${oi + 1}`}
                          onChange={(e) => {
                            const next = [...drafts[t.id]];
                            const opts = [...next[qi].options];
                            opts[oi] = e.target.value;
                            next[qi] = { ...next[qi], options: opts };
                            setDrafts((d) => ({ ...d, [t.id]: next }));
                          }}
                          style={{ width: '100%', marginBottom: 6, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
                        />
                      ))}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <label style={{ fontSize: 12 }}>
                          Correct (0–3):{' '}
                          <input
                            type="number"
                            min={0}
                            max={3}
                            value={q.correctIndex}
                            onChange={(e) => {
                              const next = [...drafts[t.id]];
                              next[qi] = { ...next[qi], correctIndex: Number(e.target.value) };
                              setDrafts((d) => ({ ...d, [t.id]: next }));
                            }}
                            style={{ width: 48 }}
                          />
                        </label>
                      </div>
                      <textarea
                        placeholder="Explanation (optional)"
                        value={q.explanation}
                        onChange={(e) => {
                          const next = [...drafts[t.id]];
                          next[qi] = { ...next[qi], explanation: e.target.value };
                          setDrafts((d) => ({ ...d, [t.id]: next }));
                        }}
                        style={{ width: '100%', minHeight: 44, marginTop: 8, fontSize: 13, borderRadius: 8, border: '1px solid #E5E7EB' }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDrafts((d) => ({ ...d, [t.id]: [...(d[t.id] ?? []), emptyQ()] }))}
                    style={{ marginRight: 8, background: '#E5E7EB', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Add question row
                  </button>
                  <button
                    type="button"
                    onClick={() => saveQuestions(t.id)}
                    style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save questions
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
