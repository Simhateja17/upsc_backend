import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getBookmarks,
  toggleBookmark,
  deleteBookmark,
  checkBookmark,
  togglePin,
} from "../controllers/bookmark.controller";

const router = Router();

// All bookmark routes require authentication
router.use(authenticate);

router.get("/", getBookmarks);
router.post("/toggle", toggleBookmark);
router.delete("/:id", deleteBookmark);
router.get("/check", checkBookmark);
router.patch("/:id/pin", togglePin);

export default router;
