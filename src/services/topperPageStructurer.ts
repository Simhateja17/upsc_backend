import { GoogleGenAI } from "@google/genai";

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

export interface TopperStructuredPage {
  pageNo: number;
  pageType: "cover_index" | "evaluation_indicators" | "answer_page" | "blank_or_irrelevant";
  answerBlocks: TopperAnswerBlock[];
  pageConfidence: Record<string, number>;
  rawOcrIssues?: string[];
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function structureTopperPage(params: {
  pageNo: number;
  imageBuffer: Buffer;
  ocrText: string;
}): Promise<TopperStructuredPage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = `You are extracting structured data from a scanned UPSC Mains evaluated topper answer-sheet page.

Use the image as source of truth and OCR only as a hint. Preserve the student's answer, separate evaluator red-ink notes, and do not invent text.

Return ONLY valid JSON with this exact shape:
{
  "pageNo": ${params.pageNo},
  "pageType": "cover_index" | "evaluation_indicators" | "answer_page" | "blank_or_irrelevant",
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

Google Vision OCR text:
---
${params.ocrText.slice(0, 12000)}
---`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_STRUCTURING_MODEL || "gemini-3.5-flash",
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

  const parsed = JSON.parse(stripJsonFence(response.text || "{}"));
  return {
    pageNo: params.pageNo,
    pageType: parsed.pageType || "blank_or_irrelevant",
    answerBlocks: Array.isArray(parsed.answerBlocks) ? parsed.answerBlocks : [],
    pageConfidence: parsed.pageConfidence || {},
    rawOcrIssues: parsed.rawOcrIssues || [],
  };
}
