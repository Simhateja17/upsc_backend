import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { downloadFile, getSignedUrl, getSignedUrls, listFiles, uploadFile, STORAGE_BUCKETS } from "../config/storage";
import { renderPdfPagesToImages } from "../config/gemini";

function hasAccess(userPlan: string, accessLevel: string): boolean {
  if (accessLevel === "free") return true;
  if (accessLevel === "trial") return ["trial", "pro", "pro-annual", "paid"].includes(userPlan);
  if (accessLevel === "paid") return ["pro", "pro-annual", "paid"].includes(userPlan);
  return false;
}

async function getUserPlan(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      settings: true,
      subscriptions: {
        where: { status: "active", endDate: { gt: new Date() } },
        take: 1,
        select: { id: true },
      },
    },
  });
  const settings = (user?.settings as any) || {};
  const sub = settings.subscription || {};
  if (sub.plan === "trial" && sub.trialEndsOn && new Date(sub.trialEndsOn) > new Date()) return "trial";
  if (["pro", "pro-annual", "paid"].includes(sub.plan) && ["active", "trial"].includes(sub.status)) return sub.plan;
  if ((user?.subscriptions?.length || 0) > 0) return "paid";
  return "free";
}

function publicMaterial(material: any, userPlan = "free") {
  const allowed = hasAccess(userPlan, material.accessLevel || "free");
  return {
    id: material.id,
    title: material.title,
    type: material.type,
    description: material.description,
    accessLevel: material.accessLevel,
    isLocked: !allowed,
    fileSize: material.fileSize,
    pageCount: material.pageCount,
    order: material.order,
    createdAt: material.createdAt,
  };
}

/**
 * GET /api/library/subjects
 * Subjects with PDF counts and tags
 */
export const getSubjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.syllabusSubject.findMany({
      where: { stage: "prelims" },
      orderBy: { sortOrder: "asc" },
      include: {
        topics: {
          include: {
            subTopics: {
              include: {
                studyMaterials: {
                  where: { isPublished: true },
                  select: { id: true, pageCount: true },
                },
              },
            },
          },
        },
      },
    });

    const data = subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      short: s.short,
      icon: s.icon,
      color: s.color,
      bg: s.bg,
      description: `${s.topics.length} sub-subjects mapped from the Prelims syllabus.`,
      tags: ["Prelims"],
      chapterCount: s.topics.length,
      pdfCount: s.topics.reduce(
        (sum: number, t: any) => sum + t.subTopics.reduce((inner: number, st: any) => inner + st.studyMaterials.length, 0),
        0
      ),
      pageCount: s.topics.reduce(
        (sum: number, t: any) => sum + t.subTopics.reduce((inner: number, st: any) => inner + st.studyMaterials.reduce((p: number, m: any) => p + (m.pageCount || 0), 0), 0),
        0
      ),
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/library/subjects/:id/chapters
 * Chapters for a subject
 */
export const getChapters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userPlan = req.user?.id ? await getUserPlan(req.user.id) : "free";
    console.log(`[Library] Fetching topic tree for subject: ${id}`);

    const subject = await prisma.syllabusSubject.findUnique({
      where: { id },
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
          include: {
            subTopics: {
              orderBy: { sortOrder: "asc" },
              include: {
                studyMaterials: {
                  where: { isPublished: true },
                  orderBy: [{ order: "asc" }, { createdAt: "desc" }],
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ status: "error", message: "Subject not found" });
    }

    const subSubjects = subject.topics.map((topic) => ({
      id: topic.id,
      title: topic.name,
      name: topic.name,
      order: topic.sortOrder,
      topics: topic.subTopics.map((subTopic) => ({
        id: subTopic.id,
        title: subTopic.name,
        name: subTopic.name,
        order: subTopic.sortOrder,
        materials: subTopic.studyMaterials.map((material) => publicMaterial(material, userPlan)),
      })),
    }));

    res.json({ status: "success", data: { subject: { id: subject.id, name: subject.name }, chapters: subSubjects, subSubjects } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/library/download/material/:materialId
 * PDF download URL
 */
export const getMaterialDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materialId = req.params.materialId as string;
    console.log(`[Library] Download requested for material: ${materialId}`);

    const material = await prisma.studyMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material || !material.isPublished) {
      return res.status(404).json({ status: "error", message: "Material not found" });
    }

    const userPlan = await getUserPlan(req.user!.id);
    if (!hasAccess(userPlan, material.accessLevel || "free")) {
      return res.status(403).json({ status: "error", message: "Upgrade required to access this PDF" });
    }

    let viewUrl = material.fileUrl;
    if (material.fileUrl && !material.fileUrl.startsWith("http")) {
      // inline=true → Content-Disposition: inline so the browser renders it in the iframe
      viewUrl = await getSignedUrl(STORAGE_BUCKETS.STUDY_MATERIALS, material.fileUrl, 3600, true);
    }

    res.json({ status: "success", data: { id: material.id, title: material.title, fileUrl: viewUrl, downloadUrl: viewUrl } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/library/view/material/:materialId/pages
 * Protected in-app reader pages. Returns rendered PNG pages instead of the raw PDF.
 */
export const getMaterialViewPages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materialId = req.params.materialId as string;
    const maxPages = Math.min(Math.max(Number(req.query.maxPages || 20), 1), 50);

    const material = await prisma.studyMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material || !material.isPublished) {
      return res.status(404).json({ status: "error", message: "Material not found" });
    }

    const userPlan = await getUserPlan(req.user!.id);
    if (!hasAccess(userPlan, material.accessLevel || "free")) {
      return res.status(403).json({ status: "error", message: "Upgrade required to access this PDF" });
    }

    // Rendering a PDF to page images is the expensive part of this endpoint
    // (CPU-heavy at scale:2, plus a full PDF download). Cache the rendered
    // pages in storage on first open so every later "Read" just fetches
    // already-rendered images instead of re-rendering the whole document.
    const cachePrefix = `rendered-pages/${materialId}`;
    const cachedNames = await listFiles(STORAGE_BUCKETS.STUDY_MATERIALS, cachePrefix).catch(() => []);
    const cachedPageNumbers = cachedNames
      .map((name) => Number(name.replace(/^page-/, "").replace(/\.png$/, "")))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    if (cachedPageNumbers.length > 0) {
      const pageNumbers = cachedPageNumbers.slice(0, maxPages);
      const paths = pageNumbers.map((n) => `${cachePrefix}/page-${n}.png`);
      const urls = await getSignedUrls(STORAGE_BUCKETS.STUDY_MATERIALS, paths, 3600, true);

      return res.json({
        status: "success",
        data: {
          id: material.id,
          title: material.title,
          totalPages: material.pageCount || cachedPageNumbers.length,
          renderedPages: pageNumbers.length,
          pages: pageNumbers.map((pageNumber, index) => ({
            pageNumber,
            mimeType: "image/png",
            url: urls[index],
          })),
        },
      });
    }

    let pdfBuffer: Buffer;
    if (material.fileUrl?.startsWith("http")) {
      const response = await fetch(material.fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      pdfBuffer = Buffer.from(await response.arrayBuffer());
    } else if (material.fileUrl) {
      const file = await downloadFile(STORAGE_BUCKETS.STUDY_MATERIALS, material.fileUrl);
      pdfBuffer = file.buffer;
    } else {
      return res.status(404).json({ status: "error", message: "PDF file not found" });
    }

    const images = await renderPdfPagesToImages(pdfBuffer, maxPages);

    await Promise.all(
      images.map((buffer, index) =>
        uploadFile(STORAGE_BUCKETS.STUDY_MATERIALS, `${cachePrefix}/page-${index + 1}.png`, buffer, "image/png")
      )
    ).catch((err) => console.warn("[LIBRARY] Failed to cache rendered pages:", err.message));

    const freshPaths = images.map((_, index) => `${cachePrefix}/page-${index + 1}.png`);
    const freshUrls = await getSignedUrls(STORAGE_BUCKETS.STUDY_MATERIALS, freshPaths, 3600, true);

    res.json({
      status: "success",
      data: {
        id: material.id,
        title: material.title,
        totalPages: material.pageCount || images.length,
        renderedPages: images.length,
        pages: images.map((_, index) => ({
          pageNumber: index + 1,
          mimeType: "image/png",
          url: freshUrls[index] || `data:image/png;base64,${images[index].toString("base64")}`,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy chapter download endpoint. Returns signed URLs for all accessible
 * materials under a legacy chapter, preserving old clients during migration.
 */
export const getDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = req.params.chapterId as string;
    const userPlan = await getUserPlan(req.user!.id);
    const materials = await prisma.studyMaterial.findMany({
      where: { chapterId, isPublished: true },
    });

    const materialsWithUrls = await Promise.all(
      materials.filter((m) => hasAccess(userPlan, m.accessLevel || "free")).map(async (m) => {
        let downloadUrl = m.fileUrl;
        if (m.fileUrl && !m.fileUrl.startsWith("http")) {
          downloadUrl = await getSignedUrl(STORAGE_BUCKETS.STUDY_MATERIALS, m.fileUrl, 3600);
        }
        return { id: m.id, title: m.title, type: m.type, fileUrl: downloadUrl, fileSize: m.fileSize, pageCount: m.pageCount };
      })
    );

    res.json({ status: "success", data: materialsWithUrls });
  } catch (error) {
    next(error);
  }
};
