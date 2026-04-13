import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import { mapSeriesToCard } from '@/lib/test-series/mappers';
import * as repo from '@/lib/test-series/repo';

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { status: 'error', message: 'Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and run supabase/test-series-schema.sql.' },
      { status: 503 }
    );
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  const asAdmin = isAdminUser(user);

  try {
    const rows = await repo.listSeriesRows(admin, { publishedOnly: !asAdmin });
    const testCounts = await repo.countTestsPerSeries(admin);
    const enrollCounts = await repo.countEnrollmentsPerSeries(admin);
    const data = rows.map((r) =>
      mapSeriesToCard(r, {
        testCount: testCounts[r.id] ?? 0,
        enrollmentCount: enrollCounts[r.id],
      })
    );
    return NextResponse.json({ status: 'success', data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Query failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Supabase admin not configured.' }, { status: 503 });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const row = await repo.insertSeries(admin, {
      title: body.title,
      description: body.description ?? '',
      thumbnail_url: body.thumbnailUrl ?? body.thumbnail_url ?? null,
      category_label: body.categoryLabel ?? body.category_label ?? 'GENERAL',
      listing_status: body.listingStatus ?? body.listing_status ?? 'open',
      published: body.published ?? false,
      duration_label: body.durationLabel ?? body.duration_label ?? 'Ongoing',
      enrolled_display: body.enrolledDisplay ?? body.enrolled_display ?? 0,
      rating: body.rating ?? 4.5,
      price_inr: body.price ?? body.price_inr ?? 0,
      compare_at_price_inr: body.compareAtPrice ?? body.compare_at_price_inr ?? null,
      discount_percent: body.discountPercent ?? body.discount_percent ?? null,
      exam_mode: body.examMode ?? body.exam_mode ?? 'prelims',
      subject: body.subject ?? null,
      difficulty: body.difficulty ?? 'medium',
      questions_per_test: body.questionsPerTest ?? body.questions_per_test ?? 20,
      sort_order: body.sortOrder ?? body.sort_order ?? 0,
      features: body.features ?? { analytics: true, aiAnalysis: false, videoSolutions: false },
      // Detail page CMS fields
      tagline: body.tagline ?? null,
      tags: body.tags ?? [],
      gradient: body.gradient ?? null,
      why_enroll: body.whyEnroll ?? body.why_enroll ?? [],
      achievements: body.achievements ?? [],
      syllabus: body.syllabus ?? [],
      faqs: body.faqs ?? [],
      includes: body.includes ?? [],
    });
    const testCounts = await repo.countTestsPerSeries(admin);
    const enrollCounts = await repo.countEnrollmentsPerSeries(admin);
    const data = mapSeriesToCard(row, {
      testCount: testCounts[row.id] ?? 0,
      enrollmentCount: enrollCounts[row.id],
    });
    return NextResponse.json({ status: 'success', data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Create failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
