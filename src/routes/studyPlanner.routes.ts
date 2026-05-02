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

export default router;
