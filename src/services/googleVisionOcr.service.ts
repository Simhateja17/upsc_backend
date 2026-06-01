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

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
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

  const body = (await response.json()) as VisionResponse;
  if (!response.ok) {
    throw new Error(`Google Vision HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  const result = body.responses?.[0];
  if (result?.error) {
    throw new Error(`Google Vision API error ${result.error.code}: ${result.error.message}`);
  }

  return result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || "";
}
