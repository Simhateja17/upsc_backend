import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSubjects,
  getTopics,
  getCards,
  createCard,
  updateProgress,
} from "../controllers/flashcard.controller";

const router = Router();

// Flashcards are premium content — require authentication for all access
router.get("/subjects", authenticate, getSubjects);
router.get("/:subjectId/topics", authenticate, getTopics);
router.get("/:subjectId/:topicId", authenticate, getCards);
router.post("/", authenticate, createCard);
router.patch("/:cardId/progress", authenticate, updateProgress);

export default router;
