import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import {
  getTodayEditorials,
  getEditorial,
  markRead,
  toggleSave,
  summarize,
  getStats,
} from "../controllers/editorial.controller";

const router = Router();

router.get("/today", optionalAuth, getTodayEditorials);
router.get("/stats", authenticate, getStats);
router.get("/:id", getEditorial);
router.post("/:id/mark-read", authenticate, markRead);
router.post("/:id/save", authenticate, toggleSave);
router.post("/:id/summarize", authenticate, summarize);

export default router;
