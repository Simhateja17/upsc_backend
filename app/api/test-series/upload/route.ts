import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 503 });
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') ?? 'pdf');
    const seriesId = String(form.get('seriesId') ?? '');
    const testId = form.get('testId') ? String(form.get('testId')) : '';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ status: 'error', message: 'file required' }, { status: 400 });
    }
    if (!seriesId) {
      return NextResponse.json({ status: 'error', message: 'seriesId required' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const orig = (file as File).name || 'upload';
    const ext = orig.includes('.') ? orig.slice(orig.lastIndexOf('.')) : kind === 'thumbnail' ? '.jpg' : '.pdf';
    const safe = `${randomUUID()}${ext}`;

    let path: string;
    if (kind === 'thumbnail') {
      path = `series/${seriesId}/${safe}`;
    } else {
      path = testId ? `series/${seriesId}/tests/${testId}/${safe}` : `series/${seriesId}/pdfs/${safe}`;
    }

    const contentType = (file as File).type || (kind === 'thumbnail' ? 'image/jpeg' : 'application/pdf');
    const { publicUrl } = await repo.uploadSeriesFile(admin, path, buf, contentType);

    return NextResponse.json({
      status: 'success',
      data: { url: publicUrl, path },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
