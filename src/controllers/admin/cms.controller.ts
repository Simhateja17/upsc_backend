import { Request, Response } from "express";
import prisma from "../../config/database";
import { STORAGE_BUCKETS, uploadFile, getPublicUrl } from "../../config/storage";

// GET /admin/cms/pages — List all pages with section counts
export const getPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { sections: true } } },
    });

    res.json({
      status: "success",
      data: pages.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        isPublished: p.isPublished,
        sectionCount: p._count.sections,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET /admin/cms/pages/:slug — Get page with all sections
export const getPage = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);

    const page = await prisma.page.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    if (!page) {
      return res.status(404).json({ status: "error", message: "Page not found" });
    }

    res.json({ status: "success", data: page });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PUT /admin/cms/sections/:id — Update a single section
export const updateSection = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { content, type, isActive, order } = req.body;

    const section = await prisma.pageSection.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ status: "success", data: section });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// POST /admin/cms/sections — Add new section to a page
export const createSection = async (req: Request, res: Response) => {
  try {
    const { pageId, key, type, content, order } = req.body;

    if (!pageId || !key) {
      return res.status(400).json({ status: "error", message: "pageId and key are required" });
    }

    const section = await prisma.pageSection.create({
      data: {
        pageId,
        key,
        type: type || "text",
        content: content || "",
        order: order || 0,
      },
    });

    res.json({ status: "success", data: section });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ status: "error", message: "Section with this key already exists for this page" });
    }
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DELETE /admin/cms/sections/:id — Remove a section
export const deleteSection = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.pageSection.delete({ where: { id } });
    res.json({ status: "success", message: "Section deleted" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PUT /admin/cms/pages/:slug/bulk — Update multiple sections at once
export const bulkUpdateSections = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      return res.status(400).json({ status: "error", message: "sections must be an array" });
    }

    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      return res.status(404).json({ status: "error", message: "Page not found" });
    }

    const results = await Promise.all(
      sections.map((s: { id: string; content?: string; type?: string; isActive?: boolean; order?: number }) =>
        prisma.pageSection.update({
          where: { id: s.id },
          data: {
            ...(s.content !== undefined && { content: s.content }),
            ...(s.type !== undefined && { type: s.type }),
            ...(s.isActive !== undefined && { isActive: s.isActive }),
            ...(s.order !== undefined && { order: s.order }),
          },
        })
      )
    );

    res.json({ status: "success", data: results });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// POST /admin/cms/upload — Upload media to CMS bucket, returns public URL
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No file uploaded" });
    }

    const ext = req.file.originalname.split(".").pop() || "png";
    const path = `cms/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await uploadFile(
      STORAGE_BUCKETS.CMS_MEDIA,
      path,
      req.file.buffer,
      req.file.mimetype
    );

    const url = getPublicUrl(STORAGE_BUCKETS.CMS_MEDIA, path);

    res.json({ status: "success", data: { url, path } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
