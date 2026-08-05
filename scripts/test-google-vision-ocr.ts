import fs from "node:fs/promises";
import path from "node:path";

type VisionTextAnnotation = {
  description?: string;
  locale?: string;
};

type VisionResponse = {
  responses?: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: {
      text?: string;
      pages?: unknown[];
    };
    error?: {
      code?: number;
      message?: string;
    };
  }>;
};

function usage(): never {
  console.error(
    [
      "Usage:",
      "  GOOGLE_VISION_API_KEY=... npx tsx scripts/test-google-vision-ocr.ts <pdf-path> [max-pages] [output-dir]",
      "",
      "Example:",
      "  GOOGLE_VISION_API_KEY=... npx tsx scripts/test-google-vision-ocr.ts ./samples/topper.pdf 5",
    ].join("\n")
  );
  process.exit(1);
}

async function callGoogleVision(imageBuffer: Buffer, apiKey: string): Promise<string> {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBuffer.toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: {
            languageHints: ["en"],
          },
        },
      ],
    }),
  });

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

async function main() {
  const [, , pdfPathArg, maxPagesArg, outputDirArg] = process.argv;
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey || !pdfPathArg) usage();

  const pdfPath = path.resolve(pdfPathArg);
  const maxPages = Math.max(1, Number(maxPagesArg || 3));
  const outputDir = path.resolve(
    outputDirArg || path.join("/private/tmp", "upsc-google-vision-ocr", path.basename(pdfPath, ".pdf"))
  );

  await fs.mkdir(outputDir, { recursive: true });

  const pdfBuffer = await fs.readFile(pdfPath);
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(pdfBuffer, { scale: 2 });

  let pageNo = 0;
  const manifest: Array<{ page: number; imagePath: string; textPath: string; charCount: number }> = [];

  for await (const image of document) {
    pageNo += 1;
    if (pageNo > maxPages) break;

    const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
    const imagePath = path.join(outputDir, `page-${String(pageNo).padStart(3, "0")}.png`);
    const textPath = path.join(outputDir, `page-${String(pageNo).padStart(3, "0")}.txt`);

    await fs.writeFile(imagePath, imageBuffer);
    console.log(`[ocr] page ${pageNo}: rendered ${imageBuffer.length} bytes`);

    const text = await callGoogleVision(imageBuffer, apiKey);
    await fs.writeFile(textPath, text.trim() + "\n", "utf8");

    manifest.push({ page: pageNo, imagePath, textPath, charCount: text.length });
    console.log(`[ocr] page ${pageNo}: extracted ${text.length} chars -> ${textPath}`);
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({ pdfPath, maxPages, pages: manifest }, null, 2), "utf8");
  console.log(`[ocr] done: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
