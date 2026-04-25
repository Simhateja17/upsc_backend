import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getProfile, updateProfile, updateSettings, getSessions, revokeSession } from "../controllers/user.controller";
import { submitFeedback } from "../controllers/feedback.controller";
import { getTrackerState, saveTrackerState } from "../controllers/syllabusTracker.controller";
import { getSubscription, startTrial, cancelSubscription, getOrders } from "../controllers/subscription.controller";
import { getNotifications, createNotification, markRead, markAllRead } from "../controllers/notification.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/settings", updateSettings);
router.get("/sessions", getSessions);
router.delete("/sessions/:id", revokeSession);
router.post("/feedback", submitFeedback);
router.get("/syllabus-tracker", getTrackerState);
router.put("/syllabus-tracker", saveTrackerState);

// Subscription
router.get("/subscription", getSubscription);
router.post("/subscription/trial", startTrial);
router.put("/subscription/cancel", cancelSubscription);
router.get("/orders", getOrders);

// Notifications
router.get("/notifications", getNotifications);
router.post("/notifications", createNotification);
router.patch("/notifications/:id/read", markRead);
router.patch("/notifications/read-all", markAllRead);

export default router;
