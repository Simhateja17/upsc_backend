import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

type Ctx = { params: Promise<{ seriesId: string }> | { seriesId: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const { seriesId } = await Promise.resolve(ctx.params);
  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  try {
    const tests = await repo.listTests(admin, seriesId);
    const out = [];
    for (const t of tests) {
      const qs = await repo.listQuestions(admin, t.id);
      out.push({
        id: t.id,
        title: t.title,
        sortOrder: t.sort_order,
        pdfUrl: t.pdf_url,
        pdfPath: t.pdf_path,
        extractedText: t.extracted_text,
        timeLimitMinutes: t.time_limit_minutes,
        videoSolutionUrl: t.video_solution_url,
        questionCount: qs.length,
      });
    }
    return NextResponse.json({ status: 'success', data: out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  const { seriesId } = await Promise.resolve(ctx.params);
  try {
    const body = await req.json();
    const existing = await repo.listTests(admin, seriesId);
    const sortOrder = body.sortOrder ?? existing.length;
    const row = await repo.insertTest(admin, {
      series_id: seriesId,
      title: body.title ?? 'Untitled test',
      sort_order: sortOrder,
    });
    return NextResponse.json({
      status: 'success',
      data: {
        id: row.id,
        title: row.title,
        sortOrder: row.sort_order,
        pdfUrl: row.pdf_url,
        pdfPath: row.pdf_path,
        timeLimitMinutes: row.time_limit_minutes,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
