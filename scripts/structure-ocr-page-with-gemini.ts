import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

function usage(): never {
  console.error(
    [
      "Usage:",
      "  GEMINI_API_KEY=... npx tsx scripts/structure-ocr-page-with-gemini.ts <image-path> <ocr-text-path> [output-json-path]",
      "",
      "Example:",
      "  GEMINI_API_KEY=... npx tsx scripts/structure-ocr-page-with-gemini.ts ../ocr-output-937212/page-003.png ../ocr-output-937212/page-003.txt",
    ].join("\n")
  );
  process.exit(1);
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function main() {
  const [, , imagePathArg, ocrPathArg, outputPathArg] = process.argv;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !imagePathArg || !ocrPathArg) usage();

  const imagePath = path.resolve(imagePathArg);
  const ocrPath = path.resolve(ocrPathArg);
  const outputPath = path.resolve(
    outputPathArg || imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, ".structured.json")
  );

  const [imageBuffer, ocrText] = await Promise.all([
    fs.readFile(imagePath),
    fs.readFile(ocrPath, "utf8"),
  ]);

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are extracting structured data from a scanned UPSC Mains evaluated answer-sheet page.

You receive:
1. The page image.
2. Google Vision OCR text for the same page.

Task:
- Separate printed question text, student handwritten answer, evaluator red-ink notes, and awarded marks.
- Use the image as the source of truth. Use OCR only as a hint.
- Do not invent text. If a word is unreadable, use "[unclear]".
- Preserve the student's answer order, headings, and bullets as much as possible.
- Red-ink evaluator annotations include ticks, brackets, comments like "valid points", "relevant introduction", "avoid short form", and circled marks.
- If this page continues a previous question, set continuesPreviousAnswer true.
- If this page starts a new question, set startsNewAnswer true.
- If this page ends with a final awarded mark for the question, set endsAnswer true and awardedMarksCandidates.

Return ONLY valid JSON with this exact shape:
{
  "pageType": "cover_index" | "evaluation_indicators" | "answer_page" | "blank_or_irrelevant",
  "questionNoCandidates": [number],
  "printedQuestionText": string | null,
  "printedMaxMarks": number | null,
  "studentAnswerText": string,
  "evaluatorNotes": string[],
  "awardedMarksCandidates": number[],
  "continuesPreviousAnswer": boolean,
  "startsNewAnswer": boolean,
  "endsAnswer": boolean,
  "visualSignals": {
    "ticks": number,
    "underlines": number,
    "crosses": number,
    "largeBrackets": number,
    "circledNumbers": number[]
  },
  "confidence": {
    "pageType": number,
    "questionIdentification": number,
    "studentAnswerText": number,
    "evaluatorNotes": number,
    "awardedMarks": number
  },
  "rawOcrIssues": string[]
}

Google Vision OCR text:
---
${ocrText.slice(0, 12000)}
---`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_STRUCTURING_MODEL || "gemini-3-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "";
  const jsonText = stripJsonFence(text);
  const parsed = JSON.parse(jsonText);
  await fs.writeFile(outputPath, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`[gemini] wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
