import prisma from "../config/database";

export interface DerivedStudyStreak {
  currentStreak: number;
  longestStreak: number;
  weekActivity: boolean[];
  lastActiveDate: Date | null;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  const d = startOfDay(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDate(keys: Set<string>, date?: Date | null) {
  if (date) keys.add(dateKey(date));
}

function getMondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function buildWeekActivity(keys: Set<string>, today: Date): boolean[] {
  const activity = [false, false, false, false, false, false, false];
  const monday = startOfDay(today);
  monday.setDate(monday.getDate() - getMondayIndex(monday));

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    activity[offset] = keys.has(dateKey(d));
  }

  return activity;
}

function countCurrentStreak(keys: Set<string>, today: Date): number {
  const cursor = startOfDay(today);
  let count = 0;

  if (!keys.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!keys.has(dateKey(cursor))) return 0;
  }

  while (keys.has(dateKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function countLongestStreak(keys: Set<string>): number {
  const sorted = [...keys].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of sorted) {
    const currentDate = startOfDay(new Date(`${key}T00:00:00`));
    if (!previous) {
      current = 1;
    } else {
      const expected = new Date(previous);
      expected.setDate(expected.getDate() + 1);
      current = dateKey(expected) === key ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    previous = currentDate;
  }

  return longest;
}

async function getActivityDateKeys(userId: string): Promise<Set<string>> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);

  const [
    activities,
    mcqAttempts,
    mainsAttempts,
    mockAttempts,
    mockMainsAttempts,
    pyqMainsAttempts,
    completedTasks,
    editorialReads,
  ] = await Promise.all([
    prisma.userActivity.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.mCQAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.mainsAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, submittedAt: true },
    }),
    prisma.mockTestAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.mockTestMainsAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, submittedAt: true },
    }),
    prisma.pyqMainsAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, submittedAt: true },
    }),
    prisma.studyPlanTask.findMany({
      where: {
        userId,
        isCompleted: true,
        OR: [{ completedAt: { gte: since } }, { date: { gte: since } }],
      },
      select: { completedAt: true, date: true },
    }),
    prisma.editorialProgress.findMany({
      where: { userId, isRead: true, readAt: { gte: since } },
      select: { readAt: true },
    }),
  ]);

  const keys = new Set<string>();
  activities.forEach((row) => addDate(keys, row.createdAt));
  mcqAttempts.forEach((row) => addDate(keys, row.completedAt ?? row.createdAt));
  mainsAttempts.forEach((row) => addDate(keys, row.submittedAt ?? row.createdAt));
  mockAttempts.forEach((row) => addDate(keys, row.completedAt ?? row.createdAt));
  mockMainsAttempts.forEach((row) => addDate(keys, row.submittedAt ?? row.createdAt));
  pyqMainsAttempts.forEach((row) => addDate(keys, row.submittedAt ?? row.createdAt));
  completedTasks.forEach((row) => addDate(keys, row.completedAt ?? row.date));
  editorialReads.forEach((row) => addDate(keys, row.readAt));

  return keys;
}

export async function getDerivedStudyStreak(userId: string): Promise<DerivedStudyStreak> {
  const today = startOfDay(new Date());
  const [keys, stored] = await Promise.all([
    getActivityDateKeys(userId),
    prisma.userStreak.findUnique({ where: { userId } }),
  ]);

  const sortedKeys = [...keys].sort();
  const calculatedLongest = countLongestStreak(keys);
  const longestStreak = Math.max(calculatedLongest, stored?.longestStreak ?? 0);

  return {
    currentStreak: countCurrentStreak(keys, today),
    longestStreak,
    weekActivity: buildWeekActivity(keys, today),
    lastActiveDate: sortedKeys.length ? new Date(`${sortedKeys[sortedKeys.length - 1]}T00:00:00`) : null,
  };
}
