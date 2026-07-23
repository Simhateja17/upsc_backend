import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  buildCommunityStats,
  buildSyntheticLeaderboardRows,
  SyntheticLeaderboardRow,
} from "../services/communityMetrics.service";

interface LeaderboardRawRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  mcq_avg: number;
  mcq_attempt_count: number;
  mains_avg: number;
  mains_attempt_count: number;
  streak: number;
  study_hours: number;
  questions_solved: number;
}

type RealLeaderboardRow = ReturnType<typeof mapRealRows>[number];
type LeaderboardRow = RealLeaderboardRow | SyntheticLeaderboardRow;
type PublicLeaderboardRow = (Omit<RealLeaderboardRow, "_rankScore">) | SyntheticLeaderboardRow;
type RankedLeaderboardRow = PublicLeaderboardRow & { rank: number };

// Round to `decimals` places. Internal scores are kept at 6dp (spec: store
// high precision) so tie-breaking never collapses two genuinely different
// scores; only the API response's top-level totalScore/mcqAvg/mainsAvg are
// rounded to 2dp (spec: display only 2 decimal places).
function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function getDateFilter(range: string, tableAlias: string) {
  if (range === "week") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '7 days'`;
  if (range === "month") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '30 days'`;
  return "";
}

function mapRealRows(rows: LeaderboardRawRow[]) {
  return rows.map((row) => {
    const mcqAvg = round(Number(row.mcq_avg) || 0, 6);
    const mainsAvg = round(Number(row.mains_avg) || 0, 6);
    const totalScore = round(mcqAvg * 0.5 + mainsAvg * 0.5, 6);
    const accuracy = round(totalScore * 10, 1);
    const mcqAttemptCount = Number(row.mcq_attempt_count) || 0;
    const mainsAttemptCount = Number(row.mains_attempt_count) || 0;
    const attemptCount = mcqAttemptCount + mainsAttemptCount;

    return {
      userId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Anonymous",
      email: row.email,
      handle: row.email ? `@${row.email.split("@")[0]}` : "",
      initial: (row.first_name?.[0] || row.last_name?.[0] || "?").toUpperCase(),
      avatarUrl: row.avatar_url,
      totalScore: round(totalScore, 2),
      mcqAvg: round(mcqAvg, 2),
      mainsAvg: round(mainsAvg, 2),
      streak: Number(row.streak) || 0,
      studyHours: round(Number(row.study_hours) || 0, 1),
      accuracy,
      questionsSolved: Number(row.questions_solved) || 0,
      mcqAttemptCount,
      mainsAttemptCount,
      attemptCount,
      isRankUnlocked: attemptCount >= 3,
      isSynthetic: false as const,
      // Kept at full precision for ranking/tie-breaking; not sent to clients.
      _rankScore: { mcqAvg, mainsAvg, totalScore },
    };
  });
}

/**
 * Eligibility Rule: a user only appears on the Overall leaderboard once
 * they've attempted both an MCQ-type and a Mains-type challenge, so someone
 * who has only ever done MCQs can't rank on Overall purely by volume.
 * Synthetic (community-filler) rows always represent both by construction.
 */
function isEligibleForTab(item: LeaderboardRow, tab: string): boolean {
  if ((item as SyntheticLeaderboardRow).isSynthetic) return true;
  const real = item as ReturnType<typeof mapRealRows>[number];
  if (tab === "mcq") return real.mcqAttemptCount > 0;
  if (tab === "mains") return real.mainsAttemptCount > 0;
  return real.mcqAttemptCount > 0 && real.mainsAttemptCount > 0;
}

function rankMetrics(item: LeaderboardRow) {
  const real = item as ReturnType<typeof mapRealRows>[number];
  if (real._rankScore) return real._rankScore;
  // Synthetic rows have no _rankScore; their already-rounded avgs are fine
  // as tie-break inputs since they aren't real ties with genuine users.
  const synthetic = item as SyntheticLeaderboardRow;
  return { mcqAvg: synthetic.mcqAvg, mainsAvg: synthetic.mainsAvg, totalScore: synthetic.totalScore };
}

/**
 * Tie-Breaking Rules (spec): higher Mains avg, then higher MCQ avg, then
 * more total attempts, then user ID as the final deterministic tie-breaker.
 * Because userId is unique, this always produces a strict total order —
 * no two rows can ever land on the same rank.
 */
function compareRows(a: LeaderboardRow, b: LeaderboardRow, tab: string): number {
  const am = rankMetrics(a);
  const bm = rankMetrics(b);

  const primary =
    tab === "mcq" ? bm.mcqAvg - am.mcqAvg
    : tab === "mains" ? bm.mainsAvg - am.mainsAvg
    : bm.totalScore - am.totalScore;
  if (primary !== 0) return primary;

  const mainsDiff = bm.mainsAvg - am.mainsAvg;
  if (mainsDiff !== 0) return mainsDiff;

  const mcqDiff = bm.mcqAvg - am.mcqAvg;
  if (mcqDiff !== 0) return mcqDiff;

  const aAttempts = (a as ReturnType<typeof mapRealRows>[number]).attemptCount ?? 0;
  const bAttempts = (b as ReturnType<typeof mapRealRows>[number]).attemptCount ?? 0;
  const attemptDiff = bAttempts - aAttempts;
  if (attemptDiff !== 0) return attemptDiff;

  return String(a.userId).localeCompare(String(b.userId));
}

function stripInternal(item: LeaderboardRow): PublicLeaderboardRow {
  if ((item as SyntheticLeaderboardRow).isSynthetic) return item as SyntheticLeaderboardRow;
  const { _rankScore, ...rest } = item as RealLeaderboardRow;
  return rest;
}

function rankForTab(rows: LeaderboardRow[], tab: string): RankedLeaderboardRow[] {
  return rows
    .filter((row) => isEligibleForTab(row, tab))
    .sort((a, b) => compareRows(a, b, tab))
    .map((item, index) => ({ ...stripInternal(item), rank: index + 1 }));
}

function buildLeaderboardQuery(range: string, includeInactiveUsers: boolean) {
  const mcqFilter = getDateFilter(range, "m");
  const mockFilter = getDateFilter(range, "mt");
  const pyqPrelimsFilter = getDateFilter(range, "ppa");
  const dailyMainsFilter = getDateFilter(range, "ma");
  const pyqFilter = getDateFilter(range, "pma");
  const mockMainsFilter = getDateFilter(range, "mma");
  const activityFilter = getDateFilter(range, "ua");
  const having = includeInactiveUsers
    ? ""
    : `WHERE COALESCE(mcq_agg.mcq_attempt_count, 0) > 0
        OR COALESCE(mains_agg.mains_attempt_count, 0) > 0
        OR COALESCE(study.study_count, 0) > 0
        OR COALESCE(us.current_streak, 0) > 0`;

  return `
    WITH
      mcq_raw AS (
        SELECT m.user_id,
               CASE WHEN (m.correct_count + m.wrong_count + m.skipped_count) > 0
                    THEN (m.correct_count::numeric / (m.correct_count + m.wrong_count + m.skipped_count)) * 10
                    ELSE 0 END AS score,
               (m.correct_count + m.wrong_count + m.skipped_count) AS questions
        FROM mcq_attempts m
        WHERE 1=1 ${mcqFilter}
      ),
      pyq_prelims_raw AS (
        -- Each row is a single PYQ question — one MCQ "attempt" worth 1 question.
        SELECT ppa.user_id,
               CASE WHEN ppa.is_correct THEN 10 ELSE 0 END AS score,
               1 AS questions
        FROM pyq_prelims_attempts ppa
        WHERE 1=1 ${pyqPrelimsFilter}
      ),
      mock_prelims_raw AS (
        SELECT mt.user_id,
               CASE WHEN (mt.correct_count + mt.wrong_count + mt.skipped_count) > 0
                    THEN (mt.correct_count::numeric / (mt.correct_count + mt.wrong_count + mt.skipped_count)) * 10
                    ELSE 0 END AS score,
               (mt.correct_count + mt.wrong_count + mt.skipped_count) AS questions
        FROM mock_test_attempts mt
        WHERE 1=1 ${mockFilter}
      ),
      mcq_pool AS (
        SELECT user_id, score, questions FROM mcq_raw
        UNION ALL SELECT user_id, score, questions FROM pyq_prelims_raw
        UNION ALL SELECT user_id, score, questions FROM mock_prelims_raw
      ),
      mcq_agg AS (
        SELECT user_id,
               AVG(score) as mcq_avg,
               COUNT(*) as mcq_attempt_count,
               SUM(questions) as mcq_questions
        FROM mcq_pool
        GROUP BY user_id
      ),
      daily_mains_raw AS (
        SELECT ma.user_id, (me.score::numeric / NULLIF(me.max_score, 0)) * 10 AS score
        FROM mains_attempts ma
        JOIN mains_evaluations me ON me.attempt_id = ma.id AND me.status = 'completed'
        WHERE 1=1 ${dailyMainsFilter}
      ),
      pyq_mains_raw AS (
        SELECT pma.user_id, (pme.score::numeric / NULLIF(pme.max_score, 0)) * 10 AS score
        FROM pyq_mains_attempts pma
        JOIN pyq_mains_evaluations pme ON pme.attempt_id = pma.id AND pme.status = 'completed'
        WHERE 1=1 ${pyqFilter}
      ),
      mock_mains_raw AS (
        SELECT mma.user_id, (mme.score::numeric / NULLIF(mme.max_score, 0)) * 10 AS score
        FROM mock_test_mains_attempts mma
        JOIN mock_test_mains_evaluations mme ON mme.attempt_id = mma.id AND mme.status = 'completed'
        WHERE 1=1 ${mockMainsFilter}
      ),
      mains_pool AS (
        SELECT user_id, score FROM daily_mains_raw
        UNION ALL SELECT user_id, score FROM pyq_mains_raw
        UNION ALL SELECT user_id, score FROM mock_mains_raw
      ),
      mains_agg AS (
        SELECT user_id,
               AVG(score) as mains_avg,
               COUNT(*) as mains_attempt_count
        FROM mains_pool
        GROUP BY user_id
      ),
      study AS (
        SELECT ua.user_id,
               COUNT(ua.id) as study_count,
               SUM(COALESCE((ua.metadata->>'hours')::numeric, 0)) as study_hours
        FROM user_activities ua
        WHERE ua.type = 'study' ${activityFilter}
        GROUP BY ua.user_id
      )
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url,
      COALESCE(mcq_agg.mcq_avg, 0) as mcq_avg,
      COALESCE(mcq_agg.mcq_attempt_count, 0) as mcq_attempt_count,
      COALESCE(mains_agg.mains_avg, 0) as mains_avg,
      COALESCE(mains_agg.mains_attempt_count, 0) as mains_attempt_count,
      COALESCE(us.current_streak, 0) as streak,
      COALESCE(study.study_hours, 0) as study_hours,
      COALESCE(mcq_agg.mcq_questions, 0) + COALESCE(mains_agg.mains_attempt_count, 0) as questions_solved
    FROM users u
    LEFT JOIN mcq_agg ON mcq_agg.user_id = u.id
    LEFT JOIN mains_agg ON mains_agg.user_id = u.id
    LEFT JOIN study ON study.user_id = u.id
    LEFT JOIN user_streaks us ON us.user_id = u.id
    ${having}
  `;
}

/**
 * GET /api/leaderboard?tab=overall|mcq|mains&range=all|week|month
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || "all";
    const tab = (req.query.tab as string) || "overall";
    const realOnly = req.query.realOnly === "true";

    const [rows, realUserCount] = await Promise.all([
      prisma.$queryRawUnsafe<LeaderboardRawRow[]>(buildLeaderboardQuery(range, false)),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    const realRows = mapRealRows(rows);
    const realRankedCount = realRows.filter((row) => row.isRankUnlocked).length;
    const syntheticRows = realOnly ? [] : buildSyntheticLeaderboardRows(range);
    const merged = !realOnly && realRankedCount < 100 ? [...realRows, ...syntheticRows] : realRows;
    const withRank = rankForTab(merged, tab);
    const communityStats = buildCommunityStats({
      realUserCount,
      rows: merged,
    });

    // This endpoint is public (no auth). Strip the full email address from each
    // entry so we don't leak user PII to anonymous callers. `handle`/`name` are
    // already shown on the leaderboard UI and reveal nothing beyond the display name.
    const publicLeaderboard = withRank.slice(0, 60).map(({ email, ...rest }) => rest);

    res.json({ status: "success", data: publicLeaderboard, meta: { communityStats, realRankedCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard/me?range=all|week|month
 */
export const getMyRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || "all";
    const userId = req.user!.id;

    const rows = await prisma.$queryRawUnsafe<LeaderboardRawRow[]>(buildLeaderboardQuery(range, true));
    const realRows = mapRealRows(rows);
    const realRankedCount = realRows.filter((row) => row.isRankUnlocked).length;
    const myData = realRows.find((item) => item.userId === userId);
    const mapped = realRankedCount < 100 ? [...realRows, ...buildSyntheticLeaderboardRows(range)] : realRows;

    const overallRanked = rankForTab(mapped, "overall");
    const myOverallIndex = overallRanked.findIndex((item) => item.userId === userId);
    const myOverallRank = myOverallIndex >= 0 ? overallRanked[myOverallIndex].rank : -1;

    const mcqRanked = rankForTab(mapped, "mcq");
    const myMcqIndex = mcqRanked.findIndex((item) => item.userId === userId);
    const myMcqRank = myMcqIndex >= 0 ? mcqRanked[myMcqIndex].rank : -1;

    const mainsRanked = rankForTab(mapped, "mains");
    const myMainsIndex = mainsRanked.findIndex((item) => item.userId === userId);
    const myMainsRank = myMainsIndex >= 0 ? mainsRanked[myMainsIndex].rank : -1;

    const isRankUnlocked = Boolean(myData?.isRankUnlocked);
    const attemptsToUnlockRank = Math.max(0, 3 - (myData?.attemptCount ?? 0));

    res.json({
      status: "success",
      data: {
        ...(myData ? stripInternal(myData) : {}),
        rank: isRankUnlocked && myOverallRank > 0 ? myOverallRank : null,
        mcqRank: isRankUnlocked && myMcqRank > 0 ? myMcqRank : null,
        mainsRank: isRankUnlocked && myMainsRank > 0 ? myMainsRank : null,
        isRankUnlocked,
        attemptsToUnlockRank,
        // Keep the denominator paired with the same (real + fallback) list used
        // to calculate `mcqRank`. `realRankedCount` is retained for admin/community
        // metrics, but using it beside a synthetic-aware rank produced values such
        // as "#949 of 17 ranked".
        mcqRankedCount: mcqRanked.length,
        realRankedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
