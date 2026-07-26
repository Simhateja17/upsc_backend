import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getFeedbackAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    res.json({ status: "success", data: feedback });
  } catch (error) {
    next(error);
  }
};
