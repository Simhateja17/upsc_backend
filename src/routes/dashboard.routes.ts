import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getDashboard, getStreak, getActivity, getPerformance, getTestAnalytics } from "../controllers/dashboard.controller";
import { getPracticeStats } from "../controllers/mockTest.controller";

const router = Router();

router.get("/dashboard", authenticate, getDashboard);
router.get("/streak", authenticate, getStreak);
router.get("/activity", authenticate, getActivity);
router.get("/performance", authenticate, getPerformance);
router.get("/practice-stats", authenticate, getPracticeStats);
router.get("/test-analytics", authenticate, getTestAnalytics);

export default router;
