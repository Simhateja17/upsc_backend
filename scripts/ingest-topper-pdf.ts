import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../src/config/database";
import { supabaseAdmin } from "../src/config/supabase";
import { STORAGE_BUCKETS, uploadFile } from "../src/config/storage";
import { extractDocumentTextWithGoogleVision } from "../src/services/googleVisionOcr.service";
import { structureTopperPage } from "../src/services/topperPageStructurer";
import { assembleTopperAnswers } from "../src/services/topperAnswerAssembler";
import { embedText } from "../src/services/embedding.service";
import { extractDirective } from "../src/services/topperRag.service";

const PAPER_GROUPS = new Set(["Essay", "GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"]);

function log(stage: string, message: string, meta?: Record<string, unknown>) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[topper:${stage}] ${new Date().toISOString()} ${message}${suffix}`);
}

function memorySnapshot() {
  const memory = process.memoryUsage();
  return {
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    externalMb: Math.round(memory.external / 1024 / 1024),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(label: string, operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number; meta?: Record<string, unknown> } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 120000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (attempt > 1) {
        log("retry", `Retrying ${label}`, { attempt, attempts, ...(options.meta || {}) });
      }
      return await withTimeout(label, operation, timeoutMs);
    } catch (error) {
      lastError = error;
      const finalAttempt = attempt === attempts;
      log(finalAttempt ? "retry:failed" : "retry:wait", `${label} failed`, {
        attempt,
        attempts,
        timeoutMs,
        error: errorMessage(error),
        ...(options.meta || {}),
      });
      if (!finalAttempt) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError;
}

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/ingest-topper-pdf.ts <pdf-path> <paper-group> [max-pages]\n" +
      'Example: npx tsx scripts/ingest-topper-pdf.ts "../Mains Answer Writing - Teja/GS Paper 1/file.pdf" "GS Paper 1" 5'
  );
  process.exit(1);
}

async function removeStorageObjects(bucket: string, paths: string[]) {
  if (!paths.length) return;
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Storage cleanup failed for ${bucket}: ${error.message}`);
}

async function cleanupStaleAttempt(document: {
  id: string;
  fileName: string;
  storagePath: string;
  status: string;
}) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  log("cleanup", `Removing stale ${document.status} attempt for ${document.fileName}`, {
    documentId: document.id,
  });

  const { data: pageObjects, error: listError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.TOPPER_ANSWER_PAGES)
    .list(document.id, { limit: 1000 });
  if (listError) {
    throw new Error(`Storage list failed for ${document.id}: ${listError.message}`);
  }

  await removeStorageObjects(
    STORAGE_BUCKETS.TOPPER_ANSWER_PAGES,
    (pageObjects || []).map((object) => `${document.id}/${object.name}`)
  );
  await removeStorageObjects(STORAGE_BUCKETS.TOPPER_PDFS, [document.storagePath]);

  await prisma.topperDocument.delete({ where: { id: document.id } });
}

function scoreBand(awarded: number | null, maxMarks: number | null): string | null {
  if (awarded == null || !maxMarks) return null;
  const pct = awarded / maxMarks;
  if (pct >= 0.65) return "strong";
  if (pct >= 0.4) return "medium";
  return "weak";
}

async function vectorizeAnswer(answer: {
  id: string;
  questionText: string | null;
  studentAnswerText: string;
  evaluatorNotesJson: unknown;
  answerStructureJson: unknown;
  paperGroup: string;
  subject: string | null;
  topic: string | null;
  directive: string | null;
  maxMarks: number | null;
  awardedMarks: number | null;
  scoreBand: string | null;
  qualityStatus: string;
}) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  if (answer.qualityStatus === "bronze") return;
  if (!answer.questionText?.trim()) return;

  const evaluatorNotes = Array.isArray(answer.evaluatorNotesJson)
    ? answer.evaluatorNotesJson.filter(Boolean).join("\n- ")
    : "";
  const structure =
    answer.answerStructureJson && typeof answer.answerStructureJson === "object"
      ? JSON.stringify(answer.answerStructureJson)
      : "";
  const score =
    answer.awardedMarks != null && answer.maxMarks
      ? `${answer.awardedMarks}/${answer.maxMarks}`
      : "marks unknown";
  const chunkText = [
    `Question:\n${answer.questionText}`,
    `Paper:\n${answer.paperGroup}`,
    answer.subject || answer.topic ? `Subject/topic:\n${answer.subject || "unknown"} / ${answer.topic || "unknown"}` : "",
    answer.directive ? `Directive:\n${answer.directive}` : "",
    `Marks:\n${score}`,
    answer.scoreBand ? `Score band:\n${answer.scoreBand}` : "",
    `Topper answer:\n${answer.studentAnswerText}`,
    evaluatorNotes ? `Evaluator notes:\n- ${evaluatorNotes}` : "",
    structure ? `Structure metadata:\n${structure}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const chunks = [{ type: "full", text: chunkText }].filter((chunk) => chunk.text.trim().length >= 120);

  for (const chunk of chunks) {
    log("embed", `Embedding ${chunk.type} chunk`, {
      answerId: answer.id,
      chars: chunk.text.length,
    });
    const embedding = await withRetry(
      `Azure embedding ${chunk.type}`,
      () => embedText(chunk.text, "RETRIEVAL_DOCUMENT"),
      { timeoutMs: 60000, meta: { answerId: answer.id, chunkType: chunk.type } }
    );
    await withRetry(
      `Supabase embedding insert ${chunk.type}`,
      async () => {
        const { error } = await supabaseAdmin.from("topper_answer_embeddings").insert({
          answer_id: answer.id,
          chunk_type: chunk.type,
          chunk_text: chunk.text,
          metadata: {
            paperGroup: answer.paperGroup,
            subject: answer.subject,
            topic: answer.topic,
            directive: answer.directive,
            maxMarks: answer.maxMarks,
            awardedMarks: answer.awardedMarks,
            scoreBand: answer.scoreBand,
            qualityStatus: answer.qualityStatus,
            chunkSchemaVersion: 2,
          },
          embedding: JSON.stringify(embedding),
        });
        if (error) throw new Error(`Embedding insert failed: ${error.message}`);
      },
      { timeoutMs: 30000, meta: { answerId: answer.id, chunkType: chunk.type } }
    );
  }
}

export async function ingestTopperPdf(params: {
  pdfPath: string;
  paperGroup: string;
  maxPages?: number;
  skipExisting?: boolean;
}) {
  if (!PAPER_GROUPS.has(params.paperGroup)) {
    throw new Error(`Invalid paper group "${params.paperGroup}"`);
  }

  const pdfPath = path.resolve(params.pdfPath);
  const pdfBuffer = await fs.readFile(pdfPath);
  const fileName = path.basename(pdfPath);

  log("pdf:start", `Starting ${fileName}`, {
    paperGroup: params.paperGroup,
    bytes: pdfBuffer.length,
    maxPages: params.maxPages ?? null,
  });

  if (params.skipExisting) {
    const existing = await prisma.topperDocument.findFirst({
      where: {
        fileName,
        paperGroup: params.paperGroup,
        status: "vectorized",
      },
      select: { id: true, totalPages: true },
    });
    if (existing) {
      log("pdf:skip", `Skipping vectorized ${fileName}`, { documentId: existing.id });
      return { documentId: existing.id, pages: existing.totalPages, answers: 0, skipped: true };
    }

    const staleAttempts = await prisma.topperDocument.findMany({
      where: {
        fileName,
        paperGroup: params.paperGroup,
        status: { not: "vectorized" },
      },
      select: { id: true, fileName: true, storagePath: true, status: true },
    });
    for (const stale of staleAttempts) {
      await cleanupStaleAttempt(stale);
    }
  }

  const storagePath = `${params.paperGroup}/${Date.now()}_${fileName}`.replace(/\s+/g, "_");

  log("pdf:upload", `Uploading source PDF ${fileName}`, { storagePath });
  await withRetry(
    "Supabase source PDF upload",
    () => uploadFile(STORAGE_BUCKETS.TOPPER_PDFS, storagePath, pdfBuffer, "application/pdf"),
    { attempts: 4, timeoutMs: 180000, meta: { fileName, storagePath } }
  );

  const document = await prisma.topperDocument.create({
    data: {
      fileName,
      storagePath,
      paperGroup: params.paperGroup,
      sourceName: "Mains Answer Writing - Teja",
      status: "processing",
    },
  });
  log("pdf:document", `Created topper document ${fileName}`, { documentId: document.id });

  let currentPageNo = 0;
  let currentStage = "init";
  try {
    currentStage = "render:init";
    log("render", `Opening PDF renderer ${fileName}`, { documentId: document.id });
    const { pdf } = await import("pdf-to-img");
    const renderScale = Number(process.env.TOPPER_RENDER_SCALE || 2);
    const rendered = await pdf(pdfBuffer, { scale: Number.isFinite(renderScale) ? renderScale : 2 });
    const pageInputs = [];
    let processedPages = 0;

    for await (const image of rendered) {
      const nextPageNo = processedPages + 1;
      if (params.maxPages && nextPageNo > params.maxPages) break;
      processedPages = nextPageNo;
      currentPageNo = processedPages;

      currentStage = "render:page";
      const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
      const imagePath = `${document.id}/page-${String(processedPages).padStart(3, "0")}.png`;
      log("page:rendered", `Rendered page ${processedPages}`, {
        documentId: document.id,
        bytes: imageBuffer.length,
        memory: memorySnapshot(),
      });

      currentStage = "storage:page-upload";
      log("page:upload", `Uploading page ${processedPages}`, { documentId: document.id, imagePath });
      await withRetry(
        `Supabase page upload ${processedPages}`,
        () => uploadFile(STORAGE_BUCKETS.TOPPER_ANSWER_PAGES, imagePath, imageBuffer, "image/png"),
        { attempts: 4, timeoutMs: 90000, meta: { documentId: document.id, page: processedPages, imagePath } }
      );

      currentStage = "ocr";
      log("page:ocr", `Running Google Vision OCR for page ${processedPages}`, { documentId: document.id });
      const rawOcrText = await withRetry(
        `Google Vision OCR page ${processedPages}`,
        () => extractDocumentTextWithGoogleVision(imageBuffer),
        {
          attempts: 4,
          baseDelayMs: 2000,
          timeoutMs: 90000,
          meta: { documentId: document.id, page: processedPages },
        }
      );
      log("page:ocr-done", `OCR complete for page ${processedPages}`, {
        documentId: document.id,
        chars: rawOcrText.length,
      });

      currentStage = "structure";
      log("page:structure", `Running Gemini structuring for page ${processedPages}`, {
        documentId: document.id,
      });
      const structured = await withRetry(
        `Gemini structuring page ${processedPages}`,
        () => structureTopperPage({ pageNo: processedPages, imageBuffer, ocrText: rawOcrText }),
        {
          attempts: 4,
          baseDelayMs: 2000,
          timeoutMs: 120000,
          meta: { documentId: document.id, page: processedPages },
        }
      );
      log("page:structure-done", `Structuring complete for page ${processedPages}`, {
        documentId: document.id,
        pageType: structured.pageType,
        answerBlocks: structured.answerBlocks.length,
      });

      currentStage = "db:page";
      const page = await prisma.topperDocumentPage.create({
        data: {
          documentId: document.id,
          pageNo: processedPages,
          imagePath,
          rawOcrText,
          structuredJson: structured as any,
          pageType: structured.pageType,
          confidenceJson: structured.pageConfidence as any,
        },
      });
      pageInputs.push({ ...structured, pageId: page.id });
      log("page:saved", `Saved page ${processedPages}`, { documentId: document.id, pageId: page.id });
      if (global.gc) {
        global.gc();
        log("memory:gc", `Forced GC after page ${processedPages}`, {
          documentId: document.id,
          memory: memorySnapshot(),
        });
      }
    }

    currentStage = "assemble";
    log("assemble", `Assembling answers for ${fileName}`, {
      documentId: document.id,
      pages: pageInputs.length,
    });
    const assembled = assembleTopperAnswers(pageInputs, { paperGroup: params.paperGroup });
    log("assemble-done", `Assembled answers for ${fileName}`, {
      documentId: document.id,
      answers: assembled.length,
      usableForRag: assembled.filter((answer) => answer.usableForRag).length,
    });

    for (const answer of assembled) {
      currentStage = "db:answer";
      log("answer:save", `Saving assembled answer`, {
        documentId: document.id,
        questionNo: answer.questionNo,
        qualityStatus: answer.qualityStatus,
        usableForRag: answer.usableForRag,
        pages: `${answer.pageStart}-${answer.pageEnd}`,
      });
      const created = await prisma.topperAnswer.create({
        data: {
          documentId: document.id,
          questionNo: answer.questionNo,
          questionText: answer.questionText,
          paperGroup: params.paperGroup,
          directive: answer.questionText ? extractDirective(answer.questionText) : null,
          maxMarks: answer.maxMarks,
          awardedMarks: answer.awardedMarks,
          scoreBand: scoreBand(answer.awardedMarks, answer.maxMarks),
          studentAnswerText: answer.studentAnswerText,
          evaluatorNotesJson: answer.evaluatorNotes as any,
          answerStructureJson: { pages: [answer.pageStart, answer.pageEnd] } as any,
          pageStart: answer.pageStart,
          pageEnd: answer.pageEnd,
          sourcePageIds: answer.sourcePageIds as any,
          qualityStatus: answer.qualityStatus,
          confidenceJson: answer.confidence as any,
          usableForRag: answer.usableForRag,
        },
      });
      currentStage = "embed";
      await vectorizeAnswer(created as any);
    }

    currentStage = "db:document-complete";
    await prisma.topperDocument.update({
      where: { id: document.id },
      data: { status: "vectorized", totalPages: processedPages },
    });

    log("pdf:done", `Completed ${fileName}`, {
      documentId: document.id,
      pages: processedPages,
      answers: assembled.length,
    });
    return { documentId: document.id, pages: processedPages, answers: assembled.length };
  } catch (error) {
    const message = errorMessage(error);
    await prisma.topperDocument.update({
      where: { id: document.id },
      data: {
        status: "failed",
        errorMessage: `stage=${currentStage}; page=${currentPageNo || "n/a"}; ${message}`,
      },
    });
    log("pdf:failed", `Failed ${fileName}`, {
      documentId: document.id,
      stage: currentStage,
      page: currentPageNo || null,
      error: message,
    });
    throw error;
  }
}

async function main() {
  const [, , pdfPath, paperGroup, maxPagesRaw] = process.argv;
  if (!pdfPath || !paperGroup) usage();
  const result = await ingestTopperPdf({
    pdfPath,
    paperGroup,
    maxPages: maxPagesRaw ? Number(maxPagesRaw) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
}
