import { invokeModel } from "../config/llm";
import prisma from "../config/database";

export interface StructuredEditorialSummary {
  keyArguments: string[];
  criticalAnalysis: Array<{ label: string; text: string }>;
  upscRelevance: Array<{ paper: string; topics: string }>;
  keyTerms: Array<{ term: string; definition: string }>;
  examQuestions: Array<{ type: "Mains" | "Prelims" | "Essay"; question: string }>;
}

export interface EditorialSummaryPayload {
  summary: string;
  structuredSummary: StructuredEditorialSummary;
}

const EMPTY_STRUCTURED_SUMMARY: StructuredEditorialSummary = {
  keyArguments: [],
  criticalAnalysis: [],
  upscRelevance: [],
  keyTerms: [],
  examQuestions: [],
};

const GENERIC_TERMS = new Set([
  "deep",
  "white",
  "high",
  "low",
  "major",
  "minor",
  "stable",
  "strong",
  "weak",
  "positive",
  "negative",
  "important",
  "critical",
  "strategic",
  "economic",
  "political",
  "governance",
  "security",
]);

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*/g, "")
    .replace(/^[\s\-•*\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCompleteSentenceLike(value: string): boolean {
  const text = cleanText(value);
  if (text.length < 24) return false;
  if (!/[A-Za-z]{3,}/.test(text)) return false;
  return /[.?!]$/.test(text) || text.split(/\s+/).length >= 8;
}

function isValidTerm(term: string, definition: string): boolean {
  const cleanedTerm = cleanText(term).replace(/:$/, "");
  const cleanedDefinition = cleanText(definition);
  if (!cleanedTerm || !cleanedDefinition) return false;
  if (cleanedTerm.length < 3 || cleanedTerm.length > 80) return false;
  if (!isCompleteSentenceLike(cleanedDefinition)) return false;

  const normalized = cleanedTerm.toLowerCase();
  const isKnownShortTerm = /^[A-Z0-9-]{3,12}$/.test(cleanedTerm) || ["Quad"].includes(cleanedTerm);
  const wordCount = cleanedTerm.split(/\s+/).length;
  if (!isKnownShortTerm && wordCount < 2) return false;
  if (GENERIC_TERMS.has(normalized)) return false;
  if (/^(deep|white|high|low|near|open)$/i.test(cleanedTerm)) return false;
  return true;
}

function isValidQuestion(question: string): boolean {
  const cleaned = cleanText(question);
  if (cleaned.length < 45 || cleaned.length > 280) return false;
  if (!cleaned.endsWith("?")) return false;
  if (!/\b(discuss|examine|analyse|analyze|evaluate|critically|how|why|what|assess|comment)\b/i.test(cleaned)) {
    return false;
  }
  return cleaned.split(/\s+/).length >= 8;
}

function normalizeStructuredSummary(value: Partial<StructuredEditorialSummary> | null | undefined): StructuredEditorialSummary {
  const keyArguments = Array.isArray(value?.keyArguments)
    ? value!.keyArguments.map(cleanText).filter(isCompleteSentenceLike).slice(0, 6)
    : [];

  const criticalAnalysis = Array.isArray(value?.criticalAnalysis)
    ? value!.criticalAnalysis
        .map((item: any) => ({
          label: cleanText(item?.label).replace(/:$/, ""),
          text: cleanText(item?.text),
        }))
        .filter((item) => item.label.length >= 3 && isCompleteSentenceLike(item.text))
        .slice(0, 4)
    : [];

  const upscRelevance = Array.isArray(value?.upscRelevance)
    ? value!.upscRelevance
        .map((item: any) => ({
          paper: cleanText(item?.paper).replace(/:$/, ""),
          topics: cleanText(item?.topics),
        }))
        .filter((item) => item.paper.length >= 3 && item.topics.length >= 8)
        .slice(0, 5)
    : [];

  const keyTerms = Array.isArray(value?.keyTerms)
    ? value!.keyTerms
        .map((item: any) => ({
          term: cleanText(item?.term).replace(/:$/, ""),
          definition: cleanText(item?.definition),
        }))
        .filter((item) => isValidTerm(item.term, item.definition))
        .slice(0, 8)
    : [];

  const examQuestions = Array.isArray(value?.examQuestions)
    ? value!.examQuestions
        .map((item: any) => ({
          type: (["Mains", "Prelims", "Essay"].includes(cleanText(item?.type)) ? cleanText(item?.type) : "Mains") as
            | "Mains"
            | "Prelims"
            | "Essay",
          question: cleanText(item?.question),
        }))
        .filter((item) => isValidQuestion(item.question))
        .slice(0, 3)
    : [];

  return {
    keyArguments,
    criticalAnalysis,
    upscRelevance,
    keyTerms: keyTerms.length >= 3 ? keyTerms : [],
    examQuestions,
  };
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return null;
}

function parseStoredStructuredSummary(value: string | null | undefined): StructuredEditorialSummary | null {
  if (!value) return null;
  const json = extractJsonObject(value);
  if (!json) return null;
  try {
    return normalizeStructuredSummary(JSON.parse(json));
  } catch {
    return null;
  }
}

function sectionBody(markdown: string, sectionTitle: string): string {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headings = [
    "Key Arguments",
    "Critical Analysis",
    "UPSC Relevance",
    "Key Terms & Concepts",
    "Potential Exam Questions",
  ]
    .filter((title) => title !== sectionTitle)
    .map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const match = markdown.match(
    new RegExp(
      `(?:^|\\n)\\s*\\d*\\.?\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*(?:[-—:]\\s*)?([\\s\\S]*?)(?=\\n\\s*\\d+\\.?\\s*(?:\\*\\*)?(?:${headings})(?:\\*\\*)?|$)`,
      "i"
    )
  );
  return match?.[1]?.trim() || "";
}

function parseLegacyMarkdownSummary(markdown: string): StructuredEditorialSummary {
  const splitLines = (body: string) => body.split(/\n+/).map(cleanText).filter(Boolean);

  const keyArguments = splitLines(sectionBody(markdown, "Key Arguments"))
    .flatMap((line) => line.split(/\s+-\s+(?=[A-Z])/))
    .map(cleanText)
    .filter(isCompleteSentenceLike)
    .slice(0, 6);

  const criticalAnalysis = splitLines(sectionBody(markdown, "Critical Analysis"))
    .map((line) => {
      const match = line.match(/^([^:]{3,40}):\s*(.+)$/);
      return match ? { label: cleanText(match[1]), text: cleanText(match[2]) } : null;
    })
    .filter((item): item is { label: string; text: string } => !!item && isCompleteSentenceLike(item.text))
    .slice(0, 4);

  const upscRelevance = splitLines(sectionBody(markdown, "UPSC Relevance"))
    .map((line) => {
      const match = line.match(/^([^:]{3,40}):\s*(.+)$/);
      return match ? { paper: cleanText(match[1]), topics: cleanText(match[2]) } : null;
    })
    .filter((item): item is { paper: string; topics: string } => !!item && item.topics.length >= 8)
    .slice(0, 5);

  const keyTerms = splitLines(sectionBody(markdown, "Key Terms & Concepts"))
    .map((line) => {
      const match = line.match(/^([^:]{3,80}):\s*(.+)$/);
      return match ? { term: cleanText(match[1]), definition: cleanText(match[2]) } : null;
    })
    .filter((item): item is { term: string; definition: string } => !!item && isValidTerm(item.term, item.definition))
    .slice(0, 8);

  const examQuestions = splitLines(sectionBody(markdown, "Potential Exam Questions"))
    .map((line) => ({ type: "Mains" as const, question: cleanText(line) }))
    .filter((item) => isValidQuestion(item.question))
    .slice(0, 3);

  return normalizeStructuredSummary({
    keyArguments,
    criticalAnalysis,
    upscRelevance,
    keyTerms,
    examQuestions,
  });
}

function legacySummaryText(structured: StructuredEditorialSummary): string {
  const lines: string[] = [];
  if (structured.keyArguments.length) {
    lines.push("1. **Key Arguments**", ...structured.keyArguments.map((item) => `- ${item}`));
  }
  if (structured.criticalAnalysis.length) {
    lines.push("2. **Critical Analysis**", ...structured.criticalAnalysis.map((item) => `- **${item.label}:** ${item.text}`));
  }
  if (structured.upscRelevance.length) {
    lines.push("3. **UPSC Relevance**", ...structured.upscRelevance.map((item) => `**${item.paper}**: ${item.topics}`));
  }
  if (structured.keyTerms.length) {
    lines.push("4. **Key Terms & Concepts**", ...structured.keyTerms.map((item) => `**${item.term}**: ${item.definition}`));
  }
  if (structured.examQuestions.length) {
    lines.push("5. **Potential Exam Questions**", ...structured.examQuestions.map((item, index) => `${index + 1}. ${item.question}`));
  }
  return lines.join("\n");
}

/**
 * Generate AI summary for an editorial
 */
export async function summarizeEditorial(editorialId: string): Promise<string> {
  const payload = await summarizeEditorialStructured(editorialId);
  return payload.summary;
}

export async function summarizeEditorialStructured(editorialId: string): Promise<EditorialSummaryPayload> {
  const editorial = await prisma.editorial.findUnique({ where: { id: editorialId } });
  if (!editorial) throw new Error("Editorial not found");

  if (editorial.aiSummary) {
    const structured = parseStoredStructuredSummary(editorial.aiSummary) || parseLegacyMarkdownSummary(editorial.aiSummary);
    return {
      summary: legacySummaryText(structured) || editorial.aiSummary,
      structuredSummary: structured,
    };
  }

  const content = editorial.content || editorial.summary;
  if (!content || content.trim().length < 50) {
    throw new Error("NO_CONTENT");
  }

  const system = `You are a UPSC preparation expert who analyzes newspaper editorials for IAS aspirants. Stay factual, non-partisan, exam-oriented, and concise. Focus on policy issues over isolated events. Apply a PYQ lens and highlight precise Prelims facts only when they are present in the source.`;

  const prompt = `Summarize this editorial for UPSC preparation:

Title: "${editorial.title}"
Source: ${editorial.source}
Category: ${editorial.category}

Content:
${content}

Return ONLY valid JSON with this exact shape:
{
  "keyArguments": ["5-6 complete analytical paragraphs, each 3-4 sentences"],
  "criticalAnalysis": [
    { "label": "Positive side", "text": "complete sentence analysis" },
    { "label": "Structural concern", "text": "complete sentence analysis" },
    { "label": "Policy angle", "text": "complete sentence analysis" },
    { "label": "Balanced view", "text": "complete sentence analysis" }
  ],
  "upscRelevance": [
    { "paper": "GS Paper 2", "topics": "topics/keywords" },
    { "paper": "GS Paper 3", "topics": "topics/keywords" }
  ],
  "keyTerms": [
    { "term": "specific UPSC-relevant concept, institution, doctrine, policy, treaty, geography, or acronym", "definition": "one-line definition" }
  ],
  "examQuestions": [
    { "type": "Mains", "question": "complete UPSC-style question ending with ?" }
  ]
}

Analysis rules:
- Prefer the underlying governance, constitutional, economic, social, environmental, ethical, technological, or international issue over the day-to-day event.
- Keep the analysis multidimensional where the article supports it.
- Reject partisan framing; discuss institutions, policy choices, rights, duties, and trade-offs.
- If the article is mostly rhetoric or has weak UPSC value, say so briefly and keep the output conservative.
- Do not invent schemes, statistics, committee names, article numbers, or PYQ links not present in the content.
- Key terms must not be generic adjectives or fragments. Never output standalone words such as "Deep", "White", "High", "Major", "Stable", or broken phrase continuations.
- Every key term must have a definition. If a term is not worth defining for UPSC, omit it.
- Exam questions must live only inside examQuestions. Do not number them as sections.
- Do not output truncated questions. If a question cannot be completed, omit it.

Target 550-700 words across the JSON values.`;

  const result = await invokeModel(
    [{ role: "user", content: prompt }],
    { system, maxTokens: 1536, temperature: 0.3, serviceName: "editorialSummarizer" }
  );

  const json = extractJsonObject(result);
  let structured = EMPTY_STRUCTURED_SUMMARY;
  if (json) {
    try {
      structured = normalizeStructuredSummary(JSON.parse(json));
    } catch {
      structured = parseLegacyMarkdownSummary(result);
    }
  } else {
    structured = parseLegacyMarkdownSummary(result);
  }
  const summary = legacySummaryText(structured);

  await prisma.editorial.update({
    where: { id: editorialId },
    data: { aiSummary: JSON.stringify(structured) },
  });

  return { summary, structuredSummary: structured };
}

/**
 * Auto-categorize an editorial by subject using AI
 */
export async function categorizeEditorial(
  title: string,
  firstParagraph: string
): Promise<string> {
  const prompt = `Categorize this newspaper editorial for UPSC preparation.

Title: "${title}"
First paragraph: "${firstParagraph}"

Return ONLY one of these categories (just the category name, nothing else):
History, Geography, Polity, Economy, Environment & Ecology, Science & Technology`;

  const result = await invokeModel(
    [{ role: "user", content: prompt }],
    { maxTokens: 50, temperature: 0.1, serviceName: "editorialCategorizer" }
  );

  const validCategories = [
    "History", "Geography", "Polity", "Economy",
    "Environment & Ecology", "Science & Technology",
  ];

  const category = result.trim();
  return validCategories.includes(category) ? category : "Current Affairs";
}
