import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
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
} from "../controllers/forum.controller";

const router = Router();

// Public / optional auth
router.get("/posts", optionalAuth, getPosts);
router.get("/posts/:id", optionalAuth, getPost);
router.get("/subjects", getSubjects);

// Authenticated
router.post("/posts", authenticate, createPost);
router.post("/posts/:id/answers", authenticate, createAnswer);
router.post("/vote", authenticate, vote);
router.post("/bookmarks", authenticate, createBookmark);
router.delete("/bookmarks/:postId", authenticate, deleteBookmark);
router.get("/my-posts", authenticate, getMyPosts);
router.get("/my-answers", authenticate, getMyAnswers);
router.get("/bookmarks", authenticate, getBookmarks);

export default router;
