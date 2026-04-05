import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getProfile, updateProfile, updateSettings } from "../controllers/user.controller";
import { submitFeedback } from "../controllers/feedback.controller";
import { getTrackerState, saveTrackerState } from "../controllers/syllabusTracker.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/settings", updateSettings);
router.post("/feedback", submitFeedback);
router.get("/syllabus-tracker", getTrackerState);
router.put("/syllabus-tracker", saveTrackerState);

export default router;
