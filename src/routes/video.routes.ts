import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import { requireAccess } from "../middleware/entitlements.middleware";
import { getSubjects, getVideosBySubject, getStats, getVideoQuestions, submitVideoQuiz, askMentor, listMentorQuestions, updateMentorQuestion } from "../controllers/video.controller";

const router = Router();

// Specific literal routes first (must precede parameterized routes)
router.get("/subjects", authenticate, getSubjects);
router.get("/stats", authenticate, getStats);
router.post("/mentor/ask", authenticate, requireAccess("mentorship", ["full"]), askMentor);
router.get("/mentor/questions", authenticate, requireAdmin, listMentorQuestions);
router.patch("/mentor/questions/:id", authenticate, requireAdmin, updateMentorQuestion);

// Parameterized routes last
router.get("/:id/questions", authenticate, getVideoQuestions);
router.post("/:id/submit", authenticate, submitVideoQuiz);
router.get("/:subject", authenticate, getVideosBySubject);

export default router;
