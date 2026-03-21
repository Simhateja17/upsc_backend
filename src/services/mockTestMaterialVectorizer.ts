import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { chunkPDF } from "./chunking.service";
import { embedText } from "./embedding.service";

const LOG = "[MOCK-TEST-VECTORIZE]";

/**
 * Vectorization pipeline for mock test material PDFs.
 * Chunks the PDF, embeds each chunk with Gemini Embedding 2, stores in mock_test_chunks.
 */
export async function vectorizeMockTestMaterial(
  uploadId: string,
  pdfBuffer: Buffer
): Promise<void> {
  console.log(`${LOG} Starting vectorization for upload ${uploadId}`);

  try {
    // Fetch upload metadata via REST
    const { data: upload, error: uploadErr } = await supabaseAdmin
      .from("mock_test_material_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadErr || !upload) {
      console.error(`${LOG} Upload ${uploadId} not found — skipping`);
      return;
    }

    const metadata = {
      year: 0,
      paper: "",
      subject: upload.subject,
      fileName: upload.file_name,
    };

    // Step 1: Chunk the PDF
    const chunks = await chunkPDF(pdfBuffer, metadata);
    console.log(`${LOG} Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await supabaseAdmin
        .from("mock_test_material_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);
      return;
    }

    // Step 2: Embed and store each chunk via REST API (with retry)
    let stored = 0;
    for (const chunk of chunks) {
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const embedding = await embedText(chunk.text, "RETRIEVAL_DOCUMENT");

          const chunkMeta = {
            subject: upload.subject,
            topic: upload.topic || null,
            source: upload.source || null,
            fileName: upload.file_name,
            pageNumber: chunk.pageNumber,
            uploadId,
          };

          const { error: insertErr } = await supabaseAdmin
            .from("mock_test_chunks")
            .insert({
              id: randomUUID(),
              upload_id: uploadId,
              page_number: chunk.pageNumber,
              chunk_index: chunk.chunkIndex,
              chunk_text: chunk.text,
              embedding: JSON.stringify(embedding),
              metadata: chunkMeta,
            });

          if (insertErr) {
            throw new Error(`REST insert failed: ${insertErr.message}`);
          }

          stored++;
          if (stored % 10 === 0) {
            console.log(`${LOG} Progress: ${stored}/${chunks.length} chunks stored`);
          }
          break;
        } catch (err: any) {
          if (attempt < MAX_RETRIES) {
            const delay = 2000 * attempt;
            console.warn(
              `${LOG} Chunk ${chunk.chunkIndex} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
          } else {
            console.error(
              `${LOG} Failed to embed chunk ${chunk.chunkIndex} (attempt ${attempt}):`,
              err
            );
            break;
          }
        }
      }
    }

    // Step 3: Update status via REST
    await supabaseAdmin
      .from("mock_test_material_uploads")
      .update({ status: "vectorized", total_chunks: stored })
      .eq("id", uploadId);

    console.log(
      `${LOG} Done: ${stored}/${chunks.length} chunks stored for upload ${uploadId}`
    );
  } catch (error) {
    console.error(`${LOG} Failed for upload ${uploadId}:`, error);
    await supabaseAdmin
      .from("mock_test_material_uploads")
      .update({ status: "failed" })
      .eq("id", uploadId)
      .then(() => {});
  }
}
