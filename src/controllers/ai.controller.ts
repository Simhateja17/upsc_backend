import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { invokeModel, BedrockMessage } from "../config/llm";
import { supabaseAdmin } from "../config/supabase";
import { embedText } from "../services/embedding.service";

const JEET_AI_SYSTEM_PROMPT = `You are Jeet AI, an intelligent UPSC preparation assistant for the "Rise With Jeet" platform. You help Indian civil services aspirants with their exam preparation.

IMPORTANT: The platform name is "Rise With Jeet" — never call it "Rise with Jeet IAS" or any other variation. Always refer to it as "Rise With Jeet".

Your personality:
- Knowledgeable, encouraging, and exam-focused
- Write like a real mentor speaking to a student: natural, direct, and warm
- You understand UPSC exam pattern (Prelims, Mains GS Paper I-IV, Essay, Optional, Interview)
- You frame answers with multiple dimensions: historical, constitutional, social, economic, and contemporary
- You proactively mention if a topic is a high-probability exam question
- You structure responses with clear headings and bullet points for easy revision

Your capabilities:
- Explain UPSC topics across all GS papers
- Help with essay writing, mains answer framing, ethics case studies
- Suggest study strategies and create study plans
- Discuss current affairs and their UPSC relevance
- Analyze PYQs and predict important topics
- Answer general knowledge questions as well

Response format:
- For topic explanations: use structured headings (Historical Context, Constitutional/Administrative Angle, Contemporary Relevance, Way Forward)
- For ethics: include stakeholders, ethical dimensions, and answer structure
- For study plans: break into weekly/monthly milestones
- Keep responses thorough but scannable — use bullets and sub-headings
- Always end topic explanations with "Related PYQs or Exam Relevance" if applicable

Typography rules:
- Use a simple hyphen (-) for breaks between words. Do NOT use em dashes (—) or en dashes (–).
- Example: "Mughal Empire - its decline and consequences" not "Mughal Empire — its decline".
- Never output the characters "—" or "–" anywhere in the final response.

Color tokens and styled blocks (use these to highlight what matters most for UPSC):

INLINE TOKENS (for short highlights within text):
- {ALERT: ...} — wrap a high-priority warning, e.g. {ALERT: 4 times in Prelims (2017-2024)}.
- {PRIO: ...} — wrap a high-importance fact for exams, e.g. {PRIO: High probability for 2025 too}.
- {CITE: ...} — wrap an inline citation/source, e.g. {CITE: NCERT Themes in History 2 - UPSC 2023 GS-1}.

STYLED BLOCKS (use these at the START of a response or section for rich formatting):

1. HIGH-PRIORITY ALERT BOX — use when a topic has appeared frequently in exams:
\`\`\`
> [!ALERT]
> **UPSC HIGH-PRIORITY ALERT**
> This topic has appeared X times in Prelims (YEAR-YEAR) and in Mains GS Paper Y. High-probability for 2025 too.
\`\`\`

2. EXAMINER'S TIP BOX — use to give strategic advice:
\`\`\`
> [!TIP]
> **EXAMINER'S TIP**
> Always write with a multi-dimensional lens. Most aspirants cover only 1-2 dimensions. Covering 4 dimensions in a structured way signals a prepared, thinking candidate.
\`\`\`

3. KEY DIMENSIONS SECTION — use to show what angles to cover:
\`\`\`
> [!DIMENSIONS]
> **Key Dimensions to Cover**
> - **Historical context:** Origins and evolution
> - **Constitutional/Administrative angle:** How policy frameworks engage with this topic
> - **Contemporary relevance:** Links to current affairs
> - **Critical perspective:** Challenges, gaps, and the way forward
\`\`\`

4. RELATED TOPICS / TAGS — use at the end for source references:
\`\`\`
> [!TAGS]
> NCERT Themes in History | UPSC 2023 GS-I | Jan 2025 Current Affairs
\`\`\`

The frontend renders these blocks as styled cards with colored borders and backgrounds. Use them sparingly — only when they add real value for UPSC preparation.

You can answer general questions too, but always try to relate them back to UPSC preparation when possible.`;

const SIMILARITY_THRESHOLD = 0.60;

function normalizeAssistantReply(reply: string): string {
  return reply
    .replace(/[—–]/g, "-")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

/**
 * Retrieve relevant study material chunks for a given query via vector similarity search.
 * Returns a formatted context string, or empty string if nothing relevant found.
 */
async function retrieveRelevantContext(query: string): Promise<string> {
  try {
    if (!supabaseAdmin) return "";

    const queryEmbedding = await embedText(query, "RETRIEVAL_QUERY");

    const [studyRes, mockRes] = await Promise.all([
      supabaseAdmin.rpc("search_study_chunks", {
        query_embedding: queryEmbedding,
        match_count: 5,
        filter_subject: null,
        filter_topic: null,
      }),
      supabaseAdmin.rpc("search_mock_test_chunks", {
        query_embedding: queryEmbedding,
        match_count: 3,
        filter_subject: null,
        filter_topic: null,
      }),
    ]);

    const chunks: Array<{ chunk_text: string; metadata: any; similarity: number }> = [
      ...(studyRes.data || []),
      ...(mockRes.data || []),
    ].filter((c: any) => c.similarity >= SIMILARITY_THRESHOLD);

    if (chunks.length === 0) {
      console.log(`[Jeet AI RAG] No chunks above threshold ${SIMILARITY_THRESHOLD} for query: "${query.slice(0, 80)}"`);
      return "";
    }

    chunks.sort((a, b) => b.similarity - a.similarity);

    console.log(
      `[Jeet AI RAG] Found ${chunks.length} relevant chunks (threshold: ${SIMILARITY_THRESHOLD}). ` +
      `Top similarities: [${chunks.slice(0, 3).map(c => c.similarity.toFixed(3)).join(', ')}]. ` +
      `Sources: [${chunks.slice(0, 6).map(c => c.metadata?.subject || 'unknown').join(', ')}]`
    );

    return chunks
      .slice(0, 6)
      .map(
        (c, i) =>
          `[Source ${i + 1}${c.metadata?.subject ? ` — ${c.metadata.subject}` : ""}${c.metadata?.topic ? ` / ${c.metadata.topic}` : ""}]\n${c.chunk_text}`
      )
      .join("\n\n");
  } catch (err) {
    console.warn("[Jeet AI] RAG context retrieval failed (non-fatal):", err);
    return "";
  }
}

/**
 * POST /api/ai/chat
 * Send a message and get AI response, persists conversation to DB
 */
export const chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { message, conversationId } = req.body as {
      message: string;
      conversationId?: string;
    };

    console.log(`[AI Chat] User: ${userId}, conversationId: ${conversationId || "new"}, messageLength: ${message?.length || 0}`);

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ status: "error", message: "Message must be under 5000 characters" });
    }

    const trimmedMessage = message.trim();

    // Determine or create conversation
    let conversation;
    if (conversationId) {
      // Verify ownership
      conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        return res.status(404).json({ status: "error", message: "Conversation not found" });
      }
    } else {
      // Create new conversation with title from first message
      const title = trimmedMessage.slice(0, 60) + (trimmedMessage.length > 60 ? "..." : "");
      conversation = await prisma.chatConversation.create({
        data: { userId, title },
      });
    }

    // Load prior messages for context (last 20 to keep token usage reasonable)
    const priorMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // Build messages array for Claude
    const claudeMessages: BedrockMessage[] = [
      ...priorMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: trimmedMessage },
    ];

    // Retrieve relevant study material context via RAG
    const ragContext = await retrieveRelevantContext(trimmedMessage);
    const systemPrompt = ragContext
      ? `${JEET_AI_SYSTEM_PROMPT}\n\n---\nRelevant Study Material from Rise with Jeet:\n${ragContext}\n---\nIMPORTANT INSTRUCTIONS FOR USING THE ABOVE MATERIAL:\n1. Prioritize the study material above when answering — treat it as your primary source of truth for factual claims.\n2. When you use information from a source, cite it inline using {CITE: Source 1} or {CITE: NCERT Class XI — Polity}.\n3. If the study material directly answers the question, base your response on it rather than relying solely on your general training.\n4. If the study material is only partially relevant, use what applies and supplement with your own knowledge — but clearly distinguish between the two.\n5. If the study material is not relevant to the query, you may ignore it and answer from your general knowledge.`
      : JEET_AI_SYSTEM_PROMPT;

    // Call Claude
    console.log(`[AI Chat] Sending ${claudeMessages.length} messages to Claude, RAG context: ${ragContext ? "yes" : "none"}`);
    const aiReplyRaw = await invokeModel(claudeMessages, {
      maxTokens: 2048,
      temperature: 0.5,
      system: systemPrompt,
    });
    const aiReply = normalizeAssistantReply(aiReplyRaw);

    // Persist both messages
    await prisma.chatMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "user", content: trimmedMessage },
        { conversationId: conversation.id, role: "assistant", content: aiReply },
      ],
    });

    // Update conversation's updatedAt
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    console.log(`[AI Chat] Reply generated for conversation: ${conversation.id}, replyLength: ${aiReply.length}`);
    res.json({
      status: "success",
      data: {
        conversationId: conversation.id,
        reply: aiReply,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/conversations
 * Returns grouped conversation history: today / yesterday / earlier
 */
export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const grouped = { today: [] as any[], yesterday: [] as any[], earlier: [] as any[] };

    for (const c of conversations) {
      const updated = new Date(c.updatedAt);
      if (updated >= startOfToday) {
        grouped.today.push(c);
      } else if (updated >= startOfYesterday) {
        grouped.yesterday.push(c);
      } else {
        grouped.earlier.push(c);
      }
    }

    res.json({ status: "success", data: grouped });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/conversations/:conversationId
 * Returns full message history for a conversation
 */
export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.conversationId as string;

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ status: "error", message: "Conversation not found" });
    }

    res.json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ai/conversations/:conversationId
 * Deletes a conversation and all its messages
 */
export const deleteConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.conversationId as string;

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ status: "error", message: "Conversation not found" });
    }

    await prisma.chatConversation.delete({ where: { id: conversationId } });
    console.log(`[AI Chat] Conversation deleted: ${conversationId}`);

    res.json({ status: "success", message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};
