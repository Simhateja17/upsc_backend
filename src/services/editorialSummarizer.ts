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

Provide a structured summary with:
1. **Key Arguments** (5-6 detailed bullet points — for each point, write 2-3 sentences covering: the core argument, its policy/constitutional significance, and why it matters for governance or society; make this section substantive and analytical, not just a headline list)
2. **Critical Analysis** — a balanced multi-perspective analysis in 4-5 sentences covering: the strengths of the approach, gaps or criticisms, what is at stake for institutions/citizens, and the key tension or trade-off an aspirant should address in a Mains answer
3. **UPSC Relevance** — which GS papers/topics this maps to
4. **Key Terms & Concepts** to remember
5. **Potential Exam Questions** — 2-3 questions that could be framed from this editorial

Analysis rules:
- Prefer the underlying governance, constitutional, economic, social, environmental, ethical, technological, or international issue over the day-to-day event.
- Keep the analysis multidimensional where the article supports it.
- Reject partisan framing; discuss institutions, policy choices, rights, duties, and trade-offs.
- If the article is mostly rhetoric or has weak UPSC value, say so briefly and keep the output conservative.
- Do not invent schemes, statistics, committee names, article numbers, or PYQ links not present in the content.

Target 450-550 words — Key Arguments and Critical Analysis sections should be the most substantial parts.`;

  const summary = await invokeModel(
    [{ role: "user", content: prompt }],
    { system, maxTokens: 1536, temperature: 0.3, serviceName: "editorialSummarizer" }
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
