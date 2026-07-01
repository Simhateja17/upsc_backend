import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadAnswerFiles } from "../middleware/upload";
import { enforceUsage } from "../middleware/entitlements.middleware";
import {
  getMainsEvaluatorResults,
  getMainsEvaluatorStatus,
  submitMainsEvaluatorAnswer,
} from "../controllers/mainsEvaluator.controller";

const router = Router();

router.post(
  "/submit",
  authenticate,
  submissionLimiter,
  enforceUsage("mains_evaluation", "standalone_mains"),
  uploadAnswerFiles(),
  submitMainsEvaluatorAnswer
);
router.get("/evaluation-status", authenticate, getMainsEvaluatorStatus);
router.get("/results", authenticate, getMainsEvaluatorResults);

export default router;
