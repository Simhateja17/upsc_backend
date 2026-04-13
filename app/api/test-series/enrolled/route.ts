import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser } from '@/lib/test-series/auth';
import { mapSeriesToCard } from '@/lib/test-series/mappers';
import * as repo from '@/lib/test-series/repo';

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'success', data: [] });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const enrollments = await repo.listEnrollmentsForUser(admin, user.id);
    const testCounts = await repo.countTestsPerSeries(admin);
    const enrollCounts = await repo.countEnrollmentsPerSeries(admin);
    const out: {
      enrollmentId: string;
      testsCompleted: number;
      progress: string;
      series: ReturnType<typeof mapSeriesToCard>;
    }[] = [];

    for (const e of enrollments) {
      const series = await repo.getSeriesRow(admin, e.series_id);
      if (!series || !series.published) continue;
      const tests = await repo.listTests(admin, e.series_id);
      let completed = 0;
      for (const t of tests) {
        const a = await repo.getAttempt(admin, user.id, t.id);
        if (a?.score != null) completed++;
      }
      out.push({
        enrollmentId: e.series_id,
        testsCompleted: completed,
        progress: tests.length ? `${completed}/${tests.length} tests` : '0/0 tests',
        series: mapSeriesToCard(series, {
          testCount: tests.length,
          enrollmentCount: enrollCounts[series.id],
        }),
      });
    }

    return NextResponse.json({ status: 'success', data: out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
