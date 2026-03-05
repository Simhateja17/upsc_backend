import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { runEditorialScraper } from "../../services/editorialScraper";
import { summarizeEditorial } from "../../services/editorialSummarizer";

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

/**
 * GET /api/admin/editorials
 * List all editorials with filtering
 */
export const getEditorials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const source = qs(req.query.source as string);
    const category = qs(req.query.category as string);
    const date = qs(req.query.date as string);
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "20";

    const where: any = {};
    if (source) where.source = source;
    if (category) where.category = category;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.publishedAt = { gte: d, lt: nextDay };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [editorials, total] = await Promise.all([
      prisma.editorial.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.editorial.count({ where }),
    ]);

    res.json({
      status: "success",
      data: {
        editorials,
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
 * POST /api/admin/editorials
 * Manually add an editorial
 */
export const createEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, source, sourceUrl, category, summary, content, tags } = req.body;

    if (!title || !source || !category) {
      return res.status(400).json({
        status: "error",
        message: "Title, source, and category are required",
      });
    }

    const editorial = await prisma.editorial.create({
      data: {
        title,
        source,
        sourceUrl,
        category,
        summary,
        content,
        tags: tags || [category, source],
        publishedAt: new Date(),
      },
    });

    res.status(201).json({ status: "success", data: editorial });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/editorials/:id
 * Edit an editorial
 */
export const updateEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, source, sourceUrl, category, summary, content, tags } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (source !== undefined) updateData.source = source;
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (category !== undefined) updateData.category = category;
    if (summary !== undefined) updateData.summary = summary;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    const editorial = await prisma.editorial.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: "success", data: editorial });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/editorials/:id
 */
export const deleteEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.editorial.delete({ where: { id } });
    res.json({ status: "success", message: "Editorial deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/editorials/scrape
 * Trigger editorial scraping manually
 */
export const triggerScrape = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await runEditorialScraper();
    res.json({
      status: "success",
      message: `Scraping complete. ${count} new editorials saved.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/editorials/:id/summarize
 * Trigger AI summarization for an editorial
 */
export const triggerSummarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Clear existing summary to force regeneration
    await prisma.editorial.update({
      where: { id },
      data: { aiSummary: null },
    });

    const summary = await summarizeEditorial(id);

    res.json({ status: "success", data: { summary } });
  } catch (error) {
    next(error);
  }
};
