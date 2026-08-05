import { generateJSON as azureGenerateJSON, azureClient, chatDeployment } from "./azure";
import { extractDocumentTextWithGoogleVision } from "../services/googleVisionOcr.service";

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  // Backwards-compatible wrapper name; uses Azure infrastructure only.
  return azureGenerateJSON<T>(prompt, system, temperature);
}

export async function renderPdfPagesToImages(
  fileBuffer: Buffer,
  maxPages = Number(process.env.OCR_PDF_MAX_PAGES || 6)
): Promise<Buffer[]> {
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(fileBuffer, { scale: 2 });
  const pages: Buffer[] = [];

  for await (const image of document) {
    pages.push(image);
    if (pages.length >= maxPages) break;
  }

  return pages;
}

async function ocrSingleImageWithAzure(
  pageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for OCR");
  }

  const deployment =
    process.env.AZURE_OPENAI_OCR_DEPLOYMENT ||
    process.env.AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT ||
    chatDeployment;

  const response = await azureClient.chat.completions.create(
    {
      model: deployment,
      messages: [
        {
          role: "system",
          content:
            "You are a strict OCR engine. Transcribe all handwritten and printed text from this image. Return only the raw text, preserving paragraph structure, bullet points, and numbering. Do not add any commentary or formatting.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${pageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    } as any
  );

  return response.choices[0]?.message?.content || "";
}

async function ocrSingleImage(
  pageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const googleKey = process.env.GOOGLE_VISION_API_KEY;
  if (googleKey) {
    try {
      return await extractDocumentTextWithGoogleVision(pageBuffer);
    } catch (err: any) {
      console.warn("[OCR] Google Vision failed, falling back to Azure:", err.message);
    }
  }

  return ocrSingleImageWithAzure(pageBuffer, mimeType);
}

/**
 * OCR extraction for handwritten answer sheets.
 * Uses Google Vision DOCUMENT_TEXT_DETECTION if configured,
 * falls back to Azure OpenAI Vision.
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    console.log("[OCR] Converting PDF pages to images for OCR...");
    try {
      const pageBuffers = await renderPdfPagesToImages(fileBuffer);
      if (pageBuffers.length === 0) {
        throw new Error("Could not render any pages from the PDF.");
      }
      console.log("[OCR] PDF pages rendered", {
        pages: pageBuffers.length,
        bytes: pageBuffers.map((page) => page.length),
      });

      const pageTexts: string[] = [];
      for (let index = 0; index < pageBuffers.length; index += 1) {
        const pageNumber = index + 1;
        console.log(`[OCR] Processing PDF page ${pageNumber} start`);
        const text = await ocrSingleImage(pageBuffers[index], "image/png");
        console.log(`[OCR] PDF page ${pageNumber} OK (${text.length} chars)`);
        pageTexts.push(text);
      }

      return pageTexts.join("\n\n");
    } catch (err: any) {
      console.error("[OCR] PDF-to-image conversion failed:", err.message);
      throw new Error(
        "Could not read your PDF. Please upload a clear photo (JPG/PNG) of your handwritten answer instead."
      );
    }
  }

  console.log("[OCR] Processing image...", {
    mimeType,
    bytes: fileBuffer.length,
  });
  const text = await ocrSingleImage(fileBuffer, mimeType);
  console.log(`[OCR] Image OCR OK (${text.length} chars)`);
  return text;
}
