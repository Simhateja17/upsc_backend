import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

interface LeaderboardRawRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  mcq_avg: number;
  mock_avg: number;
  mains_avg: number;
  streak: number;
  study_hours: number;
}

function computeScore(mcqAvg: number, mockAvg: number, streak: number, studyHours: number) {
  const mcqScore = (Math.min(mcqAvg, 100) / 100) * 30;
  const mockScore = (Math.min(mockAvg, 100) / 100) * 30;
  const streakScore = (Math.min(streak, 30) / 30) * 20;
  const hoursScore = (Math.min(studyHours, 100) / 100) * 20;
  return parseFloat((mcqScore + mockScore + streakScore + hoursScore).toFixed(2));
}

function getDateFilter(range: string, tableAlias: string) {
  if (range === "week") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '7 days'`;
  if (range === "month") return `AND ${tableAlias}.created_at >= NOW() - INTERVAL '30 days'`;
  return "";
}

/**
 * GET /api/leaderboard?tab=overall|mcq|mains&range=all|week|month
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || "all";
    const tab = (req.query.tab as string) || "overall";

    const mcqFilter = getDateFilter(range, "m");
    const mockFilter = getDateFilter(range, "mt");
    const mainsFilter = getDateFilter(range, "ma");
    const activityFilter = getDateFilter(range, "ua");

    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        COALESCE(AVG(m.accuracy), 0) as mcq_avg,
        COALESCE(AVG(mt.accuracy), 0) as mock_avg,
        COALESCE(AVG(me.score / NULLIF(me.max_score, 0) * 100), 0) as mains_avg,
        COALESCE(us.current_streak, 0) as streak,
        COALESCE(SUM(COALESCE((ua.metadata->>'hours')::numeric, 0)), 0) as study_hours
      FROM users u
      LEFT JOIN mcq_attempts m ON m.user_id = u.id ${mcqFilter}
      LEFT JOIN mock_test_attempts mt ON mt.user_id = u.id ${mockFilter}
      LEFT JOIN mains_attempts ma ON ma.user_id = u.id ${mainsFilter}
      LEFT JOIN mains_evaluations me ON me.attempt_id = ma.id AND me.status = 'completed'
      LEFT JOIN user_streaks us ON us.user_id = u.id
      LEFT JOIN user_activities ua ON ua.user_id = u.id AND ua.type = 'study' ${activityFilter}
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url, us.current_streak
      HAVING COUNT(m.id) > 0 OR COUNT(mt.id) > 0 OR COUNT(ma.id) > 0 OR COUNT(ua.id) > 0 OR us.current_streak > 0
    `;

    const rows = await prisma.$queryRawUnsafe<LeaderboardRawRow[]>(query);

    const mapped = rows.map((row) => {
      const totalScore = computeScore(
        Number(row.mcq_avg) || 0,
        Number(row.mock_avg) || 0,
        Number(row.streak) || 0,
        Number(row.study_hours) || 0
      );
      const accuracy =
        row.mcq_avg || row.mock_avg
          ? parseFloat(
              (((Number(row.mcq_avg) || 0) + (Number(row.mock_avg) || 0)) / 2).toFixed(1)
            )
          : 0;

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
        mcqAvg: parseFloat((Number(row.mcq_avg) || 0).toFixed(1)),
        mockAvg: parseFloat((Number(row.mock_avg) || 0).toFixed(1)),
        mainsAvg: parseFloat((Number(row.mains_avg) || 0).toFixed(1)),
        streak: Number(row.streak) || 0,
        studyHours: parseFloat((Number(row.study_hours) || 0).toFixed(1)),
        accuracy,
      };
    });

    let sorted: typeof mapped;
    if (tab === "mcq") {
      sorted = mapped.sort((a, b) => b.mcqAvg - a.mcqAvg || b.totalScore - a.totalScore);
    } else if (tab === "mains") {
      sorted = mapped.sort((a, b) => b.mainsAvg - a.mainsAvg || b.totalScore - a.totalScore);
    } else {
      sorted = mapped.sort((a, b) => b.totalScore - a.totalScore);
    }

    const withRank = sorted.map((item, index) => ({ ...item, rank: index + 1 }));

    res.json({ status: "success", data: withRank });
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

    const mcqFilter = getDateFilter(range, "m");
    const mockFilter = getDateFilter(range, "mt");
    const mainsFilter = getDateFilter(range, "ma");
    const activityFilter = getDateFilter(range, "ua");

    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        COALESCE(AVG(m.accuracy), 0) as mcq_avg,
        COALESCE(AVG(mt.accuracy), 0) as mock_avg,
        COALESCE(AVG(me.score / NULLIF(me.max_score, 0) * 100), 0) as mains_avg,
        COALESCE(us.current_streak, 0) as streak,
        COALESCE(SUM(COALESCE((ua.metadata->>'hours')::numeric, 0)), 0) as study_hours
      FROM users u
      LEFT JOIN mcq_attempts m ON m.user_id = u.id ${mcqFilter}
      LEFT JOIN mock_test_attempts mt ON mt.user_id = u.id ${mockFilter}
      LEFT JOIN mains_attempts ma ON ma.user_id = u.id ${mainsFilter}
      LEFT JOIN mains_evaluations me ON me.attempt_id = ma.id AND me.status = 'completed'
      LEFT JOIN user_streaks us ON us.user_id = u.id
      LEFT JOIN user_activities ua ON ua.user_id = u.id AND ua.type = 'study' ${activityFilter}
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url, us.current_streak
    `;

    const rows = await prisma.$queryRawUnsafe<LeaderboardRawRow[]>(query);

    const mapped = rows.map((row) => {
      const totalScore = computeScore(
        Number(row.mcq_avg) || 0,
        Number(row.mock_avg) || 0,
        Number(row.streak) || 0,
        Number(row.study_hours) || 0
      );
      const accuracy =
        row.mcq_avg || row.mock_avg
          ? parseFloat(
              (((Number(row.mcq_avg) || 0) + (Number(row.mock_avg) || 0)) / 2).toFixed(1)
            )
          : 0;

      return {
        userId: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Anonymous",
        email: row.email,
        avatarUrl: row.avatar_url,
        totalScore,
        mcqAvg: parseFloat((Number(row.mcq_avg) || 0).toFixed(1)),
        mockAvg: parseFloat((Number(row.mock_avg) || 0).toFixed(1)),
        mainsAvg: parseFloat((Number(row.mains_avg) || 0).toFixed(1)),
        streak: Number(row.streak) || 0,
        studyHours: parseFloat((Number(row.study_hours) || 0).toFixed(1)),
        accuracy,
      };
    });

    const overallSorted = [...mapped].sort((a, b) => b.totalScore - a.totalScore);
    const myOverallIndex = overallSorted.findIndex((item) => item.userId === userId);

    const mcqSorted = [...mapped].sort((a, b) => b.mcqAvg - a.mcqAvg);
    const myMcqIndex = mcqSorted.findIndex((item) => item.userId === userId);

    const mainsSorted = [...mapped].sort((a, b) => b.mainsAvg - a.mainsAvg);
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
