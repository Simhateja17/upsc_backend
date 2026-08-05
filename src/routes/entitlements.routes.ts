import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getMyEntitlements } from "../controllers/entitlements.controller";

const router = Router();

router.get("/me", authenticate, getMyEntitlements);

export default router;
