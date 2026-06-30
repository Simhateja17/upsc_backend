import { Router } from "express";
import {
  getPublicPYQCounts,
  getPublicPYQQuestionById,
  getPublicPYQQuestions,
  submitPyqPrelimsAnswer,
} from "../controllers/pyq.controller";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadAnswerFiles } from "../middleware/upload";
import { enforceUsage } from "../middleware/entitlements.middleware";
import {
  submitPyqMainsAnswer,
  getPyqMainsEvaluationStatus,
  getPyqMainsResults,
} from "../controllers/pyqMains.controller";

const router = Router();

router.get("/questions", getPublicPYQQuestions);
router.get("/questions/:questionId", getPublicPYQQuestionById);
router.get("/counts", getPublicPYQCounts);
router.post("/prelims/:questionId/submit", authenticate, submitPyqPrelimsAnswer);

// Mains AI evaluation (typed or handwritten)
router.post(
  "/mains/:questionId/submit",
  authenticate,
  submissionLimiter,
  enforceUsage("mains_evaluation", "pyq_mains"),
  uploadAnswerFiles(),
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
