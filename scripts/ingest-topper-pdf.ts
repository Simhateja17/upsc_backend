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

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/ingest-topper-pdf.ts <pdf-path> <paper-group> [max-pages]\n" +
      'Example: npx tsx scripts/ingest-topper-pdf.ts "../Mains Answer Writing - Teja/GS Paper 1/file.pdf" "GS Paper 1" 5'
  );
  process.exit(1);
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

  const chunks = [
    { type: "question", text: answer.questionText || "" },
    { type: "answer", text: answer.studentAnswerText },
    { type: "feedback", text: Array.isArray(answer.evaluatorNotesJson) ? answer.evaluatorNotesJson.join("\n") : "" },
    { type: "structure", text: JSON.stringify(answer.answerStructureJson || {}) },
  ].filter((chunk) => chunk.text.trim().length >= 20);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text, "RETRIEVAL_DOCUMENT");
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
      },
      embedding: JSON.stringify(embedding),
    });
    if (error) throw new Error(`Embedding insert failed: ${error.message}`);
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
      console.log(`[topper] skip existing ${fileName}: ${existing.id}`);
      return { documentId: existing.id, pages: existing.totalPages, answers: 0, skipped: true };
    }
  }

  const storagePath = `${params.paperGroup}/${Date.now()}_${fileName}`.replace(/\s+/g, "_");

  await uploadFile(STORAGE_BUCKETS.TOPPER_PDFS, storagePath, pdfBuffer, "application/pdf");

  const document = await prisma.topperDocument.create({
    data: {
      fileName,
      storagePath,
      paperGroup: params.paperGroup,
      sourceName: "Mains Answer Writing - Teja",
      status: "processing",
    },
  });

  try {
    const { pdf } = await import("pdf-to-img");
    const rendered = await pdf(pdfBuffer, { scale: 2 });
    const pageInputs = [];
    let processedPages = 0;

    for await (const image of rendered) {
      const nextPageNo = processedPages + 1;
      if (params.maxPages && nextPageNo > params.maxPages) break;
      processedPages = nextPageNo;

      const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
      const imagePath = `${document.id}/page-${String(processedPages).padStart(3, "0")}.png`;
      await uploadFile(STORAGE_BUCKETS.TOPPER_ANSWER_PAGES, imagePath, imageBuffer, "image/png");

      const rawOcrText = await extractDocumentTextWithGoogleVision(imageBuffer);
      const structured = await structureTopperPage({ pageNo: processedPages, imageBuffer, ocrText: rawOcrText });
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
      console.log(`[topper] ${fileName}: page ${processedPages} structured (${structured.answerBlocks.length} blocks)`);
    }

    const assembled = assembleTopperAnswers(pageInputs);
    for (const answer of assembled) {
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
      await vectorizeAnswer(created as any);
    }

    await prisma.topperDocument.update({
      where: { id: document.id },
      data: { status: "vectorized", totalPages: processedPages },
    });

    console.log(`[topper] done ${fileName}: ${assembled.length} answers`);
    return { documentId: document.id, pages: processedPages, answers: assembled.length };
  } catch (error) {
    await prisma.topperDocument.update({
      where: { id: document.id },
      data: { status: "failed", errorMessage: error instanceof Error ? error.message : String(error) },
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
