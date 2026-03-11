import Parser from "rss-parser";
import prisma from "../config/database";

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

// UPSC syllabus keyword groups
const UPSC_KEYWORDS = [
  // Polity & Governance
  "parliament", "constitution", "supreme court", "high court", "government", "policy",
  "election", "judiciary", "cabinet", "ministry", "legislation", "bill passed",
  "governor", "president", "prime minister", "lok sabha", "rajya sabha", "pib",
  // Economy
  "gdp", "inflation", "rbi", "reserve bank", "budget", "fiscal", "monetary",
  "trade", "export", "import", "economy", "tax", "gst", "investment",
  // International Relations
  "bilateral", "diplomacy", "foreign", "treaty", "un ", "nato", "brics", "g20",
  "china", "pakistan", "usa", "russia", "india-", "summit",
  // Environment
  "climate", "environment", "pollution", "forest", "wildlife", "biodiversity",
  "carbon", "renewable", "solar", "green energy", "ngt",
  // Science & Technology
  "isro", "space", "nuclear", "technology", "digital", "cyber", "ai ", "research",
  "satellite", "launch", "mission",
  // Security & Defence
  "defence", "army", "navy", "air force", "border", "terrorism", "security",
  "military", "isro", "drdo",
  // Society
  "education", "health", "poverty", "agriculture", "farmer", "rural", "welfare",
  "scheme", "initiative", "program", "women", "child",
  // Geography
  "disaster", "flood", "earthquake", "cyclone", "drought", "infrastructure",
];

function isUpscRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return UPSC_KEYWORDS.some(kw => text.includes(kw));
}

function categorize(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  if (text.match(/parliament|constitution|court|election|judiciary|governor|lok sabha|rajya sabha|polity/i))
    return "Polity";
  if (text.match(/gdp|inflation|rbi|budget|fiscal|trade|economy|tax|gst|monetary/i))
    return "Economy";
  if (text.match(/bilateral|diplomacy|foreign|treaty|china|pakistan|usa|russia|g20|brics|un /i))
    return "International Relations";
  if (text.match(/climate|environment|pollution|forest|wildlife|biodiversity|carbon|renewable/i))
    return "Environment";
  if (text.match(/isro|space|nuclear|digital|cyber|ai |research|satellite|technology/i))
    return "Science & Tech";
  if (text.match(/defence|army|navy|border|terrorism|security|military|drdo/i))
    return "Security";
  if (text.match(/education|health|poverty|agriculture|farmer|welfare|scheme|women|child/i))
    return "Society";
  if (text.match(/pib|ministry|government|policy|initiative|programme|cabinet/i))
    return "Governance";

  return "Current Affairs";
}

function extractTags(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const tagKeywords = [
    "economy", "polity", "environment", "technology", "international relations",
    "security", "society", "governance", "agriculture", "education", "health",
    "judiciary", "parliament", "rbi", "isro", "climate",
  ];
  return [...new Set(
    tagKeywords.filter(k => text.includes(k)).map(k => k.charAt(0).toUpperCase() + k.slice(1))
  )].slice(0, 5);
}

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

          if (!isUpscRelevant(title, summary)) continue;

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

    const exists = await prisma.editorial.findFirst({
      where: { sourceUrl: article.sourceUrl },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.editorial.create({
      data: {
        title: article.title,
        source: article.source,
        sourceUrl: article.sourceUrl,
        category: article.category,
        summary: article.summary,
        tags: article.tags,
        publishedAt: article.publishedAt,
      },
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
