import { azureClient, chatDeployment } from "../config/azure";
import { renderPdfPagesToImages } from "../config/gemini";

export interface TranscribedAnswerPage {
  pageNumber: number;
  studentAnswerText: string;
  ignoredPrintedText?: string[];
  confidence?: "high" | "medium" | "low";
}

export interface TranscribedAnswer {
  transcribedAnswer: string;
  pages: TranscribedAnswerPage[];
  confidence: "high" | "medium" | "low";
  warnings: string[];
  diagnostics?: {
    attemptedPages: number;
    readablePages: number;
    failedPages: number[];
    maxPages: number;
    truncated: boolean;
  };
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function normalizeTranscription(raw: unknown): TranscribedAnswer {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  const pages = Array.isArray(obj.pages)
    ? obj.pages.map((page: any, index: number) => ({
        pageNumber: Number(page?.pageNumber || index + 1),
        studentAnswerText: String(page?.studentAnswerText || "").trim(),
        ignoredPrintedText: Array.isArray(page?.ignoredPrintedText)
          ? page.ignoredPrintedText.map((item: unknown) => String(item)).filter(Boolean)
          : [],
        confidence: ["high", "medium", "low"].includes(page?.confidence)
          ? page.confidence
          : "medium",
      }))
    : [];

  const answerFromPages = pages
    .map((page) => page.studentAnswerText)
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const transcribedAnswer = String(obj.transcribedAnswer || answerFromPages || "").trim();

  return {
    transcribedAnswer,
    pages,
    confidence: ["high", "medium", "low"].includes(obj.confidence) ? obj.confidence : "medium",
    warnings: Array.isArray(obj.warnings)
      ? obj.warnings.map((item: unknown) => String(item)).filter(Boolean)
      : [],
  };
}

function getOcrMaxPages(): number {
  return Math.max(1, Number(process.env.AZURE_OPENAI_OCR_MAX_PAGES || process.env.OCR_PDF_MAX_PAGES || 6));
}

async function fileToPageImages(fileBuffer: Buffer, mimeType: string, maxPagesOverride?: number): Promise<{
  pages: Array<{ pageNumber: number; buffer: Buffer; mimeType: string }>;
  maxPages: number;
  truncated: boolean;
}> {
  if (mimeType === "application/pdf") {
    const maxPages = Math.max(1, maxPagesOverride ?? getOcrMaxPages());
    const rendered = await renderPdfPagesToImages(fileBuffer, maxPages + 1);
    const truncated = rendered.length > maxPages;
    const pages = rendered.slice(0, maxPages).map((buffer, index) => ({
      pageNumber: index + 1,
      buffer,
      mimeType: "image/png",
    }));
    return { pages, maxPages, truncated };
  }

  if (mimeType.startsWith("image/")) {
    return {
      pages: [{ pageNumber: 1, buffer: fileBuffer, mimeType }],
      maxPages: 1,
      truncated: false,
    };
  }

  throw new Error(`Unsupported answer upload type for vision transcription: ${mimeType}`);
}

async function filesToPageImages(files: Array<{ buffer: Buffer; mimeType: string }>): Promise<{
  pages: Array<{ pageNumber: number; buffer: Buffer; mimeType: string }>;
  maxPages: number;
  truncated: boolean;
}> {
  const maxPages = getOcrMaxPages();
  const pages: Array<{ pageNumber: number; buffer: Buffer; mimeType: string }> = [];
  let truncated = false;

  for (const file of files) {
    const remaining = maxPages - pages.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const rendered = await fileToPageImages(file.buffer, file.mimeType, remaining);
    rendered.pages.forEach((page) => {
      pages.push({
        pageNumber: pages.length + 1,
        buffer: page.buffer,
        mimeType: page.mimeType,
      });
    });
    truncated = truncated || rendered.truncated;
  }

  return { pages, maxPages, truncated };
}

export async function transcribeStudentAnswerFromUpload(params: {
  fileBuffer: Buffer;
  mimeType: string;
  files?: Array<{ buffer: Buffer; mimeType: string }>;
  questionText: string;
  paper: string;
  subject: string;
  marks: number;
  attemptId: string;
}): Promise<TranscribedAnswer> {
  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for answer transcription");
  }
  const client = azureClient;

  const deployment =
    process.env.AZURE_OPENAI_OCR_DEPLOYMENT ||
    process.env.AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT ||
    "gpt-5.4-mini";
  const timeoutMs = Number(process.env.AZURE_OPENAI_OCR_TIMEOUT_MS || 120000);
  const startedAt = Date.now();

  console.log("[transcribe] Azure vision transcription prepare", {
    attemptId: params.attemptId,
    deployment,
    mimeType: params.mimeType,
    bytes: params.fileBuffer.length,
  });

  const pageInput = params.files && params.files.length > 0
    ? await filesToPageImages(params.files)
    : await fileToPageImages(params.fileBuffer, params.mimeType);
  const pageImages = pageInput.pages;
  if (pageImages.length === 0) {
    throw new Error("No readable pages found in uploaded answer file");
  }

  const basePrompt = `Transcribe the student's handwritten UPSC Mains answer from the uploaded page image.

Known question (${params.paper} · ${params.subject} · ${params.marks} marks):
"${params.questionText}"

Rules:
- The image pages are the source of truth.
- Return only the student's answer text, preserving the student's order and bullet/paragraph structure.
- Ignore printed question text, Hindi translation, page headers, page numbers, watermarks, logos, institute branding, phone numbers, URLs, email IDs, margin instructions, and any pre-existing evaluator marks/comments.
- Ignore red-ink annotations if present. Do not include examiner comments in the transcription.
- Do not correct the student's facts or grammar. Expand obvious abbreviations only when the handwriting clearly implies them.
- If a word is unreadable, write [unclear] sparingly.

Return ONLY valid JSON:
{
  "transcribedAnswer": "cleaned student answer text from this page only",
  "pages": [
    {
      "pageNumber": <page number>,
      "studentAnswerText": "student answer found on this page only",
      "ignoredPrintedText": ["brief labels of ignored non-answer text"],
      "confidence": "high|medium|low"
    }
  ],
  "confidence": "high|medium|low",
  "warnings": ["only serious transcription caveats"]
}`;

  async function transcribePage(page: { pageNumber: number; buffer: Buffer; mimeType: string }) {
    const content: any[] = [
      { type: "text", text: `${basePrompt}\n\nPage number: ${page.pageNumber}` },
      {
      type: "image_url",
      image_url: {
        url: `data:${page.mimeType};base64,${page.buffer.toString("base64")}`,
      },
      },
    ];

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a strict transcription engine for handwritten UPSC answer sheets. You return valid JSON only and exclude all non-answer page chrome.",
      },
      { role: "user", content },
    ];

    let response;
    try {
      response = await client.chat.completions.create(
        {
          model: deployment,
          messages,
          max_completion_tokens: Number(process.env.AZURE_OPENAI_OCR_MAX_TOKENS || 4096),
          response_format: { type: "json_object" },
        } as any,
        { signal: AbortSignal.timeout(timeoutMs) }
      );
    } catch (error: any) {
      const msg = String(error?.message || error || "");
      if (msg.includes("max_completion_tokens") || msg.includes("response_format")) {
        response = await client.chat.completions.create(
          {
            model: deployment,
            messages,
            max_tokens: Number(process.env.AZURE_OPENAI_OCR_MAX_TOKENS || 4096),
          } as any,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
      } else if (deployment !== chatDeployment && /deployment|model|not found|404/i.test(msg)) {
        console.warn("[transcribe] OCR deployment unavailable; retrying chat deployment", {
          attemptId: params.attemptId,
          deployment,
          fallback: chatDeployment,
          pageNumber: page.pageNumber,
          message: msg,
        });
        response = await client.chat.completions.create(
          {
            model: chatDeployment,
            messages,
            max_completion_tokens: Number(process.env.AZURE_OPENAI_OCR_MAX_TOKENS || 4096),
            response_format: { type: "json_object" },
          } as any,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
      } else {
        throw error;
      }
    }

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = normalizeTranscription(JSON.parse(stripJsonFence(text)));
    return {
      parsed,
      usage: response.usage,
    };
  }

  console.log("[transcribe] Azure vision transcription start", {
    attemptId: params.attemptId,
    deployment,
    pages: pageImages.length,
    pageBytes: pageImages.map((page) => page.buffer.length),
    timeoutMs,
    maxPages: pageInput.maxPages,
    truncated: pageInput.truncated,
  });

  const concurrency = Math.max(1, Math.min(Number(process.env.AZURE_OPENAI_OCR_CONCURRENCY || 1), 4));
  const pageResults: Array<{ pageNumber: number; result?: TranscribedAnswer; error?: string; usage?: any }> = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < pageImages.length) {
      const index = nextIndex;
      nextIndex += 1;
      const page = pageImages[index];
      try {
        console.log("[transcribe] page start", { attemptId: params.attemptId, pageNumber: page.pageNumber });
        const { parsed, usage } = await transcribePage(page);
        pageResults[index] = { pageNumber: page.pageNumber, result: parsed, usage };
        console.log("[transcribe] page completed", {
          attemptId: params.attemptId,
          pageNumber: page.pageNumber,
          chars: parsed.transcribedAnswer.length,
          confidence: parsed.confidence,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pageResults[index] = { pageNumber: page.pageNumber, error: message };
        console.warn("[transcribe] page failed", {
          attemptId: params.attemptId,
          pageNumber: page.pageNumber,
          message,
        });
      } finally {
        page.buffer = Buffer.alloc(0);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pageImages.length) }, () => worker()));

  const failedPages = pageResults.filter((item) => item.error).map((item) => item.pageNumber);
  const pages = pageResults
    .filter((item) => item.result)
    .flatMap((item) => item.result!.pages.length > 0
      ? item.result!.pages.map((page) => ({ ...page, pageNumber: item.pageNumber }))
      : [{
          pageNumber: item.pageNumber,
          studentAnswerText: item.result!.transcribedAnswer,
          ignoredPrintedText: [],
          confidence: item.result!.confidence,
        }]);
  const readablePages = pages.filter((page) => page.studentAnswerText.trim().length > 0);
  const warnings = [
    ...pageResults.flatMap((item) => item.result?.warnings || []),
    ...failedPages.map((pageNumber) => `Page ${pageNumber} could not be transcribed.`),
    ...(pageInput.truncated ? [`Only the first ${pageInput.maxPages} pages were processed.`] : []),
  ];
  const transcribedAnswer = readablePages
    .map((page) => `[Page ${page.pageNumber}]\n${page.studentAnswerText.trim()}`)
    .join("\n\n")
    .trim();
  const confidence = failedPages.length > 0
    ? "low"
    : readablePages.some((page) => page.confidence === "low")
      ? "low"
      : readablePages.some((page) => page.confidence === "medium")
        ? "medium"
        : "high";
  const parsed: TranscribedAnswer = {
    transcribedAnswer,
    pages,
    confidence,
    warnings,
    diagnostics: {
      attemptedPages: pageImages.length,
      readablePages: readablePages.length,
      failedPages,
      maxPages: pageInput.maxPages,
      truncated: pageInput.truncated,
    },
  };
  console.log("[transcribe] Azure vision transcription completed", {
    attemptId: params.attemptId,
    deployment,
    elapsed: `${Date.now() - startedAt}ms`,
    pages: parsed.pages.length,
    chars: parsed.transcribedAnswer.length,
    confidence: parsed.confidence,
    warnings: parsed.warnings,
    diagnostics: parsed.diagnostics,
    preview: parsed.transcribedAnswer.slice(0, 240),
  });

  return parsed;
}
