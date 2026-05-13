import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── GET /api/support/tickets ────────────────────────────────────────────────

export const getMyTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const data = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      description: t.description,
      category: t.category,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.json({ status: "success", data: { tickets: data, totalCount: data.length } });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: { tickets: [], totalCount: 0 } });
    }
    next(error);
  }
};

// ── POST /api/support/tickets ───────────────────────────────────────────────

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ status: "error", message: "Subject and description are required" });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        description,
        category: category || "general",
        priority: priority || "medium",
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Support service not yet available" });
    }
    next(error);
  }
};

// ── GET /api/support/tickets/:id ────────────────────────────────────────────

export const getTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const ticketId = req.params.id as string;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });

    if (!ticket) {
      return res.status(404).json({ status: "error", message: "Ticket not found" });
    }

    res.json({
      status: "success",
      data: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        adminNotes: ticket.adminNotes,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Ticket not found" });
    }
    next(error);
  }
};

// ── GET /api/support/faq/search ─────────────────────────────────────────────

export const searchFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const category = req.query.category as string;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (query) {
      where.OR = [
        { question: { contains: query, mode: "insensitive" } },
        { answer: { contains: query, mode: "insensitive" } },
      ];
    }

    const faqs = await prisma.faq.findMany({
      where,
      orderBy: { order: "asc" },
      take: 20,
    });

    const data = faqs.map((f) => ({
      id: f.id,
      category: f.category,
      question: f.question,
      answer: f.answer,
    }));

    res.json({ status: "success", data, totalCount: data.length });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: [], totalCount: 0 });
    }
    next(error);
  }
};

// ── GET /api/support/faq ────────────────────────────────────────────────────

export const getFaqByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const faqs = await prisma.faq.findMany({
      where,
      orderBy: { order: "asc" },
    });

    const data = faqs.map((f) => ({
      id: f.id,
      category: f.category,
      question: f.question,
      answer: f.answer,
    }));

    res.json({ status: "success", data });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: [] });
    }
    next(error);
  }
};

// ── POST /api/support/faq/:id/helpful ───────────────────────────────────────

export const markFaqHelpful = async (req: Request, res: Response, next: NextFunction) => {
  // Best-effort tracking — no schema field yet, just acknowledge
  res.json({ status: "success", message: "Thank you for your feedback" });
};
