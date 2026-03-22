import { randomUUID } from "crypto";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import { embedText } from "./embedding.service";

const LOG = "[PYQ-VECTORIZE]";

/**
 * Vectorizes all approved PYQ questions that don't have embeddings yet.
 * Stores embeddings in the pyq_chunks table in Supabase.
 */
export async function vectorizeAllPYQs(): Promise<{ processed: number; failed: number }> {
  console.log(`${LOG} Starting batch PYQ vectorization...`);

  const questions = await prisma.pYQQuestion.findMany({
    where: { status: "approved" },
  });

  console.log(`${LOG} Found ${questions.length} approved PYQ questions to vectorize`);

  let processed = 0;
  let failed = 0;

  for (const question of questions) {
    try {
      const text = [
        question.questionText,
        question.explanation ?? "",
        `Subject: ${question.subject ?? ""}`,
        `Topic: ${question.topic ?? ""}`,
        `Year: ${question.year}`,
        `Paper: ${question.paper}`,
      ]
        .filter(Boolean)
        .join("\n");

      const embedding = await embedText(text, "RETRIEVAL_DOCUMENT");

      const { error } = await supabaseAdmin.from("pyq_chunks").upsert({
        id: randomUUID(),
        pyq_question_id: question.id,
        chunk_text: text,
        embedding: JSON.stringify(embedding),
        metadata: {
          subject: question.subject,
          topic: question.topic,
          year: question.year,
          paper: question.paper,
          difficulty: question.difficulty,
        },
      });

      if (error) {
        console.error(`${LOG} Failed to upsert embedding for question ${question.id}:`, error.message);
        failed++;
      } else {
        processed++;
        if (processed % 10 === 0) {
          console.log(`${LOG} Progress: ${processed}/${questions.length}`);
        }
      }
    } catch (err: any) {
      console.error(`${LOG} Error vectorizing question ${question.id}:`, err.message);
      failed++;
    }
  }

  console.log(`${LOG} Done: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}
