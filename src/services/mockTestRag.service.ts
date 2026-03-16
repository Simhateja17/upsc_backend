import { supabaseAdmin } from "../config/supabase";
import { invokeModelJSON } from "../config/bedrock";
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

  // Step 2: Vector similarity search in study material chunks
  const { data: chunks, error } = await supabaseAdmin.rpc("search_study_chunks", {
    query_embedding: queryEmbedding,
    match_count: Math.min(questionCount * 2, 20), // fetch more than needed for quality
    filter_subject: subject || null,
    filter_topic: topic || null,
  });

  if (error) throw new Error(`Study material search failed: ${error.message}`);

  const results: StudyChunkResult[] = chunks || [];

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

  const questions = await invokeModelJSON<RAGGeneratedQuestion[]>(
    [{ role: "user", content: prompt }],
    {
      system,
      maxTokens: 4096,
      temperature: 0.3,
      serviceName: "mockTestRag",
    }
  );

  return Array.isArray(questions) ? questions.slice(0, questionCount) : [];
}

/**
 * Check if study material is available for a given subject.
 * Used to decide whether to use RAG or fall back to blind AI generation.
 */
export async function hasStudyMaterial(subject: string): Promise<boolean> {
  if (!supabaseAdmin) return false;

  const { count } = await supabaseAdmin
    .from("study_material_uploads")
    .select("id", { count: "exact", head: true })
    .ilike("subject", `%${subject}%`)
    .eq("status", "vectorized");

  return (count || 0) > 0;
}
