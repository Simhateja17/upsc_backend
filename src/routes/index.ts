import { Router, Request, Response } from "express";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import dailyMcqRoutes from "./dailyMcq.routes";
import dailyAnswerRoutes from "./dailyAnswer.routes";
import editorialRoutes from "./editorial.routes";
import mockTestRoutes from "./mockTest.routes";
import studyPlannerRoutes from "./studyPlanner.routes";
import videoRoutes from "./video.routes";
import libraryRoutes from "./library.routes";
import pricingRoutes from "./pricing.routes";

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

// Pricing & Mentorship routes
router.use("/pricing", pricingRoutes);
router.use("/mentorship", pricingRoutes);

export default router;
