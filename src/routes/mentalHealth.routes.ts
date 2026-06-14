import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAccess } from "../middleware/entitlements.middleware";
import {
  saveCheckIn,
  getCheckIns,
  getStreak,
  saveToolSession,
  getToolStats,
  getDailyContent,
  getStressIndex,
  saveJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
} from "../controllers/mentalHealth.controller";

const router = Router();

router.use(authenticate, requireAccess("mental_health_buddy", ["full"]));

router.post("/check-in", saveCheckIn);
router.get("/check-ins", getCheckIns);
router.get("/streak", getStreak);
router.post("/tool-session", saveToolSession);
router.get("/tool-stats", getToolStats);
router.get("/daily-content", getDailyContent);
router.get("/stress-index", getStressIndex);
router.post("/journal", saveJournalEntry);
router.get("/journal", getJournalEntries);
router.delete("/journal/:id", deleteJournalEntry);

export default router;
