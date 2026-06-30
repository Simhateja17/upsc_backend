import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── POST /api/flags ─────────────────────────────────────────────────────────

export const toggleFlag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { questionType, questionId, questionText, reason } = req.body;

    if (!questionType || !questionId || !questionText) {
      return res.status(400).json({ status: "error", message: "questionType, questionId, and questionText are required" });
    }

    const existing = await prisma.questionFlag.findUnique({
      where: { userId_questionType_questionId: { userId, questionType, questionId } },
    });

    if (existing) {
      await prisma.questionFlag.delete({ where: { id: existing.id } });
      return res.json({ status: "success", data: { isFlagged: false } });
    }

    await prisma.questionFlag.create({
      data: { userId, questionType, questionId, questionText, reason: reason || null },
    });

    res.json({ status: "success", data: { isFlagged: true } });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Flags service not yet available" });
    }
    next(error);
  }
};

// ── GET /api/flags/check ─────────────────────────────────────────────────────

export const checkFlags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const questionType = req.query.questionType as string;
    const ids = ((req.query.ids as string) || "").split(",").filter(Boolean);

    if (!questionType || ids.length === 0) {
      return res.status(400).json({ status: "error", message: "questionType and ids query params are required" });
    }

    const flags = await prisma.questionFlag.findMany({
      where: { userId, questionType, questionId: { in: ids } },
      select: { questionId: true },
    });

    const flagged: Record<string, boolean> = {};
    for (const f of flags) flagged[f.questionId] = true;

    res.json({ status: "success", data: { flagged } });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: { flagged: {} } });
    }
    next(error);
  }
};
