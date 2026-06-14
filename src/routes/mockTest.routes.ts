import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadSingle } from "../middleware/upload";
import { enforceUsage } from "../middleware/entitlements.middleware";
import {
  getSubjects,
  getConfig,
  getPlatformStats,
  generateTest,
  getTestQuestions,
  submitTest,
  saveProgress,
  getTestResults,
  getRecommendations,
  getPracticeStats,
} from "../controllers/mockTest.controller";
import {
  submitMockTestMainsAnswer,
  getMockTestMainsEvaluationStatus,
  getMockTestMainsResults,
  getMainsHistory,
} from "../controllers/mockTestMains.controller";

const router = Router();

router.get("/subjects", getSubjects);
router.get("/config", getConfig);
router.get("/platform-stats", getPlatformStats);
router.get("/mains-history", authenticate, getMainsHistory);
router.post("/generate", authenticate, enforceUsage("prelims_mock_attempt", "mock_test"), generateTest);
router.get("/:testId/questions", authenticate, getTestQuestions);
router.post("/:testId/submit", authenticate, submitTest);
router.put("/:testId/save-progress", authenticate, saveProgress);
router.get("/:testId/results", authenticate, getTestResults);
router.get("/:testId/recommendations", authenticate, getRecommendations);

// Mains AI evaluation (typed or handwritten)
router.post(
  "/:testId/mains-submit",
  authenticate,
  submissionLimiter,
  enforceUsage("mains_evaluation", "mock_test_mains"),
  uploadSingle("file"),
  submitMockTestMainsAnswer
);
router.get(
  "/:testId/mains-evaluation-status",
  authenticate,
  getMockTestMainsEvaluationStatus
);
router.get(
  "/:testId/mains-results",
  authenticate,
  getMockTestMainsResults
);

export default router;
