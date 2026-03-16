import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

/**
 * GET /api/flashcards/subjects
 */
export const getSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    const decks = await prisma.flashcardDeck.findMany({
      include: { cards: true },
    });

    const deckData = await Promise.all(
      decks.map(async (deck) => {
        const totalCards = deck.cards.length;
        let masteredCards = 0;

        if (userId && totalCards > 0) {
          masteredCards = await prisma.userFlashcardProgress.count({
            where: {
              userId,
              mastered: true,
              cardId: { in: deck.cards.map((c) => c.id) },
            },
          });
        }

        const mastery = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
        const topics = new Set(deck.cards.map((c) => c.topicId)).size;

        return {
          id: deck.subjectId,
          subject: deck.subject,
          icon: deck.icon,
          totalCards,
          topics,
          mastery,
          masteredCards,
        };
      })
    );

    res.json({ status: "success", data: deckData });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/flashcards/:subjectId/topics
 */
export const getTopics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjectId = param(req, "subjectId");
    const userId = req.user?.id;

    const deck = await prisma.flashcardDeck.findUnique({
      where: { subjectId },
      include: { cards: true },
    });

    if (!deck) {
      res.status(404).json({ status: "error", message: "Deck not found" });
      return;
    }

    // Group cards by topic
    const topicMap: Record<string, { topicId: string; name: string; cardIds: string[] }> = {};
    for (const card of deck.cards) {
      if (!topicMap[card.topicId]) {
        topicMap[card.topicId] = { topicId: card.topicId, name: card.topic, cardIds: [] };
      }
      topicMap[card.topicId].cardIds.push(card.id);
    }

    const topics = await Promise.all(
      Object.values(topicMap).map(async (t) => {
        let mastered = 0;
        if (userId && t.cardIds.length > 0) {
          mastered = await prisma.userFlashcardProgress.count({
            where: { userId, mastered: true, cardId: { in: t.cardIds } },
          });
        }
        return {
          id: t.topicId,
          name: t.name,
          cards: t.cardIds.length,
          mastery: t.cardIds.length > 0 ? Math.round((mastered / t.cardIds.length) * 100) : 0,
        };
      })
    );

    res.json({
      status: "success",
      data: { deck: { subject: deck.subject, icon: deck.icon }, topics },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/flashcards/:subjectId/:topicId
 */
export const getCards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjectId = param(req, "subjectId");
    const topicId = param(req, "topicId");
    const userId = req.user?.id;

    const deck = await prisma.flashcardDeck.findUnique({ where: { subjectId } });
    if (!deck) {
      res.status(404).json({ status: "error", message: "Deck not found" });
      return;
    }

    const cards = await prisma.flashcard.findMany({
      where: { deckId: deck.id, topicId },
    });

    const cardIds = cards.map((c) => c.id);
    const progressMap: Record<string, boolean> = {};

    if (userId && cardIds.length > 0) {
      const progress = await prisma.userFlashcardProgress.findMany({
        where: { userId, cardId: { in: cardIds } },
      });
      for (const p of progress) {
        progressMap[p.cardId] = p.mastered;
      }
    }

    const data = cards.map((c) => ({
      id: c.id,
      question: c.question,
      answer: c.answer,
      difficulty: c.difficulty,
      mastered: progressMap[c.id] ?? false,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/flashcards
 */
export const createCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { subjectId, subject, topicId, topic, question, answer, difficulty } = req.body;

    if (!subjectId || !question || !answer) {
      res.status(400).json({ status: "error", message: "subjectId, question, and answer are required" });
      return;
    }

    let deck = await prisma.flashcardDeck.findUnique({ where: { subjectId } });
    if (!deck) {
      deck = await prisma.flashcardDeck.create({
        data: { subjectId, subject: subject || subjectId },
      });
    }

    const card = await prisma.flashcard.create({
      data: {
        deckId: deck.id,
        topicId: topicId || "custom",
        topic: topic || "Custom",
        question,
        answer,
        difficulty: difficulty || "Medium",
      },
    });

    res.status(201).json({ status: "success", data: card });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/flashcards/:cardId/progress
 */
export const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const cardId = param(req, "cardId");
    const { mastered } = req.body;

    const progress = await prisma.userFlashcardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: { mastered: Boolean(mastered), lastSeen: new Date() },
      create: { userId, cardId, mastered: Boolean(mastered) },
    });

    res.json({ status: "success", data: progress });
  } catch (error) {
    next(error);
  }
};
