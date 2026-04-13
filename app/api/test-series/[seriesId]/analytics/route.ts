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

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const { seriesId } = await Promise.resolve(ctx.params);
  const asAdmin = isAdminUser(user);

  try {
    const tests = await repo.listTests(admin, seriesId);
    if (!asAdmin) {
      const enrolled = await repo.isUserEnrolled(admin, user.id, seriesId);
      if (!enrolled) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const perTest: { testId: string; title: string; attempts: number; avgScore: number | null }[] = [];

    for (const t of tests) {
      const { data: attempts, error } = await admin
        .from('test_series_attempts')
        .select('score, total')
        .eq('test_id', t.id);
      if (error) throw error;
      const list = attempts ?? [];
      const avg =
        list.length && list.every((a: { total: number | null }) => a.total)
          ? Math.round(
              (list as { score: number | null; total: number }[]).reduce(
                (s, a) => s + ((a.score ?? 0) / (a.total || 1)) * 100,
                0
              ) / list.length
            )
          : null;
      perTest.push({
        testId: t.id,
        title: t.title,
        attempts: list.length,
        avgScore: avg,
      });
    }

    const myAttempts: { testId: string; score: number | null; total: number | null }[] = [];
    if (!asAdmin) {
      for (const t of tests) {
        const a = await repo.getAttempt(admin, user.id, t.id);
        myAttempts.push({
          testId: t.id,
          score: a?.score ?? null,
          total: a?.total ?? null,
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        scope: asAdmin ? 'admin' : 'student',
        tests: perTest,
        myAttempts: asAdmin ? undefined : myAttempts,
        aiInsights: null as string | null,
        videoSolutionsIndex: tests
          .filter((t) => t.video_solution_url)
          .map((t) => ({ testId: t.id, title: t.title, url: t.video_solution_url })),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
