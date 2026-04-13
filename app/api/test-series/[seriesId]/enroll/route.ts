import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

type Ctx = { params: Promise<{ seriesId: string }> | { seriesId: string } };

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

  const { seriesId } = await Promise.resolve(ctx.params);
  try {
    const row = await repo.getSeriesRow(admin, seriesId);
    if (!row || !row.published || row.listing_status !== 'open') {
      return NextResponse.json({ status: 'error', message: 'Series not available' }, { status: 404 });
    }
    await repo.ensureEnrollment(admin, user.id, seriesId);
    return NextResponse.json({ status: 'success', data: { seriesId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Enroll failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
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
  try {
    await repo.removeEnrollment(admin, user.id, seriesId);
    return NextResponse.json({ status: 'success', data: { seriesId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unenroll failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
