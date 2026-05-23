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
  mock_avg: number;
  mock_mains_avg: number;
  daily_mains_avg: number;
  pyq_avg: number;
  mains_avg: number;
  streak: number;
  study_hours: number;
  questions_solved: number;
}

type LeaderboardRow = ReturnType<typeof mapRealRows>[number] | SyntheticLeaderboardRow;

function avg(values: number[]) {
  const filtered = values.filter((value) => Number.isFinite(value) && value > 0);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function computeScore(mcqAvg: number, mockAvg: number, dailyAnswerAvg: number, pyqAvg: number) {
  return parseFloat(((mcqAvg + mockAvg + dailyAnswerAvg + pyqAvg) / 4).toFixed(2));
}

function getDateFilter(range: string, tableAlias: string) {
  if (range === "week") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '7 days'`;
  if (range === "month") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '30 days'`;
  return "";
}

function mapRealRows(rows: LeaderboardRawRow[]) {
  return rows.map((row) => {
    const mcqAvg = parseFloat((Number(row.mcq_avg) || 0).toFixed(1));
    const mockPrelimsAvg = Number(row.mock_avg) || 0;
    const mockMainsAvg = Number(row.mock_mains_avg) || 0;
    const mockAvg = parseFloat(avg([mockPrelimsAvg, mockMainsAvg]).toFixed(1));
    const dailyAnswerAvg = parseFloat((Number(row.daily_mains_avg) || 0).toFixed(1));
    const pyqAvg = parseFloat((Number(row.pyq_avg) || 0).toFixed(1));
    const mainsAvg = parseFloat(avg([dailyAnswerAvg, pyqAvg, mockMainsAvg]).toFixed(1));
    const totalScore = computeScore(mcqAvg, mockAvg, dailyAnswerAvg, pyqAvg);
    const accuracy = parseFloat(avg([mcqAvg, mockAvg, dailyAnswerAvg, pyqAvg]).toFixed(1));

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
      dailyAnswerAvg,
      pyqAvg,
      streak: Number(row.streak) || 0,
      studyHours: parseFloat((Number(row.study_hours) || 0).toFixed(1)),
      accuracy,
      questionsSolved: Number(row.questions_solved) || 0,
      isSynthetic: false,
    };
  });
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

function buildLeaderboardQuery(range: string, includeInactiveUsers: boolean) {
  const mcqFilter = getDateFilter(range, "m");
  const mockFilter = getDateFilter(range, "mt");
  const dailyMainsFilter = getDateFilter(range, "ma");
  const pyqFilter = getDateFilter(range, "pma");
  const mockMainsFilter = getDateFilter(range, "mma");
  const activityFilter = getDateFilter(range, "ua");
  const having = includeInactiveUsers
    ? ""
    : `WHERE COALESCE(mcq.mcq_count, 0) > 0
        OR COALESCE(mock.mock_count, 0) > 0
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
        SELECT mt.user_id, AVG(mt.accuracy) as mock_avg, COUNT(mt.id) as mock_count,
               SUM(COALESCE(mt.correct_count, 0) + COALESCE(mt.wrong_count, 0) + COALESCE(mt.skipped_count, 0)) as mock_questions
        FROM mock_test_attempts mt
        WHERE 1=1 ${mockFilter}
        GROUP BY mt.user_id
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
               AVG(pme.score / NULLIF(pme.max_score, 0) * 100) as pyq_avg,
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
      COALESCE(mock.mock_avg, 0) as mock_avg,
      COALESCE(mock_mains.mock_mains_avg, 0) as mock_mains_avg,
      COALESCE(daily_mains.daily_mains_avg, 0) as daily_mains_avg,
      COALESCE(pyq.pyq_avg, 0) as pyq_avg,
      COALESCE((COALESCE(daily_mains.daily_mains_avg, 0) + COALESCE(pyq.pyq_avg, 0) + COALESCE(mock_mains.mock_mains_avg, 0)) / 3, 0) as mains_avg,
      COALESCE(us.current_streak, 0) as streak,
      COALESCE(study.study_hours, 0) as study_hours,
      COALESCE(mcq.mcq_questions, 0)
        + COALESCE(mock.mock_questions, 0)
        + COALESCE(daily_mains.daily_mains_count, 0)
        + COALESCE(pyq.pyq_count, 0)
        + COALESCE(mock_mains.mock_mains_count, 0) as questions_solved
    FROM users u
    LEFT JOIN mcq ON mcq.user_id = u.id
    LEFT JOIN mock ON mock.user_id = u.id
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

    const [rows, realUserCount] = await Promise.all([
      prisma.$queryRawUnsafe<LeaderboardRawRow[]>(buildLeaderboardQuery(range, false)),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    const realRows = mapRealRows(rows);
    const syntheticRows = buildSyntheticLeaderboardRows(range);
    const merged = [...realRows, ...syntheticRows];
    const withRank = sortLeaderboard(merged, tab).map((item, index) => ({ ...item, rank: index + 1 }));
    const communityStats = buildCommunityStats({
      realUserCount,
      realQuestionsSolved: realRows.reduce((sum, row) => sum + row.questionsSolved, 0),
      rows: merged,
    });

    res.json({ status: "success", data: withRank.slice(0, 60), meta: { communityStats } });
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
    const mapped = [...mapRealRows(rows), ...buildSyntheticLeaderboardRows(range)];

    const overallSorted = sortLeaderboard(mapped, "overall");
    const myOverallIndex = overallSorted.findIndex((item) => item.userId === userId);

    const mcqSorted = sortLeaderboard(mapped, "mcq");
    const myMcqIndex = mcqSorted.findIndex((item) => item.userId === userId);

    const mainsSorted = sortLeaderboard(mapped, "mains");
    const myMainsIndex = mainsSorted.findIndex((item) => item.userId === userId);

    const myData = mapped.find((item) => item.userId === userId);

    res.json({
      status: "success",
      data: {
        rank: myOverallIndex >= 0 ? myOverallIndex + 1 : null,
        mcqRank: myMcqIndex >= 0 ? myMcqIndex + 1 : null,
        mainsRank: myMainsIndex >= 0 ? myMainsIndex + 1 : null,
        ...myData,
      },
    });
  } catch (error) {
    next(error);
  }
};
