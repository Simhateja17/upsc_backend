/**
 * Unified UPSC article categorizer.
 * Single source of truth for UPSC keyword taxonomy, category assignment,
 * relevance scoring, and tag extraction.
 *
 * All three ingestion pipelines (RSS, NewsAPI, editorial controller)
 * route through this module to eliminate triplication and category drift.
 */

export interface CategorizationResult {
  category: string;
  tags: string[];
  relevanceScore: number;
}

// ── Keyword taxonomy ──────────────────────────────────────────────────────────
// Hierarchical: category → matchPattern → keywords array.
// The first matching category wins; order encodes priority.

const TAXONOMY: { category: string; regex: RegExp }[] = [
  {
    category: "Polity & Governance",
    regex: /parliament|constitution|supreme court|high court|government|policy|election|judiciary|cabinet|ministry|legislation|bill passed|governor|president|prime minister|lok sabha|rajya sabha|pib|democracy|governance|federal|civil service|bureaucracy|cag|eci|upa|lokpal/i,
  },
  {
    category: "Economy",
    regex: /gdp|inflation|rbi|reserve bank|budget|fiscal|monetary|trade|export|import|economy|tax|gst|investment|economic|stock market|sebi|disinvestment|subsidy/i,
  },
  {
    category: "International Relations",
    regex: /bilateral|diplomacy|foreign|treaty|un\b|nato|brics|g20|china|pakistan|usa|russia|india-|summit|foreign policy|geopolitic|multilateral/i,
  },
  {
    category: "Environment & Ecology",
    regex: /climate|environment|pollution|forest|wildlife|biodiversity|carbon|renewable|solar|green energy|\bngt\b|ecology|conservation|wetland|emission|paris agreement|cop\d/i,
  },
  {
    category: "Science & Technology",
    regex: /isro|space|nuclear|technology|digital|cyber|ai\b|research|satellite|launch|mission|artificial intelligence|innovation|quantum|biotech|drdo|internet/i,
  },
  {
    category: "Security & Defence",
    regex: /defence|army|navy|air force|border|terrorism|security|military|drdo|national security|insurgent|militant|coastal security|bofors|rafale|tejas/i,
  },
  {
    category: "Social Issues & Welfare",
    regex: /education|health|poverty|agriculture|farmer|rural|welfare|scheme|initiative|programme?|women|child|minority|caste|inequality|social justice|society|nutrition|sanitation|housing/i,
  },
  {
    category: "History & Culture",
    regex: /history|heritage|archaeological|ancient|medieval|monument|unesco|culture|temple|inscription|freedom struggle|independence movement/i,
  },
  {
    category: "Geography & Disasters",
    regex: /disaster|flood|earthquake|cyclone|drought|infrastructure|monsoon|geograph|river|lake|mountain|plateau|soil|mineral/i,
  },
  {
    category: "Agriculture",
    regex: /agriculture|farmer|crop|rural|irrigation|food security|\bmsp\b|minimum support price|farming|horticulture|fertilizer|pesticide|organic farming/i,
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
 */
export function classifyArticle(title: string, summary?: string | null, content?: string | null): CategorizationResult {
  return {
    category: categorize(title, summary, content),
    tags: extractTags(title, summary, content),
    relevanceScore: relevanceScore(title, summary, content),
  };
}
