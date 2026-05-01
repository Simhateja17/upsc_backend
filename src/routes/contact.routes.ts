import { Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware";
import { submissionLimiter } from "../middleware/rateLimit";
import { submitContact } from "../controllers/contact.controller";

const router = Router();

// Contact form is public but optionally attaches user if logged in
router.post("/", submissionLimiter, optionalAuth, submitContact);

export default router;
