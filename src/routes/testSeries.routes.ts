import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  listSeries,
  getEnrolledSeries,
  enrollInSeries,
  unenrollFromSeries,
  createSeries,
  updateSeries,
  deleteSeries,
} from "../controllers/testSeries.controller";

const router = Router();

// Public — list all active series
router.get("/", listSeries);

// Auth required
router.get("/enrolled", authenticate, getEnrolledSeries);
router.post("/:id/enroll", authenticate, enrollInSeries);
router.delete("/:id/enroll", authenticate, unenrollFromSeries);

// Admin only
router.post("/", authenticate, createSeries);
router.put("/:id", authenticate, updateSeries);
router.delete("/:id", authenticate, deleteSeries);

export default router;
