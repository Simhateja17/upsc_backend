import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getPlans, bookCall, getTestimonials, createOrder, getOrders } from "../controllers/pricing.controller";

const router = Router();

router.get("/plans", getPlans);
router.post("/book-call", authenticate, bookCall);
router.get("/testimonials", getTestimonials);
router.post("/orders", authenticate, createOrder);
router.get("/orders", authenticate, getOrders);

export default router;
