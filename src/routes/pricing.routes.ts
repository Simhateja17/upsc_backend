import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getPlans, bookCall, getTestimonials } from "../controllers/pricing.controller";

const router = Router();

router.get("/plans", getPlans);
router.post("/book-call", authenticate, bookCall);
router.get("/testimonials", getTestimonials);

export default router;
