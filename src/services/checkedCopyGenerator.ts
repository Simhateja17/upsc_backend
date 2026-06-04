import { GoogleGenAI } from "@google/genai";
import { STORAGE_BUCKETS, uploadFile } from "../config/storage";
import { validateCheckedCopy } from "./checkedCopyValidator";
import type { CheckedCopyAnnotationPlan, EvaluatorCheckedCopyPlan } from "./checkedCopyPlanner";

type CheckedCopyResult =
  | { status: "completed"; storagePath: string }
  | { status: "failed"; reason: string };

export async function generateCheckedCopy(params: {
  attemptId: string;
  pageNumber?: number;
  originalBuffer: Buffer;
  mimeType: string;
  annotationPlan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan;
}): Promise<CheckedCopyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  if (!apiKey) return { status: "failed", reason: "GEMINI_API_KEY is not configured" };
  const startedAt = Date.now();

  try {
    console.log("[checked-copy] Gemini image request start", {
      attemptId: params.attemptId,
      pageNumber: params.pageNumber || 1,
      model,
      mimeType: params.mimeType,
      inputBytes: params.originalBuffer.length,
      annotationPlanItems: Array.isArray(params.annotationPlan)
        ? params.annotationPlan.length
        : params.annotationPlan.comments.length,
    });
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a teacher-checked UPSC answer copy image from the uploaded answer-sheet image.

Strict rules:
- Preserve the original answer image unchanged.
- Only add red teacher-style handwriting annotations, ticks, underlines, brackets, arrows, score, and bottom comment.
- Do not rewrite, crop, blur, distort, erase, or improve existing handwriting/text.
- Keep annotations sparse and realistic.
- Follow the annotation plan exactly. Do not invent extra feedback.
- Place comments in page margins or bottom space when possible. Do not cover the student's handwriting.
- Use short red handwritten-style comments like a real UPSC evaluator.
- If targetText is present, visually anchor the mark near that phrase/section with a tick, underline, bracket, or arrow.
- If a demand is missing, write the missing-demand comment in the margin or bottom and point to the closest relevant section.
- This is page ${params.pageNumber || 1} of the uploaded answer. Only mark what is visible on this page. If a targetText is not present on this page, skip that anchor and use only applicable overall/score annotations.

Annotation plan JSON:
${JSON.stringify(params.annotationPlan, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.originalBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data) as any;
    const imageData = imagePart?.inlineData?.data;
    const outputMime = imagePart?.inlineData?.mimeType || "image/png";
    if (!imageData) {
      console.warn("[checked-copy] Gemini returned no image", {
        attemptId: params.attemptId,
        elapsed: `${Date.now() - startedAt}ms`,
        candidateCount: response.candidates?.length || 0,
        partTypes: response.candidates?.[0]?.content?.parts?.map((part: any) => Object.keys(part)) || [],
      });
      return { status: "failed", reason: "Gemini image model returned no image" };
    }

    const generated = Buffer.from(imageData, "base64");
    const validation = validateCheckedCopy(params.originalBuffer, generated);
    if (!validation.ok) {
      console.warn("[checked-copy] generated image failed validation", {
        attemptId: params.attemptId,
        elapsed: `${Date.now() - startedAt}ms`,
        originalBytes: params.originalBuffer.length,
        generatedBytes: generated.length,
        reason: validation.reason,
      });
      return { status: "failed", reason: validation.reason || "Checked copy validation failed" };
    }

    const ext = outputMime.includes("jpeg") ? "jpg" : "png";
    const storagePath = `${params.attemptId}/page_${params.pageNumber || 1}_${Date.now()}_checked.${ext}`;
    await uploadFile(STORAGE_BUCKETS.CHECKED_COPIES, storagePath, generated, outputMime);
    console.log("[checked-copy] completed", {
      attemptId: params.attemptId,
      elapsed: `${Date.now() - startedAt}ms`,
      outputMime,
      generatedBytes: generated.length,
      storagePath,
    });
    return { status: "completed", storagePath };
  } catch (error) {
    console.error("[checked-copy] failed", {
      attemptId: params.attemptId,
      elapsed: `${Date.now() - startedAt}ms`,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
