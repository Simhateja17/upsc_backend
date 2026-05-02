import { runRssFetch } from "../services/rssFetcher";
import { runEditorialSummarization } from "./dailyEditorialJob";

/**
 * Fetch latest UPSC-relevant news from RSS feeds,
 * then auto-summarize any new articles with AI.
 */
export async function runLatestNewsJob(): Promise<void> {
  const saved = await runRssFetch();

  if (saved > 0) {
    console.log(`[LatestNewsJob] ${saved} new articles saved. Running AI summarization...`);
    await runEditorialSummarization();
  } else {
    console.log("[LatestNewsJob] No new articles found.");
  }
}
