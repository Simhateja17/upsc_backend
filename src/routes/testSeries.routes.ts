import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import {
  listSeries,
  getSeriesDetail,
  getEnrolledSeries,
  enrollInSeries,
  unenrollFromSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  getSeriesStats,
} from "../controllers/testSeries.controller";
import {
  getSeriesDashboard,
  checkoutSeries,
  getTestQuestions,
  submitTest,
  getTestResult,
  getTestReport,
  getTestIntelligence,
} from "../controllers/testSeries.test.controller";

const router = Router();

// Public — stats for hero section
router.get("/stats", getSeriesStats);

// Public — list all active series
router.get("/", listSeries);
router.get("/catalog", listSeries); // alias for mobile app

// Public — single series detail
router.get("/:id", getSeriesDetail);

// Auth required — series level
router.get("/enrolled", authenticate, getEnrolledSeries);
router.post("/:id/enroll", authenticate, enrollInSeries);
router.delete("/:id/enroll", authenticate, unenrollFromSeries);
router.get("/:seriesId/dashboard", authenticate, getSeriesDashboard);
router.post("/:seriesId/checkout", authenticate, checkoutSeries);

// Auth required — test level
router.get("/tests/:testId/questions", authenticate, getTestQuestions);
router.post("/tests/:testId/submit", authenticate, submitTest);
router.get("/tests/:testId/result", authenticate, getTestResult);
router.get("/tests/:testId/report", authenticate, getTestReport);
router.get("/tests/:testId/intelligence", authenticate, getTestIntelligence);

// Admin only
router.post("/", authenticate, requireAdmin, createSeries);
router.put("/:id", authenticate, requireAdmin, updateSeries);
router.delete("/:id", authenticate, requireAdmin, deleteSeries);

export default router;
