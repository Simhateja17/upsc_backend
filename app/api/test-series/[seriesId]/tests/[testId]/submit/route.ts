import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

type Ctx = { params: Promise<{ seriesId: string; testId: string }> | { seriesId: string; testId: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    if (!isAdminUser(user)) {
      const enrolled = await repo.isUserEnrolled(admin, user.id, seriesId);
      if (!enrolled) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const answersRaw = body.answers as Record<string, number> | undefined;
    const timeTaken = Number(body.timeTaken ?? body.time_taken_seconds ?? 0);
    if (!answersRaw || typeof answersRaw !== 'object') {
      return NextResponse.json({ status: 'error', message: 'answers required' }, { status: 400 });
    }

    const qs = await repo.listQuestions(admin, testId);
    if (!qs.length) {
      return NextResponse.json({ status: 'error', message: 'No questions' }, { status: 400 });
    }

    let score = 0;
    const normalized: Record<string, number> = {};
    qs.forEach((q, i) => {
      const key = String(i);
      const picked = answersRaw[key] ?? answersRaw[q.id];
      const idx = typeof picked === 'number' ? picked : parseInt(String(picked), 10);
      normalized[key] = idx;
      if (idx === q.correct_index) score++;
    });

    await repo.upsertAttempt(admin, {
      user_id: user.id,
      test_id: testId,
      answers: normalized,
      score,
      total: qs.length,
      time_taken_seconds: timeTaken,
    });

    const results = qs.map((q, i) => ({
      index: i,
      correctIndex: q.correct_index,
      chosen: normalized[String(i)],
      explanation: q.explanation,
    }));

    return NextResponse.json({
      status: 'success',
      data: {
        score,
        total: qs.length,
        percentage: Math.round((score / qs.length) * 1000) / 10,
        results,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
