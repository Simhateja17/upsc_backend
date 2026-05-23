import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getTodayTasks,
  createTask,
  updateTask,
  deleteTask,
  getStudyStreak,
  getWeeklyGoals,
  saveWeeklyGoals,
  getSyllabusCoverage,
  getMonthlyActivity,
} from "../controllers/studyPlanner.controller";
import {
  completeGoogleCalendarCallback,
  getCalendarSyncStatus,
  getGoogleCalendarAuthUrl,
  updateCalendarSync,
} from "../controllers/calendarSync.controller";

const router = Router();

router.get("/today", authenticate, getTodayTasks);
router.post("/tasks", authenticate, createTask);
router.put("/tasks/:id", authenticate, updateTask);
router.delete("/tasks/:id", authenticate, deleteTask);
router.get("/streak", authenticate, getStudyStreak);
router.get("/weekly-goals", authenticate, getWeeklyGoals);
router.put("/weekly-goals", authenticate, saveWeeklyGoals);
router.get("/syllabus-coverage", authenticate, getSyllabusCoverage);
router.get("/monthly-activity", authenticate, getMonthlyActivity);
router.get("/calendar-sync/status", authenticate, getCalendarSyncStatus);
router.get("/calendar-sync/google/auth-url", authenticate, getGoogleCalendarAuthUrl);
router.post("/calendar-sync/google/callback", authenticate, completeGoogleCalendarCallback);
router.put("/calendar-sync", authenticate, updateCalendarSync);

export default router;
