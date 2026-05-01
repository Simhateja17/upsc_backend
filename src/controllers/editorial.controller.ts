import { Request, Response, NextFunction } from "express";
import { editorialRepo } from "../repositories/prisma-editorial.repository";
import { summarizeEditorial } from "../services/editorialSummarizer";
import { getNewsArticlesBySource, syncNewsToEditorials } from "../services/newsApi";
import { runRssFetch } from "../services/rssFetcher";
import { categorize, extractTags, relevanceScore } from "../services/categorizer";

/**
 * GET /api/editorials/today
 * Today's editorial list, ranked by UPSC relevance.
 */
export const getTodayEditorials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, limit, date } = req.query;

    let since: Date;
    let until: Date | undefined;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      since = new Date(`${date}T00:00:00.000Z`);
      until = new Date(`${date}T23:59:59.999Z`);
    } else {
      since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    }

    const rawEditorials = await editorialRepo.getRecent(
      since,
      until,
      source as string | undefined,
      limit ? parseInt(limit as string) : 60
    );

    const parsedLimit = limit ? parseInt(limit as string) : 30;

    // Rank by UPSC relevance; recency is tiebreaker
    const editorials = rawEditorials
      .map((e) => ({
        e,
        score: relevanceScore(e.title, e.summary, e.category ? `${e.category} ${(e.tags || []).join(" ")}` : null),
      }))
      .sort((a, b) => b.score - a.score || b.e.publishedAt.getTime() - a.e.publishedAt.getTime())
      .map((x) => x.e)
      .slice(0, parsedLimit);

    // Attach user progress if authenticated
    let progressMap: Record<string, { isRead: boolean; isSaved: boolean }> = {};
    if (req.user) {
      const ids = editorials.map((e) => e.id);
      const [progress, bookmarks] = await Promise.all([
        editorialRepo.getProgress(req.user.id, ids),
        editorialRepo.getBookmarks(req.user.id, ids),
      ]);
      for (const p of progress) progressMap[p.editorialId] = { isRead: p.isRead, isSaved: false };
      for (const b of bookmarks) {
        if (!progressMap[b.editorialId]) progressMap[b.editorialId] = { isRead: false, isSaved: true };
        else progressMap[b.editorialId].isSaved = true;
      }
    }

    const data = editorials.map((e) => ({
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
 * Individual editorial content.
 */
export const getEditorial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const editorial = await editorialRepo.getById(id);

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
    await editorialRepo.markRead(userId, id);
    res.json({ status: "success", message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/save
 * Toggle save/bookmark.
 */
export const toggleSave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const saved = await editorialRepo.toggleSave(userId, id);
    res.json({ status: "success", data: { saved } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/editorials/:id/summarize
 * AI summary generation.
 */
export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const editorial = await editorialRepo.getById(id);

    if (!editorial) {
      return res.status(404).json({ status: "error", message: "Editorial not found" });
    }

    const summary = await summarizeEditorial(editorial.id);
    res.json({ status: "success", data: { summary } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/stats
 * Reading stats for the authenticated user.
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const recentSince = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const stats = await editorialRepo.getStats(userId, recentSince);

    res.json({
      status: "success",
      data: {
        totalRead: stats.totalRead,
        totalSaved: stats.totalSaved,
        weeklyRead: stats.weeklyRead,
        weeklyTarget: 7,
        streak: stats.streak,
        todayHinduCount: stats.todayCounts.hindu,
        todayExpressCount: stats.todayCounts.express,
        todayAiCount: stats.todayCounts.aiSummarized,
        todayReadCount: stats.todayCounts.userRead,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/editorials/live-news
 * Fetch live news from News API (real-time data).
 */
export const getLiveNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source } = req.query;

    let sourceType: "hindu" | "express" | "general" = "general";
    if (source === "The Hindu") sourceType = "hindu";
    else if (source === "Indian Express") sourceType = "express";

    const articles = await getNewsArticlesBySource(sourceType);

    const transformedArticles = articles.map((article) => ({
      id: Buffer.from(article.url).toString("base64").slice(0, 16),
      title: article.title,
      source: article.source.name || sourceType,
      sourceUrl: article.url,
      category: categorize(article.title, article.description, article.content),
      summary: article.description || null,
      content: article.content || null,
      tags: extractTags(article.title, article.description, article.content),
      publishedAt: article.publishedAt,
      isRead: false,
      isSaved: false,
    }));

    res.json({ status: "success", data: transformedArticles });
  } catch (error: any) {
    console.error("[Editorial] Error fetching live news:", error.message);
    next(error);
  }
};

/**
 * POST /api/editorials/sync-news
 * Manually trigger sync from both RSS feeds and News API.
 */
export const syncNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("[Editorial] Manual news sync triggered");

    const [rssCount, newsApiCount] = await Promise.allSettled([
      runRssFetch(),
      syncNewsToEditorials(),
    ]).then(([rss, api]) => [
      rss.status === "fulfilled" ? rss.value : 0,
      api.status === "fulfilled" ? api.value : 0,
    ]);

    const total = (rssCount as number) + (newsApiCount as number);
    res.json({
      status: "success",
      message: `Synced ${total} new articles (RSS: ${rssCount}, NewsAPI: ${newsApiCount})`,
      data: { syncedCount: total, rssCount, newsApiCount },
    });
  } catch (error) {
    next(error);
  }
};
