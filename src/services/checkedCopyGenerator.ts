import { AzureOpenAI, toFile } from "openai";
import { STORAGE_BUCKETS, uploadFile } from "../config/storage";
import { validateCheckedCopy } from "./checkedCopyValidator";
import type { CheckedCopyAnnotationPlan, EvaluatorCheckedCopyPlan } from "./checkedCopyPlanner";

type CheckedCopyResult =
  | { status: "completed"; storagePath: string }
  | { status: "failed"; reason: string };

function planForPage(
  plan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan,
  pageNumber: number
): CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan {
  if (pageNumber === 1) return plan;

  if (Array.isArray(plan)) {
    return plan.filter((item) => item.type !== "score");
  }

  return {
    ...plan,
    scoreText: "",
  };
}

export async function generateCheckedCopy(params: {
  attemptId: string;
  pageNumber?: number;
  totalPages?: number;
  originalBuffer: Buffer;
  mimeType: string;
  annotationPlan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan;
}): Promise<CheckedCopyResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || "gpt-image-2";
  // gpt-image-2 requires a newer API version than the chat models
  const apiVersion = process.env.AZURE_OPENAI_IMAGE_API_VERSION || "2025-04-01-preview";

  if (!endpoint || !apiKey) {
    return { status: "failed", reason: "Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY missing)" };
  }

  const startedAt = Date.now();
  const pageNumber = params.pageNumber || 1;
  const totalPages = params.totalPages || 1;

  try {
    const annotationPlan = planForPage(params.annotationPlan, pageNumber);

    console.log("[checked-copy] Azure image edit request start", {
      attemptId: params.attemptId,
      pageNumber,
      deployment,
      apiVersion,
      mimeType: params.mimeType,
      inputBytes: params.originalBuffer.length,
      annotationPlanItems: Array.isArray(params.annotationPlan)
        ? params.annotationPlan.length
        : params.annotationPlan.comments.length,
    });

    const prompt = `You are a UPSC teacher annotating a student's handwritten answer sheet.

Strict rules:
- Preserve the original answer image entirely — do not rewrite, erase, crop, blur, or distort any existing handwriting or text.
- Only add red teacher-style handwriting annotations: ticks, underlines, brackets, arrows, and concise margin comments.
- Keep annotations sparse, realistic, and short (as a real UPSC evaluator would write).
- Follow the annotation plan exactly. Do not invent extra feedback.
- Place comments in page margins or bottom space; do not cover the student's handwriting.
- If targetText is present, visually anchor the mark near that phrase/section with a tick, underline, bracket, or arrow.
- If a demand is missing, write the missing-demand comment in the margin and point to the closest relevant section.
- This is page ${pageNumber} of ${totalPages}. Only mark what is visible on this page.
- Write the overall score ONLY on page 1. Do NOT write any score, total marks, or final grade on pages 2-${totalPages}.

Annotation plan JSON:
${JSON.stringify(annotationPlan, null, 2)}`;

    const ai = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

    const ext = params.mimeType.includes("jpeg") ? "jpg" : "png";
    const imageFile = await toFile(params.originalBuffer, `page_${pageNumber}.${ext}`, { type: params.mimeType });

    const response = await ai.images.edit({
      model: deployment,
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1792",
    } as any);

    const item = response.data?.[0] as any;
    let generated: Buffer | null = null;

    if (item?.b64_json) {
      generated = Buffer.from(item.b64_json, "base64");
    } else if (item?.url) {
      const fetched = await fetch(item.url);
      if (!fetched.ok) {
        return { status: "failed", reason: `Failed to fetch generated image from URL: ${fetched.status}` };
      }
      generated = Buffer.from(await fetched.arrayBuffer());
    }

    if (!generated) {
      console.warn("[checked-copy] Azure returned no image data", {
        attemptId: params.attemptId,
        elapsed: `${Date.now() - startedAt}ms`,
        item,
      });
      return { status: "failed", reason: "Azure image model returned no image data" };
    }
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

    const storagePath = `${params.attemptId}/page_${pageNumber}_${Date.now()}_checked.png`;
    await uploadFile(STORAGE_BUCKETS.CHECKED_COPIES, storagePath, generated, "image/png");

    console.log("[checked-copy] completed", {
      attemptId: params.attemptId,
      elapsed: `${Date.now() - startedAt}ms`,
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
