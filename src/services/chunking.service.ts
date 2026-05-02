import { QUESTION_BOUNDARY_RE } from "./pyqParser";

const CHUNK_SIZE = 1000; // characters (~250 tokens — Gemini embedding sweet spot)
const OVERLAP = 150; // ~15% overlap
const MIN_CHUNK_LENGTH = 50; // skip tiny fragments
const PAGE_LEVEL_THRESHOLD = 1200; // use full page as chunk if page ≤ this size

export interface PYQChunkData {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  metadata: Record<string, any>;
}

/**
 * Clean raw PDF-extracted text before chunking:
 *  - Joins hyphenated line breaks (strug-\ngle → struggle)
 *  - Removes lines that are purely page numbers
 *  - Collapses 3+ consecutive newlines to paragraph boundaries (\n\n)
 *  - Normalizes unicode spaces and zero-width characters
 */
function cleanPDFText(text: string): string {
  return text
    // Join hyphenated line breaks
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Remove lines that are purely page numbers (optional whitespace around digits)
    .replace(/^\s*\d+\s*$/gm, "")
    // Collapse 3+ consecutive newlines to paragraph boundary
    .replace(/\n{3,}/g, "\n\n")
    // Normalize unicode non-breaking spaces and zero-width chars to regular space
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
    // Normalize multiple spaces to single space within lines
    .replace(/[^\S\n]{2,}/g, " ");
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
 * Split text into overlapping chunks that never break mid-word, mid-sentence,
 * or mid-paragraph. Uses tiered boundary detection:
 *   Tier 1 – paragraph (\n\n), Tier 2 – sentence (". "), Tier 3 – word (" ")
 *   Emergency – hard cut at end position (no whitespace found)
 */
function splitTextIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number,
  minLength: number
): string[] {
  const chunks: string[] = [];
  let start = 0;
  const WINDOW = Math.floor(chunkSize * 0.15); // look-back window for boundary search

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    let splitPos: number;
    if (end === text.length) {
      // Last segment — take everything remaining
      splitPos = end;
    } else {
      const windowStart = end - WINDOW;

      // Tier 1: paragraph boundary
      const paraPos = text.lastIndexOf("\n\n", end);
      if (paraPos >= windowStart) {
        splitPos = paraPos + 2; // include the newlines in the previous chunk
      } else {
        // Tier 2: sentence boundary
        const sentPos = text.lastIndexOf(". ", end);
        if (sentPos >= windowStart) {
          splitPos = sentPos + 2; // include ". " in the previous chunk
        } else {
          // Tier 3: word boundary
          const wordPos = text.lastIndexOf(" ", end);
          if (wordPos >= windowStart) {
            splitPos = wordPos + 1;
          } else {
            // Emergency: hard cut
            splitPos = end;
          }
        }
      }
    }

    const chunkText = text.slice(start, splitPos).trim();
    if (chunkText.length >= minLength) {
      chunks.push(chunkText);
    }

    // Rewind by overlap, then snap forward to next word boundary
    let nextStart = splitPos - overlap;
    if (nextStart < start + 1) nextStart = start + 1; // always advance
    // Snap forward to next space so the next chunk never starts mid-word
    const spacePos = text.indexOf(" ", nextStart);
    if (spacePos !== -1 && spacePos < splitPos) {
      nextStart = spacePos + 1;
    }
    start = nextStart;
  }

  return chunks;
}

/**
 * Question-boundary-aware split: if the text contains UPSC question markers,
 * split at question boundaries first to keep each question intact, then apply
 * size limits. Falls back to generic tiered splitter when no markers found.
 */
function splitPageText(pageText: string): string[] {
  // Page-level chunking: if the page is small, keep it whole
  if (pageText.length <= PAGE_LEVEL_THRESHOLD) {
    return [pageText];
  }

  // Question-boundary-aware splitting
  const boundaryRe = new RegExp(QUESTION_BOUNDARY_RE.source, "gm");
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = boundaryRe.exec(pageText)) !== null) {
    matches.push(m);
  }

  if (matches.length > 0) {
    // Slice at question boundaries
    const units: string[] = [];
    const preamble = pageText.slice(0, matches[0].index).trim();
    if (preamble.length >= MIN_CHUNK_LENGTH) {
      units.push(preamble);
    }
    for (let i = 0; i < matches.length; i++) {
      const unitStart = matches[i].index;
      const unitEnd = i + 1 < matches.length ? matches[i + 1].index : pageText.length;
      const unit = pageText.slice(unitStart, unitEnd).trim();
      if (unit.length >= MIN_CHUNK_LENGTH) {
        units.push(unit);
      }
    }

    // Group units into chunks up to CHUNK_SIZE
    const chunks: string[] = [];
    let current = "";
    for (const unit of units) {
      if (unit.length > CHUNK_SIZE) {
        // Oversized single question — fall through to generic splitter
        if (current.length > 0) {
          chunks.push(current.trim());
          current = "";
        }
        splitTextIntoChunks(unit, CHUNK_SIZE, OVERLAP, MIN_CHUNK_LENGTH).forEach(c => chunks.push(c));
        continue;
      }
      if (current.length + unit.length + 2 > CHUNK_SIZE && current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      current += (current.length > 0 ? "\n\n" : "") + unit;
    }
    if (current.trim().length > 0) chunks.push(current.trim());
    return chunks;
  }

  // Generic tiered splitter
  return splitTextIntoChunks(pageText, CHUNK_SIZE, OVERLAP, MIN_CHUNK_LENGTH);
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
    const rawPageText = pages[pageIdx];
    if (!rawPageText || rawPageText.trim().length < MIN_CHUNK_LENGTH) continue;

    const pageText = cleanPDFText(rawPageText);
    if (pageText.trim().length < MIN_CHUNK_LENGTH) continue;

    const pageChunks = splitPageText(pageText.trim());
    for (const chunkText of pageChunks) {
      chunks.push({
        text: chunkText,
        pageNumber: pageIdx + 1,
        chunkIndex: globalChunkIndex++,
        metadata: { ...metadata, pageNumber: pageIdx + 1 },
      });
    }
  }

  return chunks;
}
