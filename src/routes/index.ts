import { Router, Request, Response } from "express";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import authRoutes from "./auth.routes";
import aiRoutes from "./ai.routes";
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
import searchRoutes from "./search.routes";
import userRoutes from "./user.routes";
import contactRoutes from "./contact.routes";
import * as cmsPublicCtrl from "../controllers/cms.public.controller";
import { getSyllabus } from "../controllers/syllabus.controller";

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

router.get("/health/deep", async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error", latencyMs: Date.now() - dbStart };
  }

  const stStart = Date.now();
  try {
    await supabaseAdmin.storage.listBuckets();
    checks.storage = { status: "ok", latencyMs: Date.now() - stStart };
  } catch {
    checks.storage = { status: "error", latencyMs: Date.now() - stStart };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const anyError = Object.values(checks).some((c) => c.status === "error");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : anyError ? "unhealthy" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Auth routes
router.use("/auth", authRoutes);

// User routes (dashboard, profile, settings, notifications, subscription — merged)
router.use("/user", userRoutes);

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

// Mentorship routes
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

// Semantic search routes
router.use("/search", searchRoutes);

// Contact form (public)
router.use("/contact", contactRoutes);

// Syllabus data (public)
router.get("/syllabus", getSyllabus);

// Public CMS route
router.get("/cms/:slug", cmsPublicCtrl.getPageContent);

// Public FAQs
router.get("/faqs", cmsPublicCtrl.getFaqsPublic);

// Jeet AI chat routes
router.use("/ai", aiRoutes);

export default router;
