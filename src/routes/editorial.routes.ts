import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit";
import {
  getTodayEditorials,
  getEditorial,
  markRead,
  toggleSave,
  summarize,
  getStats,
  getLiveNews,
  syncNews,
} from "../controllers/editorial.controller";

const router = Router();

router.get("/today", authenticate, getTodayEditorials);
router.get("/live-news", authenticate, getLiveNews);
router.get("/stats", authenticate, getStats);
router.post("/sync-news", authenticate, syncNews);
router.get("/:id", authenticate, getEditorial);
router.post("/:id/mark-read", authenticate, markRead);
router.post("/:id/save", authenticate, toggleSave);
router.post("/:id/summarize", authenticate, aiLimiter, summarize);

export default router;
