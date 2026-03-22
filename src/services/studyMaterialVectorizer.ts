import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { chunkPDF } from "./chunking.service";
import { embedText } from "./embedding.service";

const LOG = "[RAG-VECTORIZE]";

function log(step: string, msg: string, data?: any) {
  const ts = new Date().toISOString();
  console.log(`${LOG} [${ts}] [${step}] ${msg}`);
  if (data !== undefined) {
    console.log(`${LOG} [${ts}] [${step}]   └─ ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
}

function logError(step: string, msg: string, error: any) {
  const ts = new Date().toISOString();
  console.error(`${LOG} [${ts}] [${step}] ERROR: ${msg}`);
  console.error(`${LOG} [${ts}] [${step}]   └─`, error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG} [${ts}] [${step}]   └─ Stack:`, error.stack.split("\n").slice(1, 4).join("\n      "));
  }
}

/**
 * Vectorization pipeline for study material PDFs (notes, chapters, textbooks).
 * Chunks the PDF, embeds each chunk with Gemini Embedding 2, stores via Supabase REST API.
 * Uses HTTPS (port 443) — reliable even when direct Postgres (port 5432) is blocked.
 */
export async function vectorizeStudyMaterial(
  uploadId: string,
  pdfBuffer: Buffer
): Promise<void> {
  console.log("\n" + "=".repeat(70));
  log("START", `Starting RAG vectorization pipeline for upload ${uploadId}`);
  console.log("=".repeat(70));

  try {
    // Fetch upload metadata via REST
    log("METADATA", `Fetching upload metadata from study_material_uploads`);
    const { data: upload, error: uploadErr } = await supabaseAdmin
      .from("study_material_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadErr || !upload) {
      logError("METADATA", `Upload ${uploadId} not found — skipping`, uploadErr);
      return;
    }

    log("METADATA", `Upload found`, {
      fileName: upload.file_name,
      subject: upload.subject,
      topic: upload.topic,
      source: upload.source,
    });

    const metadata = {
      year: 0,
      paper: "",
      subject: upload.subject,
      fileName: upload.file_name,
    };

    // Step 1: Chunk the PDF
    console.log("\n" + "─".repeat(50));
    log("CHUNK", `Step 1: Chunking PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    const chunks = await chunkPDF(pdfBuffer, metadata);
    log("CHUNK", `Created ${chunks.length} chunks from PDF`);
    console.log("─".repeat(50));

    if (chunks.length === 0) {
      logError("CHUNK", "No chunks extracted — marking upload as failed", null);
      await supabaseAdmin
        .from("study_material_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);
      return;
    }

    // Step 2: Embed and store each chunk via REST API (with retry)
    console.log("\n" + "─".repeat(50));
    log("EMBED", `Step 2: Embedding and storing ${chunks.length} chunks`);
    console.log("─".repeat(50));

    let stored = 0;
    let failed = 0;
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
            .from("study_material_chunks")
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
            log("EMBED", `Progress: ${stored}/${chunks.length} chunks stored (${Math.round((stored / chunks.length) * 100)}%)`);
          }
          break;
        } catch (err: any) {
          if (attempt < MAX_RETRIES) {
            const delay = 2000 * attempt;
            console.warn(
              `${LOG} [EMBED] Chunk ${chunk.chunkIndex} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
          } else {
            logError("EMBED", `Failed to embed chunk ${chunk.chunkIndex} after ${MAX_RETRIES} attempts`, err);
            failed++;
            break;
          }
        }
      }
    }

    // Step 3: Update status via REST
    console.log("\n" + "─".repeat(50));
    log("STATUS", `Step 3: Updating upload status`);
    await supabaseAdmin
      .from("study_material_uploads")
      .update({ status: "vectorized", total_chunks: stored })
      .eq("id", uploadId);

    console.log("=".repeat(70));
    log("DONE", `RAG pipeline complete for upload ${uploadId}`, {
      stored,
      failed,
      total: chunks.length,
    });
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    logError("PIPELINE", `Fatal error for upload ${uploadId}`, error);
    await supabaseAdmin
      .from("study_material_uploads")
      .update({ status: "failed" })
      .eq("id", uploadId)
      .then(() => {});
  }
}
