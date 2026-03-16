import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSubjects,
  getMindmaps,
  getMindmap,
  updateProgress,
} from "../controllers/mindmap.controller";

const router = Router();

router.get("/subjects", getSubjects);
router.get("/:subjectId", getMindmaps);
router.get("/:subjectId/:mindmapId", getMindmap);
router.patch("/:mindmapId/progress", authenticate, updateProgress);

export default router;
