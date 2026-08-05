import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { editorialRepo } from "../repositories/prisma-editorial.repository";
import { categorize, extractTags, isDailyEditorialWorthy } from "./categorizer";
import { mapEditorialToSyllabus, mappingDisplayTags } from "./editorialSyllabusMapper";

const parser = new Parser({ timeout: 10000 });
const MIN_CONTENT_LENGTH = 50; // matches editorialSummarizer.ts's NO_CONTENT threshold

/**
 * Best-effort fallback: scrape the full article body when the RSS feed's own
 * snippet is too short to summarize. Only called for the rare short-snippet case.
 */
async function scrapeArticleContent(url: string): Promise<string | null> {
  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      timeout: 10000,
    });
    const $ = cheerio.load(html);
    const parts: string[] = [];
    $("article p, .story-details p, .full-details p, .articlebodycontent p, .story_details p, main p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) parts.push(text);
    });
    const content = parts.join("\n\n");
    return content.length >= MIN_CONTENT_LENGTH ? content : null;
  } catch (err: any) {
    console.warn(`[RSS] Content fallback scrape failed for ${url}: ${err.message}`);
    return null;
  }
}

// UPSC-relevant RSS sources
const RSS_SOURCES = [
  { url: "https://www.thehindu.com/news/national/feeder/default.rss",        source: "The Hindu",         section: "National" },
  { url: "https://www.thehindu.com/opinion/editorial/feeder/default.rss",    source: "The Hindu",         section: "Editorial" },
  { url: "https://www.thehindu.com/business/Economy/feeder/default.rss",     source: "The Hindu",         section: "Economy" },
  { url: "https://indianexpress.com/section/india/feed/",                    source: "Indian Express",    section: "India" },
  { url: "https://indianexpress.com/section/opinion/editorials/feed/",       source: "Indian Express",    section: "Editorial" },
  { url: "https://indianexpress.com/section/political-pulse/feed/",          source: "Indian Express",    section: "Politics" },
  { url: "https://indianexpress.com/section/explained/feed/",                source: "Indian Express",    section: "Explained" },
  { url: "https://indianexpress.com/section/business/economy/feed/",         source: "Indian Express",    section: "Economy" },
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
  primarySyllabusPath: unknown;
  secondarySyllabusPaths: unknown;
  syllabusMappingSource: string;
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
        const itemLimit = source === "Indian Express" ? 30 : 15;
        for (const item of feed.items.slice(0, itemLimit)) {
          const title = item.title?.trim();
          if (!title) continue;

          const summary = (item.contentSnippet || item.summary || item.content || "")
            .replace(/<[^>]*>/g, "")
            .trim()
            .substring(0, 500);

          if (!isDailyEditorialWorthy(title, summary)) continue;

          const mapping = await mapEditorialToSyllabus(title, summary);
          results.push({
            title,
            summary: summary || null,
            sourceUrl: item.link || item.guid || "",
            source,
            category: mapping.primary?.subject || categorize(title, summary),
            tags: mapping.primary ? mappingDisplayTags(mapping) : extractTags(title, summary),
            primarySyllabusPath: mapping.primary,
            secondarySyllabusPaths: mapping.secondary,
            syllabusMappingSource: mapping.source,
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

    const content = (!article.summary || article.summary.length < MIN_CONTENT_LENGTH)
      ? await scrapeArticleContent(article.sourceUrl)
      : null;

    await editorialRepo.create({
      title: article.title,
      source: article.source,
      sourceUrl: article.sourceUrl,
      category: article.category,
      summary: article.summary,
      content,
      tags: article.tags,
      primarySyllabusPath: article.primarySyllabusPath as any,
      secondarySyllabusPaths: article.secondarySyllabusPaths as any,
      syllabusMappingSource: article.syllabusMappingSource,
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
