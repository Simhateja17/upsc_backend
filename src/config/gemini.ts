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
    console.log("[OCR] Converting PDF page 1 to image for Google Vision OCR...");
    try {
      const { pdf } = await import("pdf-to-img");
      const document = await pdf(fileBuffer, { scale: 2 });
      let firstPageBuffer: Buffer | null = null;
      for await (const image of document) {
        firstPageBuffer = image;
        break; // Only need the first page
      }
      if (!firstPageBuffer) {
        throw new Error("Could not render any pages from the PDF.");
      }
      console.log(`[OCR] PDF page 1 rendered (${firstPageBuffer.length} bytes)`);
      const text = await extractDocumentTextWithGoogleVision(firstPageBuffer);
      console.log(`[OCR] Google Vision on PDF page 1 OK (${text.length} chars)`);
      return text;
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
