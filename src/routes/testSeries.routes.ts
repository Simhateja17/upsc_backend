import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  listSeries,
  getSeriesDetail,
  getEnrolledSeries,
  enrollInSeries,
  unenrollFromSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  getSeriesStats,
} from "../controllers/testSeries.controller";

const router = Router();

// Public — stats for hero section
router.get("/stats", getSeriesStats);

// Public — list all active series
router.get("/", listSeries);

// Public — single series detail
router.get("/:id", getSeriesDetail);

// Auth required
router.get("/enrolled", authenticate, getEnrolledSeries);
router.post("/:id/enroll", authenticate, enrollInSeries);
router.delete("/:id/enroll", authenticate, unenrollFromSeries);

// Admin only
router.post("/", authenticate, createSeries);
router.put("/:id", authenticate, updateSeries);
router.delete("/:id", authenticate, deleteSeries);

export default router;
