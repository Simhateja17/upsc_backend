import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { toggleFlag, checkFlags } from "../controllers/flag.controller";

const router = Router();

// All flag routes require authentication
router.use(authenticate);

router.get("/check", checkFlags);
router.post("/", toggleFlag);

export default router;
