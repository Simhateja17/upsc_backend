import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { uploadFile, STORAGE_BUCKETS } from "../../config/storage";
import { parsePYQPdf, PYQParseMode } from "../../services/pyqParser";
import { vectorizeAllPYQs } from "../../services/pyqVectorizer";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

function getMode(input: unknown): PYQParseMode {
  return String(input || "prelims").toLowerCase() === "mains" ? "mains" : "prelims";
}

async function createPYQUploadCompat(data: {
  fileName: string;
  fileUrl: string;
  year: number;
  paper: string;
  mode: PYQParseMode;
  status: string;
  uploadedById: string;
}) {
  try {
    return await prisma.pYQUpload.create({
      data: {
        ...data,
        errorMessage: null,
      } as any,
    });
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message.includes("Unknown argument `errorMessage`")) {
      return prisma.pYQUpload.create({ data: data as any });
    }
    throw err;
  }
}

/**
 * POST /api/admin/pyq/upload
 * Upload a PYQ PDF for AI parsing
 */
export const uploadPYQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const mode = getMode(req.body?.mode);

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "PDF file is required" });
    }

    const fileName = `pyq_${Date.now()}.pdf`;
    const filePath = `uploads/${fileName}`;

    await uploadFile(STORAGE_BUCKETS.PYQ_PDFS, filePath, req.file.buffer, "application/pdf");

    const upload = await createPYQUploadCompat({
      fileName: req.file.originalname,
      fileUrl: filePath,
      year: 0,
      paper: "unknown",
      mode,
      status: "processing",
      uploadedById: userId,
    });

    parsePYQPdf(upload.id, req.file.buffer, mode).catch((err) => console.error("PYQ parsing error:", err));

    res.status(201).json({
      status: "success",
      data: { uploadId: upload.id, status: "processing", mode },
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
    const mode = qs(req.query.mode as string);

    const where: any = {};
    if (status) where.status = status;
    if (year) where.year = parseInt(year);
    if (mode) where.mode = getMode(mode);

    const uploads = await prisma.pYQUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { email: true, firstName: true } },
        _count: { select: { questions: true, mainsQuestions: true } },
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
        mainsQuestions: {
          orderBy: { createdAt: "asc" },
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
    const mode = getMode(qs(req.query.mode as string));
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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [questions, total] = await Promise.all(
      mode === "mains"
        ? [
            prisma.pYQMainsQuestion.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip,
              take: parseInt(limit),
            }),
            prisma.pYQMainsQuestion.count({ where }),
          ]
        : [
            prisma.pYQQuestion.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip,
              take: parseInt(limit),
            }),
            prisma.pYQQuestion.count({ where }),
          ]
    );

    res.json({
      status: "success",
      data: {
        questions,
        mode,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
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
    const mode = getMode(qs(req.query.mode as string));
    const { questionText, subject, topic, difficulty, options, correctOption, explanation, status } = req.body;

    const existing =
      mode === "mains"
        ? await prisma.pYQMainsQuestion.findUnique({ where: { id } })
        : await prisma.pYQQuestion.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ status: "error", message: "Question not found" });
    }

    const updateData: any = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (subject !== undefined) updateData.subject = subject;
    if (topic !== undefined) updateData.topic = topic;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (status !== undefined) updateData.status = status;

    if (mode !== "mains") {
      if (options !== undefined) updateData.options = options;
      if (correctOption !== undefined) updateData.correctOption = correctOption;
      if (explanation !== undefined) updateData.explanation = explanation;
    }

    const question =
      mode === "mains"
        ? await prisma.pYQMainsQuestion.update({ where: { id }, data: updateData })
        : await prisma.pYQQuestion.update({ where: { id }, data: updateData });

    if (status === "approved" && existing.uploadId) {
      const approvedCount =
        mode === "mains"
          ? await prisma.pYQMainsQuestion.count({
              where: { uploadId: existing.uploadId, status: "approved" },
            })
          : await prisma.pYQQuestion.count({
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
    const mode = getMode(qs(req.query.mode as string));
    const questionIds = req.body.questionIds || req.body.ids;
    const { status } = req.body;

    if (!Array.isArray(questionIds) || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "questionIds (array) and status (approved/rejected) are required",
      });
    }

    if (mode === "mains") {
      await prisma.pYQMainsQuestion.updateMany({
        where: { id: { in: questionIds } },
        data: { status },
      });
    } else {
      await prisma.pYQQuestion.updateMany({
        where: { id: { in: questionIds } },
        data: { status },
      });
    }

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
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = getMode(qs(req.query.mode as string));
    const isMains = mode === "mains";

    const [total, approved, draft, rejected, bySubject, byYear] = await Promise.all(
      isMains
        ? [
            prisma.pYQMainsQuestion.count(),
            prisma.pYQMainsQuestion.count({ where: { status: "approved" } }),
            prisma.pYQMainsQuestion.count({ where: { status: "draft" } }),
            prisma.pYQMainsQuestion.count({ where: { status: "rejected" } }),
            prisma.pYQMainsQuestion.groupBy({
              by: ["subject"],
              _count: { id: true },
              where: { status: "approved" },
            }),
            prisma.pYQMainsQuestion.groupBy({
              by: ["year"],
              _count: { id: true },
              where: { status: "approved" },
              orderBy: { year: "desc" },
            }),
          ]
        : [
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
          ]
    );

    res.json({
      status: "success",
      data: {
        mode,
        total,
        approved,
        draft,
        rejected,
        bySubject: bySubject.map((s: any) => ({ subject: s.subject, count: s._count.id })),
        byYear: byYear.map((y: any) => ({ year: y.year, count: y._count.id })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pyq/vectorize
 * Trigger batch vectorization of all approved PYQs without embeddings.
 * Runs asynchronously and returns immediately.
 */
export const triggerPYQVectorization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: "success", message: "PYQ vectorization started in background" });

    vectorizeAllPYQs()
      .then(({ processed, failed }) => {
        console.log(`PYQ vectorization complete: ${processed} processed, ${failed} failed`);
      })
      .catch((err) => {
        console.error("PYQ vectorization error:", err);
      });
  } catch (error) {
    next(error);
  }
};
