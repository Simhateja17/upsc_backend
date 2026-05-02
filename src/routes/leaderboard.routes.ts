import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getLeaderboard, getMyRank } from "../controllers/leaderboard.controller";

const router = Router();

router.get("/", getLeaderboard);
router.get("/me", authenticate, getMyRank);

export default router;
