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
  dailyMcqScore: number;
  pyqPrelimsScore: number;
  mockPrelimsScore: number;
  dailyAnswerScore: number;
  pyqMainsScore: number;
  mockMainsScore: number;
  dailyAnswerAvg: number;
  pyqAvg: number;
  streak: number;
  studyHours: number;
  accuracy: number;
  questionsSolved: number;
  attemptCount: number;
  isRankUnlocked: true;
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

    let dailyMcqScore: number;
    let pyqPrelimsScore: number;
    let mockPrelimsScore: number;
    let dailyAnswerScore: number;
    let pyqMainsScore: number;
    let mockMainsScore: number;
    let streak: number;
    let studyHours: number;
    let questionsSolved: number;

    if (tier < 0.05) {
      dailyMcqScore = 8.4 + rnd() * 1.4;
      pyqPrelimsScore = 8.0 + rnd() * 1.5;
      mockPrelimsScore = 7.8 + rnd() * 1.6;
      dailyAnswerScore = 6.6 + rnd() * 2.0;
      pyqMainsScore = 6.8 + rnd() * 1.9;
      mockMainsScore = 6.4 + rnd() * 2.0;
      streak = 18 + Math.floor(rnd() * 32);
      studyHours = 70 + Math.floor(rnd() * 45);
      questionsSolved = 850 + Math.floor(rnd() * 380);
    } else if (tier < 0.2) {
      dailyMcqScore = 7.0 + rnd() * 1.4;
      pyqPrelimsScore = 6.6 + rnd() * 1.5;
      mockPrelimsScore = 6.4 + rnd() * 1.5;
      dailyAnswerScore = 5.0 + rnd() * 1.8;
      pyqMainsScore = 5.2 + rnd() * 1.8;
      mockMainsScore = 5.0 + rnd() * 1.8;
      streak = 9 + Math.floor(rnd() * 20);
      studyHours = 42 + Math.floor(rnd() * 36);
      questionsSolved = 480 + Math.floor(rnd() * 360);
    } else if (tier < 0.55) {
      dailyMcqScore = 5.2 + rnd() * 1.8;
      pyqPrelimsScore = 4.8 + rnd() * 2.0;
      mockPrelimsScore = 4.6 + rnd() * 2.0;
      dailyAnswerScore = 3.6 + rnd() * 1.9;
      pyqMainsScore = 3.8 + rnd() * 2.0;
      mockMainsScore = 3.5 + rnd() * 2.0;
      streak = 3 + Math.floor(rnd() * 12);
      studyHours = 18 + Math.floor(rnd() * 36);
      questionsSolved = 190 + Math.floor(rnd() * 290);
    } else {
      dailyMcqScore = 2.8 + rnd() * 2.4;
      pyqPrelimsScore = 2.5 + rnd() * 2.3;
      mockPrelimsScore = 2.2 + rnd() * 2.4;
      dailyAnswerScore = 1.8 + rnd() * 2.2;
      pyqMainsScore = 2.0 + rnd() * 2.2;
      mockMainsScore = 1.8 + rnd() * 2.1;
      streak = Math.floor(rnd() * 7);
      studyHours = 4 + Math.floor(rnd() * 22);
      questionsSolved = 35 + Math.floor(rnd() * 170);
    }

    dailyMcqScore = clamp(dailyMcqScore + (rnd() * 0.4 - 0.2), 0, 10);
    pyqPrelimsScore = clamp(pyqPrelimsScore + (rnd() * 0.4 - 0.2), 0, 10);
    mockPrelimsScore = clamp(mockPrelimsScore + (rnd() * 0.4 - 0.2), 0, 10);
    dailyAnswerScore = clamp(dailyAnswerScore + (rnd() * 0.4 - 0.2), 0, 10);
    pyqMainsScore = clamp(pyqMainsScore + (rnd() * 0.4 - 0.2), 0, 10);
    mockMainsScore = clamp(mockMainsScore + (rnd() * 0.4 - 0.2), 0, 10);

    const mcqAvg = parseFloat(avg([dailyMcqScore, pyqPrelimsScore, mockPrelimsScore]).toFixed(2));
    const mockAvg = parseFloat(avg([mockPrelimsScore, mockMainsScore]).toFixed(2));
    const dailyAnswerAvg = parseFloat(dailyAnswerScore.toFixed(2));
    const pyqAvg = parseFloat(avg([pyqPrelimsScore, pyqMainsScore]).toFixed(2));
    const mainsAvg = parseFloat(avg([dailyAnswerScore, pyqMainsScore, mockMainsScore]).toFixed(2));
    const totalScore = parseFloat(avg([
      dailyMcqScore,
      pyqPrelimsScore,
      mockPrelimsScore,
      dailyAnswerScore,
      pyqMainsScore,
      mockMainsScore,
    ]).toFixed(2));
    const accuracy = parseFloat((totalScore * 10).toFixed(1));
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
      dailyMcqScore: parseFloat(dailyMcqScore.toFixed(2)),
      pyqPrelimsScore: parseFloat(pyqPrelimsScore.toFixed(2)),
      mockPrelimsScore: parseFloat(mockPrelimsScore.toFixed(2)),
      dailyAnswerScore: parseFloat(dailyAnswerScore.toFixed(2)),
      pyqMainsScore: parseFloat(pyqMainsScore.toFixed(2)),
      mockMainsScore: parseFloat(mockMainsScore.toFixed(2)),
      dailyAnswerAvg,
      pyqAvg,
      streak,
      studyHours,
      accuracy,
      questionsSolved,
      attemptCount: 6 + Math.floor(rnd() * 40),
      isRankUnlocked: true,
      isSynthetic: true,
    };
  });
}

export function buildCommunityStats(params: {
  realUserCount: number;
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
  const questionsSolved = params.rows.reduce((sum, row) => sum + (row.questionsSolved ?? 0), 0);
  const avgAccuracy = Math.round(avg(params.rows.map((row) => Number(row.accuracy) || 0).filter(Boolean)));

  return {
    totalAspirants: 937 + params.realUserCount,
    activeToday,
    questionsSolved,
    avgAccuracy,
  };
}

export function getSyntheticDailyAnswerAttemptCount(realAttemptCount: number, now = new Date()) {
  const rnd = seededRand(hashSeed(`${todayKey(now)}:${currentBucket(now)}:daily-answer-attempts`));
  return realAttemptCount + 18 + Math.floor(rnd() * 28);
}
