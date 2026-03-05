import cron from "node-cron";
import { runEditorialScraper } from "../services/editorialScraper";
import { rotateDailyMCQ, createDailyMainsQuestion } from "./dailyContentJob";
import { runEditorialSummarization } from "./dailyEditorialJob";

/**
 * Initialize all cron jobs
 * Times are in IST (UTC+5:30), but cron runs in server timezone.
 * Adjust offsets if server is UTC.
 */
export function initScheduler() {
  console.log("[Scheduler] Initializing cron jobs...");

  // 6:00 AM IST (00:30 UTC) — Scrape editorials
  cron.schedule("30 0 * * *", async () => {
    console.log("[Cron] Running editorial scraper...");
    try {
      await runEditorialScraper();
    } catch (error) {
      console.error("[Cron] Editorial scraper failed:", error);
    }
  });

  // 6:30 AM IST (01:00 UTC) — AI summarize new editorials
  cron.schedule("0 1 * * *", async () => {
    console.log("[Cron] Running editorial summarization...");
    try {
      await runEditorialSummarization();
    } catch (error) {
      console.error("[Cron] Editorial summarization failed:", error);
    }
  });

  // 12:00 AM IST (18:30 UTC previous day) — Create daily MCQ set
  cron.schedule("30 18 * * *", async () => {
    console.log("[Cron] Creating daily MCQ set...");
    try {
      await rotateDailyMCQ();
    } catch (error) {
      console.error("[Cron] Daily MCQ rotation failed:", error);
    }
  });

  // 12:00 AM IST — Create daily mains question
  cron.schedule("31 18 * * *", async () => {
    console.log("[Cron] Creating daily mains question...");
    try {
      await createDailyMainsQuestion();
    } catch (error) {
      console.error("[Cron] Daily mains question failed:", error);
    }
  });

  console.log("[Scheduler] All cron jobs registered.");
}
