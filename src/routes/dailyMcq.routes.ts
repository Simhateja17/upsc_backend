import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getTodayMCQ,
  getTodayQuestions,
  submitMCQ,
  getTodayResults,
  getTodayReview,
  getTodayRecommendations,
  getPracticeQuestions,
} from "../controllers/dailyMcq.controller";

const router = Router();

router.get("/today", authenticate, getTodayMCQ);
router.get("/today/questions", authenticate, getTodayQuestions);
router.post("/today/submit", authenticate, submitMCQ);
router.get("/today/results", authenticate, getTodayResults);
router.get("/today/review", authenticate, getTodayReview);
router.get("/today/recommendations", authenticate, getTodayRecommendations);
router.get("/practice", authenticate, getPracticeQuestions);

export default router;
