import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../config/supabase";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { vectorizeStudyMaterial } from "../../services/studyMaterialVectorizer";

const LOG = "[RAG-UPLOAD]";
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
}

/**
 * POST /api/admin/study-materials/upload
 * Upload a study material PDF (notes, chapters, textbooks) for RAG vectorization.
 * Uses Supabase REST API (HTTPS) — no direct Postgres connection needed.
 */
export const uploadStudyMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "PDF file is required" });
    }

    const { subject, topic, source } = req.body as {
      subject?: string;
      topic?: string;
      source?: string;
    };

    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "subject is required" });
    }

    log("UPLOAD", `Received PDF upload`, {
      fileName: req.file.originalname,
      sizeBytes: req.file.size,
      subject: subject.trim(),
      topic: topic?.trim() || null,
      source: source?.trim() || null,
      uploadedBy: userId,
    });

    // Upload to Supabase Storage
    const fileName = `study_${Date.now()}.pdf`;
    const filePath = `rag-sources/${fileName}`;

    log("STORAGE", `Uploading to Supabase Storage bucket: ${STORAGE_BUCKETS.STUDY_MATERIALS}`, filePath);
    await uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, filePath, req.file.buffer, "application/pdf");
    log("STORAGE", `Upload to storage complete`);

    // Create DB record via REST
    log("DB", `Creating upload record in study_material_uploads`);
    const { data: upload, error } = await supabaseAdmin
      .from("study_material_uploads")
      .insert({
        id: randomUUID(),
        file_name: req.file.originalname,
        file_url: filePath,
        subject: subject.trim(),
        topic: topic?.trim() || null,
        source: source?.trim() || null,
        status: "processing",
        uploaded_by_id: userId,
      })
      .select("id, status")
      .single();

    if (error || !upload) {
      logError("DB", "Failed to create study material record", error);
      return res.status(500).json({ status: "error", message: "Failed to create upload record" });
    }

    log("DB", `Upload record created`, { uploadId: upload.id });

    // Vectorize asynchronously
    log("VECTORIZE", `Kicking off async vectorization for upload ${upload.id}`);
    vectorizeStudyMaterial(upload.id, req.file.buffer)
      .catch((err) => logError("VECTORIZE", "Study material vectorization error", err));

    res.status(201).json({
      status: "success",
      data: { uploadId: upload.id, status: "processing" },
      message: "PDF uploaded. Vectorization started — chunks will be ready in a few minutes.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/study-materials
 * List all study material uploads with status and chunk count.
 */
export const getStudyMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.query.subject as string | undefined;
    const status = req.query.status as string | undefined;

    let query = supabaseAdmin
      .from("study_material_uploads")
      .select("*, uploaded_by:users(email, first_name)")
      .order("created_at", { ascending: false });

    if (subject) query = query.ilike("subject", `%${subject}%`);
    if (status) query = query.eq("status", status);

    const { data: uploads, error } = await query;

    if (error) {
      console.error("Failed to fetch study materials:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch study materials" });
    }

    res.json({ status: "success", data: uploads });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/study-materials/:id
 * Delete a study material upload and all its chunks.
 */
export const deleteStudyMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const { data: upload } = await supabaseAdmin
      .from("study_material_uploads")
      .select("id")
      .eq("id", id)
      .single();

    if (!upload) {
      return res.status(404).json({ status: "error", message: "Upload not found" });
    }

    // Delete chunks first, then upload
    await supabaseAdmin.from("study_material_chunks").delete().eq("upload_id", id);
    await supabaseAdmin.from("study_material_uploads").delete().eq("id", id);

    res.json({ status: "success", message: "Study material and all chunks deleted" });
  } catch (error) {
    next(error);
  }
};
