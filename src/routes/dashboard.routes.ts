import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getDashboard, getStreak, getActivity, getPerformance } from "../controllers/dashboard.controller";
import { getPracticeStats } from "../controllers/mockTest.controller";

const router = Router();

router.get("/dashboard", authenticate, getDashboard);
router.get("/streak", authenticate, getStreak);
router.get("/activity", authenticate, getActivity);
router.get("/performance", authenticate, getPerformance);
router.get("/practice-stats", authenticate, getPracticeStats);

export default router;
