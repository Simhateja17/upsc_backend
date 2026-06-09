import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import {
  listSeries,
  listSeriesCatalog,
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
router.get("/catalog", optionalAuth, listSeriesCatalog); // mobile app catalog shape

// Auth required — test level. These must be registered before `/:id`.
router.get("/tests/:testId/questions", authenticate, getTestQuestions);
router.post("/tests/:testId/submit", authenticate, submitTest);
router.get("/tests/:testId/result", authenticate, getTestResult);
router.get("/tests/:testId/report", authenticate, getTestReport);
router.get("/tests/:testId/intelligence", authenticate, getTestIntelligence);

// Auth required — series level
router.get("/enrolled", authenticate, getEnrolledSeries);
router.post("/:id/enroll", authenticate, enrollInSeries);
router.delete("/:id/enroll", authenticate, unenrollFromSeries);
router.get("/:seriesId/dashboard", authenticate, getSeriesDashboard);
router.post("/:seriesId/checkout", authenticate, checkoutSeries);

// Admin only
router.post("/", authenticate, requireAdmin, createSeries);
router.put("/:id", authenticate, requireAdmin, updateSeries);
router.delete("/:id", authenticate, requireAdmin, deleteSeries);

// Public — single series detail. Keep last so fixed routes are not captured as ids.
router.get("/:id", getSeriesDetail);

export default router;
