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

async function fileToPageImages(fileBuffer: Buffer, mimeType: string): Promise<Array<{ pageNumber: number; buffer: Buffer; mimeType: string }>> {
  if (mimeType === "application/pdf") {
    const maxPages = Number(process.env.AZURE_OPENAI_OCR_MAX_PAGES || process.env.OCR_PDF_MAX_PAGES || 6);
    const pages = await renderPdfPagesToImages(fileBuffer, maxPages);
    return pages.map((buffer, index) => ({
      pageNumber: index + 1,
      buffer,
      mimeType: "image/png",
    }));
  }

  if (mimeType.startsWith("image/")) {
    return [{ pageNumber: 1, buffer: fileBuffer, mimeType }];
  }

  throw new Error(`Unsupported answer upload type for vision transcription: ${mimeType}`);
}

export async function transcribeStudentAnswerFromUpload(params: {
  fileBuffer: Buffer;
  mimeType: string;
  questionText: string;
  paper: string;
  subject: string;
  marks: number;
  attemptId: string;
}): Promise<TranscribedAnswer> {
  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for answer transcription");
  }

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

  const pageImages = await fileToPageImages(params.fileBuffer, params.mimeType);
  if (pageImages.length === 0) {
    throw new Error("No readable pages found in uploaded answer file");
  }

  const prompt = `Transcribe the student's handwritten UPSC Mains answer from the uploaded page image(s).

Known question (${params.paper} · ${params.subject} · ${params.marks} marks):
"${params.questionText}"

Rules:
- The image pages are the source of truth.
- Return only the student's answer text, preserving the student's order and bullet/paragraph structure.
- Ignore printed question text, Hindi translation, page headers, page numbers, watermarks, logos, institute branding, phone numbers, URLs, email IDs, margin instructions, and any pre-existing evaluator marks/comments.
- Ignore red-ink annotations if present. Do not include examiner comments in the transcription.
- Do not correct the student's facts or grammar. Expand obvious abbreviations only when the handwriting clearly implies them.
- If a word is unreadable, write [unclear] sparingly.
- If the answer continues across pages, join it in page order.

Return ONLY valid JSON:
{
  "transcribedAnswer": "full cleaned student answer only",
  "pages": [
    {
      "pageNumber": 1,
      "studentAnswerText": "student answer found on this page only",
      "ignoredPrintedText": ["brief labels of ignored non-answer text"],
      "confidence": "high|medium|low"
    }
  ],
  "confidence": "high|medium|low",
  "warnings": ["only serious transcription caveats"]
}`;

  const content: any[] = [{ type: "text", text: prompt }];
  for (const page of pageImages) {
    content.push({ type: "text", text: `Page ${page.pageNumber}:` });
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${page.mimeType};base64,${page.buffer.toString("base64")}`,
      },
    });
  }

  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a strict transcription engine for handwritten UPSC answer sheets. You return valid JSON only and exclude all non-answer page chrome.",
    },
    { role: "user", content },
  ];

  console.log("[transcribe] Azure vision transcription start", {
    attemptId: params.attemptId,
    deployment,
    pages: pageImages.length,
    pageBytes: pageImages.map((page) => page.buffer.length),
    timeoutMs,
  });

  let response;
  try {
    response = await azureClient.chat.completions.create(
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
      response = await azureClient.chat.completions.create(
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
        message: msg,
      });
      response = await azureClient.chat.completions.create(
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
  console.log("[transcribe] Azure vision transcription completed", {
    attemptId: params.attemptId,
    deployment,
    elapsed: `${Date.now() - startedAt}ms`,
    pages: parsed.pages.length,
    chars: parsed.transcribedAnswer.length,
    confidence: parsed.confidence,
    warnings: parsed.warnings,
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    preview: parsed.transcribedAnswer.slice(0, 240),
  });

  return parsed;
}
