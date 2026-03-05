import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { uploadFile, STORAGE_BUCKETS, getSignedUrl } from "../../config/storage";
import { parsePYQPdf } from "../../services/pyqParser";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

/**
 * POST /api/admin/pyq/upload
 * Upload a PYQ PDF for AI parsing
 */
export const uploadPYQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { year, paper } = req.body;

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "PDF file is required" });
    }
    if (!year || !paper) {
      return res.status(400).json({ status: "error", message: "Year and paper are required" });
    }

    // Upload to Supabase Storage
    const fileName = `${year}_${paper}_${Date.now()}.pdf`;
    const filePath = `uploads/${fileName}`;

    await uploadFile(
      STORAGE_BUCKETS.PYQ_PDFS,
      filePath,
      req.file.buffer,
      "application/pdf"
    );

    const fileUrl = filePath;

    // Create upload record
    const upload = await prisma.pYQUpload.create({
      data: {
        fileName: req.file.originalname,
        fileUrl,
        year: parseInt(year),
        paper,
        status: "processing",
        uploadedById: userId,
      },
    });

    // Start parsing asynchronously
    parsePYQPdf(upload.id, req.file.buffer, parseInt(year), paper)
      .catch((err) => console.error("PYQ parsing error:", err));

    res.status(201).json({
      status: "success",
      data: { uploadId: upload.id, status: "processing" },
      message: "PDF uploaded and parsing started. Check status with GET /api/admin/pyq/uploads/:id",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pyq/uploads
 * List all PYQ uploads with their status
 */
export const getUploads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = qs(req.query.status as string);
    const year = qs(req.query.year as string);

    const where: any = {};
    if (status) where.status = status;
    if (year) where.year = parseInt(year);

    const uploads = await prisma.pYQUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { email: true, firstName: true } },
        _count: { select: { questions: true } },
      },
    });

    res.json({ status: "success", data: uploads });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pyq/uploads/:id
 * Get upload details with parsing status
 */
export const getUploadDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const upload = await prisma.pYQUpload.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: "asc" },
          include: {
            duplicateOf: { select: { id: true, questionText: true } },
          },
        },
      },
    });

    if (!upload) {
      return res.status(404).json({ status: "error", message: "Upload not found" });
    }

    res.json({ status: "success", data: upload });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pyq/questions
 * List all PYQ questions with filtering
 */
export const getQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = qs(req.query.status as string);
    const subject = qs(req.query.subject as string);
    const year = qs(req.query.year as string);
    const paper = qs(req.query.paper as string);
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "50";

    const where: any = {};
    if (status) where.status = status;
    if (subject) where.subject = { contains: subject, mode: "insensitive" };
    if (year) where.year = parseInt(year);
    if (paper) where.paper = paper;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [questions, total] = await Promise.all([
      prisma.pYQQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.pYQQuestion.count({ where }),
    ]);

    res.json({
      status: "success",
      data: {
        questions,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/pyq/questions/:id
 * Edit a PYQ question
 */
export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { questionText, subject, topic, difficulty, options, correctOption, explanation, status } = req.body;

    const existing = await prisma.pYQQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Question not found" });
    }

    const updateData: any = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (subject !== undefined) updateData.subject = subject;
    if (topic !== undefined) updateData.topic = topic;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (options !== undefined) updateData.options = options;
    if (correctOption !== undefined) updateData.correctOption = correctOption;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (status !== undefined) updateData.status = status;

    const question = await prisma.pYQQuestion.update({
      where: { id },
      data: updateData,
    });

    // If approving, update the upload's approved count
    if (status === "approved" && existing.uploadId) {
      const approvedCount = await prisma.pYQQuestion.count({
        where: { uploadId: existing.uploadId, status: "approved" },
      });
      await prisma.pYQUpload.update({
        where: { id: existing.uploadId },
        data: { totalApproved: approvedCount },
      });
    }

    res.json({ status: "success", data: question });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pyq/questions/bulk-approve
 * Bulk approve/reject questions
 */
export const bulkUpdateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionIds, status } = req.body;

    if (!Array.isArray(questionIds) || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "questionIds (array) and status (approved/rejected) are required",
      });
    }

    await prisma.pYQQuestion.updateMany({
      where: { id: { in: questionIds } },
      data: { status },
    });

    res.json({
      status: "success",
      message: `${questionIds.length} questions updated to '${status}'`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pyq/stats
 * PYQ bank statistics
 */
export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, approved, draft, rejected, bySubject, byYear] = await Promise.all([
      prisma.pYQQuestion.count(),
      prisma.pYQQuestion.count({ where: { status: "approved" } }),
      prisma.pYQQuestion.count({ where: { status: "draft" } }),
      prisma.pYQQuestion.count({ where: { status: "rejected" } }),
      prisma.pYQQuestion.groupBy({
        by: ["subject"],
        _count: { id: true },
        where: { status: "approved" },
      }),
      prisma.pYQQuestion.groupBy({
        by: ["year"],
        _count: { id: true },
        where: { status: "approved" },
        orderBy: { year: "desc" },
      }),
    ]);

    res.json({
      status: "success",
      data: {
        total,
        approved,
        draft,
        rejected,
        bySubject: bySubject.map((s) => ({ subject: s.subject, count: s._count.id })),
        byYear: byYear.map((y) => ({ year: y.year, count: y._count.id })),
      },
    });
  } catch (error) {
    next(error);
  }
};
