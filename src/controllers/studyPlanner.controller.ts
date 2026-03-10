import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/study-plan/today
 * Today's study plan tasks
 */
export const getTodayTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = getToday();

    const tasks = await prisma.studyPlanTask.findMany({
      where: { userId, date: today },
      orderBy: [{ isCompleted: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
    });

    res.json({ status: "success", data: tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-plan/tasks
 * Add a task: { title, description, subject, type, date, startTime, endTime, duration }
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, description, subject, type, date, startTime, endTime, duration } = req.body;

    if (!title) {
      return res.status(400).json({ status: "error", message: "Title is required" });
    }

    const taskDate = date ? new Date(date) : getToday();
    taskDate.setHours(0, 0, 0, 0);

    const task = await prisma.studyPlanTask.create({
      data: {
        userId,
        title,
        description,
        subject,
        type: type || "study",
        date: taskDate,
        startTime,
        endTime,
        duration,
      },
    });

    res.status(201).json({ status: "success", data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/study-plan/tasks/:id
 * Update a task
 */
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { title, description, subject, type, date, startTime, endTime, duration, isCompleted } = req.body;

    const existing = await prisma.studyPlanTask.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Task not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) { const d = new Date(date); d.setHours(0, 0, 0, 0); updateData.date = d; }
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (duration !== undefined) updateData.duration = duration;
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }

    const task = await prisma.studyPlanTask.update({ where: { id }, data: updateData });

    // Update study streak if completed
    if (isCompleted) {
      await updateStudyStreak(userId);
    }

    res.json({ status: "success", data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/study-plan/tasks/:id
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.studyPlanTask.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Task not found" });
    }

    await prisma.studyPlanTask.delete({ where: { id } });
    res.json({ status: "success", message: "Task deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-plan/streak
 */
export const getStudyStreak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    let streak = await prisma.studyStreak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await prisma.studyStreak.create({
        data: { userId, currentStreak: 0, longestStreak: 0, totalStudyDays: 0 },
      });
    }

    res.json({ status: "success", data: streak });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-plan/weekly-goals
 */
export const getWeeklyGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const weekStart = getWeekStart();

    // One-time cleanup: wipe ALL existing weekly goals for this user
    const existingCount = await prisma.weeklyGoal.count({ where: { userId } });
    if (existingCount > 0) {
      await prisma.weeklyGoal.deleteMany({ where: { userId } });
    }

    const goals = await prisma.weeklyGoal.findMany({
      where: { userId, weekStart },
      orderBy: { createdAt: "asc" },
    });

    res.json({ status: "success", data: goals.map(g => ({ id: g.id, title: g.title, completed: g.isCompleted })) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/study-plan/weekly-goals
 */
export const saveWeeklyGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const weekStart = getWeekStart();
    const { goals } = req.body as { goals: { title: string; completed?: boolean }[] };

    if (!Array.isArray(goals)) {
      res.status(400).json({ status: "error", message: "goals must be an array" });
      return;
    }

    // Delete existing goals for this week and recreate
    await prisma.weeklyGoal.deleteMany({ where: { userId, weekStart } });

    const created = await Promise.all(
      goals
        .filter(g => g.title?.trim())
        .map(g =>
          prisma.weeklyGoal.create({
            data: {
              userId,
              title: g.title.trim(),
              targetCount: 1,
              isCompleted: g.completed ?? false,
              weekStart,
            },
          })
        )
    );

    res.json({ status: "success", data: created.map(g => ({ id: g.id, title: g.title, completed: g.isCompleted })) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-plan/syllabus-coverage
 */
export const getSyllabusCoverage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fixed list of UPSC subjects to always show
    const SUBJECTS = [
      "Polity", "History", "Geography", "Economics",
      "Science & Technology", "Environment", "Ethics", "Current Affairs",
    ];

    // Count total and completed tasks per subject
    const [allTasks, completedTasks] = await Promise.all([
      prisma.studyPlanTask.groupBy({
        by: ["subject"],
        where: { userId, subject: { in: SUBJECTS } },
        _count: { id: true },
      }),
      prisma.studyPlanTask.groupBy({
        by: ["subject"],
        where: { userId, subject: { in: SUBJECTS }, isCompleted: true },
        _count: { id: true },
      }),
    ]);

    const totalMap = new Map(allTasks.map(r => [r.subject!, r._count.id]));
    const doneMap  = new Map(completedTasks.map(r => [r.subject!, r._count.id]));

    const data = SUBJECTS.map(subject => {
      const total     = totalMap.get(subject) ?? 0;
      const completed = doneMap.get(subject) ?? 0;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { subject, completedTasks: completed, totalTasks: total, percentage };
    });

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-plan/monthly-activity
 * Returns day numbers in the given month that have at least one completed task
 */
export const getMonthlyActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || now.getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const tasks = await prisma.studyPlanTask.findMany({
      where: {
        userId,
        isCompleted: true,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { date: true },
    });

    const daySet = new Set<number>();
    for (const task of tasks) {
      daySet.add(new Date(task.date).getDate());
    }

    res.json({ status: "success", data: { studiedDays: Array.from(daySet).sort((a, b) => a - b) } });
  } catch (error) {
    next(error);
  }
};

function getWeekStart(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

async function updateStudyStreak(userId: string) {
  const today = getToday();

  let streak = await prisma.studyStreak.findUnique({ where: { userId } });

  if (!streak) {
    await prisma.studyStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, totalStudyDays: 1, lastStudyDate: today },
    });
    return;
  }

  const lastDate = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  if (lastDate && lastDate.getTime() === today.getTime()) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastDate && lastDate.getTime() === yesterday.getTime();

  const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;

  await prisma.studyStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      totalStudyDays: streak.totalStudyDays + 1,
      lastStudyDate: today,
    },
  });
}
