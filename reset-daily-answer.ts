import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetDailyAnswer() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const question = await prisma.dailyMainsQuestion.findUnique({
    where: { date: today },
  });

  if (!question) {
    console.log('No daily mains question found for today.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found today's question: ${question.id}`);

  const attempts = await prisma.mainsAttempt.findMany({
    where: { questionId: question.id },
    include: { evaluation: true, user: true },
  });

  console.log(`Found ${attempts.length} attempt(s) for today's question:`);
  for (const a of attempts) {
    console.log(`  - User: ${a.user?.email || a.userId} | Attempt: ${a.id} | Evaluation: ${a.evaluation?.status || 'none'}`);
  }

  const attemptIds = attempts.map(a => a.id);

  if (attemptIds.length > 0) {
    const deletedEvals = await prisma.mainsEvaluation.deleteMany({
      where: { attemptId: { in: attemptIds } },
    });
    console.log(`Deleted ${deletedEvals.count} evaluation(s).`);

    const deletedAttempts = await prisma.mainsAttempt.deleteMany({
      where: { id: { in: attemptIds } },
    });
    console.log(`Deleted ${deletedAttempts.count} attempt(s).`);
  }

  console.log('Daily answer reset complete! You can now re-submit.');
  await prisma.$disconnect();
}

resetDailyAnswer().catch((e) => {
  console.error(e);
  process.exit(1);
});
