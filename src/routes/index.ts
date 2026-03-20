import { Router, Request, Response } from "express";
import authRoutes from "./auth.routes";
import aiRoutes from "./ai.routes";
import dashboardRoutes from "./dashboard.routes";
import dailyMcqRoutes from "./dailyMcq.routes";
import dailyAnswerRoutes from "./dailyAnswer.routes";
import editorialRoutes from "./editorial.routes";
import mockTestRoutes from "./mockTest.routes";
import studyPlannerRoutes from "./studyPlanner.routes";
import videoRoutes from "./video.routes";
import libraryRoutes from "./library.routes";
import pricingRoutes from "./pricing.routes";
import mentorshipRoutes from "./mentorship.routes";
import adminRoutes from "./admin.routes";
import pyqRoutes from "./pyq.routes";
import flashcardsRoutes from "./flashcards.routes";
import spacedRepetitionRoutes from "./spacedRepetition.routes";
import mindmapRoutes from "./mindmap.routes";
import testSeriesRoutes from "./testSeries.routes";
import * as cmsPublicCtrl from "../controllers/cms.public.controller";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({
    status: "success",
    message: "UPSC Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
router.use("/auth", authRoutes);

// Dashboard & user routes
router.use("/user", dashboardRoutes);

// Daily MCQ routes
router.use("/daily-mcq", dailyMcqRoutes);

// Daily Answer Writing routes
router.use("/daily-answer", dailyAnswerRoutes);

// Editorial routes
router.use("/editorials", editorialRoutes);

// Mock Test routes
router.use("/mock-tests", mockTestRoutes);

// Study Planner routes
router.use("/study-plan", studyPlannerRoutes);

// Video Lectures routes
router.use("/videos", videoRoutes);

// Library routes
router.use("/library", libraryRoutes);

// Pricing routes
router.use("/pricing", pricingRoutes);

// Mentorship routes (separate from pricing)
router.use("/mentorship", mentorshipRoutes);

// Admin routes
router.use("/admin", adminRoutes);

// Public PYQ routes
router.use("/pyq", pyqRoutes);

// Flashcards routes
router.use("/flashcards", flashcardsRoutes);

// Spaced Repetition routes
router.use("/spaced-repetition", spacedRepetitionRoutes);

// Mindmap routes
router.use("/mindmaps", mindmapRoutes);

// Test Series routes
router.use("/test-series", testSeriesRoutes);

// Public CMS route (no auth - slug is URL-encoded for nested paths)
router.get("/cms/:slug", cmsPublicCtrl.getPageContent);

// Jeet AI chat routes
router.use("/ai", aiRoutes);

export default router;
