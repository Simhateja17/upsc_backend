import { randomUUID } from "crypto";
import prisma from "../config/database";
import { chunkPDF } from "./chunking.service";
import { embedText } from "./embedding.service";

const LOG = "[STUDY-VECTORIZE]";

/**
 * Vectorization pipeline for study material PDFs (notes, chapters, textbooks).
 * Chunks the PDF, embeds each chunk with Gemini Embedding 2, stores in study_material_chunks.
 */
export async function vectorizeStudyMaterial(
  uploadId: string,
  pdfBuffer: Buffer
): Promise<void> {
  console.log(`${LOG} Starting vectorization for upload ${uploadId}`);

  try {
    // Fetch upload metadata
    const upload = await prisma.studyMaterialUpload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      console.error(`${LOG} Upload ${uploadId} not found — skipping`);
      return;
    }

    const metadata = {
      year: 0,
      paper: "",
      subject: upload.subject,
      fileName: upload.fileName,
    };

    // Step 1: Chunk the PDF
    const chunks = await chunkPDF(pdfBuffer, metadata);
    console.log(`${LOG} Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await prisma.studyMaterialUpload.update({
        where: { id: uploadId },
        data: { status: "failed" },
      });
      return;
    }

    // Step 2: Embed and store each chunk
    let stored = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await embedText(chunk.text, "RETRIEVAL_DOCUMENT");
        const embeddingStr = `[${embedding.join(",")}]`;

        const chunkMeta = {
          subject: upload.subject,
          topic: upload.topic || null,
          source: upload.source || null,
          fileName: upload.fileName,
          pageNumber: chunk.pageNumber,
          uploadId,
        };

        await prisma.$executeRaw`
          INSERT INTO "study_material_chunks" (id, upload_id, page_number, chunk_index, chunk_text, embedding, metadata, created_at)
          VALUES (
            ${randomUUID()},
            ${uploadId},
            ${chunk.pageNumber},
            ${chunk.chunkIndex},
            ${chunk.text},
            ${embeddingStr}::vector,
            ${JSON.stringify(chunkMeta)}::jsonb,
            NOW()
          )
        `;
        stored++;
      } catch (err) {
        console.error(`${LOG} Failed to embed chunk ${chunk.chunkIndex}:`, err);
      }
    }

    // Step 3: Update status
    await prisma.studyMaterialUpload.update({
      where: { id: uploadId },
      data: { status: "vectorized", totalChunks: stored },
    });

    console.log(`${LOG} Done: ${stored}/${chunks.length} chunks stored for upload ${uploadId}`);
  } catch (error) {
    console.error(`${LOG} Failed for upload ${uploadId}:`, error);
    await prisma.studyMaterialUpload.update({
      where: { id: uploadId },
      data: { status: "failed" },
    }).catch(() => {});
  }
}
