import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import { uploadPDF } from "../middleware/upload";
import { uploadSingle } from "../middleware/upload";
import { aiLimiter } from "../middleware/rateLimit";

// Admin controllers
import * as pyqCtrl from "../controllers/admin/pyq.controller";
import * as editorialCtrl from "../controllers/admin/editorial.controller";
import * as contentCtrl from "../controllers/admin/content.controller";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ==================== PYQ Management ====================
router.post("/pyq/upload", uploadPDF, pyqCtrl.uploadPYQ);
router.get("/pyq/uploads", pyqCtrl.getUploads);
router.get("/pyq/uploads/:id", pyqCtrl.getUploadDetail);
router.get("/pyq/questions", pyqCtrl.getQuestions);
router.put("/pyq/questions/:id", pyqCtrl.updateQuestion);
router.post("/pyq/questions/bulk-approve", pyqCtrl.bulkUpdateStatus);
router.get("/pyq/stats", pyqCtrl.getStats);

// ==================== Editorial Management ====================
router.get("/editorials", editorialCtrl.getEditorials);
router.post("/editorials", editorialCtrl.createEditorial);
router.put("/editorials/:id", editorialCtrl.updateEditorial);
router.delete("/editorials/:id", editorialCtrl.deleteEditorial);
router.post("/editorials/scrape", aiLimiter, editorialCtrl.triggerScrape);
router.post("/editorials/:id/summarize", aiLimiter, editorialCtrl.triggerSummarize);

// ==================== Daily MCQ Management ====================
router.get("/daily-mcq", contentCtrl.getDailyMCQSets);
router.post("/daily-mcq", contentCtrl.createDailyMCQ);
router.post("/daily-mcq/generate", aiLimiter, contentCtrl.triggerDailyMCQ);

// ==================== Daily Mains Management ====================
router.get("/daily-mains", contentCtrl.getDailyMainsQuestions);
router.post("/daily-mains", contentCtrl.createDailyMains);
router.put("/daily-mains/:id", contentCtrl.updateDailyMains);
router.post("/daily-mains/generate", aiLimiter, contentCtrl.triggerDailyMains);

// ==================== Study Material Management ====================
router.post("/library/subjects", contentCtrl.createSubject);
router.post("/library/chapters", contentCtrl.createChapter);
router.post("/library/materials/upload", uploadSingle("file"), contentCtrl.uploadMaterial);

// ==================== User Management ====================
router.get("/users", contentCtrl.getUsers);
router.put("/users/:id", contentCtrl.updateUser);

// ==================== Analytics ====================
router.get("/analytics", contentCtrl.getAnalytics);

export default router;
