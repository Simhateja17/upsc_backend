import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getMyTickets,
  createTicket,
  getTicket,
  searchFaq,
  getFaqByCategory,
  markFaqHelpful,
} from "../controllers/support.controller";

const router = Router();

// Authenticated routes
router.use(authenticate);

router.get("/tickets", getMyTickets);
router.post("/tickets", createTicket);
router.get("/tickets/:id", getTicket);

// FAQ routes (also require auth per app design)
router.get("/faq/search", searchFaq);
router.get("/faq", getFaqByCategory);
router.post("/faq/:id/helpful", markFaqHelpful);

export default router;
