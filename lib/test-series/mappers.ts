export type SeriesFeatures = {
  analytics?: boolean;
  aiAnalysis?: boolean;
  videoSolutions?: boolean;
};

export type DbSeries = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category_label: string;
  listing_status: string;
  published: boolean;
  duration_label: string;
  enrolled_display: number;
  rating: number;
  price_inr: number;
  compare_at_price_inr: number | null;
  discount_percent: number | null;
  exam_mode: string;
  subject: string | null;
  difficulty: string;
  questions_per_test: number;
  sort_order: number;
  features: SeriesFeatures | null;
  updated_at?: string;
  created_at?: string;
  // Detail page CMS fields
  tagline?: string | null;
  tags?: string[];
  gradient?: string | null;
  why_enroll?: Array<{ t: string; d: string }> | null;
  achievements?: string[];
  syllabus?: Array<{ t: string; n: string; topics: string[] }> | null;
  faqs?: Array<{ q: string; a: string }> | null;
  includes?: string[];
};

export type DbTest = {
  id: string;
  series_id: string;
  title: string;
  sort_order: number;
  pdf_url: string | null;
  pdf_path: string | null;
  extracted_text: string | null;
  time_limit_minutes: number;
  video_solution_url: string | null;
};

export type DbQuestion = {
  id: string;
  test_id: string;
  sort_order: number;
  prompt: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  extra: Record<string, unknown> | null;
};

export function mapSeriesToCard(
  row: DbSeries,
  opts: { testCount: number; enrollmentCount?: number }
) {
  const f = row.features ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    examMode: row.exam_mode,
    subject: row.subject,
    difficulty: row.difficulty,
    totalTests: opts.testCount,
    questionsPerTest: row.questions_per_test,
    price: row.price_inr,
    compareAtPrice: row.compare_at_price_inr,
    discountPercent: row.discount_percent,
    isActive: row.published && row.listing_status === 'open',
    published: row.published,
    listingStatus: row.listing_status,
    enrollmentCount: Math.max(row.enrolled_display, opts.enrollmentCount ?? 0),
    enrolledDisplay: row.enrolled_display,
    thumbnailUrl: row.thumbnail_url,
    categoryLabel: row.category_label,
    durationLabel: row.duration_label,
    rating: Number(row.rating),
    features: {
      analytics: f.analytics !== false,
      aiAnalysis: !!f.aiAnalysis,
      videoSolutions: !!f.videoSolutions,
    },
    // Detail page CMS fields
    tagline: row.tagline ?? null,
    tags: row.tags ?? [],
    gradient: row.gradient ?? null,
    whyEnroll: row.why_enroll ?? [],
    achievements: row.achievements ?? [],
    syllabus: row.syllabus ?? [],
    faqs: row.faqs ?? [],
    includes: row.includes ?? [],
  };
}

export function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x));
  }
  return [];
}
