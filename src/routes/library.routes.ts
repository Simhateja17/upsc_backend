import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getSubjects, getChapters, getDownloadUrl } from "../controllers/library.controller";

const router = Router();

router.get("/subjects", getSubjects);
router.get("/subjects/:id/chapters", getChapters);
router.get("/download/:chapterId", authenticate, getDownloadUrl);

export default router;
