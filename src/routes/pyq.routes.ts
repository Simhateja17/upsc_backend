import { Router } from "express";
import { getPublicPYQCounts, getPublicPYQQuestions } from "../controllers/pyq.controller";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadSingle } from "../middleware/upload";
import {
  submitPyqMainsAnswer,
  getPyqMainsEvaluationStatus,
  getPyqMainsResults,
} from "../controllers/pyqMains.controller";

const router = Router();

router.get("/questions", getPublicPYQQuestions);
router.get("/counts", getPublicPYQCounts);

// Mains AI evaluation (typed or handwritten)
router.post(
  "/mains/:questionId/submit",
  authenticate,
  submissionLimiter,
  uploadSingle("file"),
  submitPyqMainsAnswer
);
router.get(
  "/mains/:questionId/evaluation-status",
  authenticate,
  getPyqMainsEvaluationStatus
);
router.get(
  "/mains/:questionId/results",
  authenticate,
  getPyqMainsResults
);

export default router;
