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
import * as aiCostCtrl from "../controllers/admin/aiCost.controller";
import * as cmsCtrl from "../controllers/admin/cms.controller";

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
router.post("/editorials/sync-rss", aiLimiter, editorialCtrl.triggerRssSync);
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

// ==================== Video Management ====================
router.get("/videos/subjects", contentCtrl.getVideoSubjects);
router.post("/videos/subjects", contentCtrl.createVideoSubject);
router.put("/videos/subjects/:id", contentCtrl.updateVideoSubject);
router.delete("/videos/subjects/:id", contentCtrl.deleteVideoSubject);
router.post("/videos", contentCtrl.createVideo);
router.put("/videos/:id", contentCtrl.updateVideo);
router.delete("/videos/:id", contentCtrl.deleteVideo);
router.get("/videos/:id/questions", contentCtrl.getVideoQuestions);
router.post("/videos/:id/questions", contentCtrl.createVideoQuestion);
router.delete("/videos/:videoId/questions/:qid", contentCtrl.deleteVideoQuestion);

// ==================== Testimonials Management ====================
router.get("/testimonials", contentCtrl.getTestimonialsAdmin);
router.post("/testimonials", contentCtrl.createTestimonial);
router.put("/testimonials/:id", contentCtrl.updateTestimonial);
router.delete("/testimonials/:id", contentCtrl.deleteTestimonial);

// ==================== Pricing Plans Management ====================
router.get("/pricing", contentCtrl.getPricingPlansAdmin);
router.post("/pricing", contentCtrl.createPricingPlan);
router.put("/pricing/:id", contentCtrl.updatePricingPlan);
router.delete("/pricing/:id", contentCtrl.deletePricingPlan);

// ==================== Analytics ====================
router.get("/analytics", contentCtrl.getAnalytics);

// ==================== AI Cost Tracking ====================
router.get("/ai-cost", aiCostCtrl.getAiCost);

// ==================== CMS Management ====================
router.post("/cms/upload", uploadSingle("file"), cmsCtrl.uploadMedia);
router.get("/cms/pages", cmsCtrl.getPages);
router.get("/cms/pages/:slug", cmsCtrl.getPage);
router.put("/cms/pages/:slug/bulk", cmsCtrl.bulkUpdateSections);
router.post("/cms/sections", cmsCtrl.createSection);
router.put("/cms/sections/:id", cmsCtrl.updateSection);
router.delete("/cms/sections/:id", cmsCtrl.deleteSection);

// ==================== Mindmap (Admin seeding) ====================
import { createMindmap } from "../controllers/mindmap.controller";
router.post("/mindmaps", createMindmap);

export default router;
