import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getContactSubmissionsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: submissions });
  } catch (error) {
    next(error);
  }
};

export const updateContactSubmissionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    if (!status?.trim()) {
      return res.status(400).json({ status: "error", message: "status is required" });
    }
    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: { status: status.trim() },
    });
    res.json({ status: "success", data: submission });
  } catch (error) {
    next(error);
  }
};
