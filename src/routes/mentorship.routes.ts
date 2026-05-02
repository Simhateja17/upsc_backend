import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { bookCall, getTestimonials } from "../controllers/pricing.controller";

const router = Router();

router.post("/book-call", authenticate, bookCall);
router.get("/testimonials", getTestimonials);

export default router;
