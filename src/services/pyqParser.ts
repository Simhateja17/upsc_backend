import { invokeModelJSON } from "../config/bedrock";
import prisma from "../config/database";
import * as stringSimilarity from "string-similarity";

interface ParsedQuestion {
  questionText: string;
  options: Array<{ label: string; text: string }>;
  correctOption: string;
  subject: string;
  topic: string;
  difficulty: string;
}

const UPSC_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "Current Affairs",
  "International Relations",
];

const LOG_PREFIX = "[PYQ-PIPELINE]";

function log(step: string, msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${step}] ${msg}`);
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} [${timestamp}] [${step}]   └─ ${typeof data === "string" ? data : JSON.stringify(data, null, 2)}`);
  }
}

function logError(step: string, msg: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`${LOG_PREFIX} [${timestamp}] [${step}] ERROR: ${msg}`);
  console.error(`${LOG_PREFIX} [${timestamp}] [${step}]   └─`, error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG_PREFIX} [${timestamp}] [${step}]   └─ Stack:`, error.stack.split("\n").slice(1, 4).join("\n      "));
  }
}

/**
 * Extract text from PDF buffer using pdf-parse
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  log("PDF-EXTRACT", `Starting PDF text extraction (buffer size: ${(buffer.length / 1024).toFixed(1)} KB)`);
  const startTime = Date.now();

  const { PDFParse } = await import("pdf-parse");
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new (PDFParse as any)(uint8);
  const result = await (parser as any).getText();

  const text = result.pages
    ? result.pages.map((p: any) => (typeof p === "string" ? p : p.text || "")).join("\n\n")
    : String(result.text || result);

  const elapsed = Date.now() - startTime;
  log("PDF-EXTRACT", `Extraction complete in ${elapsed}ms`);
  log("PDF-EXTRACT", `Pages: ${result.totalPages || result.pages?.length || "unknown"}`);
  log("PDF-EXTRACT", `Extracted text length: ${text.length} characters`);
  log("PDF-EXTRACT", `Preview (first 200 chars): "${text.substring(0, 200).replace(/\n/g, "\\n")}..."`);

  return text;
}

/**
 * Split text into chunks of roughly pageSize characters
 */
function splitIntoChunks(text: string, chunkSize = 3000): string[] {
  log("CHUNKING", `Starting chunking with max chunk size: ${chunkSize} chars`);
  const startTime = Date.now();

  const chunks: string[] = [];
  let current = "";

  const paragraphs = text.split(/\n\n+/);
  log("CHUNKING", `Total paragraphs found: ${paragraphs.length}`);

  for (const para of paragraphs) {
    if (current.length + para.length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      log("CHUNKING", `Chunk #${chunks.length} created: ${current.trim().length} chars`);
      current = "";
    }
    current += para + "\n\n";
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
    log("CHUNKING", `Chunk #${chunks.length} created (final): ${current.trim().length} chars`);
  }

  const elapsed = Date.now() - startTime;
  log("CHUNKING", `Chunking complete in ${elapsed}ms — ${chunks.length} total chunks`);

  // Log chunk size distribution
  const sizes = chunks.map((c) => c.length);
  log("CHUNKING", `Chunk sizes: min=${Math.min(...sizes)}, max=${Math.max(...sizes)}, avg=${Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)}`);

  return chunks;
}

/**
 * Send a chunk to Bedrock for MCQ extraction
 */
async function parseChunkWithAI(
  chunk: string,
  year: number,
  paper: string,
  chunkIndex: number,
  totalChunks: number
): Promise<ParsedQuestion[]> {
  log("AI-PARSE", `Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} chars)`);
  log("AI-PARSE", `Chunk preview: "${chunk.substring(0, 150).replace(/\n/g, "\\n")}..."`);
  const startTime = Date.now();

  const system = `You are a UPSC question extractor. Extract all MCQ questions from the given text.
For each question, return a JSON array of objects. If no questions are found, return an empty array.
Only return valid JSON, no other text.`;

  const prompt = `Extract all MCQ questions from this UPSC ${paper} ${year} paper text. For each question return:
- questionText: the full question text
- options: array of {label: "A"/"B"/"C"/"D", text: "option text"}
- correctOption: "A", "B", "C", or "D" (if determinable, otherwise "")
- subject: one of [${UPSC_SUBJECTS.join(", ")}]
- topic: specific topic within the subject
- difficulty: "Easy", "Medium", or "Hard"

Text to parse:
${chunk}

Return a JSON array of extracted questions.`;

  try {
    log("AI-PARSE", `Sending chunk ${chunkIndex + 1} to Bedrock (prompt: ${prompt.length} chars)...`);
    const result = await invokeModelJSON<ParsedQuestion[]>(
      [{ role: "user", content: prompt }],
      { system, maxTokens: 4096, temperature: 0.1, serviceName: "pyqParser" }
    );

    const elapsed = Date.now() - startTime;
    const questions = Array.isArray(result) ? result : [];

    log("AI-PARSE", `Chunk ${chunkIndex + 1} parsed in ${elapsed}ms — ${questions.length} questions extracted`);

    if (questions.length > 0) {
      questions.forEach((q, i) => {
        log("AI-PARSE", `  Question ${i + 1}: [${q.subject}] [${q.difficulty}] "${q.questionText.substring(0, 80)}..."`);
        log("AI-PARSE", `    Options: ${(q.options || []).length} | Correct: ${q.correctOption || "N/A"} | Topic: ${q.topic || "N/A"}`);
      });
    } else {
      log("AI-PARSE", `  No questions found in this chunk`);
    }

    return questions;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError("AI-PARSE", `Chunk ${chunkIndex + 1} failed after ${elapsed}ms`, error);
    return [];
  }
}

/**
 * Check for duplicate questions against existing PYQ bank
 */
async function findDuplicates(
  questionText: string,
  questionIndex: number
): Promise<{ isDuplicate: boolean; duplicateId: string | null; similarity: number }> {
  log("DEDUP", `Checking duplicates for question #${questionIndex + 1}: "${questionText.substring(0, 60)}..."`);
  const startTime = Date.now();

  // First check exact match
  const exact = await prisma.pYQQuestion.findFirst({
    where: { questionText, status: { not: "rejected" } },
    select: { id: true },
  });

  if (exact) {
    const elapsed = Date.now() - startTime;
    log("DEDUP", `  EXACT DUPLICATE found in ${elapsed}ms (id: ${exact.id})`);
    return { isDuplicate: true, duplicateId: exact.id, similarity: 1.0 };
  }

  // Fuzzy match — load recent approved questions for comparison
  const existing = await prisma.pYQQuestion.findMany({
    where: { status: { in: ["approved", "draft"] } },
    select: { id: true, questionText: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  if (existing.length === 0) {
    const elapsed = Date.now() - startTime;
    log("DEDUP", `  No existing questions to compare against (${elapsed}ms)`);
    return { isDuplicate: false, duplicateId: null, similarity: 0 };
  }

  log("DEDUP", `  Comparing against ${existing.length} existing questions...`);
  const existingTexts = existing.map((q) => q.questionText);
  const bestMatch = stringSimilarity.findBestMatch(questionText, existingTexts);
  const elapsed = Date.now() - startTime;

  if (bestMatch.bestMatch.rating > 0.7) {
    const matchIndex = bestMatch.bestMatchIndex;
    log("DEDUP", `  FUZZY DUPLICATE found in ${elapsed}ms (similarity: ${(bestMatch.bestMatch.rating * 100).toFixed(1)}%, id: ${existing[matchIndex].id})`);
    log("DEDUP", `    Matched with: "${existing[matchIndex].questionText.substring(0, 60)}..."`);
    return {
      isDuplicate: true,
      duplicateId: existing[matchIndex].id,
      similarity: bestMatch.bestMatch.rating,
    };
  }

  log("DEDUP", `  No duplicate found in ${elapsed}ms (best similarity: ${(bestMatch.bestMatch.rating * 100).toFixed(1)}%)`);
  return { isDuplicate: false, duplicateId: null, similarity: bestMatch.bestMatch.rating };
}

/**
 * Full PDF parsing pipeline
 */
export async function parsePYQPdf(
  uploadId: string,
  pdfBuffer: Buffer,
  year: number,
  paper: string
): Promise<void> {
  const pipelineStart = Date.now();
  console.log("\n" + "=".repeat(80));
  log("PIPELINE", `STARTING PYQ PARSING PIPELINE`);
  log("PIPELINE", `Upload ID: ${uploadId}`);
  log("PIPELINE", `Year: ${year} | Paper: ${paper}`);
  log("PIPELINE", `PDF Buffer Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log("=".repeat(80));

  try {
    // ─── Step 1: Extract text ──────────────────────────────────────
    console.log("\n" + "─".repeat(60));
    log("STEP-1", "EXTRACTING TEXT FROM PDF");
    console.log("─".repeat(60));
    const text = await extractTextFromPDF(pdfBuffer);

    if (!text || text.trim().length === 0) {
      log("STEP-1", "WARNING: No text extracted from PDF! File may be image-based.");
      await prisma.pYQUpload.update({
        where: { id: uploadId },
        data: { status: "parsed", totalExtracted: 0 },
      });
      return;
    }

    // ─── Step 2: Split into chunks ─────────────────────────────────
    console.log("\n" + "─".repeat(60));
    log("STEP-2", "SPLITTING TEXT INTO CHUNKS");
    console.log("─".repeat(60));
    const chunks = splitIntoChunks(text);

    // ─── Step 3: Parse each chunk with AI ──────────────────────────
    console.log("\n" + "─".repeat(60));
    log("STEP-3", `PARSING ${chunks.length} CHUNKS WITH AI`);
    console.log("─".repeat(60));

    let totalExtracted = 0;
    let totalDuplicates = 0;
    let totalNew = 0;

    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n  --- Chunk ${i + 1}/${chunks.length} ---`);
      const questions = await parseChunkWithAI(chunks[i], year, paper, i, chunks.length);

      for (let j = 0; j < questions.length; j++) {
        const q = questions[j];

        // ─── Step 4: Check for duplicates ──────────────────────
        const dupCheck = await findDuplicates(q.questionText, totalExtracted);

        const status = dupCheck.isDuplicate ? "rejected" : "draft";
        if (dupCheck.isDuplicate) totalDuplicates++;
        else totalNew++;

        log("DB-SAVE", `Saving question #${totalExtracted + 1}: status=${status}, subject=${q.subject || "Current Affairs"}`);

        await prisma.pYQQuestion.create({
          data: {
            year,
            paper,
            questionText: q.questionText,
            subject: q.subject || "Current Affairs",
            topic: q.topic || null,
            difficulty: q.difficulty || "Medium",
            options: q.options || [],
            correctOption: q.correctOption || null,
            status,
            duplicateOfId: dupCheck.duplicateId,
            uploadId,
          },
        });

        log("DB-SAVE", `Question #${totalExtracted + 1} saved successfully`);
        totalExtracted++;
      }

      log("PROGRESS", `Chunks processed: ${i + 1}/${chunks.length} | Questions so far: ${totalExtracted} (${totalNew} new, ${totalDuplicates} duplicates)`);
    }

    // ─── Step 5: Update upload status ──────────────────────────────
    console.log("\n" + "─".repeat(60));
    log("STEP-5", "UPDATING UPLOAD STATUS");
    console.log("─".repeat(60));

    await prisma.pYQUpload.update({
      where: { id: uploadId },
      data: {
        status: "parsed",
        totalExtracted,
      },
    });

    const totalElapsed = Date.now() - pipelineStart;

    console.log("\n" + "=".repeat(80));
    log("PIPELINE", "PIPELINE COMPLETE");
    log("PIPELINE", `Total time: ${(totalElapsed / 1000).toFixed(1)}s`);
    log("PIPELINE", `Total questions extracted: ${totalExtracted}`);
    log("PIPELINE", `  New questions: ${totalNew}`);
    log("PIPELINE", `  Duplicates rejected: ${totalDuplicates}`);
    log("PIPELINE", `  Chunks processed: ${chunks.length}`);
    log("PIPELINE", `  Avg time per chunk: ${(totalElapsed / chunks.length / 1000).toFixed(1)}s`);
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    const totalElapsed = Date.now() - pipelineStart;
    console.log("\n" + "!".repeat(80));
    logError("PIPELINE", `Pipeline FAILED after ${(totalElapsed / 1000).toFixed(1)}s`, error);
    console.log("!".repeat(80) + "\n");

    await prisma.pYQUpload.update({
      where: { id: uploadId },
      data: { status: "processing" }, // Keep as processing so admin can retry
    });
  }
}
