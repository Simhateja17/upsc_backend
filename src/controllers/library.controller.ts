import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { getSignedUrl, STORAGE_BUCKETS } from "../config/storage";

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

    let downloadUrl = material.fileUrl;
    if (material.fileUrl && !material.fileUrl.startsWith("http")) {
      downloadUrl = await getSignedUrl(STORAGE_BUCKETS.STUDY_MATERIALS, material.fileUrl, 3600);
    }

    res.json({ status: "success", data: { id: material.id, title: material.title, fileUrl: downloadUrl, downloadUrl } });
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
