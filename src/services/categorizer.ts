/**
 * Unified UPSC article categorizer.
 * Single source of truth for UPSC keyword taxonomy, category assignment,
 * relevance scoring, and tag extraction.
 *
 * All three ingestion pipelines (RSS, NewsAPI, editorial controller)
 * route through this module to eliminate triplication and category drift.
 *
 * NOTE: Only the 6 canonical Prelims subjects are returned:
 * History, Geography, Polity, Economy, Environment & Ecology, Science & Technology
 */

import { VALID_UPSC_SUBJECTS } from "../constants/subjects";

export interface CategorizationResult {
  category: string;
  tags: string[];
  relevanceScore: number;
}

// ── Keyword taxonomy ──────────────────────────────────────────────────────────
// Hierarchical: category → matchPattern → keywords array.
// The first matching category wins; order encodes priority.
// All categories MUST map to one of the 6 canonical subjects.

const TAXONOMY: { category: string; regex: RegExp }[] = [
  {
    category: "Polity",
    regex: /parliament|constitution|supreme court|high court|\bcourt\b|bail|petition|petitioner|justice|judge|government|policy|election|judiciary|cabinet|ministry|minister|legislation|bill passed|governor|president|prime minister|\bpm\b|chief minister|\bcm\b|lok sabha|rajya sabha|\bmp\b|\bmla\b|political|party|leader|bjp|congress|pib|democracy|governance|federal|civil service|bureaucracy|cag|eci|upa|lokpal|bilateral|diplomacy|foreign|treaty|un\b|nato|brics|g20|china|pakistan|usa|russia|india-|summit|foreign policy|geopolitic|multilateral/i,
  },
  {
    category: "Economy",
    regex: /gdp|inflation|rbi|reserve bank|budget|fiscal|monetary|trade|export|import|economy|tax|gst|investment|economic|stock market|sebi|disinvestment|subsidy|poverty|agriculture|farmer|rural|msp|minimum support price|farming|horticulture|fertilizer|pesticide|organic farming/i,
  },
  {
    category: "Environment & Ecology",
    regex: /climate|environment|pollution|forest|wildlife|biodiversity|carbon|renewable|solar|green energy|\bngt\b|ecology|conservation|wetland|emission|paris agreement|cop\d/i,
  },
  {
    category: "Science & Technology",
    regex: /isro|space|nuclear|technology|digital|cyber|ai\b|research|satellite|launch|mission|artificial intelligence|innovation|quantum|biotech|drdo|internet|defence|army|navy|air force|border|terrorism|security|military|national security|insurgent|militant|coastal security|bofors|rafale|tejas/i,
  },
  {
    category: "History",
    regex: /history|heritage|archaeological|ancient|medieval|monument|unesco|culture|temple|inscription|freedom struggle|independence movement/i,
  },
  {
    category: "Geography",
    regex: /disaster|flood|earthquake|cyclone|drought|infrastructure|monsoon|geograph|river|lake|mountain|plateau|soil|mineral/i,
  },
];

const FALLBACK_CATEGORY = "Current Affairs";

// ── Relevance scoring ─────────────────────────────────────────────────────────

const RELEVANCE_KEYWORDS = [
  "polity", "constitution", "parliament", "supreme court", "governance",
  "economy", "economic", "rbi", "fiscal", "monetary", "budget", "inflation", "gdp",
  "geography", "climate", "monsoon",
  "environment", "biodiversity", "pollution", "wildlife",
  "history", "heritage",
  "science", "technology", "space", "isro", "defence", "ai ", " ai.",
  "international", "bilateral", "un ", "g20", "brics", "diplomacy",
  "agriculture", "farmer", "msp",
  "ethics", "corruption",
  "society", "caste", "women", "minority", "welfare",
  "disaster", "cyclone", "earthquake",
  "scheme", "yojana", "policy",
];

const NOISE_KEYWORDS = [
  "cricket", "football", "ipl", "bollywood", "box office",
  "celebrity", "entertainment", "gossip", "lifestyle",
];

const EXCLUDED_DAILY_EDITORIAL_PATTERNS = [
  /\b(cricket|football|kabaddi|ipl|match score|live score|scorecard)\b/i,
  /\b(bollywood|hollywood|celebrity|box office|gossip|movie review|film review)\b/i,
  /\b(sensex|nifty|stock market live|share price|quarterly earnings|q[1-4] results)\b/i,
  /\b(iphone|smartphone|gadget|consumer app|product launch|review)\b/i,
  /\b(horoscope|lifestyle tips|diet tips|fitness tips)\b/i,
  /\b(sponsored|advertorial|advertisement|promotional)\b/i,
  /\b(weather forecast|weather report)\b/i,
  /\b(obituary|passes away)\b/i,
  /\b(viral video|viral social media|social media viral|it cell)\b/i,
];

const POLICY_SIGNAL_PATTERN =
  /\b(constitution|constitutional|supreme court|high court|parliament|bill|act|law|policy|scheme|governance|federal|rights|judicial review|welfare|regulation|regulatory|committee|commission|mou|treaty|strategic|climate|disaster management|national security|public administration)\b/i;

const LOW_VALUE_POLITICS_PATTERN =
  /\b(bjp|congress|party|campaign|rally|speech|remark|remarks|spar|slams|hits out|accuses|alleged remark|poll narrative|election rally|internal feud)\b/i;

const INDIVIDUAL_CRIME_OR_LEGAL_PATTERN =
  /\b(murder|robbery|accident|arrested|bail|anticipatory bail|custody|derogatory remarks|defamation)\b/i;

// ── Tag extraction ────────────────────────────────────────────────────────────

const TAG_KEYWORDS = [
  "economy", "polity", "environment", "technology", "international relations",
  "security", "society", "governance", "agriculture", "education", "health",
  "judiciary", "parliament", "rbi", "isro", "climate", "climate change",
  "constitutional", "foreign policy", "bilateral", "trade",
  "upsc", "current affairs", "gdp", "inflation",
  "supreme court", "defence",
];

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Build the full text corpus from an article's fields.
 */
function buildText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/**
 * Categorize an article by matching its text against the UPSC taxonomy.
 * Returns the first matching category, or the fallback.
 * Only returns one of the 6 canonical subjects or the fallback.
 */
export function categorize(title: string, summary?: string | null, content?: string | null): string {
  const text = buildText([title, summary, content]);

  for (const entry of TAXONOMY) {
    if (entry.regex.test(text)) {
      return entry.category;
    }
  }

  return FALLBACK_CATEGORY;
}

/**
 * Return true if the categorized article is one of the 6 canonical subjects.
 */
export function isValidCategory(category: string): boolean {
  return VALID_UPSC_SUBJECTS.includes(category as any);
}

/**
 * Score an article's relevance to UPSC preparation.
 * Positive keywords increase score; noise keywords (sports, entertainment) decrease it.
 */
export function relevanceScore(title: string, summary?: string | null, content?: string | null): number {
  const text = buildText([title, summary, content]);
  let score = 0;

  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) score += 2;
  }
  for (const kw of NOISE_KEYWORDS) {
    if (text.includes(kw)) score -= 3;
  }

  return score;
}

/**
 * Return true if the text contains at least one UPSC-relevant keyword.
 */
export function isRelevant(title: string, summary?: string | null, content?: string | null): boolean {
  const text = buildText([title, summary, content]);
  return RELEVANCE_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Gate for the Daily Editorial surface.
 * This is stricter than generic relevance: a story can mention politics, AI,
 * courts, or markets and still be too episodic for UPSC editorial analysis.
 */
export function isDailyEditorialWorthy(title: string, summary?: string | null, content?: string | null): boolean {
  const text = buildText([title, summary, content]);

  if (!isRelevant(title, summary, content)) return false;
  if (EXCLUDED_DAILY_EDITORIAL_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const hasPolicySignal = POLICY_SIGNAL_PATTERN.test(text);

  if (LOW_VALUE_POLITICS_PATTERN.test(text) && !hasPolicySignal) return false;
  if (INDIVIDUAL_CRIME_OR_LEGAL_PATTERN.test(text) && !hasPolicySignal) return false;

  return true;
}

/**
 * Extract up to `maxTags` (default 5) UPSC-relevant tags from the article text.
 */
export function extractTags(title: string, summary?: string | null, content?: string | null, maxTags = 5): string[] {
  const text = buildText([title, summary, content]);

  const matched = TAG_KEYWORDS
    .filter((kw) => text.includes(kw))
    .map((kw) => kw.charAt(0).toUpperCase() + kw.slice(1));

  return [...new Set(matched)].slice(0, maxTags);
}

/**
 * One-call convenience: returns category, tags, and relevance score.
 * Category is guaranteed to be one of the 6 canonical subjects or the fallback.
 */
export function classifyArticle(title: string, summary?: string | null, content?: string | null): CategorizationResult {
  return {
    category: categorize(title, summary, content),
    tags: extractTags(title, summary, content),
    relevanceScore: relevanceScore(title, summary, content),
  };
}
