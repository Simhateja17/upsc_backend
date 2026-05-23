import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { invokeModel, BedrockMessage } from "../config/llm";
import { supabaseAdmin } from "../config/supabase";
import { embedText } from "../services/embedding.service";

const JEET_AI_SYSTEM_PROMPT = `You are Jeet AI, the UPSC preparation assistant for "Rise With Jeet". Never use any other platform name.

Answer like a direct mentor: accurate, exam-focused, natural, and concise. Default to 120-180 words unless the user asks for depth, an essay, a mains answer, ethics case study, or a study plan.

Use headings and bullets only when they improve revision. For UPSC topics, include exam relevance when useful. For ethics, cover stakeholders and ethical dimensions. For study plans, use weekly/monthly milestones.

Use only hyphens, never em dashes or en dashes. You may use sparse tokens such as {ALERT: ...}, {PRIO: ...}, and {CITE: ...}. Use styled blocks like > [!ALERT], > [!TIP], > [!DIMENSIONS], or > [!TAGS] only when they add clear UPSC value.`;

const SIMILARITY_THRESHOLD = 0.68;
const RAG_SOURCE_LIMIT = 2;
const RAG_CHUNK_CHAR_LIMIT = 1500;
const RECENT_HISTORY_LIMIT = 6;
const SUMMARY_TARGET_WORDS = 130;
const JEET_AI_MAX_TOKENS = 900;

function normalizeAssistantReply(reply: string): string {
  return reply
    .replace(/[—–]/g, "-")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function truncateForPrompt(text: string, maxChars: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).replace(/\s+\S*$/, "")}...`;
}

function countMessageChars(messages: BedrockMessage[]): number {
  return messages.reduce((sum, msg) => {
    if (typeof msg.content === "string") return sum + msg.content.length;
    return sum + msg.content.reduce((inner, block) => inner + (block.text?.length || 0), 0);
  }, 0);
}

/**
 * Retrieve relevant study material chunks for a given query via vector similarity search.
 * Returns a formatted context string, or empty string if nothing relevant found.
 */
async function retrieveRelevantContext(query: string): Promise<{ context: string; sourceCount: number; contextChars: number }> {
  try {
    if (!supabaseAdmin) return { context: "", sourceCount: 0, contextChars: 0 };

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
      return { context: "", sourceCount: 0, contextChars: 0 };
    }

    chunks.sort((a, b) => b.similarity - a.similarity);
    const selected = chunks.slice(0, RAG_SOURCE_LIMIT);

    console.log(
      `[Jeet AI RAG] Found ${chunks.length} relevant chunks (threshold: ${SIMILARITY_THRESHOLD}). ` +
      `Using ${selected.length}. ` +
      `Top similarities: [${selected.map(c => c.similarity.toFixed(3)).join(', ')}]. ` +
      `Sources: [${selected.map(c => c.metadata?.subject || 'unknown').join(', ')}]`
    );

    const context = selected
      .map(
        (c, i) =>
          `[Source ${i + 1}${c.metadata?.subject ? ` - ${c.metadata.subject}` : ""}${c.metadata?.topic ? ` / ${c.metadata.topic}` : ""}]\n${truncateForPrompt(c.chunk_text, RAG_CHUNK_CHAR_LIMIT)}`
      )
      .join("\n\n");

    return { context, sourceCount: selected.length, contextChars: context.length };
  } catch (err) {
    console.warn("[Jeet AI] RAG context retrieval failed (non-fatal):", err);
    return { context: "", sourceCount: 0, contextChars: 0 };
  }
}

async function buildConversationMemory(
  conversation: { id: string; summary: string | null; summarizedMessageCount: number },
  priorMessages: Array<{ role: string; content: string }>
): Promise<{ summary: string | null; recentMessages: BedrockMessage[]; summarizedMessageCount: number }> {
  const nextSummarizedCount = Math.max(0, priorMessages.length - RECENT_HISTORY_LIMIT);
  let summary = conversation.summary;
  let summarizedMessageCount = conversation.summarizedMessageCount || 0;

  if (nextSummarizedCount > summarizedMessageCount) {
    const messagesToSummarize = priorMessages.slice(summarizedMessageCount, nextSummarizedCount);
    const transcript = messagesToSummarize
      .map((m) => `${m.role}: ${truncateForPrompt(m.content, 1000)}`)
      .join("\n");

    try {
      summary = await invokeModel(
        [
          {
            role: "user",
            content: `Existing summary:\n${summary || "None"}\n\nNew chat turns:\n${transcript}\n\nUpdate the conversation memory in ${SUMMARY_TARGET_WORDS} words or fewer. Preserve only stable user goals, preferences, unresolved tasks, and facts needed for future answers. Do not include greetings or generic advice.`,
          },
        ],
        {
          system: "You compress chat history for a UPSC tutoring assistant. Return only the updated concise memory.",
          maxTokens: 220,
          temperature: 0.1,
          serviceName: "jeetAiHistorySummarizer",
        }
      );
      summary = truncateForPrompt(normalizeAssistantReply(summary), 900);
      summarizedMessageCount = nextSummarizedCount;

      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { summary, summarizedMessageCount },
      });
    } catch (err) {
      console.warn("[AI Chat] Conversation summarization failed (non-fatal):", err);
    }
  }

  const recentMessages = priorMessages.slice(-RECENT_HISTORY_LIMIT).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return { summary, recentMessages, summarizedMessageCount };
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

    // Load prior messages once; older turns are compressed before model input.
    const priorMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    const memory = await buildConversationMemory(conversation, priorMessages);

    // Build messages array for Claude: summary in system prompt + last 3 turns verbatim.
    const claudeMessages: BedrockMessage[] = [
      ...memory.recentMessages,
      { role: "user" as const, content: trimmedMessage },
    ];

    // Retrieve relevant study material context via RAG
    const rag = await retrieveRelevantContext(trimmedMessage);
    const memorySection = memory.summary
      ? `\n\nConversation memory:\n${memory.summary}`
      : "";
    const ragSection = rag.context
      ? `\n\nRelevant Rise With Jeet study material:\n${rag.context}\nUse this as primary grounding when relevant. Cite used sources with {CITE: Source 1}. Ignore irrelevant excerpts.`
      : "";
    const systemPrompt = `${JEET_AI_SYSTEM_PROMPT}${memorySection}${ragSection}`;

    console.log(
      `[AI Chat Telemetry] policy=jeet-ai-token-reduction-v1 ` +
        `systemPromptChars=${systemPrompt.length} ` +
        `historyMessages=${memory.recentMessages.length} ` +
        `historyChars=${countMessageChars(memory.recentMessages)} ` +
        `priorMessages=${priorMessages.length} ` +
        `summarizedMessageCount=${memory.summarizedMessageCount} ` +
        `summaryChars=${memory.summary?.length || 0} ` +
        `ragSources=${rag.sourceCount} ` +
        `ragChars=${rag.contextChars} ` +
        `userMessageChars=${trimmedMessage.length} ` +
        `maxTokens=${JEET_AI_MAX_TOKENS}`
    );

    // Call Claude
    console.log(`[AI Chat] Sending ${claudeMessages.length} messages to Claude, RAG context: ${rag.context ? "yes" : "none"}`);
    const aiReplyRaw = await invokeModel(claudeMessages, {
      maxTokens: JEET_AI_MAX_TOKENS,
      temperature: 0.5,
      system: systemPrompt,
      serviceName: "jeetAiChat",
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
