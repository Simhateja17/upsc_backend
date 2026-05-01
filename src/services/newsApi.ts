import axios from 'axios';
import { editorialRepo } from '../repositories/prisma-editorial.repository';
import { categorize, extractTags } from './categorizer';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

/**
 * Fetch top headlines from News API
 * @param options - Query parameters for News API
 */
export async function fetchTopHeadlines(options: {
  country?: string;
  category?: string;
  sources?: string;
  q?: string;
  pageSize?: number;
  page?: number;
}): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      pageSize: String(options.pageSize || 20),
      page: String(options.page || 1),
    });

    // News API requires at least one of: country, category, sources, or q
    // Default to country='us' if nothing is provided
    if (!options.country && !options.category && !options.sources && !options.q) {
      params.append('country', 'us');
    } else {
      if (options.country) params.append('country', options.country);
      if (options.category) params.append('category', options.category);
      if (options.sources) params.append('sources', options.sources);
      if (options.q) params.append('q', options.q);
    }

    const response = await axios.get<NewsApiResponse>(
      `${NEWS_API_BASE_URL}/top-headlines?${params.toString()}`
    );

    if (response.data.status !== 'ok') {
      throw new Error('News API request failed');
    }

    return response.data.articles;
  } catch (error: any) {
    console.error('[NewsAPI] Error fetching headlines:', error.response?.data || error.message);
    throw new Error('Failed to fetch news from News API');
  }
}

/**
 * Fetch everything from News API (more flexible search)
 * @param options - Query parameters for News API
 */
export async function fetchEverything(options: {
  q?: string;
  sources?: string;
  domains?: string;
  from?: string;
  to?: string;
  language?: string;
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  pageSize?: number;
  page?: number;
}): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      pageSize: String(options.pageSize || 20),
      page: String(options.page || 1),
      language: options.language || 'en',
      sortBy: options.sortBy || 'publishedAt',
    });

    if (options.q) params.append('q', options.q);
    if (options.sources) params.append('sources', options.sources);
    if (options.domains) params.append('domains', options.domains);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);

    const response = await axios.get<NewsApiResponse>(
      `${NEWS_API_BASE_URL}/everything?${params.toString()}`
    );

    if (response.data.status !== 'ok') {
      throw new Error('News API request failed');
    }

    return response.data.articles;
  } catch (error: any) {
    console.error('[NewsAPI] Error fetching everything:', error.response?.data || error.message);
    throw new Error('Failed to fetch news from News API');
  }
}

/**
 * Fetch Indian news relevant for UPSC preparation
 */
export async function fetchIndianNews(): Promise<NewsArticle[]> {
  // Fetch from Indian news sources
  return fetchTopHeadlines({
    country: 'in',
    pageSize: 50,
  });
}

/**
 * Fetch news by category for UPSC
 */
export async function fetchNewsByCategory(category: 'business' | 'science' | 'technology' | 'general'): Promise<NewsArticle[]> {
  return fetchTopHeadlines({
    country: 'in',
    category,
    pageSize: 20,
  });
}

/**
 * Sync News API articles to database as editorials
 */
export async function syncNewsToEditorials(): Promise<number> {
  console.log('[NewsAPI] Starting sync to editorials...');

  try {
    const articles = await fetchIndianNews();
    let syncedCount = 0;

    for (const article of articles) {
      try {
        if (!article.title || !article.publishedAt) continue;

        const existing = await editorialRepo.findBySourceUrl(article.url);
        if (existing) continue;

        const category = categorize(article.title, article.description, article.content);
        const tags = extractTags(article.title, article.description, article.content);

        await editorialRepo.create({
          title: article.title,
          source: article.source.name || 'News API',
          sourceUrl: article.url,
          category,
          summary: article.description || null,
          content: article.content || null,
          tags,
          aiSummary: null,
          publishedAt: new Date(article.publishedAt),
        });

        syncedCount++;
      } catch (err: any) {
        console.error(`[NewsAPI] Error saving article: ${article.title}`, err.message);
      }
    }

    console.log(`[NewsAPI] Synced ${syncedCount} new articles`);
    return syncedCount;
  } catch (error: any) {
    console.error('[NewsAPI] Sync failed:', error.message);
    throw error;
  }
}

/**
 * Get News API articles by source preference
 */
export async function getNewsArticlesBySource(source: 'hindu' | 'express' | 'general'): Promise<NewsArticle[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  if (source === 'hindu') {
    return fetchEverything({
      q: 'India OR politics OR economy OR government',
      domains: 'thehindu.com',
      from: todayStr,
      sortBy: 'publishedAt',
      pageSize: 20,
    });
  }

  if (source === 'express') {
    return fetchEverything({
      q: 'India OR politics OR economy OR government',
      domains: 'indianexpress.com',
      from: todayStr,
      sortBy: 'publishedAt',
      pageSize: 20,
    });
  }

  return fetchEverything({
    q: 'India',
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: 50,
  });
}
