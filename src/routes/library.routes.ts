import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { enforceUsage } from "../middleware/entitlements.middleware";
import { getSubjects, getChapters, getDownloadUrl, getMaterialDownloadUrl, getMaterialViewPages } from "../controllers/library.controller";

const router = Router();

// Premium library content — require authentication for browsing + download
router.get("/subjects", authenticate, getSubjects);
router.get("/subjects/:id/chapters", authenticate, getChapters);
router.get("/view/material/:materialId/pages", authenticate, enforceUsage("study_material_download", "library"), getMaterialViewPages);
router.get("/download/material/:materialId", authenticate, enforceUsage("study_material_download", "library"), getMaterialDownloadUrl);
router.get("/download/:chapterId", authenticate, enforceUsage("study_material_download", "library"), getDownloadUrl);

export default router;
