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

export interface ModelAnswerAlignment {
  cosineSimilarity: number;
  band: "excellent" | "strong" | "moderate" | "weak" | "off";
  keyTermOverlap: number;
  coveredKeyTerms: string[];
  missingKeyTerms: string[];
  reason: string;
}

/**
 * Computes a semantic-alignment score between the student's answer and a
 * curated platform model answer (currently PYQ Mains only). Uses the same
 * Azure text-embedding-ada-002 embeddings as RAG retrieval and L2-normalises
 * them, so cosine similarity reduces to a dot product in [-1, 1] (clamped to
 * [0, 1] for banding). Additionally extracts substantive key terms (from the
 * model answer only) and reports how many the student's answer used.
 *
 * This is a Python-free, deterministic reviewer-only signal — it does NOT
 * substitute the rubric, only feeds an extra binding input into the evaluator
 * prompt and is surfaced in ragDiagnostics so the result UI can show it.
 */
const MODEL_ANSWER_KEY_TERM_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "is", "are", "was",
  "were", "be", "with", "for", "by", "at", "as", "that", "this", "it", "its",
  "from", "has", "have", "had", "should", "must", "can", "may", "india",
  "indian", "such", "also", "while", "whose", "their",
]);

function extractKeyTerms(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !MODEL_ANSWER_KEY_TERM_STOPWORDS.has(token));
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  // Order by frequency desc, then lexically, to surface substantive terms.
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([term]) => term);
}

function cosineOfL2(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are L2-normalised by embedText; clamp for numerical safety.
  return Math.max(-1, Math.min(1, dot));
}

function bandFromCosine(cos: number): ModelAnswerAlignment["band"] {
  if (cos >= 0.78) return "excellent";
  if (cos >= 0.66) return "strong";
  if (cos >= 0.5) return "moderate";
  if (cos >= 0.3) return "weak";
  return "off";
}

export async function computeModelAnswerAlignment(
  studentAnswer: string,
  modelAnswer: string
): Promise<ModelAnswerAlignment> {
  const [studentEmb, modelEmb] = await Promise.all([
    embedText(studentAnswer.slice(0, 8000), "RETRIEVAL_QUERY"),
    embedText(modelAnswer.slice(0, 8000), "RETRIEVAL_DOCUMENT"),
  ]);
  const cosine = cosineOfL2(studentEmb, modelEmb);
  const cosClamped = Math.max(0, cosine);
  const band = bandFromCosine(cosClamped);

  const keyTerms = extractKeyTerms(modelAnswer);
  const studentLower = ` ${studentAnswer.toLowerCase()} `;
  const covered = keyTerms.filter((term) => studentLower.includes(` ${term} `) || new RegExp(`\\b${term}\\b`, "i").test(studentAnswer));
  const missing = keyTerms.filter((term) => !covered.includes(term));
  const keyTermOverlap = keyTerms.length === 0 ? 0 : covered.length / keyTerms.length;

  const reason =
    band === "excellent"
      ? `Student answer closely tracks the platform model answer (cosine ${cosClamped.toFixed(2)}, covers ${covered.length}/${keyTerms.length} key terms).`
      : band === "strong"
        ? `Student answer aligns well with the model answer (cosine ${cosClamped.toFixed(2)}) but misses ${missing.length} key terms.`
        : band === "moderate"
          ? `Partial alignment with the model answer (cosine ${cosClamped.toFixed(2)}); dominant gaps in key-term coverage.`
          : band === "weak"
            ? `Weak alignment with the platform model answer (cosine ${cosClamped.toFixed(2)}); substantial restructuring needed.`
            : `Student answer diverges from the platform model answer (cosine ${cosClamped.toFixed(2)}); likely off-demand or missing core content.`;

  return {
    cosineSimilarity: Number(cosClamped.toFixed(3)),
    band,
    keyTermOverlap: Number(keyTermOverlap.toFixed(3)),
    coveredKeyTerms: covered,
    missingKeyTerms: missing,
    reason,
  };
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

// Maximum number of distinct chunks we will include per retrieved topper
// answer in the evaluator context. Each chunk is a different semantic unit
// (question, answer, evaluator note, high-scoring pattern, mistake pattern)
// and sending several together lets the LLM calibrate against the full
// evidence on a single topper answer rather than against one fragment.
const MAX_CHUNKS_PER_ANSWER = 4;

// Preserve the order the RPC returned (chunk_type priority then cosine
// similarity), so the most informative chunk for each answer is shown first.
function groupMatchesByAnswer(matches: TopperMatch[]): TopperMatch[][] {
  const byAnswer = new Map<string, TopperMatch[]>();
  for (const match of matches) {
    const list = byAnswer.get(match.answer_id);
    if (list) {
      list.push(match);
    } else {
      byAnswer.set(match.answer_id, [match]);
    }
  }
  return Array.from(byAnswer.values());
}

export function buildTopperContext(matches: TopperMatch[]): string {
  if (matches.length === 0) {
    return "No comparable topper answers were retrieved. Grade from the rubric only.";
  }

  const grouped = groupMatchesByAnswer(matches)
    .map((chunks) => chunks.filter((c) => c.chunk_type === "full" || c.chunk_type === "answer" || c.chunk_type === "question"))
    .filter((chunks) => chunks.length > 0);

  return grouped
    .map((chunks, index) => {
      const header = chunks[0];
      const score = header.awarded_marks != null && header.max_marks
        ? `${header.awarded_marks}/${header.max_marks}`
        : "marks unknown";
      const shownChunks = chunks.slice(0, MAX_CHUNKS_PER_ANSWER);
      const chunksText = shownChunks
        .map(
          (c) =>
            `[Chunk type=${c.chunk_type} | similarity ${Number(c.similarity || 0).toFixed(2)}]\n${c.chunk_text}`
        )
        .join("\n\n");
      return `[Comparable ${index + 1} | ${header.paper_group} | ${score} | ${header.score_band || header.quality_status}]
Question: ${header.question_text || "unknown"}
${chunksText}`;
    })
    .join("\n\n---\n\n");
}
