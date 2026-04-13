import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import { parseOptions } from '@/lib/test-series/mappers';
import * as repo from '@/lib/test-series/repo';

type Ctx = { params: Promise<{ seriesId: string; testId: string }> | { seriesId: string; testId: string } };

/** Student attempt payload: no correct answers in response */
function stripCorrect(qs: { id: string; sort_order: number; prompt: string; options: unknown }[]) {
  return qs.map((q, i) => ({
    id: q.id,
    index: i,
    text: q.prompt,
    opts: parseOptions(q.options),
    time: 60,
  }));
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    const asAdmin = isAdminUser(user);
    const enrolled = await repo.isUserEnrolled(admin, user.id, seriesId);
    if (!asAdmin && !enrolled) {
      return NextResponse.json({ status: 'error', message: 'Enroll to access this test' }, { status: 403 });
    }

    const series = await repo.getSeriesRow(admin, seriesId);
    if (!series || (!asAdmin && (!series.published || series.listing_status !== 'open'))) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    const qs = await repo.listQuestions(admin, testId);
    if (!qs.length) {
      return NextResponse.json({ status: 'error', message: 'No questions configured for this test' }, { status: 404 });
    }

    const data = stripCorrect(qs);
    return NextResponse.json({
      status: 'success',
      data: {
        testId,
        seriesId,
        title: t.title,
        timeLimitMinutes: t.time_limit_minutes,
        questions: data,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const rawList = body.questions ?? body;
    if (!Array.isArray(rawList)) {
      return NextResponse.json({ status: 'error', message: 'Expected questions array' }, { status: 400 });
    }

    const questions = rawList.map((q: Record<string, unknown>, i: number) => ({
      prompt: String(q.prompt ?? q.text ?? ''),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct_index: Number(q.correctIndex ?? q.correct_index ?? 0),
      explanation: (q.explanation as string) ?? null,
      sort_order: Number(q.sortOrder ?? q.sort_order ?? i),
    }));

    await repo.replaceQuestions(admin, testId, questions);
    return NextResponse.json({ status: 'success', data: { count: questions.length } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
