import { supabaseAdmin } from "../config/supabase";
import { generateJSON } from "../config/azure";
import { embedText } from "./embedding.service";

export interface RAGGeneratedQuestion {
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctOption: string;
  subject: string;
  category: string;
  difficulty: string;
  explanation: string;
}

interface StudyChunkResult {
  id: string;
  chunk_text: string;
  metadata: {
    subject: string;
    topic: string | null;
    source: string | null;
    fileName: string;
    pageNumber: number;
  };
  similarity: number;
}

/**
 * Generate mock test questions using RAG over study material chunks.
 *
 * Flow:
 * 1. Embed the query (subject + topic)
 * 2. Search study_material_chunks for relevant content
 * 3. Build context from top chunks
 * 4. Claude generates MCQ questions grounded in the content
 */
export async function generateMockTestFromRAG(params: {
  subject: string;
  topic?: string;
  difficulty: string;
  questionCount: number;
  examMode: string;
}): Promise<RAGGeneratedQuestion[]> {
  const { subject, topic, difficulty, questionCount, examMode } = params;

  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not configured");
  }

  // Step 1: Build and embed the query
  const queryText = [subject, topic, "UPSC study material concepts"].filter(Boolean).join(" ");
  const queryEmbedding = await embedText(queryText, "RETRIEVAL_QUERY");

  const SIMILARITY_THRESHOLD = 0.65;
  const fetchCount = Math.min(questionCount * 2, 20);

  // Step 2a: Vector similarity search in unified mock_test_chunks_01 table
  const { data: unifiedChunks, error: chunksError } = await supabaseAdmin.rpc("search_mock_test_chunks_01", {
    query_embedding: queryEmbedding,
    match_count: fetchCount,
    filter_subject: subject || null,
    filter_topic: topic || null,
  });

  if (chunksError) {
    console.error("[RAG] search_mock_test_chunks_01 error:", chunksError.message);
    throw new Error(`Chunk search failed: ${chunksError.message}`);
  }

  console.log(`[RAG] search_mock_test_chunks_01 returned ${(unifiedChunks || []).length} chunks`);

  // Step 2b: Also search PYQs in parallel (capped at 30% of context)
  const pyqRes = await supabaseAdmin.rpc("search_pyq_questions", {
    query_embedding: queryEmbedding,
    match_count: Math.ceil(fetchCount * 0.3),
    filter_subject: subject || null,
  });

  // Normalise PYQ results to same shape as chunk results
  const pyqChunks: StudyChunkResult[] = ((pyqRes.data || []) as any[]).map((q) => ({
    id: q.id,
    chunk_text: q.question_text,
    metadata: {
      subject: q.subject,
      topic: q.topic || null,
      source: `PYQ ${q.year}`,
      fileName: `PYQ ${q.year}`,
      pageNumber: 0,
    },
    similarity: q.similarity,
  }));

  // Merge all sources and filter by minimum similarity
  const allChunks: StudyChunkResult[] = [
    ...(unifiedChunks || []),
    ...pyqChunks,
  ].filter((c) => c.similarity >= SIMILARITY_THRESHOLD);

  // Sort combined results by similarity descending, cap at fetchCount
  allChunks.sort((a, b) => b.similarity - a.similarity);
  const results: StudyChunkResult[] = allChunks.slice(0, fetchCount);

  if (results.length === 0) {
    return []; // No study material uploaded for this subject — caller handles fallback
  }

  // Step 3: Build context from retrieved chunks
  const context = results
    .map(
      (c, i) =>
        `[Excerpt ${i + 1} — ${c.metadata.subject}${c.metadata.topic ? ` / ${c.metadata.topic}` : ""}${c.metadata.source ? ` (${c.metadata.source})` : ""}]\n${c.chunk_text}`
    )
    .join("\n\n");

  // Step 4: Generate questions via Claude
  const system = `You are a UPSC exam question creator. Generate MCQ questions ONLY from the provided study material excerpts. Every question must be directly answerable from the given content. Return only valid JSON.`;

  const prompt = `Using ONLY the study material excerpts below, generate ${questionCount} UPSC ${examMode} MCQ questions on the topic of "${subject}${topic ? ` — ${topic}` : ""}".

Difficulty level: ${difficulty}

Study Material:
${context}

Requirements for each question:
- Must be directly grounded in the excerpts above
- 4 options labeled A, B, C, D
- One clearly correct answer
- A concise explanation citing which excerpt supports the answer

Return a JSON array with this exact structure:
[
  {
    "questionText": "...",
    "options": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}],
    "correctOption": "A",
    "subject": "${subject}",
    "category": "${topic || subject}",
    "difficulty": "${difficulty}",
    "explanation": "..."
  }
]`;

  const questions = await generateJSON<RAGGeneratedQuestion[]>(prompt, system, 0.3);

  return Array.isArray(questions) ? questions.slice(0, questionCount) : [];
}

/**
 * Check if study material is available for a given subject.
 * Used to decide whether to use RAG or fall back to blind AI generation.
 */
export async function hasStudyMaterial(subject: string): Promise<boolean> {
  if (!supabaseAdmin) return false;

  // Check if any chunks exist in mock_test_chunks_01 for this subject
  const { count } = await supabaseAdmin
    .from("mock_test_chunks_01")
    .select("id", { count: "exact", head: true })
    .ilike("metadata->>subject", `%${subject}%`);

  if ((count || 0) > 0) return true;

  // Also check upload tables (for subjects that may have been marked vectorized
  // but chunks written to old tables — graceful fallback)
  const [studyResult, mockResult] = await Promise.all([
    supabaseAdmin
      .from("study_material_uploads")
      .select("id", { count: "exact", head: true })
      .ilike("subject", `%${subject}%`)
      .eq("status", "vectorized"),
    supabaseAdmin
      .from("mock_test_material_uploads")
      .select("id", { count: "exact", head: true })
      .ilike("subject", `%${subject}%`)
      .eq("status", "vectorized"),
  ]);

  return (studyResult.count || 0) + (mockResult.count || 0) > 0;
}
