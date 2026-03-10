import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { invokeModel, BedrockMessage } from "../config/bedrock";

const JEET_AI_SYSTEM_PROMPT = `You are Jeet AI, an intelligent UPSC preparation assistant for the "Rise with Jeet IAS" platform. You help Indian civil services aspirants with their exam preparation.

Your personality:
- Knowledgeable, encouraging, and exam-focused
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

You can answer general questions too, but always try to relate them back to UPSC preparation when possible.`;

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

    // Call Claude
    const aiReply = await invokeModel(claudeMessages, {
      maxTokens: 2048,
      temperature: 0.5,
      system: JEET_AI_SYSTEM_PROMPT,
    });

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

    res.json({ status: "success", message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};
