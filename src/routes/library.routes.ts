import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getSubjects, getChapters, getDownloadUrl } from "../controllers/library.controller";

const router = Router();

// Premium library content — require authentication for browsing + download
router.get("/subjects", authenticate, getSubjects);
router.get("/subjects/:id/chapters", authenticate, getChapters);
router.get("/download/:chapterId", authenticate, getDownloadUrl);

export default router;
