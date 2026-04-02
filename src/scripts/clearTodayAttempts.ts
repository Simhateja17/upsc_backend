import prisma from "../config/database";

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log("Today:", today.toISOString());

  const mcq = await prisma.dailyMCQ.findUnique({ where: { date: today } });
  if (!mcq) {
    console.log("No MCQ for today");
    return;
  }

  console.log("MCQ ID:", mcq.id, "Title:", mcq.title);

  const attempts = await prisma.mCQAttempt.findMany({
    where: { dailyMcqId: mcq.id },
    select: { id: true, userId: true },
  });
  console.log("Attempts found:", attempts.length);

  for (const a of attempts) {
    await prisma.mCQResponse.deleteMany({ where: { attemptId: a.id } });
  }
  const del = await prisma.mCQAttempt.deleteMany({ where: { dailyMcqId: mcq.id } });
  console.log("Deleted attempts:", del.count);
  console.log("Done! Refresh the Daily MCQ page.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
