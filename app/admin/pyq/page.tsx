'use client';

import { useEffect, useState, useRef } from 'react';
import { adminService } from '@/lib/services';

interface PYQQuestion {
  id: string;
  year: number;
  paper: string;
  questionText: string;
  subject: string;
  topic?: string;
  difficulty?: string;
  status: string;
  options?: any;
  correctOption?: string;
  explanation?: string;
}

export default function PYQManager() {
  const [mode, setMode] = useState<'prelims' | 'mains'>('prelims');
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PYQQuestion>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const LIMIT = 20;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForUploadToFinish = async (uploadId: string) => {
    console.log(`[PYQ Admin] Polling started for uploadId=${uploadId}`);
    const maxAttempts = 40; // ~2 minutes
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`[PYQ Admin] Poll attempt ${i + 1}/${maxAttempts} for uploadId=${uploadId}`);
      const detail = await adminService.getPYQUploadDetail(uploadId);
      const upload = detail?.data;
      const status = String(upload?.status || '').toLowerCase();
      console.log(`[PYQ Admin] Upload status=${status || 'unknown'}`, upload);

      if (status === 'failed') {
        console.error(`[PYQ Admin] Parsing failed for uploadId=${uploadId}`, upload);
        throw new Error(upload?.errorMessage || 'PDF parsing failed. Check backend logs/API keys and try another PDF.');
      }

      if (status === 'parsed' || status === 'reviewed' || status === 'completed') {
        console.log(`[PYQ Admin] Parsing complete for uploadId=${uploadId}`, upload);
        return upload;
      }

      await sleep(3000);
    }

    console.warn(`[PYQ Admin] Poll timeout for uploadId=${uploadId}`);
    return null;
  };

  const loadQuestions = (page = currentPage) => {
    setLoading(true);
    adminService
      .getPYQQuestions({ mode, ...(statusFilter ? { status: statusFilter } : {}), page, limit: LIMIT })
      .then(async (res) => {
        const apiQuestions = (res.data?.questions || []) as PYQQuestion[];
        setQuestions(apiQuestions);

        const apiTotal = Number(res.data?.pagination?.total ?? apiQuestions.length);
        const apiPage = Number(res.data?.pagination?.page ?? page);
        const apiTotalPages = Number(res.data?.pagination?.totalPages ?? Math.max(1, Math.ceil(apiTotal / LIMIT)));

        setCurrentPage(apiPage);
        setTotalPages(apiTotalPages);
        setTotalQuestions(apiTotal);

        try {
          const statsRes = await adminService.getPYQStats(mode);
          const statsTotal = Number(statsRes?.data?.total);
          if (Number.isFinite(statsTotal)) {
            setTotalQuestions(statsTotal);
            setTotalPages(Math.max(1, Math.ceil(statsTotal / LIMIT)));
          }
        } catch {
          // keep pagination total from getPYQQuestions if stats endpoint fails
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    loadQuestions(1);
  }, [statusFilter, mode]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setSelectedIds(new Set());
    loadQuestions(page);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    console.log(`[PYQ Admin] Upload requested: mode=${mode}, file=${file.name}, size=${file.size}`);
    setUploading(true);
    setUploadMsg('Uploading PDF...');

    try {
      const res = await adminService.uploadPYQ(file, mode);
      console.log('[PYQ Admin] Upload API response:', res);
      if (res?.status !== 'success' || !res?.data?.uploadId) {
        console.error('[PYQ Admin] Upload API returned error payload:', res);
        throw new Error(res?.message || 'Upload failed');
      }

      setUploadMsg('PDF uploaded. Parsing questions in background...');
      const upload = await waitForUploadToFinish(res.data.uploadId);

      if (!upload) {
        setUploadMsg('Parsing is taking longer than expected. Please refresh in a minute.');
        console.warn('[PYQ Admin] Parsing not completed within polling window.');
        loadQuestions(1);
      } else {
        const extractedCount = Number(upload.totalExtracted || 0);
        console.log(`[PYQ Admin] Final extracted count=${extractedCount}`, upload);
        setUploadMsg(`Parsed ${extractedCount} question${extractedCount === 1 ? '' : 's'} successfully.`);
        loadQuestions(1);
      }
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      console.error('[PYQ Admin] Upload/parsing flow failed:', err);
      setUploadMsg(`Error: ${err.message}`);
    } finally {
      console.log('[PYQ Admin] Upload flow finished');
      setUploading(false);
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await adminService.bulkApprovePYQ(Array.from(selectedIds), status, mode);
      setSelectedIds(new Set());
      loadQuestions();
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const startEdit = (q: PYQQuestion) => {
    setEditingId(q.id);
    setEditData({ questionText: q.questionText, subject: q.subject, topic: q.topic, difficulty: q.difficulty });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await adminService.updatePYQQuestion(editingId, editData, mode);
      setEditingId(null);
      loadQuestions();
    } catch {}
  };

  const statusColor: Record<string, string> = {
    draft: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
  };

  return (
    <div>
      <h1
        className="font-inter font-bold text-[#111827] mb-[clamp(1.5rem,2vw,2rem)]"
        style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}
      >
        PYQ Manager
      </h1>
      <div className="inline-flex rounded-xl bg-white p-1 mb-5" style={{ border: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={() => setMode('prelims')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: mode === 'prelims' ? '#111827' : 'transparent', color: mode === 'prelims' ? '#fff' : '#374151' }}
        >
          Prelims
        </button>
        <button
          type="button"
          onClick={() => setMode('mains')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: mode === 'mains' ? '#111827' : 'transparent', color: mode === 'mains' ? '#fff' : '#374151' }}
        >
          Mains
        </button>
      </div>

      {/* Upload Section */}
      <div
        className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)] mb-[clamp(1.5rem,2vw,2rem)]"
        style={{ border: '1px solid #E5E7EB' }}
      >
        <h2 className="font-inter font-semibold text-[#111827] mb-4" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
          Upload {mode === 'prelims' ? 'Prelims' : 'Mains'} PYQ PDF
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-[#6B7280] mb-1 font-inter">PDF File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="block text-sm text-[#374151] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#EFF6FF] file:text-[#1D4ED8] file:font-medium file:cursor-pointer"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm disabled:opacity-50"
            style={{ background: '#6366F1' }}
          >
            {uploading ? 'Processing...' : 'Upload & Parse'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#9CA3AF] font-inter">
          {mode === 'prelims'
            ? 'Prelims PDFs are parsed into objective MCQs automatically.'
            : 'Mains PDFs are parsed into descriptive questions automatically.'}
        </p>
        {uploadMsg && (
          <p className="mt-3 text-sm font-inter" style={{ color: uploadMsg.startsWith('Error') ? '#EF4444' : '#10B981' }}>
            {uploadMsg}
          </p>
        )}
      </div>

      {/* Questions List */}
      <div
        className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]"
        style={{ border: '1px solid #E5E7EB' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-inter font-semibold text-[#111827]" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
            Questions ({totalQuestions})
            <span className="text-sm font-normal text-[#9CA3AF] ml-2">
              Page {currentPage} of {totalPages}
            </span>
          </h2>
          <div className="flex gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction('approved')}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ background: '#10B981' }}
                >
                  Approve ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleBulkAction('rejected')}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ background: '#EF4444' }}
                >
                  Reject ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-[#6B7280] text-sm font-inter py-8 text-center">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="text-[#6B7280] text-sm font-inter py-8 text-center">
            No questions found. Upload a PYQ PDF to get started.
          </p>
        ) : (
          <div>
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === questions.length && questions.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded"
                />
                Select All
              </label>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: '#FAFAFA',
                    borderLeft: `4px solid ${statusColor[q.status] || '#9CA3AF'}`,
                  }}
                >
                  {editingId === q.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editData.questionText || ''}
                        onChange={(e) => setEditData({ ...editData, questionText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <input
                          value={editData.subject || ''}
                          onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                          placeholder="Subject"
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1"
                        />
                        <input
                          value={editData.topic || ''}
                          onChange={(e) => setEditData({ ...editData, topic: e.target.value })}
                          placeholder="Topic"
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1"
                        />
                        <select
                          value={editData.difficulty || ''}
                          onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-4 py-1.5 rounded-lg text-white text-sm" style={{ background: '#10B981' }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg text-sm border border-gray-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="w-4 h-4 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-[#6B7280]">{q.year} - {q.paper}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: `${statusColor[q.status] || '#9CA3AF'}20`,
                              color: statusColor[q.status] || '#9CA3AF',
                            }}
                          >
                            {q.status}
                          </span>
                          {q.subject && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">{q.subject}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#374151] leading-relaxed">{q.questionText}</p>
                        {mode === 'prelims' && q.options && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {(Array.isArray(q.options) ? q.options : []).map((opt: any) => (
                              <span
                                key={opt.id || opt.label}
                                className={`text-xs px-2 py-1 rounded ${
                                  (opt.id || opt.label) === q.correctOption ? 'bg-green-50 text-green-700 font-medium' : 'text-[#6B7280]'
                                }`}
                              >
                                ({opt.id || opt.label}) {opt.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(q)}
                        className="text-xs text-[#6366F1] hover:underline flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                <p className="text-sm text-[#6B7280] font-inter">
                  Showing {(currentPage - 1) * LIMIT + 1}-{Math.min(currentPage * LIMIT, totalQuestions)} of {totalQuestions}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-inter disabled:opacity-30 hover:bg-gray-100 transition-colors"
                  >
                    First
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-inter disabled:opacity-30 hover:bg-gray-100 transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#9CA3AF]">{p}</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className="w-9 h-9 rounded-lg text-sm font-inter font-medium transition-colors"
                          style={{
                            background: p === currentPage ? '#6366F1' : 'transparent',
                            color: p === currentPage ? '#FFF' : '#374151',
                          }}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-inter disabled:opacity-30 hover:bg-gray-100 transition-colors"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-inter disabled:opacity-30 hover:bg-gray-100 transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
