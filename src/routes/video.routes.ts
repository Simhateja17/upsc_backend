import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getSubjects, getVideosBySubject, getStats, getVideoQuestions, submitVideoQuiz, askMentor } from "../controllers/video.controller";

const router = Router();

// Premium video content — require authentication for all access
router.get("/subjects", authenticate, getSubjects);
router.get("/stats", authenticate, getStats);
router.get("/:id/questions", authenticate, getVideoQuestions);
router.post("/:id/submit", authenticate, submitVideoQuiz);
router.get("/:subject", authenticate, getVideosBySubject);
router.post("/mentor/ask", authenticate, askMentor);

export default router;
