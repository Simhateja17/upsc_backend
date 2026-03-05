import axios from "axios";
import * as cheerio from "cheerio";
import prisma from "../config/database";
import { categorizeEditorial } from "./editorialSummarizer";

interface ScrapedEditorial {
  title: string;
  content: string;
  author?: string;
  sourceUrl: string;
  source: string;
  publishedAt: Date;
}

/**
 * Scrape editorials from The Hindu
 */
export async function scrapeTheHindu(): Promise<ScrapedEditorial[]> {
  const editorials: ScrapedEditorial[] = [];

  try {
    const { data: html } = await axios.get(
      "https://www.thehindu.com/opinion/editorial/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(html);

    // Extract editorial links from the listing page
    const articleLinks: string[] = [];
    $("a[href*='/opinion/editorial/']").each((_, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        href.includes("article") &&
        !articleLinks.includes(href) &&
        articleLinks.length < 5
      ) {
        articleLinks.push(href.startsWith("http") ? href : `https://www.thehindu.com${href}`);
      }
    });

    // Fetch each article
    for (const url of articleLinks) {
      try {
        const { data: articleHtml } = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          timeout: 10000,
        });

        const $article = cheerio.load(articleHtml);
        const title = $article("h1.title, h1").first().text().trim();
        const author = $article(".author-name, .auth-nm").first().text().trim();

        // Extract article content
        const contentParts: string[] = [];
        $article(".articlebodycontent p, .article-body p, article p").each(
          (_, el) => {
            const text = $article(el).text().trim();
            if (text.length > 20) contentParts.push(text);
          }
        );

        const content = contentParts.join("\n\n");

        if (title && content.length > 100) {
          editorials.push({
            title,
            content,
            author: author || undefined,
            sourceUrl: url,
            source: "The Hindu",
            publishedAt: new Date(),
          });
        }
      } catch (err) {
        console.error(`Failed to scrape article: ${url}`, err);
      }
    }
  } catch (error) {
    console.error("The Hindu scraper error:", error);
  }

  return editorials;
}

/**
 * Scrape editorials from Indian Express
 */
export async function scrapeIndianExpress(): Promise<ScrapedEditorial[]> {
  const editorials: ScrapedEditorial[] = [];

  try {
    const { data: html } = await axios.get(
      "https://indianexpress.com/section/opinion/editorials/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(html);

    const articleLinks: string[] = [];
    $("a[href*='/article/']").each((_, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        href.includes("opinion") &&
        !articleLinks.includes(href) &&
        articleLinks.length < 5
      ) {
        articleLinks.push(href);
      }
    });

    for (const url of articleLinks) {
      try {
        const { data: articleHtml } = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          timeout: 10000,
        });

        const $article = cheerio.load(articleHtml);
        const title = $article("h1").first().text().trim();
        const author = $article(".editor, .author").first().text().trim();

        const contentParts: string[] = [];
        $article(".full-details p, article p, .story_details p").each(
          (_, el) => {
            const text = $article(el).text().trim();
            if (text.length > 20) contentParts.push(text);
          }
        );

        const content = contentParts.join("\n\n");

        if (title && content.length > 100) {
          editorials.push({
            title,
            content,
            author: author || undefined,
            sourceUrl: url,
            source: "Indian Express",
            publishedAt: new Date(),
          });
        }
      } catch (err) {
        console.error(`Failed to scrape article: ${url}`, err);
      }
    }
  } catch (error) {
    console.error("Indian Express scraper error:", error);
  }

  return editorials;
}

/**
 * Run the full scraping pipeline — scrape + deduplicate + categorize + store
 */
export async function runEditorialScraper(): Promise<number> {
  console.log("[Scraper] Starting editorial scrape...");

  const [hinduEditorials, ieEditorials] = await Promise.all([
    scrapeTheHindu(),
    scrapeIndianExpress(),
  ]);

  const allEditorials = [...hinduEditorials, ...ieEditorials];
  let savedCount = 0;

  for (const editorial of allEditorials) {
    // Check if already scraped (by source URL)
    const existing = await prisma.editorial.findFirst({
      where: { sourceUrl: editorial.sourceUrl },
    });

    if (existing) continue;

    // Auto-categorize using AI
    let category = "Current Affairs";
    try {
      const firstPara = editorial.content.split("\n\n")[0] || "";
      category = await categorizeEditorial(editorial.title, firstPara);
    } catch (err) {
      console.error("Categorization failed, using default:", err);
    }

    // Extract summary (first 2 paragraphs)
    const paragraphs = editorial.content.split("\n\n");
    const summary =
      paragraphs.slice(0, 2).join(" ").substring(0, 300) + "...";

    await prisma.editorial.create({
      data: {
        title: editorial.title,
        source: editorial.source,
        sourceUrl: editorial.sourceUrl,
        category,
        summary,
        content: editorial.content,
        tags: [category, editorial.source],
        publishedAt: editorial.publishedAt,
      },
    });

    savedCount++;
  }

  console.log(
    `[Scraper] Done. Scraped ${allEditorials.length}, saved ${savedCount} new editorials.`
  );
  return savedCount;
}
