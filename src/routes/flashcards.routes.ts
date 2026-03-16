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

router.get("/subjects", getSubjects);
router.get("/:subjectId/topics", getTopics);
router.get("/:subjectId/:topicId", getCards);
router.post("/", authenticate, createCard);
router.patch("/:cardId/progress", authenticate, updateProgress);

export default router;
