import { Request, Response, NextFunction, Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { uploadAnswerFiles } from "../middleware/upload";
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

// Generating a Mains paper only hands out the questions - the actual cost
// (AI evaluation) is charged separately and correctly at /mains-submit below.
// Only Prelims generation should ever spend a prelims_mock_attempt credit;
// gating it unconditionally here was blocking Mains generation for anyone
// who'd exhausted their Prelims attempts, even with Mains evaluations left.
const enforcePrelimsAttemptForPrelims = (req: Request, res: Response, next: NextFunction) => {
  if (req.body?.examMode === "mains") return next();
  return enforceUsage("prelims_mock_attempt", "mock_test")(req, res, next);
};

router.get("/subjects", getSubjects);
router.get("/config", getConfig);
router.get("/platform-stats", getPlatformStats);
router.get("/mains-history", authenticate, getMainsHistory);
router.post("/generate", authenticate, enforcePrelimsAttemptForPrelims, generateTest);
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
  uploadAnswerFiles(),
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
