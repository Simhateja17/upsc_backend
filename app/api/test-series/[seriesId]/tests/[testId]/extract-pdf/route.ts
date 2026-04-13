import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ seriesId: string; testId: string }> | { seriesId: string; testId: string } };

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
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

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
    }

    let buffer: Buffer | null = null;
    if (t.pdf_path) {
      buffer = await repo.downloadSeriesFile(admin, t.pdf_path);
    }

    if (!buffer && t.pdf_url) {
      const r = await fetch(t.pdf_url);
      if (r.ok) {
        buffer = Buffer.from(await r.arrayBuffer());
      }
    }

    if (!buffer?.length) {
      return NextResponse.json({ status: 'error', message: 'No PDF on file' }, { status: 400 });
    }

    const text = await extractTextFromPdfBuffer(buffer);

    await repo.updateTest(admin, testId, { extracted_text: text });

    return NextResponse.json({
      status: 'success',
      data: {
        charCount: text.length,
        preview: text.slice(0, 2000),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Extract failed';
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
