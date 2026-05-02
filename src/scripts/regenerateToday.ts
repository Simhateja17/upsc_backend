import prisma from "../config/database";
import { ensureTodayMCQ } from "../jobs/dailyContentJob";

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Delete existing MCQ for today (cascade: responses -> attempts -> questions -> MCQ)
  const mcq = await prisma.dailyMCQ.findUnique({ where: { date: today } });
  if (mcq) {
    const attempts = await prisma.mCQAttempt.findMany({
      where: { dailyMcqId: mcq.id },
      select: { id: true },
    });
    for (const a of attempts) {
      await prisma.mCQResponse.deleteMany({ where: { attemptId: a.id } });
    }
    await prisma.mCQAttempt.deleteMany({ where: { dailyMcqId: mcq.id } });
    await prisma.mCQQuestion.deleteMany({ where: { dailyMcqId: mcq.id } });
    await prisma.dailyMCQ.delete({ where: { id: mcq.id } });
    console.log("Deleted old MCQ:", mcq.id);
  }

  // Regenerate
  console.log("Generating new MCQ with 5 PYQ + 5 AI...");
  await ensureTodayMCQ();
  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
