import { invokeModel } from "../config/llm";
import prisma from "../config/database";

/**
 * Generate AI summary for an editorial
 */
export async function summarizeEditorial(editorialId: string): Promise<string> {
  const editorial = await prisma.editorial.findUnique({ where: { id: editorialId } });
  if (!editorial) throw new Error("Editorial not found");

  // Return cached summary if exists
  if (editorial.aiSummary) return editorial.aiSummary;

  const content = editorial.content || editorial.summary || editorial.title;

  const system = `You are a UPSC preparation expert who analyzes newspaper editorials for IAS aspirants. Stay factual, non-partisan, exam-oriented, and concise. Focus on policy issues over isolated events. Apply a PYQ lens and highlight precise Prelims facts only when they are present in the source.`;

  const prompt = `Summarize this editorial for UPSC preparation:

Title: "${editorial.title}"
Source: ${editorial.source}
Category: ${editorial.category}

Content:
${content}

Provide a structured summary with:
1. **Key Arguments** (3-4 bullet points)
2. **UPSC Relevance** — which GS papers/topics this maps to
3. **Key Terms & Concepts** to remember
4. **Potential Exam Questions** — 2-3 questions that could be framed from this editorial
5. **Critical Analysis** — balanced perspective for answer writing

Analysis rules:
- Prefer the underlying governance, constitutional, economic, social, environmental, ethical, technological, or international issue over the day-to-day event.
- Keep the analysis multidimensional where the article supports it.
- Reject partisan framing; discuss institutions, policy choices, rights, duties, and trade-offs.
- If the article is mostly rhetoric or has weak UPSC value, say so briefly and keep the output conservative.
- Do not invent schemes, statistics, committee names, article numbers, or PYQ links not present in the content.

Keep the summary concise (300-400 words).`;

  const summary = await invokeModel(
    [{ role: "user", content: prompt }],
    { system, maxTokens: 1024, temperature: 0.3, serviceName: "editorialSummarizer" }
  );

  // Cache the summary
  await prisma.editorial.update({
    where: { id: editorialId },
    data: { aiSummary: summary },
  });

  return summary;
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
