import Parser from "rss-parser";
import { editorialRepo } from "../repositories/prisma-editorial.repository";
import { categorize, extractTags, isRelevant } from "./categorizer";

const parser = new Parser({ timeout: 10000 });

// UPSC-relevant RSS sources
const RSS_SOURCES = [
  { url: "https://www.thehindu.com/news/national/feeder/default.rss",        source: "The Hindu",         section: "National" },
  { url: "https://www.thehindu.com/opinion/editorial/feeder/default.rss",    source: "The Hindu",         section: "Editorial" },
  { url: "https://www.thehindu.com/business/Economy/feeder/default.rss",     source: "The Hindu",         section: "Economy" },
  { url: "https://indianexpress.com/section/india/feed/",                    source: "Indian Express",    section: "India" },
  { url: "https://indianexpress.com/section/opinion/editorials/feed/",       source: "Indian Express",    section: "Editorial" },
  { url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",  source: "Hindustan Times",   section: "India" },
  { url: "https://www.livemint.com/rss/economy",                             source: "LiveMint",          section: "Economy" },
  { url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",          source: "PIB",               section: "Government" },
];

export interface FetchedArticle {
  title: string;
  summary: string | null;
  sourceUrl: string;
  source: string;
  category: string;
  tags: string[];
  publishedAt: Date;
}

/**
 * Fetch all RSS feeds and return UPSC-relevant articles
 */
export async function fetchRssArticles(): Promise<FetchedArticle[]> {
  const results: FetchedArticle[] = [];

  await Promise.allSettled(
    RSS_SOURCES.map(async ({ url, source }) => {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items.slice(0, 15)) {
          const title = item.title?.trim();
          if (!title) continue;

          const summary = (item.contentSnippet || item.summary || item.content || "")
            .replace(/<[^>]*>/g, "")
            .trim()
            .substring(0, 500);

          if (!isRelevant(title, summary)) continue;

          results.push({
            title,
            summary: summary || null,
            sourceUrl: item.link || item.guid || "",
            source,
            category: categorize(title, summary),
            tags: extractTags(title, summary),
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          });
        }
      } catch (err: any) {
        console.warn(`[RSS] Failed to fetch ${url}: ${err.message}`);
      }
    })
  );

  return results;
}

/**
 * Save fetched articles to DB, skipping duplicates by sourceUrl
 */
export async function saveArticlesToDb(articles: FetchedArticle[]): Promise<number> {
  let saved = 0;

  for (const article of articles) {
    if (!article.sourceUrl) continue;

    const exists = await editorialRepo.findBySourceUrl(article.sourceUrl);
    if (exists) continue;

    await editorialRepo.create({
      title: article.title,
      source: article.source,
      sourceUrl: article.sourceUrl,
      category: article.category,
      summary: article.summary,
      content: null,
      tags: article.tags,
      aiSummary: null,
      publishedAt: article.publishedAt,
    });
    saved++;
  }

  return saved;
}

/**
 * Full pipeline: fetch RSS → filter UPSC-relevant → save new articles
 */
export async function runRssFetch(): Promise<number> {
  console.log("[RSS] Starting fetch from all sources...");
  const articles = await fetchRssArticles();
  console.log(`[RSS] Fetched ${articles.length} UPSC-relevant articles`);
  const saved = await saveArticlesToDb(articles);
  console.log(`[RSS] Saved ${saved} new articles to DB`);
  return saved;
}
