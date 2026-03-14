import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { summarizeEditorial } from "../services/editorialSummarizer";
import { getNewsArticlesBySource, syncNewsToEditorials } from "../services/newsApi";

/**
 * GET /api/editorials/today
 * Today's editorial list
 */
export const getTodayEditorials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, limit } = req.query;
    console.log(`[Editorial] Fetching today's editorials, source: ${source || "all"}, limit: ${limit || 30}`);

    // Show articles from the last 24 hours so RSS articles fetched today are always included
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const where: any = {
      publishedAt: { gte: since },
    };
    if (source && source !== "all") {
      where.source = source as string;
    }

    const editorials = await prisma.editorial.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit ? parseInt(limit as string) : 30,
    });

    // If user is authenticated, include their progress
    let progressMap: Record<string, { isRead: boolean; isSaved: boolean }> = {};
    if (req.user) {
      const [progress, bookmarks] = await Promise.all([
        prisma.editorialProgress.findMany({
          where: { userId: req.user.id, editorialId: { in: editorials.map(e => e.id) } },
        }),
        prisma.editorialBookmark.findMany({
          where: { userId: req.user.id, editorialId: { in: editorials.map(e => e.id) } },
        }),
      ]);
      for (const p of progress) {
        progressMap[p.editorialId] = { isRead: p.isRead, isSaved: false };
      }
      for (const b of bookmarks) {
        if (!progressMap[b.editorialId]) progressMap[b.editorialId] = { isRead: false, isSaved: true };
        else progressMap[b.editorialId].isSaved = true;
      }
    }

    const data = editorials.map(e => ({
      ...e,
      isRead: progressMap[e.id]?.isRead || false,
      isSaved: progressMap[e.id]?.isSaved || false,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/:id
 * Individual editorial content
 */
export const getEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const editorial = await prisma.editorial.findUnique({ where: { id } });

    if (!editorial) {
      return res.status(404).json({ status: "error", message: "Editorial not found" });
    }

    res.json({ status: "success", data: editorial });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/mark-read
 */
export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    console.log(`[Editorial] Mark read: editorial ${id} by user ${userId}`);

    await prisma.editorialProgress.upsert({
      where: { userId_editorialId: { userId, editorialId: id } },
      create: { userId, editorialId: id, isRead: true, readAt: new Date() },
      update: { isRead: true, readAt: new Date() },
    });

    await prisma.userActivity.create({
      data: { userId, type: "editorial", title: "Read Editorial", metadata: { editorialId: id } },
    });

    res.json({ status: "success", message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/save
 * Toggle save/bookmark
 */
export const toggleSave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.editorialBookmark.findUnique({
      where: { userId_editorialId: { userId, editorialId: id } },
    });

    if (existing) {
      await prisma.editorialBookmark.delete({ where: { id: existing.id } });
      res.json({ status: "success", data: { saved: false } });
    } else {
      await prisma.editorialBookmark.create({ data: { userId, editorialId: id } });
      res.json({ status: "success", data: { saved: true } });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/summarize
 * AI summary generation (placeholder)
 */
export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    console.log(`[Editorial] AI summarize requested for: ${id}`);
    const editorial = await prisma.editorial.findUnique({ where: { id } });

    if (!editorial) {
      return res.status(404).json({ status: "error", message: "Editorial not found" });
    }

    // Use AI summarization service (returns cached if already summarized)
    const summary = await summarizeEditorial(editorial.id);

    res.json({ status: "success", data: { summary } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/stats
 * Reading stats for user
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const totalRead = await prisma.editorialProgress.count({
      where: { userId, isRead: true },
    });

    const totalSaved = await prisma.editorialBookmark.count({ where: { userId } });

    // Weekly count
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyRead = await prisma.editorialProgress.count({
      where: { userId, isRead: true, readAt: { gte: weekStart } },
    });

    const streak = await prisma.userStreak.findUnique({ where: { userId } });

    // Today's counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayHinduCount, todayExpressCount, todayAiCount, todayReadCount] = await Promise.all([
      prisma.editorial.count({ where: { source: 'The Hindu', publishedAt: { gte: todayStart } } }),
      prisma.editorial.count({ where: { source: 'Indian Express', publishedAt: { gte: todayStart } } }),
      prisma.editorial.count({ where: { aiSummary: { not: null }, publishedAt: { gte: todayStart } } }),
      prisma.editorialProgress.count({ where: { userId, isRead: true, readAt: { gte: todayStart } } }),
    ]);

    res.json({
      status: "success",
      data: {
        totalRead,
        totalSaved,
        weeklyRead,
        weeklyTarget: 7,
        streak: streak?.currentStreak || 0,
        todayHinduCount,
        todayExpressCount,
        todayAiCount,
        todayReadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/live-news
 * Fetch live news from News API (real-time data)
 */
export const getLiveNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source } = req.query;
    
    // Determine which source to fetch from
    let sourceType: 'hindu' | 'express' | 'general' = 'general';
    if (source === 'The Hindu') sourceType = 'hindu';
    else if (source === 'Indian Express') sourceType = 'express';

    // Fetch articles from News API
    const articles = await getNewsArticlesBySource(sourceType);

    // Transform News API articles to match our Editorial format
    const transformedArticles = articles.map(article => {
      const category = categorizeArticle(article);
      const tags = extractArticleTags(article);

      return {
        id: Buffer.from(article.url).toString('base64').slice(0, 16), // Generate temp ID from URL
        title: article.title,
        source: article.source.name || sourceType,
        sourceUrl: article.url,
        category,
        summary: article.description || null,
        content: article.content || null,
        tags,
        publishedAt: article.publishedAt,
        isRead: false,
        isSaved: false,
      };
    });

    res.json({ status: "success", data: transformedArticles });
  } catch (error: any) {
    console.error('[Editorial] Error fetching live news:', error.message);
    // Fallback to database if News API fails
    try {
      const { source } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: any = {
        publishedAt: { gte: today, lt: tomorrow },
      };
      if (source && source !== "all") {
        where.source = source as string;
      }

      const editorials = await prisma.editorial.findMany({
        where,
        orderBy: { publishedAt: "desc" },
      });

      const data = editorials.map(e => ({
        ...e,
        isRead: false,
        isSaved: false,
      }));

      res.json({ status: "success", data });
    } catch (fallbackError) {
      next(fallbackError);
    }
  }
};

/**
 * POST /api/editorials/sync-news
 * Manually trigger sync of News API articles to database
 */
export const syncNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("[Editorial] Manual news sync triggered");
    const count = await syncNewsToEditorials();
    res.json({ 
      status: "success", 
      message: `Synced ${count} new articles from News API`,
      data: { syncedCount: count }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions for categorization
function categorizeArticle(article: any): string {
  const title = article.title?.toLowerCase() || '';
  const description = article.description?.toLowerCase() || '';
  const content = `${title} ${description}`;

  if (content.match(/economy|gdp|inflation|fiscal|monetary|budget|tax|rbi|reserve bank/i)) {
    return 'Economy';
  }
  if (content.match(/polity|constitution|parliament|supreme court|government|election|democracy|judiciary/i)) {
    return 'Polity';
  }
  if (content.match(/environment|climate|pollution|forest|wildlife|ecology|biodiversity|green/i)) {
    return 'Environment';
  }
  if (content.match(/technology|digital|cyber|ai|artificial intelligence|internet|innovation/i)) {
    return 'Technology';
  }
  if (content.match(/international|foreign|diplomacy|china|pakistan|usa|russia|treaty|bilateral/i)) {
    return 'International Relations';
  }
  if (content.match(/security|defence|army|navy|border|terrorism|national security/i)) {
    return 'Security';
  }
  if (content.match(/society|social|culture|education|health|welfare|poverty|inequality/i)) {
    return 'Society';
  }
  if (content.match(/agriculture|farmer|crop|rural|irrigation|food security/i)) {
    return 'Agriculture';
  }

  return 'General';
}

function extractArticleTags(article: any): string[] {
  const tags: string[] = [];
  const content = `${article.title} ${article.description || ''}`.toLowerCase();

  const keywords = [
    'economy', 'gdp', 'inflation', 'polity', 'parliament', 'supreme court',
    'environment', 'climate change', 'technology', 'international relations',
    'defence', 'security', 'agriculture', 'education', 'health', 'judiciary',
    'upsc', 'current affairs'
  ];

  keywords.forEach(keyword => {
    if (content.includes(keyword)) {
      tags.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return [...new Set(tags)].slice(0, 5);
}
