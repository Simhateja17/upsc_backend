import prisma from "../config/database";

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mcq = await prisma.dailyMCQ.findUnique({
    where: { date: today },
    include: {
      questions: {
        orderBy: { questionNum: "asc" },
        select: { questionNum: true, questionText: true, category: true, options: true },
      },
    },
  });
  if (!mcq) {
    console.log("No MCQ for today");
    return;
  }
  console.log("Title:", mcq.title);
  console.log("Total questions:", mcq.questions.length);
  console.log("");

  let pyqCount = 0;
  let aiCount = 0;

  mcq.questions.forEach((q: any) => {
    const opts = q.options as any[];
    const hasLabel = opts?.[0]?.label !== undefined;
    const hasId = opts?.[0]?.id !== undefined;
    const source = hasLabel && !hasId ? "PYQ" : hasId && !hasLabel ? "AI" : "UNKNOWN";
    if (source === "PYQ") pyqCount++;
    else aiCount++;
    console.log(
      `Q${q.questionNum} [${source}] [${q.category}] ${q.questionText.substring(0, 100)}...`
    );
  });

  console.log("");
  console.log(`PYQ: ${pyqCount}, AI: ${aiCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
