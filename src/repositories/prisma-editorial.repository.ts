import prisma from "../config/database";
import type {
  EditorialRepository,
  EditorialRow,
  EditorialProgressRow,
  EditorialBookmarkRow,
  EditorialStats,
} from "./editorial.repository";

/**
 * Prisma adapter for EditorialRepository.
 * Production implementation — all database access for editorials through this module.
 */
export function createPrismaEditorialRepository(): EditorialRepository {
  return {
    async getRecent(since, until, source, limit = 60) {
      const where: any = {
        publishedAt: until ? { gte: since, lte: until } : { gte: since },
      };
      if (source && source !== "all") {
        where.source = source;
      }

      return prisma.editorial.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
      }) as unknown as EditorialRow[];
    },

    async getById(id) {
      const row = await prisma.editorial.findUnique({ where: { id } });
      return (row as EditorialRow | null) ?? null;
    },

    async getProgress(userId, editorialIds) {
      return prisma.editorialProgress.findMany({
        where: { userId, editorialId: { in: editorialIds } },
        select: { editorialId: true, isRead: true },
      });
    },

    async getBookmarks(userId, editorialIds) {
      return prisma.editorialBookmark.findMany({
        where: { userId, editorialId: { in: editorialIds } },
        select: { editorialId: true },
      });
    },

    async markRead(userId, editorialId) {
      await prisma.editorialProgress.upsert({
        where: { userId_editorialId: { userId, editorialId } },
        create: { userId, editorialId, isRead: true, readAt: new Date() },
        update: { isRead: true, readAt: new Date() },
      });

      await prisma.userActivity.create({
        data: {
          userId,
          type: "editorial",
          title: "Read Editorial",
          metadata: { editorialId },
        },
      });
    },

    async toggleSave(userId, editorialId): Promise<boolean> {
      const existing = await prisma.editorialBookmark.findUnique({
        where: { userId_editorialId: { userId, editorialId } },
      });

      if (existing) {
        await prisma.editorialBookmark.delete({ where: { id: existing.id } });
        return false;
      }

      await prisma.editorialBookmark.create({ data: { userId, editorialId } });
      return true;
    },

    async getStats(userId, recentSince): Promise<EditorialStats> {
      const totalRead = await prisma.editorialProgress.count({
        where: { userId, isRead: true },
      });

      const totalSaved = await prisma.editorialBookmark.count({ where: { userId } });

      // Monday as the first day of the current week (local server time).
      const weekStart = new Date();
      const dow = weekStart.getDay(); // 0 = Sun, 1 = Mon, ...
      weekStart.setDate(weekStart.getDate() - ((dow + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);

      const weeklyRead = await prisma.editorialProgress.count({
        where: { userId, isRead: true, readAt: { gte: weekStart } },
      });

      // Editorials read since local midnight today.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const readToday = await prisma.editorialProgress.count({
        where: { userId, isRead: true, readAt: { gte: todayStart } },
      });

      // Real per-day activity strip for the current week (Mon..Sun).
      const weekRows = await prisma.editorialProgress.findMany({
        where: { userId, isRead: true, readAt: { gte: weekStart } },
        select: { readAt: true },
      });
      const weekChecks = Array.from({ length: 7 }, () => false);
      for (const row of weekRows) {
        if (!row.readAt) continue;
        const dayIndex = Math.floor(
          (row.readAt.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (dayIndex >= 0 && dayIndex < 7) weekChecks[dayIndex] = true;
      }

      const streakRow = await prisma.userStreak.findUnique({ where: { userId } });

      const [hindu, express, ai, read] = await Promise.all([
        prisma.editorial.count({ where: { source: "The Hindu", publishedAt: { gte: recentSince } } }),
        prisma.editorial.count({ where: { source: "Indian Express", publishedAt: { gte: recentSince } } }),
        prisma.editorial.count({ where: { aiSummary: { not: null }, publishedAt: { gte: recentSince } } }),
        prisma.editorialProgress.count({ where: { userId, isRead: true, readAt: { gte: recentSince } } }),
      ]);

      // Get saved items with editorial details
      const savedBookmarks = await prisma.editorialBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { editorial: true },
      });

      const savedItems = savedBookmarks.map((b) => ({
        id: b.editorialId,
        title: b.editorial.title,
        summary: b.editorial.summary,
        source: b.editorial.source,
        category: b.editorial.category || "General",
        tags: b.editorial.tags || [],
        savedAt: b.createdAt.toISOString(),
      }));

      return {
        totalRead,
        totalSaved,
        weeklyRead,
        streak: streakRow?.currentStreak || 0,
        readToday,
        dailyTarget: 7,
        weekChecks,
        todayCounts: { hindu, express, aiSummarized: ai, userRead: read },
        savedItems,
      };
    },

    async getAvailabilityRows(since, until, source) {
      const where: any = {
        publishedAt: { gte: since, lte: until },
      };
      if (source && source !== "all") {
        where.source = source;
      }

      return prisma.editorial.findMany({
        where,
        select: { title: true, summary: true, content: true, publishedAt: true, category: true },
        orderBy: { publishedAt: "asc" },
      });
    },

    async findBySourceUrl(url) {
      return prisma.editorial.findFirst({
        where: { sourceUrl: url },
        select: { id: true },
      });
    },

    async create(row) {
      const created = await prisma.editorial.create({ data: row });
      return created as EditorialRow;
    },
  };
}

/** Singleton instance for the application. */
export const editorialRepo = createPrismaEditorialRepository();
