import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import { mapSeriesToCard } from '@/lib/test-series/mappers';
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
  const asAdmin = isAdminUser(user);

  try {
    const row = await repo.getSeriesRow(admin, seriesId);
    if (!row) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }
    if (!asAdmin && (!row.published || row.listing_status !== 'open')) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    const tests = await repo.listTests(admin, seriesId);
    const enrollCounts = await repo.countEnrollmentsPerSeries(admin);
    const card = mapSeriesToCard(row, {
      testCount: tests.length,
      enrollmentCount: enrollCounts[row.id],
    });

    const schedule = tests.map((t, idx) => ({
      id: t.id,
      num: idx + 1,
      name: t.title,
      qs: 0,
      time: `${t.time_limit_minutes} min`,
      status: 'open' as string,
      score: null as number | null,
      pdfUrl: t.pdf_url,
      videoSolutionUrl: t.video_solution_url,
    }));

    for (let i = 0; i < tests.length; i++) {
      const qs = await repo.listQuestions(admin, tests[i].id);
      schedule[i].qs = qs.length;
      if (user) {
        const att = await repo.getAttempt(admin, user.id, tests[i].id);
        schedule[i].score = att?.score ?? null;
        schedule[i].status = att?.score != null ? ('done' as const) : ('open' as const);
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        series: card,
        tests: tests.map((t) => ({
          id: t.id,
          title: t.title,
          sortOrder: t.sort_order,
          pdfUrl: t.pdf_url,
          pdfPath: t.pdf_path,
          extractedText: t.extracted_text,
          timeLimitMinutes: t.time_limit_minutes,
          videoSolutionUrl: t.video_solution_url,
        })),
        schedule,
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

  const { seriesId } = await Promise.resolve(ctx.params);
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.title != null) patch.title = body.title;
    if (body.description != null) patch.description = body.description;
    if (body.thumbnailUrl != null) patch.thumbnail_url = body.thumbnailUrl;
    if (body.thumbnail_url != null) patch.thumbnail_url = body.thumbnail_url;
    if (body.categoryLabel != null) patch.category_label = body.categoryLabel;
    if (body.category_label != null) patch.category_label = body.category_label;
    if (body.listingStatus != null) patch.listing_status = body.listingStatus;
    if (body.listing_status != null) patch.listing_status = body.listing_status;
    if (body.published != null) patch.published = body.published;
    if (body.durationLabel != null) patch.duration_label = body.durationLabel;
    if (body.duration_label != null) patch.duration_label = body.duration_label;
    if (body.enrolledDisplay != null) patch.enrolled_display = body.enrolledDisplay;
    if (body.enrolledDisplay != null) patch.enrolled_display = body.enrolledDisplay;
    if (body.enrolled_display != null) patch.enrolled_display = body.enrolled_display;
    if (body.rating != null) patch.rating = body.rating;
    if (body.price != null) patch.price_inr = body.price;
    if (body.price_inr != null) patch.price_inr = body.price_inr;
    if (body.compareAtPrice != null) patch.compare_at_price_inr = body.compareAtPrice;
    if (body.compare_at_price_inr !== undefined) patch.compare_at_price_inr = body.compare_at_price_inr;
    if (body.discountPercent != null) patch.discount_percent = body.discountPercent;
    if (body.discount_percent !== undefined) patch.discount_percent = body.discount_percent;
    if (body.examMode != null) patch.exam_mode = body.examMode;
    if (body.exam_mode != null) patch.exam_mode = body.exam_mode;
    if (body.subject !== undefined) patch.subject = body.subject;
    if (body.difficulty != null) patch.difficulty = body.difficulty;
    if (body.questionsPerTest != null) patch.questions_per_test = body.questionsPerTest;
    if (body.questions_per_test != null) patch.questions_per_test = body.questions_per_test;
    if (body.sortOrder != null) patch.sort_order = body.sortOrder;
    if (body.sort_order != null) patch.sort_order = body.sort_order;
    if (body.features != null) patch.features = body.features;
    // Detail page CMS fields
    if (body.tagline !== undefined) patch.tagline = body.tagline;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.gradient !== undefined) patch.gradient = body.gradient;
    if (body.whyEnroll !== undefined) patch.why_enroll = body.whyEnroll;
    if (body.why_enroll !== undefined) patch.why_enroll = body.why_enroll;
    if (body.achievements !== undefined) patch.achievements = body.achievements;
    if (body.syllabus !== undefined) patch.syllabus = body.syllabus;
    if (body.faqs !== undefined) patch.faqs = body.faqs;
    if (body.includes !== undefined) patch.includes = body.includes;

    const row = await repo.updateSeries(admin, seriesId, patch as never);
    const testCounts = await repo.countTestsPerSeries(admin);
    const enrollCounts = await repo.countEnrollmentsPerSeries(admin);
    const data = mapSeriesToCard(row, {
      testCount: testCounts[row.id] ?? 0,
      enrollmentCount: enrollCounts[row.id],
    });
    return NextResponse.json({ status: 'success', data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Update failed';
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

  const { seriesId } = await Promise.resolve(ctx.params);
  try {
    await repo.deleteSeries(admin, seriesId);
    return NextResponse.json({ status: 'success', data: { id: seriesId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
