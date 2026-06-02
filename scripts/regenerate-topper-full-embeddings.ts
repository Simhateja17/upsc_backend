import prisma from "../src/config/database";
import { supabaseAdmin } from "../src/config/supabase";
import { embedText } from "../src/services/embedding.service";

function log(message: string, meta?: Record<string, unknown>) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[topper-embeddings] ${new Date().toISOString()} ${message}${suffix}`);
}

function scoreBand(awarded: number | null, maxMarks: number | null): string | null {
  if (awarded == null || !maxMarks) return null;
  const pct = awarded / maxMarks;
  if (pct >= 0.65) return "strong";
  if (pct >= 0.4) return "medium";
  return "weak";
}

function notesToText(value: unknown): string {
  return Array.isArray(value) ? value.filter(Boolean).join("\n- ") : "";
}

function buildChunk(answer: Awaited<ReturnType<typeof fetchValidAnswers>>[number]) {
  const notes = notesToText(answer.evaluatorNotesJson);
  const score =
    answer.awardedMarks != null && answer.maxMarks
      ? `${answer.awardedMarks}/${answer.maxMarks}`
      : "marks unknown";
  return [
    `Question:\n${answer.questionText}`,
    `Paper:\n${answer.paperGroup}`,
    answer.subject || answer.topic ? `Subject/topic:\n${answer.subject || "unknown"} / ${answer.topic || "unknown"}` : "",
    answer.directive ? `Directive:\n${answer.directive}` : "",
    `Marks:\n${score}`,
    answer.scoreBand ? `Score band:\n${answer.scoreBand}` : "",
    `Topper answer:\n${answer.studentAnswerText}`,
    notes ? `Evaluator notes:\n- ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function fetchValidAnswers() {
  return prisma.topperAnswer.findMany({
    where: {
      usableForRag: true,
      qualityStatus: { in: ["gold", "silver"] },
      questionText: { not: null },
      studentAnswerText: { not: "" },
    },
    include: { document: true },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const write = process.argv.includes("--write");
  const answers = (await fetchValidAnswers()).filter((answer) => {
    const hasQuestion = Boolean(answer.questionText?.trim());
    const hasAnswer = answer.studentAnswerText.trim().length >= 120;
    const isEssay = answer.paperGroup === "Essay";
    const hasMarks = answer.maxMarks != null && answer.awardedMarks != null;
    return hasQuestion && hasAnswer && (isEssay || hasMarks);
  });

  log(write ? "Regenerating full embeddings" : "Dry run", {
    validAnswers: answers.length,
    write,
  });

  if (!write) {
    const byPaper = answers.reduce<Record<string, number>>((acc, answer) => {
      acc[answer.paperGroup] = (acc[answer.paperGroup] || 0) + 1;
      return acc;
    }, {});
    log("Would regenerate embeddings", byPaper);
    return;
  }

  const { error: deleteError } = await supabaseAdmin.from("topper_answer_embeddings").delete().neq("id", "");
  if (deleteError) throw new Error(`Failed to delete existing topper embeddings: ${deleteError.message}`);
  log("Deleted existing topper embeddings");

  let inserted = 0;
  for (const answer of answers) {
    const chunkText = buildChunk(answer);
    const embedding = await embedText(chunkText, "RETRIEVAL_DOCUMENT");
    const { error } = await supabaseAdmin.from("topper_answer_embeddings").insert({
      answer_id: answer.id,
      chunk_type: "full",
      chunk_text: chunkText,
      metadata: {
        paperGroup: answer.paperGroup,
        subject: answer.subject,
        topic: answer.topic,
        directive: answer.directive,
        questionNo: answer.questionNo,
        maxMarks: answer.maxMarks,
        awardedMarks: answer.awardedMarks,
        scoreBand: answer.scoreBand || scoreBand(answer.awardedMarks, answer.maxMarks),
        qualityStatus: answer.qualityStatus,
        sourceDocumentId: answer.documentId,
        sourceFileName: answer.document.fileName,
        pageStart: answer.pageStart,
        pageEnd: answer.pageEnd,
        chunkSchemaVersion: 2,
      },
      embedding: JSON.stringify(embedding),
    });
    if (error) throw new Error(`Embedding insert failed for ${answer.id}: ${error.message}`);
    inserted += 1;
    if (inserted % 25 === 0) log("Inserted embeddings", { inserted, total: answers.length });
  }

  log("Done", { inserted });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
