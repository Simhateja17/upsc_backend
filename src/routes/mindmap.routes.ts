import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSubjects,
  getMindmaps,
  getMindmap,
  updateProgress,
} from "../controllers/mindmap.controller";

const router = Router();

// Mindmaps are premium content — require authentication for all access
router.get("/subjects", authenticate, getSubjects);
router.get("/:subjectId", authenticate, getMindmaps);
router.get("/:subjectId/:mindmapId", authenticate, getMindmap);
router.patch("/:mindmapId/progress", authenticate, updateProgress);

export default router;
