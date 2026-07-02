// One-off migration: replaces Prelims and Mains syllabus content with the
// client's spreadsheet data. Optional subjects are never touched. Progress
// reset for Prelims/Mains was explicitly approved, so this is a clean
// delete-and-recreate rather than a position-preserving merge — existing
// SyllabusTrackerState.states entries for these stages become orphaned but
// harmless (silently ignored by the coverage-counting code).
//
// Run with: npx tsx prisma/replaceSyllabusPrelimsMains.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { parseAllPrelims, parseAllMains, SeedSubject } from "../scripts/parseSyllabusCsv";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function replaceStage(stage: "prelims" | "mains", subjects: SeedSubject[]) {
  console.log(`\n--- ${stage} ---`);
  for (let si = 0; si < subjects.length; si++) {
    const subj = subjects[si];
    const dbSubject = await prisma.syllabusSubject.create({
      data: {
        stage,
        name: subj.name,
        short: subj.short,
        icon: subj.icon,
        color: subj.color,
        bg: subj.bg,
        sortOrder: si,
      },
    });
    console.log(`  Created subject: ${stage} > ${subj.name} (${subj.topics.length} topics)`);

    for (let ti = 0; ti < subj.topics.length; ti++) {
      const topic = subj.topics[ti];
      const dbTopic = await prisma.syllabusTopic.create({
        data: { subjectId: dbSubject.id, name: topic.name, sortOrder: ti },
      });

      for (let sti = 0; sti < topic.subs.length; sti++) {
        await prisma.syllabusSubTopic.create({
          data: { topicId: dbTopic.id, name: topic.subs[sti], sortOrder: sti },
        });
      }
    }
  }
}

async function main() {
  console.log("Parsing CSVs...");
  const prelims = parseAllPrelims();
  const mains = parseAllMains();
  console.log(`Parsed ${prelims.length} prelims subjects, ${mains.length} mains subjects.`);

  console.log("\nDeleting existing prelims/mains subjects (cascades to topics/sub-topics)...");
  const deleted = await prisma.syllabusSubject.deleteMany({
    where: { stage: { in: ["prelims", "mains"] } },
  });
  console.log(`Deleted ${deleted.count} subjects.`);

  await replaceStage("prelims", prelims);
  await replaceStage("mains", mains);

  console.log("\nSyllabus replacement complete.");
}

main()
  .catch((e) => {
    console.error("Replacement failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
