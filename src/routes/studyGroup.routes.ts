import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getGroups,
  getGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  getMessages,
  postMessage,
  getMyGroups,
} from "../controllers/studyGroup.controller";

const router = Router();

// All study-group routes require authentication
router.use(authenticate);

// Groups
router.get("/", getGroups);
router.post("/", createGroup);
router.get("/my-groups", getMyGroups);
router.get("/:id", getGroup);

// Membership
router.post("/:id/join", joinGroup);
router.post("/:id/leave", leaveGroup);

// Messages
router.get("/:id/messages", getMessages);
router.post("/:id/messages", postMessage);

export default router;
