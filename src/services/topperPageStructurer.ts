import { GoogleGenAI } from "@google/genai";
import { azureClient, chatDeployment } from "../config/azure";

export interface TopperAnswerBlock {
  questionNo: number | null;
  printedQuestionText: string | null;
  printedMaxMarks: number | null;
  studentAnswerText: string;
  evaluatorNotes: string[];
  awardedMarksCandidates: number[];
  startsAnswer: boolean;
  continuesPreviousAnswer: boolean;
  endsAnswer: boolean;
  bbox?: { x: number; y: number; w: number; h: number } | null;
  confidence?: Record<string, number>;
}

export interface TopperQuestionIndexItem {
  questionNo: number;
  questionText: string;
  maxMarks: number | null;
  wordLimit?: number | null;
}

export interface TopperStructuredPage {
  pageNo: number;
  pageType: "cover_index" | "evaluation_indicators" | "answer_page" | "blank_or_irrelevant";
  questionIndex: TopperQuestionIndexItem[];
  answerBlocks: TopperAnswerBlock[];
  pageConfidence: Record<string, number>;
  rawOcrIssues?: string[];
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function buildPrompt(pageNo: number, ocrText: string): string {
  return `You are extracting structured data from a scanned UPSC Mains evaluated topper answer-sheet page.

Use the page image as source of truth when available and OCR only as a hint. Preserve the student's answer, separate evaluator red-ink notes, and do not invent text.

Return ONLY valid JSON with this exact shape:
{
  "pageNo": ${pageNo},
  "pageType": "cover_index" | "evaluation_indicators" | "answer_page" | "blank_or_irrelevant",
  "questionIndex": [
    {
      "questionNo": number,
      "questionText": "full printed question text",
      "maxMarks": number | null,
      "wordLimit": number | null
    }
  ],
  "answerBlocks": [
    {
      "questionNo": number | null,
      "printedQuestionText": string | null,
      "printedMaxMarks": number | null,
      "studentAnswerText": string,
      "evaluatorNotes": string[],
      "awardedMarksCandidates": number[],
      "startsAnswer": boolean,
      "continuesPreviousAnswer": boolean,
      "endsAnswer": boolean,
      "bbox": { "x": number, "y": number, "w": number, "h": number } | null,
      "confidence": {
        "questionIdentification": number,
        "studentAnswerText": number,
        "evaluatorNotes": number,
        "awardedMarks": number,
        "segmentation": number
      }
    }
  ],
  "pageConfidence": {},
  "rawOcrIssues": []
}

Rules:
- If this is a printed question paper, cover page, index page, or front page with questions/marks, put printed questions in questionIndex and do not create answerBlocks unless there is actual student answer text.
- If this is an answer page and the printed question is not visible, set printedQuestionText to null but preserve questionNo if visible.
- Do not put candidate details, roll number, test metadata, instructions, or marks table as studentAnswerText.
- For Essay pages, use questionIndex for printed essay prompts and answerBlocks for actual essay text.
- Awarded marks are evaluator marks written on answer pages, not printed max marks.

Google Vision OCR text:
---
${ocrText.slice(0, 12000)}
---`;
}

function normalizeStructuredPage(parsed: any, pageNo: number): TopperStructuredPage {
  return {
    pageNo,
    pageType: parsed.pageType || "blank_or_irrelevant",
    questionIndex: Array.isArray(parsed.questionIndex) ? parsed.questionIndex : [],
    answerBlocks: Array.isArray(parsed.answerBlocks) ? parsed.answerBlocks : [],
    pageConfidence: parsed.pageConfidence || {},
    rawOcrIssues: parsed.rawOcrIssues || [],
  };
}

async function structureWithAzure(params: {
  pageNo: number;
  imageBuffer: Buffer;
  ocrText: string;
}): Promise<TopperStructuredPage> {
  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for topper page structuring");
  }

  const prompt = buildPrompt(params.pageNo, params.ocrText);
  const model = process.env.AZURE_OPENAI_STRUCTURING_DEPLOYMENT || chatDeployment;
  console.log("[topper-structurer] Azure primary structuring start", {
    pageNo: params.pageNo,
    model,
  });
  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a strict OCR post-processor for UPSC evaluated answer copies. Return valid JSON only.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${params.imageBuffer.toString("base64")}`,
          },
        },
      ],
    },
  ];

  let response;
  try {
    response = await azureClient.chat.completions.create(
      {
        model,
        messages,
        max_completion_tokens: Number(process.env.TOPPER_STRUCTURING_MAX_TOKENS || 4096),
        response_format: { type: "json_object" },
      } as any,
      { signal: AbortSignal.timeout(Number(process.env.TOPPER_AZURE_STRUCTURING_TIMEOUT_MS || 90000)) }
    );
  } catch (error: any) {
    const msg = String(error?.message || error || "");
    if (msg.includes("max_completion_tokens") || msg.includes("response_format")) {
      response = await azureClient.chat.completions.create(
        {
          model,
          messages,
          max_tokens: Number(process.env.TOPPER_STRUCTURING_MAX_TOKENS || 4096),
        } as any,
        { signal: AbortSignal.timeout(Number(process.env.TOPPER_AZURE_STRUCTURING_TIMEOUT_MS || 90000)) }
      );
    } else {
      throw error;
    }
  }

  const text = response.choices[0]?.message?.content || "{}";
  const structured = normalizeStructuredPage(JSON.parse(stripJsonFence(text)), params.pageNo);
  console.log("[topper-structurer] Azure primary structuring done", {
    pageNo: params.pageNo,
    model,
    pageType: structured.pageType,
    answerBlocks: structured.answerBlocks.length,
    questionIndex: structured.questionIndex.length,
  });
  return structured;
}

async function structureWithGemini(params: {
  pageNo: number;
  imageBuffer: Buffer;
  ocrText: string;
}): Promise<TopperStructuredPage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildPrompt(params.pageNo, params.ocrText);
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_STRUCTURING_FALLBACK_MODEL || process.env.GEMINI_STRUCTURING_MODEL || "gemini-3.5-flash";
  console.log("[topper-structurer] Gemini fallback structuring start", {
    pageNo: params.pageNo,
    model,
  });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: params.imageBuffer.toString("base64") } },
        ],
      },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });

  const structured = normalizeStructuredPage(JSON.parse(stripJsonFence(response.text || "{}")), params.pageNo);
  console.log("[topper-structurer] Gemini fallback structuring done", {
    pageNo: params.pageNo,
    model,
    pageType: structured.pageType,
    answerBlocks: structured.answerBlocks.length,
    questionIndex: structured.questionIndex.length,
  });
  return structured;
}

export async function structureTopperPage(params: {
  pageNo: number;
  imageBuffer: Buffer;
  ocrText: string;
}): Promise<TopperStructuredPage> {
  try {
    return await structureWithAzure(params);
  } catch (error) {
    console.warn(
      "[topper-structurer] Azure structuring failed; falling back to Gemini:",
      error instanceof Error ? error.message : error
    );
    return structureWithGemini(params);
  }
}
