import cron from "node-cron";
import { runEditorialScraper } from "../services/editorialScraper";
import { rotateDailyMCQ, createDailyMainsQuestion } from "./dailyContentJob";
import { runEditorialSummarization } from "./dailyEditorialJob";
import { runLatestNewsJob } from "./latestNewsJob";
import { fireAndForget } from "./jobRunner";
import {
  sendDailyMcqReminders,
  sendStreakAlerts,
  sendMorningDigestNotifications,
  sendWeeklyProgressEmails,
} from "./notificationJobs";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";

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

  // 8:00 AM IST (02:30 UTC) — Send spaced repetition reminders for due items
  cron.schedule("30 2 * * *", () => {
    fireAndForget(() => sendSpacedRepReminders(), { name: "spaced-rep-reminders" });
  });

  // 7:30 AM IST (02:00 UTC) — Morning editorial digest
  cron.schedule("0 2 * * *", () => {
    fireAndForget(() => sendMorningDigestNotifications(), { name: "morning-digest" });
  });

  // 8:05 AM IST (02:35 UTC) — Daily MCQ reminder (staggered after spaced-rep)
  cron.schedule("35 2 * * *", () => {
    fireAndForget(() => sendDailyMcqReminders(), { name: "daily-mcq-reminder" });
  });

  // 7:00 PM IST (13:30 UTC) — Streak at risk alert
  cron.schedule("30 13 * * *", () => {
    fireAndForget(() => sendStreakAlerts(), { name: "streak-alert" });
  });

  // Sunday 9:00 AM IST (03:30 UTC) — Weekly progress summary
  cron.schedule("30 3 * * 0", () => {
    fireAndForget(() => sendWeeklyProgressEmails(), { name: "weekly-progress" });
  });

  console.log("[Scheduler] All cron jobs registered with retry + monitoring.");
}

async function sendSpacedRepReminders(): Promise<void> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const dueItems = await prisma.spacedRepItem.findMany({
    where: {
      remindEnabled: true,
      nextReviewAt: { lte: endOfToday },
    },
    select: { userId: true, questionText: true, subject: true, nextReviewAt: true },
  });

  if (dueItems.length === 0) {
    console.log("[SpacedRepReminders] No due items today.");
    return;
  }

  const grouped = new Map<string, typeof dueItems>();
  for (const item of dueItems) {
    if (!grouped.has(item.userId)) grouped.set(item.userId, []);
    grouped.get(item.userId)!.push(item);
  }

  let sent = 0;
  for (const [userId, items] of grouped) {
    const count = items.length;
    const firstSubject = items[0].subject ?? "UPSC";
    const body =
      count === 1
        ? `Time to revise: "${items[0].questionText.slice(0, 70)}${items[0].questionText.length > 70 ? "..." : ""}"`
        : `You have ${count} topics due for revision today. Start with ${firstSubject}.`;

    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: `Revision Reminder - ${count} item${count > 1 ? "s" : ""} due today`,
        body,
        type: "spaced_rep",
        read: false,
      });
      sent++;
    } catch (err) {
      console.warn(`[SpacedRepReminders] Failed to notify user ${userId}:`, err);
    }
  }

  console.log(`[SpacedRepReminders] Sent ${sent} reminder notifications.`);
}
