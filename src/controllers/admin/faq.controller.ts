import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getFaqsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: "asc", createdAt: "desc" } });
    res.json({ status: "success", data: faqs });
  } catch (error) {
    next(error);
  }
};

export const createFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, question, answer, order } = req.body;
    if (!category || !question || !answer) {
      return res.status(400).json({ status: "error", message: "category, question, and answer are required" });
    }
    const faq = await prisma.faq.create({ data: { category, question, answer, order: order ?? 0 } });
    res.status(201).json({ status: "success", data: faq });
  } catch (error) {
    next(error);
  }
};

export const updateFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { category, question, answer, order, isActive } = req.body;
    const data: any = {};
    if (category !== undefined) data.category = category;
    if (question !== undefined) data.question = question;
    if (answer !== undefined) data.answer = answer;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    const faq = await prisma.faq.update({ where: { id }, data });
    res.json({ status: "success", data: faq });
  } catch (error) {
    next(error);
  }
};

export const deleteFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.faq.delete({ where: { id } });
    res.json({ status: "success", message: "FAQ deleted" });
  } catch (error) {
    next(error);
  }
};
