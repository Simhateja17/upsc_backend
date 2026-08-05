type VisionTextAnnotation = {
  description?: string;
};

type VisionResponse = {
  responses?: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: { text?: string };
    error?: { code?: number; message?: string };
  }>;
};

export async function extractDocumentTextWithGoogleVision(
  imageBuffer: Buffer
): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY is not configured");
  const timeoutMs = Number(process.env.GOOGLE_VISION_OCR_TIMEOUT_MS || 120000);
  const startedAt = Date.now();

  console.log("[OCR] Google Vision request start", {
    bytes: imageBuffer.length,
    timeoutMs,
    feature: "DOCUMENT_TEXT_DETECTION",
  });

  let response: Response;
  try {
    response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBuffer.toString("base64") },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["en"] },
            },
          ],
        }),
      }
    );
  } catch (error) {
    console.error("[OCR] Google Vision request failed", {
      elapsed: `${Date.now() - startedAt}ms`,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
    });
    throw error;
  }

  const body = (await response.json()) as VisionResponse;
  if (!response.ok) {
    console.error("[OCR] Google Vision HTTP error", {
      elapsed: `${Date.now() - startedAt}ms`,
      status: response.status,
      body,
    });
    throw new Error(`Google Vision HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  const result = body.responses?.[0];
  if (result?.error) {
    console.error("[OCR] Google Vision API error", {
      elapsed: `${Date.now() - startedAt}ms`,
      code: result.error.code,
      message: result.error.message,
    });
    throw new Error(`Google Vision API error ${result.error.code}: ${result.error.message}`);
  }

  const text = result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || "";
  console.log("[OCR] Google Vision request completed", {
    elapsed: `${Date.now() - startedAt}ms`,
    chars: text.length,
    pages: 1,
  });
  return text;
}
