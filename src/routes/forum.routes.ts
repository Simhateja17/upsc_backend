import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import { enforceUsage } from "../middleware/entitlements.middleware";
import {
  getPosts,
  getPost,
  createPost,
  createAnswer,
  vote,
  createBookmark,
  deleteBookmark,
  getMyPosts,
  getMyAnswers,
  getBookmarks,
  getSubjects,
  getStats,
} from "../controllers/forum.controller";

const router = Router();

// Public / optional auth
router.get("/posts", optionalAuth, getPosts);
router.get("/posts/:id", optionalAuth, getPost);
router.get("/subjects", getSubjects);
router.get("/stats", getStats);

// Authenticated
router.post("/posts", authenticate, enforceUsage("forum_post", "forum"), createPost);
router.post("/posts/:id/answers", authenticate, enforceUsage("forum_reply", "forum"), createAnswer);
router.post("/vote", authenticate, vote);
router.post("/bookmarks", authenticate, createBookmark);
router.delete("/bookmarks/:postId", authenticate, deleteBookmark);
router.get("/my-posts", authenticate, getMyPosts);
router.get("/my-answers", authenticate, getMyAnswers);
router.get("/bookmarks", authenticate, getBookmarks);

export default router;
