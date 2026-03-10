import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit";
import {
  chat,
  getConversations,
  getConversation,
  deleteConversation,
} from "../controllers/ai.controller";

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// POST /api/ai/chat — send message, get AI reply (rate limited — expensive)
router.post("/chat", aiLimiter, chat);

// GET /api/ai/conversations — list all conversations grouped by date
router.get("/conversations", getConversations);

// GET /api/ai/conversations/:conversationId — get full message history
router.get("/conversations/:conversationId", getConversation);

// DELETE /api/ai/conversations/:conversationId — delete a conversation
router.delete("/conversations/:conversationId", deleteConversation);

export default router;
