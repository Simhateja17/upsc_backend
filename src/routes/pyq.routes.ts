import { Router } from "express";
import { getPublicPYQQuestions } from "../controllers/pyq.controller";

const router = Router();

router.get("/questions", getPublicPYQQuestions);

export default router;
