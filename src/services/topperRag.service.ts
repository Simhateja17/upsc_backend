import { supabaseAdmin } from "../config/supabase";
import { embedText } from "./embedding.service";

export interface TopperMatch {
  answer_id: string;
  chunk_id: string;
  chunk_type: string;
  chunk_text: string;
  question_text: string | null;
  paper_group: string;
  subject: string | null;
  topic: string | null;
  directive: string | null;
  max_marks: number | null;
  awarded_marks: number | null;
  score_band: string | null;
  quality_status: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export function normalizePaperGroup(paper: string | null | undefined): string | null {
  if (!paper) return null;
  const value = paper.toLowerCase().replace(/\bgs\s*paper\b/g, "paper");
  if (value.includes("essay")) return "Essay";
  if (/\b(4|iv)\b/.test(value)) return "GS Paper 4";
  if (/\b(3|iii)\b/.test(value)) return "GS Paper 3";
  if (/\b(2|ii)\b/.test(value)) return "GS Paper 2";
  if (/\b(1|i)\b/.test(value)) return "GS Paper 1";
  return null;
}

export function extractDirective(questionText: string): string | null {
  const match = questionText.match(/\b(discuss|examine|critically examine|critically analyze|analyse|analyze|evaluate|comment|elucidate|explain|illustrate)\b/i);
  return match?.[1]?.toLowerCase() || null;
}

export async function retrieveTopperMatches(params: {
  questionText: string;
  answerText: string;
  paper: string;
  subject?: string | null;
  topic?: string | null;
  maxMarks?: number | null;
  matchCount?: number;
}): Promise<TopperMatch[]> {
  if (!supabaseAdmin) return [];

  const paperGroup = normalizePaperGroup(params.paper);
  const directive = extractDirective(params.questionText);
  const queryText = [
    params.questionText,
    params.subject ? `Subject: ${params.subject}` : "",
    params.topic ? `Topic: ${params.topic}` : "",
    `Student answer: ${params.answerText.slice(0, 1200)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const queryEmbedding = await embedText(queryText, "RETRIEVAL_QUERY");
  const { data, error } = await supabaseAdmin.rpc("match_topper_answers", {
    query_embedding: queryEmbedding,
    match_count: params.matchCount || 8,
    paper_group_filter: paperGroup,
    max_marks_filter: params.maxMarks || null,
    directive_filter: directive,
    topic_filter: params.topic || null,
  });

  if (error) {
    console.error("[TOPPER-RAG] match_topper_answers failed:", error.message);
    return [];
  }

  return (data || []) as TopperMatch[];
}

export function buildTopperContext(matches: TopperMatch[]): string {
  if (matches.length === 0) {
    return "No comparable topper answers were retrieved. Grade from the rubric only.";
  }

  const byAnswer = new Map<string, TopperMatch>();
  for (const match of matches) {
    const existing = byAnswer.get(match.answer_id);
    if (!existing || match.chunk_type === "full" || match.similarity > existing.similarity) {
      byAnswer.set(match.answer_id, match);
    }
  }

  return Array.from(byAnswer.values())
    .filter((m) => m.chunk_type === "full" || m.chunk_type === "answer" || m.chunk_type === "question")
    .map((m, index) => {
      const score = m.awarded_marks != null && m.max_marks ? `${m.awarded_marks}/${m.max_marks}` : "marks unknown";
      return `[Comparable ${index + 1} | ${m.paper_group} | ${score} | ${m.score_band || m.quality_status} | similarity ${Number(m.similarity || 0).toFixed(2)}]
Question: ${m.question_text || "unknown"}
Chunk (${m.chunk_type}):
${m.chunk_text}`;
    })
    .join("\n\n");
}
