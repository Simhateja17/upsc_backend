import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * GET /api/syllabus
 * Returns all syllabus subjects grouped by stage (prelims, mains, optional)
 * with topics and sub-topics included.
 */
export const getSyllabus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.syllabusSubject.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
          include: {
            subTopics: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    // Group by stage and transform to frontend-expected shape
    const grouped: Record<string, any[]> = { prelims: [], mains: [], optional: [] };

    for (const subj of subjects) {
      const stage = subj.stage as string;
      if (!grouped[stage]) grouped[stage] = [];

      grouped[stage].push({
        id: subj.id,
        name: subj.name,
        short: subj.short,
        icon: subj.icon,
        color: subj.color,
        bg: subj.bg,
        topics: subj.topics.map((t) => ({
          name: t.name,
          subs: t.subTopics.map((st) => st.name),
        })),
      });
    }

    res.json({ status: "success", data: grouped });
  } catch (error) {
    next(error);
  }
};
