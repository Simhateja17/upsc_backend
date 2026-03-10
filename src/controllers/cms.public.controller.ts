import { Request, Response } from "express";
import prisma from "../config/database";

// GET /cms/:slug — Returns published page sections (no auth)
export const getPageContent = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);

    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { key: true, type: true, content: true },
        },
      },
    });

    if (!page || !page.isPublished) {
      return res.status(404).json({ status: "error", message: "Page not found" });
    }

    // Convert sections array to key-value map for easy frontend consumption
    const content: Record<string, any> = {};
    for (const section of page.sections) {
      if (section.type === "json") {
        try {
          content[section.key] = JSON.parse(section.content);
        } catch {
          content[section.key] = section.content;
        }
      } else {
        content[section.key] = section.content;
      }
    }

    res.json({
      status: "success",
      data: { slug: page.slug, title: page.title, content },
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
