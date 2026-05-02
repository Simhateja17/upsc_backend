import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import { uploadPDF } from "../middleware/upload";
import { uploadSingle } from "../middleware/upload";
import { aiLimiter } from "../middleware/rateLimit";

// Admin controllers — split by domain
import * as pyqCtrl from "../controllers/admin/pyq.controller";
import * as editorialCtrl from "../controllers/admin/editorial.controller";
import * as dailyMcqCtrl from "../controllers/admin/daily-mcq.controller";
import * as dailyMainsCtrl from "../controllers/admin/daily-mains.controller";
import * as libraryCtrl from "../controllers/admin/library.controller";
import * as syllabusCtrl from "../controllers/admin/syllabus.controller";
import * as usersCtrl from "../controllers/admin/users.controller";
import * as videoCtrl from "../controllers/admin/video.controller";
import * as testimonialsCtrl from "../controllers/admin/testimonials.controller";
import * as pricingCtrl from "../controllers/admin/pricing.controller";
import * as faqCtrl from "../controllers/admin/faq.controller";
import * as analyticsCtrl from "../controllers/admin/analytics.controller";
import * as aiCostCtrl from "../controllers/admin/aiCost.controller";
import * as cmsCtrl from "../controllers/admin/cms.controller";
import * as studyMaterialCtrl from "../controllers/admin/studyMaterial.controller";
import * as mockTestMaterialCtrl from "../controllers/admin/mockTestMaterial.controller";

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
router.post("/pyq/vectorize", pyqCtrl.triggerPYQVectorization);

// ==================== Editorial Management ====================
router.get("/editorials", editorialCtrl.getEditorials);
router.post("/editorials", editorialCtrl.createEditorial);
router.put("/editorials/:id", editorialCtrl.updateEditorial);
router.delete("/editorials/:id", editorialCtrl.deleteEditorial);
router.post("/editorials/scrape", aiLimiter, editorialCtrl.triggerScrape);
router.post("/editorials/sync-rss", aiLimiter, editorialCtrl.triggerRssSync);
router.post("/editorials/:id/summarize", aiLimiter, editorialCtrl.triggerSummarize);

// ==================== Daily MCQ Management ====================
router.get("/daily-mcq", dailyMcqCtrl.getDailyMCQSets);
router.post("/daily-mcq", dailyMcqCtrl.createDailyMCQ);
router.post("/daily-mcq/generate", aiLimiter, dailyMcqCtrl.triggerDailyMCQ);

// ==================== Daily Mains Management ====================
router.get("/daily-mains", dailyMainsCtrl.getDailyMainsQuestions);
router.post("/daily-mains", dailyMainsCtrl.createDailyMains);
router.put("/daily-mains/:id", dailyMainsCtrl.updateDailyMains);
router.post("/daily-mains/generate", aiLimiter, dailyMainsCtrl.triggerDailyMains);

// ==================== Study Material RAG (Mock Test Source) ====================
router.post("/study-materials/upload", uploadPDF, studyMaterialCtrl.uploadStudyMaterial);
router.get("/study-materials", studyMaterialCtrl.getStudyMaterials);
router.delete("/study-materials/:id", studyMaterialCtrl.deleteStudyMaterial);

// ==================== Mock Test Materials (stores in mock_test_chunks) ====================
router.post("/mock-test-materials/upload", uploadPDF, mockTestMaterialCtrl.uploadMockTestMaterial);
router.get("/mock-test-materials", mockTestMaterialCtrl.getMockTestMaterials);
router.delete("/mock-test-materials/:id", mockTestMaterialCtrl.deleteMockTestMaterial);

// ==================== Library Management ====================
router.get("/library/subjects", libraryCtrl.getSubjects);
router.post("/library/subjects", libraryCtrl.createSubject);
router.put("/library/subjects/:id", libraryCtrl.updateSubject);
router.delete("/library/subjects/:id", libraryCtrl.deleteSubject);
router.get("/library/chapters", libraryCtrl.getChapters);
router.post("/library/chapters", libraryCtrl.createChapter);
router.put("/library/chapters/:id", libraryCtrl.updateChapter);
router.delete("/library/chapters/:id", libraryCtrl.deleteChapter);
router.get("/library/materials", libraryCtrl.getMaterials);
router.post("/library/materials/upload", uploadSingle("file"), libraryCtrl.uploadMaterial);
router.delete("/library/materials/:id", libraryCtrl.deleteMaterial);

// ==================== Syllabus Management ====================
router.get("/syllabus/subjects", syllabusCtrl.getSyllabusSubjects);
router.post("/syllabus/subjects", syllabusCtrl.createSyllabusSubject);
router.put("/syllabus/subjects/:id", syllabusCtrl.updateSyllabusSubject);
router.delete("/syllabus/subjects/:id", syllabusCtrl.deleteSyllabusSubject);
router.post("/syllabus/topics", syllabusCtrl.createSyllabusTopic);
router.put("/syllabus/topics/:id", syllabusCtrl.updateSyllabusTopic);
router.delete("/syllabus/topics/:id", syllabusCtrl.deleteSyllabusTopic);
router.post("/syllabus/sub-topics", syllabusCtrl.createSyllabusSubTopic);
router.put("/syllabus/sub-topics/:id", syllabusCtrl.updateSyllabusSubTopic);
router.delete("/syllabus/sub-topics/:id", syllabusCtrl.deleteSyllabusSubTopic);

// ==================== User Management ====================
router.get("/users", usersCtrl.getUsers);
router.put("/users/:id", usersCtrl.updateUser);

// ==================== Video Management ====================
router.get("/videos/subjects", videoCtrl.getVideoSubjects);
router.post("/videos/subjects", videoCtrl.createVideoSubject);
router.put("/videos/subjects/:id", videoCtrl.updateVideoSubject);
router.delete("/videos/subjects/:id", videoCtrl.deleteVideoSubject);
router.post("/videos", videoCtrl.createVideo);
router.put("/videos/:id", videoCtrl.updateVideo);
router.delete("/videos/:id", videoCtrl.deleteVideo);
router.get("/videos/:id/questions", videoCtrl.getVideoQuestions);
router.post("/videos/:id/questions", videoCtrl.createVideoQuestion);
router.delete("/videos/:videoId/questions/:qid", videoCtrl.deleteVideoQuestion);

// ==================== Testimonials Management ====================
router.get("/testimonials", testimonialsCtrl.getTestimonialsAdmin);
router.post("/testimonials", testimonialsCtrl.createTestimonial);
router.put("/testimonials/:id", testimonialsCtrl.updateTestimonial);
router.delete("/testimonials/:id", testimonialsCtrl.deleteTestimonial);

// ==================== Pricing Plans Management ====================
router.get("/pricing", pricingCtrl.getPricingPlansAdmin);
router.post("/pricing", pricingCtrl.createPricingPlan);
router.put("/pricing/:id", pricingCtrl.updatePricingPlan);
router.delete("/pricing/:id", pricingCtrl.deletePricingPlan);

// ==================== FAQ Management ====================
router.get("/faqs", faqCtrl.getFaqsAdmin);
router.post("/faqs", faqCtrl.createFaq);
router.put("/faqs/:id", faqCtrl.updateFaq);
router.delete("/faqs/:id", faqCtrl.deleteFaq);

// ==================== Analytics ====================
router.get("/analytics", analyticsCtrl.getAnalytics);

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

// ==================== Flashcard Management ====================
import {
  adminGetDecks,
  adminCreateDeck,
  adminUpdateDeck,
  adminDeleteDeck,
  adminGetCards,
  adminCreateCard,
  adminUpdateCard,
  adminDeleteCard,
} from "../controllers/flashcard.controller";
router.get("/flashcards/decks", adminGetDecks);
router.post("/flashcards/decks", adminCreateDeck);
router.put("/flashcards/decks/:id", adminUpdateDeck);
router.delete("/flashcards/decks/:id", adminDeleteDeck);
router.get("/flashcards/cards", adminGetCards);
router.post("/flashcards/cards", adminCreateCard);
router.put("/flashcards/cards/:id", adminUpdateCard);
router.delete("/flashcards/cards/:id", adminDeleteCard);

// ==================== Mindmap Management ====================
import {
  createMindmap,
  adminGetMindmapSubjects,
  adminCreateMindmapSubject,
  adminUpdateMindmapSubject,
  adminDeleteMindmapSubject,
  adminGetMindmaps,
  adminUpdateMindmap,
  adminDeleteMindmap,
} from "../controllers/mindmap.controller";
router.get("/mindmaps/subjects", adminGetMindmapSubjects);
router.post("/mindmaps/subjects", adminCreateMindmapSubject);
router.put("/mindmaps/subjects/:id", adminUpdateMindmapSubject);
router.delete("/mindmaps/subjects/:id", adminDeleteMindmapSubject);
router.get("/mindmaps", adminGetMindmaps);
router.post("/mindmaps", createMindmap);
router.put("/mindmaps/:id", adminUpdateMindmap);
router.delete("/mindmaps/:id", adminDeleteMindmap);

// ==================== Spaced Rep Seeds ====================
import {
  adminGetSeeds,
  adminCreateSeed,
  adminUpdateSeed,
  adminDeleteSeed,
} from "../controllers/spacedRepetition.controller";
router.get("/spaced-rep/seeds", adminGetSeeds);
router.post("/spaced-rep/seeds", adminCreateSeed);
router.put("/spaced-rep/seeds/:id", adminUpdateSeed);
router.delete("/spaced-rep/seeds/:id", adminDeleteSeed);

export default router;
