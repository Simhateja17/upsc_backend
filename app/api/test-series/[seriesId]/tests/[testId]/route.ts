import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

type Ctx = { params: Promise<{ seriesId: string; testId: string }> | { seriesId: string; testId: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }
    const qs = await repo.listQuestions(admin, testId);
    return NextResponse.json({
      status: 'success',
      data: {
        id: t.id,
        title: t.title,
        sortOrder: t.sort_order,
        pdfUrl: t.pdf_url,
        pdfPath: t.pdf_path,
        extractedText: t.extracted_text,
        timeLimitMinutes: t.time_limit_minutes,
        videoSolutionUrl: t.video_solution_url,
        questions: qs.map((q) => ({
          id: q.id,
          sortOrder: q.sort_order,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        })),
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
    const patch: Record<string, unknown> = {};
    if (body.title != null) patch.title = body.title;
    if (body.sortOrder != null) patch.sort_order = body.sortOrder;
    if (body.timeLimitMinutes != null) patch.time_limit_minutes = body.timeLimitMinutes;
    if (body.pdfUrl != null) patch.pdf_url = body.pdfUrl;
    if (body.pdfPath != null) patch.pdf_path = body.pdfPath;
    if (body.extractedText != null) patch.extracted_text = body.extractedText;
    if (body.videoSolutionUrl !== undefined) patch.video_solution_url = body.videoSolutionUrl;

    const row = await repo.updateTest(admin, testId, patch as never);
    return NextResponse.json({
      status: 'success',
      data: {
        id: row.id,
        title: row.title,
        sortOrder: row.sort_order,
        pdfUrl: row.pdf_url,
        pdfPath: row.pdf_path,
        extractedText: row.extracted_text,
        timeLimitMinutes: row.time_limit_minutes,
        videoSolutionUrl: row.video_solution_url,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const token = getBearerFromRequest(_req);
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
    await repo.deleteTest(admin, testId);
    return NextResponse.json({ status: 'success', data: { id: testId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
