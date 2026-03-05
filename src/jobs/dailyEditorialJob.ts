import prisma from "../config/database";
import { summarizeEditorial } from "../services/editorialSummarizer";

/**
 * Summarize all editorials from today that don't yet have AI summaries
 */
export async function runEditorialSummarization(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unsummarized = await prisma.editorial.findMany({
    where: {
      publishedAt: { gte: today },
      aiSummary: null,
    },
    select: { id: true, title: true },
  });

  console.log(`[EditorialJob] ${unsummarized.length} editorials to summarize`);

  let summarized = 0;
  for (const editorial of unsummarized) {
    try {
      await summarizeEditorial(editorial.id);
      summarized++;
      console.log(`[EditorialJob] Summarized: ${editorial.title}`);
    } catch (error) {
      console.error(`[EditorialJob] Failed to summarize ${editorial.title}:`, error);
    }
  }

  return summarized;
}
