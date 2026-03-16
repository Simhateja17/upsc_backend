const CHUNK_SIZE = 2000; // characters (~500 tokens)
const OVERLAP = 200; // characters overlap between chunks
const MIN_CHUNK_LENGTH = 50; // skip tiny fragments

export interface PYQChunkData {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  metadata: Record<string, any>;
}

/**
 * Extract per-page text from a PDF buffer using pdf-parse v2
 */
async function extractPagesFromPDF(buffer: Buffer): Promise<string[]> {
  const { PDFParse } = await import("pdf-parse");
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new (PDFParse as any)(uint8);
  const result = await (parser as any).getText();

  if (result.pages && Array.isArray(result.pages) && result.pages.length > 0) {
    return result.pages.map((p: any) =>
      typeof p === "string" ? p : (p.text || "")
    );
  }

  // Fallback: whole text as one page
  const text = String(result.text || result || "");
  return [text];
}

/**
 * Split a PDF buffer into overlapping text chunks with metadata.
 * Used for RAG vectorization (separate from MCQ extraction pipeline).
 */
export async function chunkPDF(
  buffer: Buffer,
  metadata: { year: number; paper: string; subject: string; fileName: string }
): Promise<PYQChunkData[]> {
  const pages = await extractPagesFromPDF(buffer);
  const chunks: PYQChunkData[] = [];
  let globalChunkIndex = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx];
    if (!pageText || pageText.trim().length < MIN_CHUNK_LENGTH) continue;

    let i = 0;
    while (i < pageText.length) {
      const chunkText = pageText.slice(i, i + CHUNK_SIZE).trim();
      if (chunkText.length >= MIN_CHUNK_LENGTH) {
        chunks.push({
          text: chunkText,
          pageNumber: pageIdx + 1,
          chunkIndex: globalChunkIndex++,
          metadata: { ...metadata, pageNumber: pageIdx + 1 },
        });
      }
      i += CHUNK_SIZE - OVERLAP;
    }
  }

  return chunks;
}
