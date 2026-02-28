import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getSubjects, getVideosBySubject, getStats, askMentor } from "../controllers/video.controller";

const router = Router();

router.get("/subjects", getSubjects);
router.get("/stats", getStats);
router.get("/:subject", getVideosBySubject);
router.post("/mentor/ask", authenticate, askMentor);

export default router;
