import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMoodValue(mood: string): number {
  const map: Record<string, number> = {
    Exhausted: 1,
    Low: 2,
    Anxious: 3,
    Frustrated: 4,
    Okay: 5,
    Good: 6,
    Great: 7,
    "On Fire!": 8,
  };
  return map[mood] ?? 5;
}

function getStressLevel(checkIns: { mood: string; energy: number }[]): { level: number; label: string } {
  if (checkIns.length === 0) return { level: 0.5, label: "Moderate" };
  const totalScore = checkIns.reduce((sum, c) => {
    const moodVal = getMoodValue(c.mood);
    return sum + (moodVal + c.energy);
  }, 0);
  const avg = totalScore / (checkIns.length * 18); // max possible per entry = 8 + 10 = 18
  const inverted = 1 - avg;
  const level = Math.max(0, Math.min(1, inverted));

  let label = "Low";
  if (level > 0.35) label = "Moderate";
  if (level > 0.65) label = "High";
  if (level > 0.85) label = "Very High";

  return { level, label };
}

async function updateWellnessStreak(userId: string) {
  const today = getToday();

  let streak = await prisma.wellnessStreak.findUnique({ where: { userId } });

  if (!streak) {
    await prisma.wellnessStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastCheckIn: today },
    });
    return;
  }

  const lastDate = streak.lastCheckIn ? new Date(streak.lastCheckIn) : null;
  if (lastDate && isSameDay(lastDate, today)) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastDate && isSameDay(lastDate, yesterday);

  const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;

  await prisma.wellnessStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      lastCheckIn: today,
    },
  });
}

/**
 * POST /api/mental-health/check-in
 */
export const saveCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { mood, energy, note } = req.body;

    if (!mood || typeof energy !== "number") {
      return res.status(400).json({ status: "error", message: "mood and energy are required" });
    }

    if (energy < 1 || energy > 10) {
      return res.status(400).json({ status: "error", message: "energy must be between 1 and 10" });
    }

    const today = getToday();

    // Upsert today's check-in (only one per day)
    const existing = await prisma.moodCheckIn.findFirst({
      where: { userId, date: today },
    });

    let checkIn;
    if (existing) {
      checkIn = await prisma.moodCheckIn.update({
        where: { id: existing.id },
        data: { mood, energy, note: note ?? existing.note },
      });
    } else {
      checkIn = await prisma.moodCheckIn.create({
        data: { userId, mood, energy, note: note ?? null, date: today },
      });
      await updateWellnessStreak(userId);
    }

    res.status(201).json({ status: "success", data: checkIn });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mental-health/check-ins
 */
export const getCheckIns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const checkIns = await prisma.moodCheckIn.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "desc" },
    });

    res.json({ status: "success", data: checkIns });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mental-health/streak
 */
export const getStreak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    let streak = await prisma.wellnessStreak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await prisma.wellnessStreak.create({
        data: { userId, currentStreak: 0, longestStreak: 0 },
      });
    }

    res.json({ status: "success", data: streak });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mental-health/tool-session
 */
export const saveToolSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { toolType, duration, completed } = req.body;

    if (!toolType || typeof duration !== "number") {
      return res.status(400).json({ status: "error", message: "toolType and duration are required" });
    }

    const session = await prisma.mindToolSession.create({
      data: { userId, toolType, duration, completed: completed ?? true },
    });

    res.status(201).json({ status: "success", data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mental-health/tool-stats
 */
export const getToolStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.mindToolSession.findMany({
      where: { userId, completed: true },
      orderBy: { createdAt: "desc" },
    });

    const statsMap = new Map<
      string,
      { toolType: string; sessions: number; totalMinutes: number }
    >();

    for (const s of sessions) {
      const existing = statsMap.get(s.toolType);
      if (existing) {
        existing.sessions += 1;
        existing.totalMinutes += s.duration;
      } else {
        statsMap.set(s.toolType, {
          toolType: s.toolType,
          sessions: 1,
          totalMinutes: s.duration,
        });
      }
    }

    res.json({ status: "success", data: Array.from(statsMap.values()) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mental-health/daily-content
 */
export const getDailyContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [latestCheckIn, streak] = await Promise.all([
      prisma.moodCheckIn.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.wellnessStreak.findUnique({ where: { userId } }),
    ]);

    const tips: Record<string, string[]> = {
      Low: [
        "Take a 10-minute walk outside — sunlight boosts serotonin naturally.",
        "Write down three small wins from today, no matter how minor.",
        "Reach out to a friend or mentor — connection heals isolation.",
      ],
      Anxious: [
        "Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 4 times.",
        "Limit caffeine for the next 6 hours — it amplifies anxiety loops.",
        "Break your next task into a 5-minute micro-step to reduce overwhelm.",
      ],
      Okay: [
        "Take 5 minutes of box breathing before your study session.",
        "Spend 10 min outside — sunlight resets cortisol naturally.",
        "Write tomorrow's 3 tasks tonight — reduces morning anxiety.",
      ],
      Good: [
        "Channel this energy into your hardest topic — momentum is everything.",
        "Help a peer with a doubt — teaching deepens your own clarity.",
        "Log this feeling so you can recall what habits created it.",
      ],
      Great: [
        "You're in flow — protect this time. Silence notifications for 90 min.",
        "Set a stretch goal for today while confidence is high.",
        "Celebrate properly: a good meal, music, or a short walk.",
      ],
    };

    const allAffirmations = [
      "The UPSC exam tests your consistency, not your brilliance. Show up every single day and the result will take care of itself.",
      "Every page you read today is a brick in the foundation of your success. Keep building.",
      "Rest is not giving up. Rest is part of the strategy.",
      "You have survived 100% of your bad days so far. This one is no different.",
      "Comparison is the thief of joy. Run your own race, at your own pace.",
      "The syllabus is vast, but so is your capacity to learn. Trust the process.",
      "One mock test does not define you. One bad day does not define you. Your effort does.",
      "Clarity comes from engagement, not thought. Start before you feel ready.",
    ];

    const moodKey = latestCheckIn?.mood as string | undefined;
    const tipPool = (moodKey && tips[moodKey]) ? tips[moodKey] : tips["Okay"];

    // Deterministic daily tip based on date
    const dayIndex = new Date().getDate() % tipPool.length;
    const affirmationIndex = new Date().getDate() % allAffirmations.length;

    res.json({
      status: "success",
      data: {
        tip: tipPool[dayIndex],
        affirmation: allAffirmations[affirmationIndex],
        streak: streak?.currentStreak ?? 0,
        lastMood: latestCheckIn?.mood ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mental-health/stress-index
 */
export const getStressIndex = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const checkIns = await prisma.moodCheckIn.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { mood: true, energy: true, date: true },
    });

    const { level, label } = getStressLevel(checkIns);

    const tips: Record<string, string[]> = {
      Low: [
        "You're in a great mental space. Use this stability to tackle difficult topics.",
        "Maintain your sleep and exercise rhythm — prevention is easier than recovery.",
      ],
      Moderate: [
        "You're managing well. A few mindful practices will keep you steady.",
        "Take 5 minutes of box breathing before your study session.",
        "Spend 10 min outside — sunlight resets cortisol naturally.",
      ],
      High: [
        "Your stress levels are elevated. Prioritize one recovery activity today.",
        "Consider cutting study time by 30 min to make room for a walk or meditation.",
        "Talk to someone — peer support or a mentor can reframe pressure into purpose.",
      ],
      "Very High": [
        "Your body is asking for a pause. This is not weakness — it's wisdom.",
        "Do a 10-minute grounding exercise before opening any book.",
        "If stress persists, consider speaking to a counselor. iCall: 9152987821.",
      ],
    };

    res.json({
      status: "success",
      data: {
        level,
        label,
        daysAnalyzed: days,
        checkInCount: checkIns.length,
        tips: tips[label] ?? tips["Moderate"],
        history: checkIns.map((c) => ({
          date: c.date,
          energy: c.energy,
          mood: c.mood,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
