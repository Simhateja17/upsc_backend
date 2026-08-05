import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadAnswerFiles } from "../middleware/upload";
import { enforceUsage } from "../middleware/entitlements.middleware";
import {
  getTodayQuestion,
  getTodayFullQuestion,
  submitTextAnswer,
  uploadAnswer,
  getEvaluationStatus,
  getTodayResults,
  getHistory,
  getCalendar,
} from "../controllers/dailyAnswer.controller";

const router = Router();

router.get("/today", authenticate, getTodayQuestion);
router.get("/today/question", authenticate, getTodayFullQuestion);
router.post("/today/submit-text", authenticate, submissionLimiter, enforceUsage("mains_evaluation", "daily_mains"), submitTextAnswer);
router.post("/today/upload", authenticate, submissionLimiter, enforceUsage("mains_evaluation", "daily_mains"), uploadAnswerFiles(), uploadAnswer);
router.get("/today/evaluation-status", authenticate, getEvaluationStatus);
router.get("/today/results", authenticate, getTodayResults);
router.get("/history", authenticate, getHistory);
router.get("/calendar", authenticate, getCalendar);

export default router;
