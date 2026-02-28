import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import {
  getTodayQuestion,
  getTodayFullQuestion,
  submitTextAnswer,
  uploadAnswer,
  getEvaluationStatus,
  getTodayResults,
} from "../controllers/dailyAnswer.controller";

const router = Router();

router.get("/today", optionalAuth, getTodayQuestion);
router.get("/today/question", authenticate, getTodayFullQuestion);
router.post("/today/submit-text", authenticate, submitTextAnswer);
router.post("/today/upload", authenticate, uploadAnswer);
router.get("/today/evaluation-status", authenticate, getEvaluationStatus);
router.get("/today/results", authenticate, getTodayResults);

export default router;
