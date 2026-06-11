import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

interface LeaderboardRawRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  mcq_avg: number;
  pyq_prelims_avg: number;
  mock_prelims_avg: number;
  mock_mains_avg: number;
  daily_mains_avg: number;
  pyq_mains_avg: number;
  mains_avg: number;
  streak: number;
  study_hours: number;
  questions_solved: number;
  attempt_count: number;
}

type LeaderboardRow = ReturnType<typeof mapRealRows>[number];
type RankedLeaderboardRow = LeaderboardRow & { rank: number };

function avg(values: number[], includeZeros = false) {
  const filtered = values.filter((value) => Number.isFinite(value) && (includeZeros || value > 0));
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function pctToTen(value: number) {
  return parseFloat(((Number(value) || 0) / 10).toFixed(2));
}

function getDateFilter(range: string, tableAlias: string) {
  if (range === "week") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '7 days'`;
  if (range === "month") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '30 days'`;
  return "";
}

function mapRealRows(rows: LeaderboardRawRow[]) {
  return rows.map((row) => {
    const dailyMcqScore = pctToTen(Number(row.mcq_avg) || 0);
    const pyqPrelimsScore = pctToTen(Number(row.pyq_prelims_avg) || 0);
    const mockPrelimsScore = pctToTen(Number(row.mock_prelims_avg) || 0);
    const dailyAnswerScore = pctToTen(Number(row.daily_mains_avg) || 0);
    const pyqMainsScore = pctToTen(Number(row.pyq_mains_avg) || 0);
    const mockMainsScore = pctToTen(Number(row.mock_mains_avg) || 0);
    const mcqAvg = parseFloat(avg([dailyMcqScore, pyqPrelimsScore, mockPrelimsScore], true).toFixed(2));
    const mockAvg = parseFloat(avg([mockPrelimsScore, mockMainsScore], true).toFixed(2));
    const dailyAnswerAvg = dailyAnswerScore;
    const pyqAvg = parseFloat(avg([pyqPrelimsScore, pyqMainsScore], true).toFixed(2));
    const mainsAvg = parseFloat(avg([dailyAnswerScore, pyqMainsScore, mockMainsScore], true).toFixed(2));
    const totalScore = parseFloat(avg([
      dailyMcqScore,
      pyqPrelimsScore,
      mockPrelimsScore,
      dailyAnswerScore,
      pyqMainsScore,
      mockMainsScore,
    ], true).toFixed(2));
    const accuracy = parseFloat((totalScore * 10).toFixed(1));
    const attemptCount = Number(row.attempt_count) || 0;

    return {
      userId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Anonymous",
      email: row.email,
      handle: row.email ? `@${row.email.split("@")[0]}` : "",
      initial: (row.first_name?.[0] || row.last_name?.[0] || "?").toUpperCase(),
      avatarUrl: row.avatar_url,
      totalScore,
      mcqAvg,
      mockAvg,
      mainsAvg,
      dailyMcqScore,
      pyqPrelimsScore,
      mockPrelimsScore,
      dailyAnswerScore,
      pyqMainsScore,
      mockMainsScore,
      dailyAnswerAvg,
      pyqAvg,
      streak: Number(row.streak) || 0,
      studyHours: parseFloat((Number(row.study_hours) || 0).toFixed(1)),
      accuracy,
      questionsSolved: Number(row.questions_solved) || 0,
      attemptCount,
      isRankUnlocked: attemptCount >= 3,
      isSynthetic: false,
    };
  });
}

function getScoreForRanking(item: LeaderboardRow, tab: string): number {
  if (tab === "mcq") return item.mcqAvg;
  if (tab === "mains") return item.mainsAvg;
  return item.totalScore;
}

function sortLeaderboard(rows: LeaderboardRow[], tab: string) {
  const sorted = [...rows];
  if (tab === "mcq") {
    return sorted.sort((a, b) => b.mcqAvg - a.mcqAvg || b.totalScore - a.totalScore);
  }
  if (tab === "mains") {
    return sorted.sort((a, b) => b.mainsAvg - a.mainsAvg || b.totalScore - a.totalScore);
  }
  return sorted.sort((a, b) => b.totalScore - a.totalScore);
}

function assignRanks(rows: LeaderboardRow[], tab: string): RankedLeaderboardRow[] {
  let previousRank = 1;
  return rows.map((item, index) => {
    if (index === 0) return { ...item, rank: previousRank };
    const prev = rows[index - 1];
    const sameScore = getScoreForRanking(item, tab) === getScoreForRanking(prev, tab);
    previousRank = sameScore ? previousRank : index + 1;
    return { ...item, rank: previousRank };
  });
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
    : `WHERE COALESCE(mcq.mcq_count, 0) > 0
        OR COALESCE(mock.mock_count, 0) > 0
        OR COALESCE(pyq_prelims.pyq_prelims_count, 0) > 0
        OR COALESCE(daily_mains.daily_mains_count, 0) > 0
        OR COALESCE(pyq.pyq_count, 0) > 0
        OR COALESCE(mock_mains.mock_mains_count, 0) > 0
        OR COALESCE(study.study_count, 0) > 0
        OR COALESCE(us.current_streak, 0) > 0`;

  return `
    WITH
      mcq AS (
        SELECT m.user_id, AVG(m.accuracy) as mcq_avg, COUNT(m.id) as mcq_count,
               SUM(COALESCE(m.correct_count, 0) + COALESCE(m.wrong_count, 0) + COALESCE(m.skipped_count, 0)) as mcq_questions
        FROM mcq_attempts m
        WHERE 1=1 ${mcqFilter}
        GROUP BY m.user_id
      ),
      mock AS (
        SELECT mt.user_id, AVG(mt.accuracy) as mock_prelims_avg, COUNT(mt.id) as mock_count,
               SUM(COALESCE(mt.correct_count, 0) + COALESCE(mt.wrong_count, 0) + COALESCE(mt.skipped_count, 0)) as mock_questions
        FROM mock_test_attempts mt
        WHERE 1=1 ${mockFilter}
        GROUP BY mt.user_id
      ),
      pyq_prelims AS (
        SELECT ppa.user_id,
               AVG(ppa.accuracy) as pyq_prelims_avg,
               COUNT(ppa.id) as pyq_prelims_count
        FROM pyq_prelims_attempts ppa
        WHERE 1=1 ${pyqPrelimsFilter}
        GROUP BY ppa.user_id
      ),
      daily_mains AS (
        SELECT ma.user_id,
               AVG(me.score / NULLIF(me.max_score, 0) * 100) as daily_mains_avg,
               COUNT(ma.id) as daily_mains_count
        FROM mains_attempts ma
        LEFT JOIN mains_evaluations me ON me.attempt_id = ma.id AND me.status = 'completed'
        WHERE 1=1 ${dailyMainsFilter}
        GROUP BY ma.user_id
      ),
      pyq AS (
        SELECT pma.user_id,
               AVG(pme.score / NULLIF(pme.max_score, 0) * 100) as pyq_mains_avg,
               COUNT(pma.id) as pyq_count
        FROM pyq_mains_attempts pma
        LEFT JOIN pyq_mains_evaluations pme ON pme.attempt_id = pma.id AND pme.status = 'completed'
        WHERE 1=1 ${pyqFilter}
        GROUP BY pma.user_id
      ),
      mock_mains AS (
        SELECT mma.user_id,
               AVG(mme.score / NULLIF(mme.max_score, 0) * 100) as mock_mains_avg,
               COUNT(mma.id) as mock_mains_count
        FROM mock_test_mains_attempts mma
        LEFT JOIN mock_test_mains_evaluations mme ON mme.attempt_id = mma.id AND mme.status = 'completed'
        WHERE 1=1 ${mockMainsFilter}
        GROUP BY mma.user_id
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
      COALESCE(mcq.mcq_avg, 0) as mcq_avg,
      COALESCE(pyq_prelims.pyq_prelims_avg, 0) as pyq_prelims_avg,
      COALESCE(mock.mock_prelims_avg, 0) as mock_prelims_avg,
      COALESCE(mock_mains.mock_mains_avg, 0) as mock_mains_avg,
      COALESCE(daily_mains.daily_mains_avg, 0) as daily_mains_avg,
      COALESCE(pyq.pyq_mains_avg, 0) as pyq_mains_avg,
      COALESCE((COALESCE(daily_mains.daily_mains_avg, 0) + COALESCE(pyq.pyq_mains_avg, 0) + COALESCE(mock_mains.mock_mains_avg, 0)) / 3, 0) as mains_avg,
      COALESCE(us.current_streak, 0) as streak,
      COALESCE(study.study_hours, 0) as study_hours,
      COALESCE(mcq.mcq_questions, 0)
        + COALESCE(mock.mock_questions, 0)
        + COALESCE(pyq_prelims.pyq_prelims_count, 0)
        + COALESCE(daily_mains.daily_mains_count, 0)
        + COALESCE(pyq.pyq_count, 0)
        + COALESCE(mock_mains.mock_mains_count, 0) as questions_solved,
      COALESCE(mcq.mcq_count, 0)
        + COALESCE(mock.mock_count, 0)
        + COALESCE(pyq_prelims.pyq_prelims_count, 0)
        + COALESCE(daily_mains.daily_mains_count, 0)
        + COALESCE(pyq.pyq_count, 0)
        + COALESCE(mock_mains.mock_mains_count, 0) as attempt_count
    FROM users u
    LEFT JOIN mcq ON mcq.user_id = u.id
    LEFT JOIN mock ON mock.user_id = u.id
    LEFT JOIN pyq_prelims ON pyq_prelims.user_id = u.id
    LEFT JOIN daily_mains ON daily_mains.user_id = u.id
    LEFT JOIN pyq ON pyq.user_id = u.id
    LEFT JOIN mock_mains ON mock_mains.user_id = u.id
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

    const [rows, realUserCount, activeTodayRows] = await Promise.all([
      prisma.$queryRawUnsafe<LeaderboardRawRow[]>(buildLeaderboardQuery(range, false)),
      prisma.user.count({ where: { isActive: true } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT user_id) AS count
        FROM public.user_activities
        WHERE created_at >= CURRENT_DATE
      `,
    ]);
    const realRows = mapRealRows(rows);
    const realRankedCount = realRows.filter((row) => row.isRankUnlocked).length;
    const withRank = sortLeaderboard(realRows, tab).map((item, index) => ({ ...item, rank: index + 1 }));
    const questionsSolved = realRows.reduce((sum, row) => sum + row.questionsSolved, 0);
    const rowsWithAccuracy = realRows.filter((row) => row.accuracy > 0);
    const communityStats = {
      totalAspirants: realUserCount,
      activeToday: Number(activeTodayRows[0]?.count ?? 0),
      questionsSolved,
      avgAccuracy: rowsWithAccuracy.length
        ? Math.round(rowsWithAccuracy.reduce((sum, row) => sum + row.accuracy, 0) / rowsWithAccuracy.length)
        : 0,
    };

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

    const overallRanked = assignRanks(sortLeaderboard(realRows, "overall"), "overall");
    const myOverallIndex = overallRanked.findIndex((item) => item.userId === userId);
    const myOverallRank = myOverallIndex >= 0 ? overallRanked[myOverallIndex].rank : -1;

    const mcqRanked = assignRanks(sortLeaderboard(realRows, "mcq"), "mcq");
    const myMcqIndex = mcqRanked.findIndex((item) => item.userId === userId);
    const myMcqRank = myMcqIndex >= 0 ? mcqRanked[myMcqIndex].rank : -1;

    const mainsRanked = assignRanks(sortLeaderboard(realRows, "mains"), "mains");
    const myMainsIndex = mainsRanked.findIndex((item) => item.userId === userId);
    const myMainsRank = myMainsIndex >= 0 ? mainsRanked[myMainsIndex].rank : -1;

    const isRankUnlocked = Boolean(myData?.isRankUnlocked);
    const attemptsToUnlockRank = Math.max(0, 3 - (myData?.attemptCount ?? 0));

    res.json({
      status: "success",
      data: {
        rank: isRankUnlocked && myOverallRank > 0 ? myOverallRank : null,
        mcqRank: isRankUnlocked && myMcqRank > 0 ? myMcqRank : null,
        mainsRank: isRankUnlocked && myMainsRank > 0 ? myMainsRank : null,
        isRankUnlocked,
        attemptsToUnlockRank,
        realRankedCount,
        ...myData,
      },
    });
  } catch (error) {
    next(error);
  }
};
