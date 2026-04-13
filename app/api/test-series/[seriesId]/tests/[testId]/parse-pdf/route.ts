import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBearerFromRequest, getBearerUser, isAdminUser } from '@/lib/test-series/auth';
import * as repo from '@/lib/test-series/repo';

export const runtime = 'nodejs';
export const maxDuration = 120; // allow up to 2 min for large PDFs

type Ctx = { params: Promise<{ seriesId: string; testId: string }> | { seriesId: string; testId: string } };

// ── Azure OpenAI client (lazy singleton) ────────────────────────────
let _azure: AzureOpenAI | null | undefined;
function getAzure(): AzureOpenAI | null {
  if (_azure !== undefined) return _azure;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';
  if (!endpoint || !apiKey) { _azure = null; return null; }
  _azure = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  return _azure;
}
function getDeployment() {
  return process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o';
}

// ── Question boundary regex (same as PYQ parser) ────────────────────
const QUESTION_BOUNDARY_RE = /^\s*(?:\d+[\.\)]|Q[\.\s]?\d+[\.\)]?)\s+/m;

// ── Chunking (mirrors pyqParser.ts) ─────────────────────────────────
function splitIntoChunks(text: string, chunkSize = 3000): string[] {
  const re = new RegExp(QUESTION_BOUNDARY_RE.source, 'gm');
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) matches.push(m);

  if (matches.length === 0) return paragraphSplit(text, chunkSize);

  const units: string[] = [];
  const preamble = text.slice(0, matches[0].index).trim();
  if (preamble) paragraphSplit(preamble, chunkSize).forEach((c) => units.push(c));
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    units.push(text.slice(start, end).trim());
  }

  const chunks: string[] = [];
  let cur = '';
  for (const u of units) {
    if (u.length > chunkSize) {
      if (cur) { chunks.push(cur.trim()); cur = ''; }
      paragraphSplit(u, chunkSize).forEach((c) => chunks.push(c));
      continue;
    }
    if (cur.length + u.length + 2 > chunkSize && cur) {
      chunks.push(cur.trim());
      cur = '';
    }
    cur += (cur ? '\n\n' : '') + u;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function paragraphSplit(text: string, size: number): string[] {
  const chunks: string[] = [];
  let cur = '';
  for (const p of text.split(/\n\n+/)) {
    if (cur.length + p.length > size && cur) { chunks.push(cur.trim()); cur = ''; }
    cur += p + '\n\n';
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// ── AI parse a single chunk ─────────────────────────────────────────
interface ParsedQ {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

const SYSTEM = `You are a UPSC exam question extractor. Extract all MCQ questions from the given text.
For each question, return a JSON array of objects. If no questions are found, return an empty array.
Only return valid JSON, no other text.`;

async function parseChunk(
  azure: AzureOpenAI,
  deployment: string,
  chunk: string,
  idx: number,
  total: number
): Promise<ParsedQ[]> {
  console.log(`[parse-pdf] Chunk ${idx + 1}/${total} (${chunk.length} chars)`);

  const prompt = `Extract all MCQ questions from this exam paper text. For each question return:
- prompt: the full question text
- options: array of exactly 4 option strings (the text of each option, without A/B/C/D prefix)
- correct_index: index of the correct option (0-3). If determinable from the text, set it. If an answer key is provided elsewhere, use it. Otherwise make your best judgment.
- explanation: a clear, concise explanation (2-4 sentences) of why the correct answer is correct. Generate your own explanation by analyzing the question — do NOT copy from the PDF.

Text to parse:
${chunk}

Return a JSON array of extracted questions.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await azure.chat.completions.create(
        {
          model: deployment,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: prompt },
          ],
          max_completion_tokens: 4096,
          temperature: 0.1,
        },
        { signal: AbortSignal.timeout(45000) }
      );

      const raw = res.choices[0]?.message?.content ?? '';
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      const arr = JSON.parse(jsonMatch[1]?.trim() || raw.trim());
      const questions = Array.isArray(arr) ? arr : [];
      console.log(`[parse-pdf] Chunk ${idx + 1}: ${questions.length} questions`);

      return questions.map((q: any) => ({
        prompt: String(q.prompt ?? q.questionText ?? ''),
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => (typeof o === 'string' ? o : o.text ?? String(o)))
          : [],
        correct_index: Number(q.correct_index ?? q.correctIndex ?? q.correctOption ?? 0),
        explanation: String(q.explanation ?? ''),
      }));
    } catch (err) {
      if (attempt === 3) {
        console.error(`[parse-pdf] Chunk ${idx + 1} failed after 3 attempts:`, err);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  return [];
}

// ── Route handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 503 });
  }

  const azure = getAzure();
  if (!azure) {
    return NextResponse.json(
      { status: 'error', message: 'Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  const token = getBearerFromRequest(req);
  const user = token ? await getBearerUser(token) : null;
  if (!isAdminUser(user)) {
    return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
  }

  const { seriesId, testId } = await Promise.resolve(ctx.params);
  let body: { autoSave?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  try {
    const t = await repo.getTestRow(admin, testId);
    if (!t || t.series_id !== seriesId) {
      return NextResponse.json({ status: 'error', message: 'Test not found' }, { status: 404 });
    }

    if (!t.extracted_text?.trim()) {
      return NextResponse.json(
        { status: 'error', message: 'No extracted text. Click "Extract text from PDF" first.' },
        { status: 400 }
      );
    }

    const chunks = splitIntoChunks(t.extracted_text);
    console.log(`[parse-pdf] ${chunks.length} chunks from ${t.extracted_text.length} chars`);

    const deployment = getDeployment();
    const BATCH_SIZE = 3;
    const allQuestions: ParsedQ[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((chunk, j) => parseChunk(azure, deployment, chunk, i + j, chunks.length))
      );
      for (const qs of results) allQuestions.push(...qs);
    }

    // Assign sort_order
    const numbered = allQuestions.map((q, i) => ({ ...q, sort_order: i }));

    if (body.autoSave && numbered.length > 0) {
      await repo.replaceQuestions(
        admin,
        testId,
        numbered.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || null,
          sort_order: q.sort_order,
        }))
      );
      console.log(`[parse-pdf] Auto-saved ${numbered.length} questions for test ${testId}`);
    }

    return NextResponse.json({
      status: 'success',
      data: {
        questions: numbered,
        totalParsed: numbered.length,
        saved: !!body.autoSave,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Parse failed';
    console.error('[parse-pdf] Error:', e);
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
