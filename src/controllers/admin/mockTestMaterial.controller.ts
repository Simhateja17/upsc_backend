import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../config/supabase";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { vectorizeMockTestMaterial } from "../../services/mockTestMaterialVectorizer";

/**
 * POST /api/admin/mock-test-materials/upload
 * Upload a mock test material PDF for RAG vectorization.
 * Chunks are stored in mock_test_chunks (not study_material_chunks).
 */
export const uploadMockTestMaterial = async (req: Request, res: Response, next: NextFunction) => {
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

    const fileName = `mock_test_${Date.now()}.pdf`;
    const filePath = `mock-test-sources/${fileName}`;

    await uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, filePath, req.file.buffer, "application/pdf");

    const { data: upload, error } = await supabaseAdmin
      .from("mock_test_material_uploads")
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
      console.error("Failed to create mock test material record:", error);
      return res.status(500).json({ status: "error", message: "Failed to create upload record" });
    }

    vectorizeMockTestMaterial(upload.id, req.file.buffer)
      .catch((err) => console.error("Mock test material vectorization error:", err));

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
 * GET /api/admin/mock-test-materials
 * List all mock test material uploads with status and chunk count.
 */
export const getMockTestMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.query.subject as string | undefined;
    const status = req.query.status as string | undefined;

    let query = supabaseAdmin
      .from("mock_test_material_uploads")
      .select("*, uploaded_by:users(email, first_name)")
      .order("created_at", { ascending: false });

    if (subject) query = query.ilike("subject", `%${subject}%`);
    if (status) query = query.eq("status", status);

    const { data: uploads, error } = await query;

    if (error) {
      console.error("Failed to fetch mock test materials:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch mock test materials" });
    }

    res.json({ status: "success", data: uploads });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/mock-test-materials/:id
 * Delete a mock test material upload and all its chunks.
 */
export const deleteMockTestMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const { data: upload } = await supabaseAdmin
      .from("mock_test_material_uploads")
      .select("id")
      .eq("id", id)
      .single();

    if (!upload) {
      return res.status(404).json({ status: "error", message: "Upload not found" });
    }

    await supabaseAdmin.from("mock_test_chunks").delete().eq("upload_id", id);
    await supabaseAdmin.from("mock_test_chunks_01").delete().eq("upload_id", id);
    await supabaseAdmin.from("mock_test_material_uploads").delete().eq("id", id);

    res.json({ status: "success", message: "Mock test material and all chunks deleted" });
  } catch (error) {
    next(error);
  }
};
