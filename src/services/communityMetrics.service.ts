export interface SyntheticLeaderboardRow {
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  handle: string;
  initial: string;
  avatarUrl: null;
  totalScore: number;
  mcqAvg: number;
  mockAvg: number;
  mainsAvg: number;
  dailyAnswerAvg: number;
  pyqAvg: number;
  streak: number;
  studyHours: number;
  accuracy: number;
  questionsSolved: number;
  isSynthetic: true;
}

export interface CommunityStats {
  totalAspirants: number;
  activeToday: number;
  questionsSolved: number;
  avgAccuracy: number;
}

const FIRST_NAMES = [
  "Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Bhavya", "Charu", "Dev", "Diya", "Isha",
  "Karan", "Kavya", "Manasa", "Meera", "Nikhil", "Pranav", "Priya", "Rahul", "Riya", "Rohan",
  "Saanvi", "Sakshi", "Samar", "Sanya", "Suri", "Tanvi", "Varun", "Vidya", "Yash", "Zoya",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Joshi", "Mishra", "Iyer", "Reddy",
  "Rao", "Nair", "Menon", "Mehta", "Das", "Sen", "Jain", "Kapoor", "Bose", "Chandra",
];

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function currentBucket(now = new Date()) {
  return Math.floor(now.getTime() / (30 * 60 * 1000));
}

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildSyntheticLeaderboardRows(range = "all", count = 937, now = new Date()): SyntheticLeaderboardRow[] {
  const bucket = currentBucket(now);
  const seedBase = hashSeed(`${todayKey(now)}:${bucket}:${range}`);

  return Array.from({ length: count }, (_, index) => {
    const rnd = seededRand(seedBase + index * 7919 + 31337);
    const firstName = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
    const tier = rnd();

    let mcqAvg: number;
    let mockAvg: number;
    let dailyAnswerAvg: number;
    let pyqAvg: number;
    let streak: number;
    let studyHours: number;
    let questionsSolved: number;

    if (tier < 0.05) {
      mcqAvg = 84 + Math.floor(rnd() * 13);
      mockAvg = 78 + Math.floor(rnd() * 15);
      dailyAnswerAvg = 62 + Math.floor(rnd() * 23);
      pyqAvg = 70 + Math.floor(rnd() * 20);
      streak = 18 + Math.floor(rnd() * 32);
      studyHours = 70 + Math.floor(rnd() * 45);
      questionsSolved = 850 + Math.floor(rnd() * 380);
    } else if (tier < 0.2) {
      mcqAvg = 70 + Math.floor(rnd() * 14);
      mockAvg = 66 + Math.floor(rnd() * 14);
      dailyAnswerAvg = 50 + Math.floor(rnd() * 18);
      pyqAvg = 58 + Math.floor(rnd() * 18);
      streak = 9 + Math.floor(rnd() * 20);
      studyHours = 42 + Math.floor(rnd() * 36);
      questionsSolved = 480 + Math.floor(rnd() * 360);
    } else if (tier < 0.55) {
      mcqAvg = 55 + Math.floor(rnd() * 16);
      mockAvg = 50 + Math.floor(rnd() * 18);
      dailyAnswerAvg = 36 + Math.floor(rnd() * 18);
      pyqAvg = 42 + Math.floor(rnd() * 20);
      streak = 3 + Math.floor(rnd() * 12);
      studyHours = 18 + Math.floor(rnd() * 36);
      questionsSolved = 190 + Math.floor(rnd() * 290);
    } else {
      mcqAvg = 34 + Math.floor(rnd() * 22);
      mockAvg = 30 + Math.floor(rnd() * 22);
      dailyAnswerAvg = 22 + Math.floor(rnd() * 18);
      pyqAvg = 28 + Math.floor(rnd() * 18);
      streak = Math.floor(rnd() * 7);
      studyHours = 4 + Math.floor(rnd() * 22);
      questionsSolved = 35 + Math.floor(rnd() * 170);
    }

    const drift = Math.floor(rnd() * 7) - 3;
    mcqAvg = clamp(mcqAvg + drift, 20, 99);
    mockAvg = clamp(mockAvg + Math.floor(rnd() * 5) - 2, 20, 99);
    dailyAnswerAvg = clamp(dailyAnswerAvg + Math.floor(rnd() * 5) - 2, 15, 95);
    pyqAvg = clamp(pyqAvg + Math.floor(rnd() * 5) - 2, 20, 99);

    const mainsAvg = parseFloat(avg([dailyAnswerAvg, pyqAvg]).toFixed(1));
    const totalScore = parseFloat(((mcqAvg + mockAvg + dailyAnswerAvg + pyqAvg) / 4).toFixed(2));
    const accuracy = parseFloat(avg([mcqAvg, mockAvg, dailyAnswerAvg, pyqAvg]).toFixed(1));
    const name = `${firstName} ${lastName}`;

    return {
      userId: `synthetic-${index + 1}`,
      firstName,
      lastName,
      name,
      email: "",
      handle: `@${firstName.toLowerCase()}${lastName.toLowerCase().slice(0, 3)}${index + 1}`,
      initial: firstName[0].toUpperCase(),
      avatarUrl: null,
      totalScore,
      mcqAvg,
      mockAvg,
      mainsAvg,
      dailyAnswerAvg,
      pyqAvg,
      streak,
      studyHours,
      accuracy,
      questionsSolved,
      isSynthetic: true,
    };
  });
}

export function buildCommunityStats(params: {
  realUserCount: number;
  realQuestionsSolved: number;
  rows: Array<{ accuracy: number; questionsSolved?: number }>;
  now?: Date;
}): CommunityStats {
  const now = params.now ?? new Date();
  const daySeed = hashSeed(todayKey(now));
  const bucketSeed = hashSeed(`${todayKey(now)}:${currentBucket(now)}`);
  const dayRnd = seededRand(daySeed);
  const bucketRnd = seededRand(bucketSeed);
  const activeBase = 590 + Math.floor(dayRnd() * 71);
  const activeToday = clamp(activeBase + Math.floor(bucketRnd() * 21) - 10, 590, 690) + params.realUserCount;
  const syntheticQuestions = params.rows.reduce((sum, row) => sum + (row.questionsSolved ?? 0), 0);
  const avgAccuracy = Math.round(avg(params.rows.map((row) => Number(row.accuracy) || 0).filter(Boolean)));

  return {
    totalAspirants: 937 + params.realUserCount,
    activeToday,
    questionsSolved: syntheticQuestions + params.realQuestionsSolved,
    avgAccuracy,
  };
}

export function getSyntheticDailyAnswerAttemptCount(realAttemptCount: number, now = new Date()) {
  const rnd = seededRand(hashSeed(`${todayKey(now)}:${currentBucket(now)}:daily-answer-attempts`));
  return realAttemptCount + 18 + Math.floor(rnd() * 28);
}
