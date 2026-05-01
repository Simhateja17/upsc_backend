import cron from "node-cron";
import { runEditorialScraper } from "../services/editorialScraper";
import { rotateDailyMCQ, createDailyMainsQuestion } from "./dailyContentJob";
import { runEditorialSummarization } from "./dailyEditorialJob";
import { runLatestNewsJob } from "./latestNewsJob";
import { fireAndForget } from "./jobRunner";

/**
 * Initialize all cron jobs.
 * Times are in IST (UTC+5:30), but cron runs in server timezone.
 * All jobs use the JobRunner for automatic retry and structured logging.
 */
export function initScheduler() {
  console.log("[Scheduler] Initializing cron jobs...");

  // 6:00 AM IST (00:30 UTC) — Scrape editorials
  cron.schedule("30 0 * * *", () => {
    fireAndForget(() => runEditorialScraper(), { name: "editorial-scraper" });
  });

  // 6:30 AM IST (01:00 UTC) — AI summarize new editorials
  cron.schedule("0 1 * * *", () => {
    fireAndForget(() => runEditorialSummarization(), { name: "editorial-summarization" });
  });

  // 12:00 AM IST (18:30 UTC previous day) — Create daily MCQ set
  cron.schedule("30 18 * * *", () => {
    fireAndForget(() => rotateDailyMCQ(), { name: "daily-mcq-rotation" });
  });

  // 12:00 AM IST — Create daily mains question
  cron.schedule("31 18 * * *", () => {
    fireAndForget(() => createDailyMainsQuestion(), { name: "daily-mains-question" });
  });

  // Every 3 hours — fetch latest UPSC-relevant news from RSS feeds + auto-summarize
  cron.schedule("0 */3 * * *", () => {
    fireAndForget(() => runLatestNewsJob(), { name: "rss-news-fetch" });
  });

  console.log("[Scheduler] All cron jobs registered with retry + monitoring.");
}
