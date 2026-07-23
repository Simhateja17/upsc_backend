import { Request, Response, NextFunction } from "express";
import { editorialRepo } from "../repositories/prisma-editorial.repository";
import { summarizeEditorialStructured } from "../services/editorialSummarizer";
import { getNewsArticlesBySource, syncNewsToEditorials } from "../services/newsApi";
import { runRssFetch } from "../services/rssFetcher";
import { categorize, extractTags, relevanceScore, isValidCategory, isDailyEditorialWorthy } from "../services/categorizer";
import { istDateKey, istDayWindow, istMonthWindow } from "../utils/istDate";

function parseMonthWindow(month: unknown): { since: Date; until: Date; monthPrefix: string } | null {
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [, monthRaw] = month.split("-");
  const monthIndex = Number(monthRaw) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  // Availability is shown by edition date, so include the previous day's
  // content at the start of the month and exclude the next month's content.
  const { since, until } = istMonthWindow(month, 0, -1);
  return { since, until, monthPrefix: month };
}

function displayCategoryForEditorial(editorial: { title: string; summary?: string | null; content?: string | null; category: string }) {
  const computed = categorize(editorial.title, editorial.summary, editorial.content);
  return isValidCategory(computed) ? computed : editorial.category;
}

/**
 * GET /api/editorials/today
 * Daily editorial edition, ranked by UPSC relevance. Defaults to yesterday in IST.
 */
export const getTodayEditorials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, limit, date } = req.query;

    const editionDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : istDateKey(new Date(), -1);
    const { since, until } = istDayWindow(editionDate);

    const rawEditorials = await editorialRepo.getRecent(
      since,
      until,
      source as string | undefined,
      limit ? parseInt(limit as string) : 60
    );

    const parsedLimit = limit ? parseInt(limit as string) : 30;

    // Filter to only canonical subjects, then rank by UPSC relevance
    const editorials = rawEditorials
      .filter((e) => isDailyEditorialWorthy(e.title, e.summary, e.content))
      .map((e) => {
        const category = displayCategoryForEditorial(e);
        const tags = [category, ...extractTags(e.title, e.summary, e.content)]
          .filter((tag, index, all) => all.indexOf(tag) === index);
        return { ...e, category, tags };
      })
      .filter((e) => isValidCategory(e.category))
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
 * GET /api/editorials/availability?source=The%20Hindu&month=2026-03
 * Source-specific edition dates with at least one visible UPSC-relevant editorial.
 */
export const getEditorialAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, month } = req.query;
    const window = parseMonthWindow(month);
    if (!window) {
      return res.status(400).json({
        status: "error",
        message: "month must be in YYYY-MM format",
      });
    }

    const rows = await editorialRepo.getAvailabilityRows(
      window.since,
      window.until,
      source as string | undefined
    );

    const dates = new Set<string>();
    rows
      .filter((row) => isValidCategory(row.category) && isDailyEditorialWorthy(row.title, row.summary, row.content))
      .forEach((row) => {
        const date = istDateKey(row.publishedAt, 1);
        if (date.startsWith(window.monthPrefix)) dates.add(date);
      });

    res.json({
      status: "success",
      data: {
        month: window.monthPrefix,
        source: typeof source === "string" ? source : "all",
        availableDates: Array.from(dates).sort(),
      },
    });
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

    const result = await summarizeEditorialStructured(editorial.id);
    res.json({ status: "success", data: result });
  } catch (error: any) {
    if (error?.message === "NO_CONTENT") {
      return res.status(422).json({
        status: "error",
        code: "NO_CONTENT",
        message: "Full article text isn't available yet for this item.",
      });
    }
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
        readToday: stats.readToday,
        dailyTarget: stats.dailyTarget,
        weekChecks: stats.weekChecks,
        todayHinduCount: stats.todayCounts.hindu,
        todayExpressCount: stats.todayCounts.express,
        todayAiCount: stats.todayCounts.aiSummarized,
        todayReadCount: stats.todayCounts.userRead,
        savedItems: stats.savedItems,
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

    const transformedArticles = articles
      .map((article) => ({
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
      }))
      .filter((a) => isValidCategory(a.category) && isDailyEditorialWorthy(a.title, a.summary, a.content));

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
