import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbQuestion, DbSeries, DbTest } from './mappers';

const BUCKET = 'test-series-files';

export async function countTestsPerSeries(admin: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await admin.from('test_series_tests').select('series_id');
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const sid = (row as { series_id: string }).series_id;
    map[sid] = (map[sid] ?? 0) + 1;
  }
  return map;
}

export async function countEnrollmentsPerSeries(admin: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await admin.from('test_series_enrollments').select('series_id');
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const sid = (row as { series_id: string }).series_id;
    map[sid] = (map[sid] ?? 0) + 1;
  }
  return map;
}

export async function listSeriesRows(
  admin: SupabaseClient,
  opts: { publishedOnly: boolean }
): Promise<DbSeries[]> {
  let q = admin.from('test_series').select('*').order('sort_order', { ascending: true });
  if (opts.publishedOnly) q = q.eq('published', true).eq('listing_status', 'open');
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbSeries[];
}

export async function getSeriesRow(admin: SupabaseClient, id: string): Promise<DbSeries | null> {
  const { data, error } = await admin.from('test_series').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as DbSeries) ?? null;
}

export async function insertSeries(admin: SupabaseClient, payload: Record<string, unknown>): Promise<DbSeries> {
  const { data, error } = await admin.from('test_series').insert(payload).select('*').single();
  if (error) throw error;
  return data as DbSeries;
}

export async function updateSeries(admin: SupabaseClient, id: string, patch: Partial<DbSeries>): Promise<DbSeries> {
  const { data, error } = await admin
    .from('test_series')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DbSeries;
}

export async function deleteSeries(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin.from('test_series').delete().eq('id', id);
  if (error) throw error;
}

export async function listTests(admin: SupabaseClient, seriesId: string): Promise<DbTest[]> {
  const { data, error } = await admin
    .from('test_series_tests')
    .select('*')
    .eq('series_id', seriesId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbTest[];
}

export async function insertTest(
  admin: SupabaseClient,
  payload: { series_id: string; title: string; sort_order?: number }
): Promise<DbTest> {
  const { data, error } = await admin.from('test_series_tests').insert(payload).select('*').single();
  if (error) throw error;
  return data as DbTest;
}

export async function updateTest(admin: SupabaseClient, id: string, patch: Partial<DbTest>): Promise<DbTest> {
  const { data, error } = await admin
    .from('test_series_tests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DbTest;
}

export async function deleteTest(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin.from('test_series_tests').delete().eq('id', id);
  if (error) throw error;
}

export async function listQuestions(admin: SupabaseClient, testId: string): Promise<DbQuestion[]> {
  const { data, error } = await admin
    .from('test_series_questions')
    .select('*')
    .eq('test_id', testId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbQuestion[];
}

export async function replaceQuestions(
  admin: SupabaseClient,
  testId: string,
  questions: {
    prompt: string;
    options: string[];
    correct_index: number;
    explanation?: string | null;
    sort_order: number;
  }[]
): Promise<void> {
  const { error: delErr } = await admin.from('test_series_questions').delete().eq('test_id', testId);
  if (delErr) throw delErr;
  if (questions.length === 0) return;
  const rows = questions.map((q) => ({
    test_id: testId,
    prompt: q.prompt,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation ?? null,
    sort_order: q.sort_order,
  }));
  const { error } = await admin.from('test_series_questions').insert(rows);
  if (error) throw error;
}

export async function getTestRow(admin: SupabaseClient, testId: string): Promise<DbTest | null> {
  const { data, error } = await admin.from('test_series_tests').select('*').eq('id', testId).maybeSingle();
  if (error) throw error;
  return (data as DbTest) ?? null;
}

export async function ensureEnrollment(admin: SupabaseClient, userId: string, seriesId: string): Promise<void> {
  const { error } = await admin.from('test_series_enrollments').upsert(
    { user_id: userId, series_id: seriesId },
    { onConflict: 'user_id,series_id' }
  );
  if (error) throw error;
}

export async function removeEnrollment(admin: SupabaseClient, userId: string, seriesId: string): Promise<void> {
  const { error } = await admin
    .from('test_series_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('series_id', seriesId);
  if (error) throw error;
}

export async function isUserEnrolled(
  admin: SupabaseClient,
  userId: string,
  seriesId: string
): Promise<boolean> {
  const { data } = await admin
    .from('test_series_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .maybeSingle();
  return !!data;
}

export async function listEnrollmentsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<{ series_id: string }[]> {
  const { data, error } = await admin
    .from('test_series_enrollments')
    .select('series_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as { series_id: string }[];
}

export async function upsertAttempt(
  admin: SupabaseClient,
  payload: {
    user_id: string;
    test_id: string;
    answers: Record<string, number>;
    score: number;
    total: number;
    time_taken_seconds: number;
  }
): Promise<void> {
  const { error } = await admin.from('test_series_attempts').upsert(
    {
      user_id: payload.user_id,
      test_id: payload.test_id,
      answers: payload.answers,
      score: payload.score,
      total: payload.total,
      time_taken_seconds: payload.time_taken_seconds,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,test_id' }
  );
  if (error) throw error;
}

export async function getAttempt(
  admin: SupabaseClient,
  userId: string,
  testId: string
): Promise<{ answers: Record<string, number>; score: number | null; total: number | null } | null> {
  const { data, error } = await admin
    .from('test_series_attempts')
    .select('answers, score, total')
    .eq('user_id', userId)
    .eq('test_id', testId)
    .maybeSingle();
  if (error) throw error;
  return data as { answers: Record<string, number>; score: number | null; total: number | null } | null;
}

export async function uploadSeriesFile(
  admin: SupabaseClient,
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<{ publicUrl: string; path: string }> {
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function downloadSeriesFile(admin: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export { BUCKET };
