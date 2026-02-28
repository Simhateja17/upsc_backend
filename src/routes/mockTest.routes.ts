import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSubjects,
  getConfig,
  generateTest,
  getTestQuestions,
  submitTest,
  saveProgress,
  getTestResults,
  getRecommendations,
  getPracticeStats,
} from "../controllers/mockTest.controller";

const router = Router();

router.get("/subjects", getSubjects);
router.get("/config", getConfig);
router.post("/generate", authenticate, generateTest);
router.get("/:testId/questions", authenticate, getTestQuestions);
router.post("/:testId/submit", authenticate, submitTest);
router.put("/:testId/save-progress", authenticate, saveProgress);
router.get("/:testId/results", authenticate, getTestResults);
router.get("/:testId/recommendations", authenticate, getRecommendations);

export default router;
