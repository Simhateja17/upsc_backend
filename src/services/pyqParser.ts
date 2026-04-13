import { invokeModelJSON } from "../config/llm";
import prisma from "../config/database";
import { extractTextFromFile } from "../config/gemini";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

export type PYQParseMode = "prelims" | "mains";

interface ParsedPrelimsQuestion {
  questionText: string;
  options: Array<{ label: string; text: string }>;
  correctOption: string;
  subject: string;
  topic: string;
  difficulty: string;
  explanation: string;
  year: number | null;
  paper: string | null;
}

interface ParsedMainsQuestion {
  questionText: string;
  subject: string;
  topic: string;
  difficulty: string;
  year: number | null;
  paper: string | null;
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

// Matches common UPSC question numbering: "1." "1)" "Q.1" "Q1." "Q 1" etc.
// ^\s* + \s+ guards prevent false positives on numbers inside option text.
export const QUESTION_BOUNDARY_RE = /^\s*(?:\d+[\.\)]|Q[\.\s]?\d+[\.\)]?)\s+/m;

const LOG_PREFIX = "[PYQ-PIPELINE]";
const AI_MAX_RETRIES = 3;
const CHUNK_CONCURRENCY = 3;
const execFileAsync = promisify(execFile);

function log(step: string, msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${step}] ${msg}`);
  if (data !== undefined) {
    console.log(
      `${LOG_PREFIX} [${timestamp}] [${step}]   -> ${
        typeof data === "string" ? data : JSON.stringify(data, null, 2)
      }`
    );
  }
}

function logError(step: string, msg: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`${LOG_PREFIX} [${timestamp}] [${step}] ERROR: ${msg}`);
  console.error(
    `${LOG_PREFIX} [${timestamp}] [${step}]   ->`,
    error instanceof Error ? error.message : error
  );
  if (error instanceof Error && error.stack) {
    console.error(
      `${LOG_PREFIX} [${timestamp}] [${step}]   -> Stack:`,
      error.stack.split("\n").slice(1, 4).join("\n      ")
    );
  }
}

async function updatePYQUploadCompat(
  uploadId: string,
  data: {
    status?: string;
    year?: number;
    paper?: string;
    mode?: PYQParseMode;
    totalExtracted?: number;
    errorMessage?: string | null;
  }
) {
  try {
    await prisma.pYQUpload.update({ where: { id: uploadId }, data: data as any });
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message.includes("Unknown argument `errorMessage`")) {
      const { errorMessage: _omit, ...withoutErrorMessage } = data;
      await prisma.pYQUpload.update({
        where: { id: uploadId },
        data: withoutErrorMessage as any,
      });
      return;
    }
    throw err;
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === AI_MAX_RETRIES) {
        logError("RETRY", `${label} failed after ${AI_MAX_RETRIES} attempts`, error);
        throw error;
      }
      const delay = 1000 * Math.pow(2, attempt - 1);
      log("RETRY", `${label} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  log("PDF-EXTRACT", `Starting PDF text extraction (buffer size: ${(buffer.length / 1024).toFixed(1)} KB)`);
  const startTime = Date.now();

  let text = "";
  try {
    // Primary extractor path (pdf-parse v2 API)
    const { PDFParse } = await import("pdf-parse");
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const parser = new (PDFParse as any)(uint8);
    const result = await (parser as any).getText();

    text = result.pages
      ? result.pages.map((p: any) => (typeof p === "string" ? p : p.text || "")).join("\n\n")
      : String(result.text || result);
  } catch (primaryError) {
    logError("PDF-EXTRACT", "Primary PDF extraction failed, trying legacy fallback", primaryError);
    try {
      // Fallback extractor path (older/default pdf-parse signature)
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default || (pdfParseModule as any);
      const fallback = await pdfParse(buffer);
      text = String(fallback?.text || "");
    } catch (fallbackError) {
      // Important: never throw here; caller will trigger OCR fallback.
      logError("PDF-EXTRACT", "Legacy PDF fallback also failed, deferring to OCR fallback", fallbackError);
      text = "";
    }
  }

  const elapsed = Date.now() - startTime;
  log("PDF-EXTRACT", `Extraction complete in ${elapsed}ms`);
  log("PDF-EXTRACT", `Pages: unknown`);
  log("PDF-EXTRACT", `Extracted text length: ${text.length} characters`);
  log("PDF-EXTRACT", `Preview (first 200 chars): "${text.substring(0, 200).replace(/\n/g, "\\n")}"`);

  return text;
}

async function extractTextFromPDFViaCLI(buffer: Buffer): Promise<string> {
  const base = `pyq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpPdf = path.join(os.tmpdir(), `${base}.pdf`);
  const tmpTxt = path.join(os.tmpdir(), `${base}.txt`);

  try {
    await fs.writeFile(tmpPdf, buffer);
    await execFileAsync(
      process.env.PDFTOTEXT_PATH || "pdftotext",
      ["-layout", "-nopgbrk", "-enc", "UTF-8", tmpPdf, tmpTxt],
      { timeout: 30000 }
    );
    const out = await fs.readFile(tmpTxt, "utf8");
    return out || "";
  } finally {
    await Promise.allSettled([fs.unlink(tmpPdf), fs.unlink(tmpTxt)]);
  }
}

function paragraphFallbackSplit(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const para of text.split(/\n\n+/)) {
    if (current.length + para.length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

function splitIntoChunks(text: string, chunkSize = 3000): string[] {
  log("CHUNKING", `Starting chunking with max chunk size: ${chunkSize} chars`);
  const startTime = Date.now();

  const boundaryRe = new RegExp(QUESTION_BOUNDARY_RE.source, "gm");
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = boundaryRe.exec(text)) !== null) {
    matches.push(m);
  }

  log("CHUNKING", `Question boundaries detected: ${matches.length}`);

  if (matches.length === 0) {
    const fallback = paragraphFallbackSplit(text, chunkSize);
    const elapsed = Date.now() - startTime;
    log("CHUNKING", `Paragraph fallback: ${fallback.length} chunks in ${elapsed}ms`);
    return fallback;
  }

  const units: string[] = [];

  const preamble = text.slice(0, matches[0].index).trim();
  if (preamble.length > 0) {
    paragraphFallbackSplit(preamble, chunkSize).forEach((c) => units.push(c));
  }

  for (let i = 0; i < matches.length; i++) {
    const unitStart = matches[i].index;
    const unitEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    units.push(text.slice(unitStart, unitEnd).trim());
  }

  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    if (unit.length > chunkSize) {
      if (current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      paragraphFallbackSplit(unit, chunkSize).forEach((c) => chunks.push(c));
      continue;
    }
    if (current.length + unit.length + 2 > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current.length > 0 ? "\n\n" : "") + unit;
  }

  if (current.trim().length > 0) chunks.push(current.trim());

  const elapsed = Date.now() - startTime;
  log("CHUNKING", `Chunking complete in ${elapsed}ms - ${chunks.length} total chunks`);

  const sizes = chunks.map((c) => c.length);
  if (sizes.length > 0) {
    log(
      "CHUNKING",
      `Chunk sizes: min=${Math.min(...sizes)}, max=${Math.max(...sizes)}, avg=${Math.round(
        sizes.reduce((a, b) => a + b, 0) / sizes.length
      )}`
    );
  }

  return chunks;
}

function buildPrompt(
  mode: PYQParseMode,
  chunk: string
): { system: string; prompt: string } {
  if (mode === "mains") {
    return {
      system:
        "You are a UPSC Mains question extractor. Extract only descriptive/written questions. Return strict JSON only.",
      prompt: `Extract all descriptive/written UPSC Mains questions from this text. For each question return:
- questionText: full descriptive question text
- subject: one of [${UPSC_SUBJECTS.join(", ")}]
- topic: specific topic within the subject
- difficulty: "Easy", "Medium", or "Hard"
- year: 4-digit year for this question, or null if unknown
- paper: one of "GS-I", "GS-II", "GS-III", "GS-IV", "Essay", or null if unknown

IMPORTANT:
- Extract only descriptive/written mains questions
- Do NOT include options or answer keys
- Detect year and paper per question

Text to parse:
${chunk}

Return only a JSON array.`,
    };
  }

  return {
    system:
      "You are a UPSC question extractor. Extract all MCQ questions from the given text. Return strict JSON only.",
    prompt: `Extract all MCQ questions from this UPSC exam paper text. For each question return:
- questionText: full question text
- options: array of {label: "A"/"B"/"C"/"D", text: "option text"}
- correctOption: "A", "B", "C", or "D" (if determinable, otherwise "")
- subject: one of [${UPSC_SUBJECTS.join(", ")}]
- topic: specific topic within the subject
- difficulty: "Easy", "Medium", or "Hard"
- explanation: concise explanation of the correct answer
- year: 4-digit year for this question, or null if unknown
- paper: one of "GS-I", "GS-II", "GS-III", "GS-IV", "CSAT", "Essay", or null if unknown

IMPORTANT:
- This PDF may contain multiple years and multiple papers
- Detect year and paper per question

Text to parse:
${chunk}

Return only a JSON array.`,
  };
}

async function parseChunkWithAI(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  mode: PYQParseMode
): Promise<Array<ParsedPrelimsQuestion | ParsedMainsQuestion>> {
  log("AI-PARSE", `Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} chars)`);
  log("AI-PARSE", `Chunk preview: "${chunk.substring(0, 150).replace(/\n/g, "\\n")}"`);
  const startTime = Date.now();

  const { system, prompt } = buildPrompt(mode, chunk);

  try {
    log("AI-PARSE", `Sending chunk ${chunkIndex + 1} to model (prompt: ${prompt.length} chars)...`);

    const result = await withRetry(
      () =>
        invokeModelJSON<Array<ParsedPrelimsQuestion | ParsedMainsQuestion>>(
          [{ role: "user", content: prompt }],
          { system, maxTokens: 4096, temperature: 0.1, serviceName: "pyqParser" }
        ),
      `chunk-${chunkIndex + 1}`
    );

    const elapsed = Date.now() - startTime;
    const questions = Array.isArray(result) ? result : [];

    log("AI-PARSE", `Chunk ${chunkIndex + 1} parsed in ${elapsed}ms - ${questions.length} questions extracted`);

    if (questions.length > 0) {
      questions.forEach((q, i) => {
        log(
          "AI-PARSE",
          `  Question ${i + 1}: [${q.subject}] [${q.difficulty}] [${q.year ?? "?"}/${q.paper ?? "?"}] "${q.questionText.substring(0, 80)}..."`
        );
      });
    }

    return questions;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError("AI-PARSE", `Chunk ${chunkIndex + 1} failed after ${elapsed}ms`, error);
    return [];
  }
}

async function parseChunksInBatches(
  chunks: string[],
  mode: PYQParseMode,
  batchSize: number = CHUNK_CONCURRENCY
): Promise<
  { chunkIndex: number; questions: Array<ParsedPrelimsQuestion | ParsedMainsQuestion> }[]
> {
  const results: {
    chunkIndex: number;
    questions: Array<ParsedPrelimsQuestion | ParsedMainsQuestion>;
  }[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchStart = Date.now();
    log(
      "BATCH",
      `Processing batch ${Math.floor(i / batchSize) + 1} (chunks ${i + 1}-${i + batch.length} of ${chunks.length})`
    );

    const batchResults = await Promise.all(
      batch.map((chunk, j) => parseChunkWithAI(chunk, i + j, chunks.length, mode))
    );

    for (let j = 0; j < batchResults.length; j++) {
      results.push({ chunkIndex: i + j, questions: batchResults[j] });
    }

    const batchElapsed = Date.now() - batchStart;
    log("BATCH", `Batch complete in ${(batchElapsed / 1000).toFixed(1)}s`);
  }

  return results;
}

export async function parsePYQPdf(
  uploadId: string,
  pdfBuffer: Buffer,
  mode: PYQParseMode = "prelims"
): Promise<void> {
  const pipelineStart = Date.now();
  console.log("\n" + "=".repeat(80));
  log("PIPELINE", "STARTING PYQ PARSING PIPELINE");
  log("PIPELINE", `Upload ID: ${uploadId}`);
  log("PIPELINE", `Mode: ${mode}`);
  log("PIPELINE", `PDF Buffer Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log("=".repeat(80));

  try {
    console.log("\n" + "-".repeat(60));
    log("STEP-1", "EXTRACTING TEXT FROM PDF");
    console.log("-".repeat(60));

    let text = await extractTextFromPDF(pdfBuffer);

    if (!text || text.trim().length < 50) {
      log(
        "STEP-1",
        "No text extracted from PDF parser. Trying pdftotext CLI fallback."
      );
      try {
        const cliText = await extractTextFromPDFViaCLI(pdfBuffer);
        if (cliText && cliText.trim().length >= 50) {
          text = cliText;
          log("STEP-1", `pdftotext fallback succeeded (${cliText.length} chars extracted)`);
        } else {
          // Last attempt: Azure OCR helper (may not support PDF directly in all setups).
          const ocrText = await extractTextFromFile(pdfBuffer, "application/pdf");
          if (ocrText && ocrText.trim().length >= 50) {
            text = ocrText;
            log("STEP-1", `OCR fallback succeeded (${ocrText.length} chars extracted)`);
          } else {
            await updatePYQUploadCompat(uploadId, {
              status: "failed",
              errorMessage:
                "No extractable text found. PDF parser and pdftotext fallback returned insufficient text.",
            });
            return;
          }
        }
      } catch (ocrErr: any) {
        const reason =
          ocrErr instanceof Error ? ocrErr.message : String(ocrErr || "Unknown OCR error");
        await updatePYQUploadCompat(uploadId, {
          status: "failed",
          errorMessage: `PDF text extraction failed. Fallbacks failed: ${reason}`,
        });
        return;
      }
    }

    console.log("\n" + "-".repeat(60));
    log("STEP-2", "SPLITTING TEXT INTO CHUNKS");
    console.log("-".repeat(60));

    const chunks = splitIntoChunks(text);

    console.log("\n" + "-".repeat(60));
    log("STEP-3", `PARSING ${chunks.length} CHUNKS WITH AI (concurrency: ${CHUNK_CONCURRENCY})`);
    console.log("-".repeat(60));

    const chunkResults = await parseChunksInBatches(chunks, mode);

    console.log("\n" + "-".repeat(60));
    log("STEP-4", "SAVING QUESTIONS");
    console.log("-".repeat(60));

    let totalExtracted = 0;

    for (const { questions } of chunkResults) {
      for (const q of questions) {
        totalExtracted++;
        const qYear = q.year || 0;
        const qPaper = q.paper || "Unknown";

        log(
          "DB-SAVE",
          `Saving question #${totalExtracted}: status=approved, year=${qYear}, paper=${qPaper}, subject=${q.subject || "Current Affairs"}, mode=${mode}`
        );

        if (mode === "prelims") {
          const pq = q as ParsedPrelimsQuestion;
          await prisma.pYQQuestion.create({
            data: {
              year: qYear,
              paper: qPaper,
              questionText: pq.questionText,
              subject: pq.subject || "Current Affairs",
              topic: pq.topic || null,
              difficulty: pq.difficulty || "Medium",
              options: pq.options || [],
              correctOption: pq.correctOption || null,
              explanation: pq.explanation || null,
              status: "approved",
              uploadId,
            },
          });
        } else {
          await prisma.pYQMainsQuestion.create({
            data: {
              year: qYear,
              paper: qPaper,
              questionText: q.questionText,
              subject: q.subject || "Current Affairs",
              topic: q.topic || null,
              difficulty: q.difficulty || "Medium",
              status: "approved",
              uploadId,
            },
          });
        }

        log("DB-SAVE", `Question #${totalExtracted} saved successfully`);
      }
    }

    console.log("\n" + "-".repeat(60));
    log("STEP-5", "UPDATING UPLOAD STATUS");
    console.log("-".repeat(60));

    const allQuestions = chunkResults.flatMap((r) => r.questions);
    const detectedYear =
      mostCommon(allQuestions.map((q) => q.year).filter((y): y is number => y !== null && y > 0)) || 0;
    const detectedPaper =
      mostCommon(
        allQuestions
          .map((q) => q.paper)
          .filter((p): p is string => p !== null && p !== "Unknown")
      ) || "Unknown";

    await updatePYQUploadCompat(uploadId, {
      year: detectedYear,
      paper: detectedPaper,
      mode,
      status: "parsed",
      errorMessage: null,
      totalExtracted,
    });

    const totalElapsed = Date.now() - pipelineStart;

    console.log("\n" + "=".repeat(80));
    log("PIPELINE", "PIPELINE COMPLETE");
    log("PIPELINE", `Total time: ${(totalElapsed / 1000).toFixed(1)}s`);
    log("PIPELINE", `Total questions extracted: ${totalExtracted}`);
    log("PIPELINE", `Chunks processed: ${chunks.length}`);
    log("PIPELINE", `Upload metadata: year=${detectedYear}, paper=${detectedPaper}, mode=${mode}`);
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    const totalElapsed = Date.now() - pipelineStart;
    console.log("\n" + "!".repeat(80));
    logError("PIPELINE", `Pipeline FAILED after ${(totalElapsed / 1000).toFixed(1)}s`, error);
    console.log("!".repeat(80) + "\n");

    await updatePYQUploadCompat(uploadId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown parsing error",
    });
  }
}

function mostCommon<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<T, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best: T = arr[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
