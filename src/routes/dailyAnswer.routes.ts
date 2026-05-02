import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter, aiLimiter } from "../middleware/rateLimit";
import { uploadSingle } from "../middleware/upload";
import {
  getTodayQuestion,
  getTodayFullQuestion,
  submitTextAnswer,
  uploadAnswer,
  getEvaluationStatus,
  getTodayResults,
} from "../controllers/dailyAnswer.controller";

const router = Router();

router.get("/today", authenticate, getTodayQuestion);
router.get("/today/question", authenticate, getTodayFullQuestion);
router.post("/today/submit-text", authenticate, submissionLimiter, submitTextAnswer);
router.post("/today/upload", authenticate, submissionLimiter, uploadSingle("file"), uploadAnswer);
router.get("/today/evaluation-status", authenticate, getEvaluationStatus);
router.get("/today/results", authenticate, getTodayResults);

export default router;
