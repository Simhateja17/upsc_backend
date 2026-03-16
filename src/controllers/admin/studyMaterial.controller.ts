import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { vectorizeStudyMaterial } from "../../services/studyMaterialVectorizer";

/**
 * POST /api/admin/study-materials/upload
 * Upload a study material PDF (notes, chapters, textbooks) for RAG vectorization.
 * Body fields: subject (required), topic (optional), source (optional)
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

    // Upload to Supabase Storage
    const fileName = `study_${Date.now()}.pdf`;
    const filePath = `rag-sources/${fileName}`;

    await uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, filePath, req.file.buffer, "application/pdf");

    // Create DB record
    const upload = await prisma.studyMaterialUpload.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: filePath,
        subject: subject.trim(),
        topic: topic?.trim() || null,
        source: source?.trim() || null,
        status: "processing",
        uploadedById: userId,
      },
    });

    // Vectorize asynchronously
    vectorizeStudyMaterial(upload.id, req.file.buffer)
      .catch((err) => console.error("Study material vectorization error:", err));

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

    const where: any = {};
    if (subject) where.subject = { contains: subject, mode: "insensitive" };
    if (status) where.status = status;

    const uploads = await prisma.studyMaterialUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { email: true, firstName: true } },
        _count: { select: { chunks: true } },
      },
    });

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

    const upload = await prisma.studyMaterialUpload.findUnique({ where: { id } });
    if (!upload) {
      return res.status(404).json({ status: "error", message: "Upload not found" });
    }

    // Cascade delete handles chunks
    await prisma.studyMaterialUpload.delete({ where: { id: id } });

    res.json({ status: "success", message: "Study material and all chunks deleted" });
  } catch (error) {
    next(error);
  }
};
