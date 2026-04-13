import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as repo from '@/lib/test-series/repo';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { status: 'success', data: { activeSeries: 0, totalStudents: 0, testsTaken: 0, successRate: 0 } },
      { status: 200 }
    );
  }

  try {
    const published = await repo.listSeriesRows(admin, { publishedOnly: true });
    const { count: enrCount } = await admin
      .from('test_series_enrollments')
      .select('*', { count: 'exact', head: true });
    const { count: attCount } = await admin
      .from('test_series_attempts')
      .select('*', { count: 'exact', head: true });
    const { data: attempts } = await admin.from('test_series_attempts').select('score, total');

    let successRate = 0;
    if (attempts?.length) {
      const ratios = attempts
        .filter((a: { total: number | null }) => a.total && a.total > 0)
        .map((a: { score: number | null; total: number | null }) => ((a.score ?? 0) / (a.total ?? 1)) * 100);
      if (ratios.length) {
        successRate = Math.round(ratios.reduce((s, x) => s + x, 0) / ratios.length);
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        activeSeries: published.length,
        totalStudents: enrCount ?? 0,
        testsTaken: attCount ?? 0,
        successRate,
      },
    });
  } catch {
    return NextResponse.json({
      status: 'success',
      data: { activeSeries: 0, totalStudents: 0, testsTaken: 0, successRate: 0 },
    });
  }
}
