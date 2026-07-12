import prisma from "../../config/database";
import { insertNotification } from "../../utils/notifications";
import { buildBadgeContext } from "./badgeContext";
import { BADGE_CATALOG, BADGE_KEYS, type BadgeCategoryKey } from "./badgeCatalog";

export interface BadgeResult {
  key: string;
  categoryKey: BadgeCategoryKey;
  status: "earned" | "locked";
  supported: boolean;
  current: number;
  target: number;
}

export interface AchievementsResponse {
  badges: BadgeResult[];
  totalsByCategory: Record<string, { earned: number; total: number }>;
  earnedTotal: number;
  totalBadges: number;
  /** Keys earned for the first time in *this* request — the frontend toasts these. */
  newlyAwarded: string[];
  heroStats: { dayStreak: number; syllabusDone: number };
}

/** Turn a badge key like "rise-365" into a display title like "Rise 365". */
function humanizeKey(key: string): string {
  return key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Evaluate every badge for the user against real activity, persist any newly
 * earned badges (once), fire a notification per new badge, and return the full
 * board with per-category totals and hero stats.
 *
 * This is the single evaluate-on-read entry point: calling it is idempotent —
 * a badge is inserted at most once and only surfaces in `newlyAwarded` on the
 * request that first earns it.
 */
export async function getAchievements(userId: string): Promise<AchievementsResponse> {
  const ctx = await buildBadgeContext(userId);

  const existing = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true },
  });
  const earnedKeys = new Set(existing.map((b) => b.badgeKey));

  const evaluations = BADGE_CATALOG.map((def) => ({
    def,
    result: def.supported ? def.evaluate(ctx) : { earned: false, current: 0, target: 0 },
  }));

  const newlyAwarded = evaluations
    .filter(({ def, result }) => def.supported && result.earned && !earnedKeys.has(def.key))
    .map(({ def }) => def.key);

  if (newlyAwarded.length > 0) {
    await prisma.userBadge.createMany({
      data: newlyAwarded.map((badgeKey) => ({ userId, badgeKey })),
      skipDuplicates: true,
    });
    for (const key of newlyAwarded) {
      earnedKeys.add(key);
      // Best-effort: a failed notification must not fail the whole request.
      try {
        await insertNotification(
          userId,
          "New Badge Unlocked!",
          `You earned the "${humanizeKey(key)}" badge. Keep rising!`,
          "badge",
        );
      } catch {
        /* ignore notification failures */
      }
    }
  }

  const totalsByCategory: Record<string, { earned: number; total: number }> = {};
  const badges: BadgeResult[] = evaluations.map(({ def, result }) => {
    const status: BadgeResult["status"] = earnedKeys.has(def.key) ? "earned" : "locked";
    const bucket = (totalsByCategory[def.categoryKey] ??= { earned: 0, total: 0 });
    bucket.total += 1;
    if (status === "earned") bucket.earned += 1;
    return {
      key: def.key,
      categoryKey: def.categoryKey,
      status,
      supported: def.supported,
      current: result.current,
      target: result.target,
    };
  });

  const earnedTotal = badges.filter((b) => b.status === "earned").length;

  return {
    badges,
    totalsByCategory,
    earnedTotal,
    totalBadges: badges.length,
    newlyAwarded,
    heroStats: {
      dayStreak: ctx.currentStreak,
      syllabusDone: ctx.syllabusCoverage,
    },
  };
}

/** Mark toast-shown badges as seen. Ignores keys that aren't in the catalog. */
export async function markBadgesSeen(userId: string, keys: string[]): Promise<void> {
  const valid = keys.filter((k) => BADGE_KEYS.has(k));
  if (valid.length === 0) return;
  await prisma.userBadge.updateMany({
    where: { userId, badgeKey: { in: valid } },
    data: { seen: true },
  });
}
