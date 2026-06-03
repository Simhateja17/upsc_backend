import { generateJSON as azureGenerateJSON } from "./azure";
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

/**
 * OCR extraction for handwritten answer sheets.
 * Uses Google Vision DOCUMENT_TEXT_DETECTION, matching the topper-ingestion
 * milestone pipeline, so student OCR and corpus OCR behave consistently.
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    // Convert PDF to image and OCR — handles both text-based and scanned PDFs.
    console.log("[OCR] Converting PDF pages to images for Google Vision OCR...");
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
        console.log(`[OCR] Google Vision on PDF page ${pageNumber} start`);
        const text = await extractDocumentTextWithGoogleVision(pageBuffers[index]);
        console.log(`[OCR] Google Vision on PDF page ${pageNumber} OK (${text.length} chars)`);
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

  console.log("[OCR] Trying Google Vision OCR...", {
    mimeType,
    bytes: fileBuffer.length,
  });
  const text = await extractDocumentTextWithGoogleVision(fileBuffer);
  console.log(`[OCR] Google Vision OK (${text.length} chars)`);
  return text;
}
