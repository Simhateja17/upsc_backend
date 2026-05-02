import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  saveCheckIn,
  getCheckIns,
  getStreak,
  saveToolSession,
  getToolStats,
  getDailyContent,
  getStressIndex,
} from "../controllers/mentalHealth.controller";

const router = Router();

router.post("/check-in", authenticate, saveCheckIn);
router.get("/check-ins", authenticate, getCheckIns);
router.get("/streak", authenticate, getStreak);
router.post("/tool-session", authenticate, saveToolSession);
router.get("/tool-stats", authenticate, getToolStats);
router.get("/daily-content", authenticate, getDailyContent);
router.get("/stress-index", authenticate, getStressIndex);

export default router;
