/**
 * EditorialRepository — seam between business logic and database.
 *
 * Callers depend on this interface, never on Prisma directly.
 * Swap adapters (Prisma, in-memory mock) at the seam for testing.
 */
export interface EditorialRow {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  category: string;
  summary: string | null;
  content: string | null;
  tags: string[];
  aiSummary: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorialProgressRow {
  editorialId: string;
  isRead: boolean;
}

export interface EditorialBookmarkRow {
  editorialId: string;
}

export interface EditorialStats {
  totalRead: number;
  totalSaved: number;
  weeklyRead: number;
  streak: number;
  todayCounts: {
    hindu: number;
    express: number;
    aiSummarized: number;
    userRead: number;
  };
}

export interface EditorialRepository {
  /** Fetch recent editorials within a time window, ranked by recency. */
  getRecent(since: Date, until?: Date, source?: string, limit?: number): Promise<EditorialRow[]>;

  /** Fetch a single editorial by id. */
  getById(id: string): Promise<EditorialRow | null>;

  /** Batch-fetch read progress for a user across multiple editorial ids. */
  getProgress(userId: string, editorialIds: string[]): Promise<EditorialProgressRow[]>;

  /** Batch-fetch bookmarks for a user across multiple editorial ids. */
  getBookmarks(userId: string, editorialIds: string[]): Promise<EditorialBookmarkRow[]>;

  /** Mark an editorial as read (upsert). Also creates a user activity record. */
  markRead(userId: string, editorialId: string): Promise<void>;

  /** Toggle save/bookmark for an editorial. Returns the new saved state. */
  toggleSave(userId: string, editorialId: string): Promise<boolean>;

  /** Aggregate reading stats for a user. */
  getStats(userId: string, recentSince: Date): Promise<EditorialStats>;

  /** Check if an editorial already exists by source URL (de-duplication). */
  findBySourceUrl(url: string): Promise<{ id: string } | null>;

  /** Insert a new editorial row. */
  create(row: Omit<EditorialRow, "id" | "createdAt" | "updatedAt">): Promise<EditorialRow>;
}
