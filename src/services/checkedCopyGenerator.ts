import { GoogleGenAI } from "@google/genai";
import { STORAGE_BUCKETS, uploadFile } from "../config/storage";
import { validateCheckedCopy } from "./checkedCopyValidator";
import type { CheckedCopyAnnotationPlan } from "./checkedCopyPlanner";

type CheckedCopyResult =
  | { status: "completed"; storagePath: string }
  | { status: "failed"; reason: string };

export async function generateCheckedCopy(params: {
  attemptId: string;
  originalBuffer: Buffer;
  mimeType: string;
  annotationPlan: CheckedCopyAnnotationPlan;
}): Promise<CheckedCopyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  if (!apiKey) return { status: "failed", reason: "GEMINI_API_KEY is not configured" };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a teacher-checked UPSC answer copy image.

Strict rules:
- Preserve the original answer image unchanged.
- Only add red teacher-style handwriting annotations, ticks, underlines, brackets, arrows, score, and bottom comment.
- Do not rewrite, crop, blur, distort, erase, or improve existing handwriting/text.
- Keep annotations sparse and realistic.

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
    if (!imageData) return { status: "failed", reason: "Gemini image model returned no image" };

    const generated = Buffer.from(imageData, "base64");
    const validation = validateCheckedCopy(params.originalBuffer, generated);
    if (!validation.ok) {
      return { status: "failed", reason: validation.reason || "Checked copy validation failed" };
    }

    const ext = outputMime.includes("jpeg") ? "jpg" : "png";
    const storagePath = `${params.attemptId}/${Date.now()}_checked.${ext}`;
    await uploadFile(STORAGE_BUCKETS.CHECKED_COPIES, storagePath, generated, outputMime);
    return { status: "completed", storagePath };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
