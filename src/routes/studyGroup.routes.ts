import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAccess } from "../middleware/entitlements.middleware";
import {
  getGroups,
  getGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  getMessages,
  postMessage,
  getMyGroups,
  getGoals,
  addGoal,
  toggleGoal,
  getMemberTimes,
  postFocusTime,
} from "../controllers/studyGroup.controller";

const router = Router();

// All study-group routes require authentication
router.use(authenticate, requireAccess("live_study_room", ["full"]));

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

// Room goals
router.get("/:id/goals", getGoals);
router.post("/:id/goals", addGoal);
router.post("/:id/goals/:goalId/toggle", toggleGoal);

// Room-scoped focus time
router.get("/:id/member-times", getMemberTimes);
router.post("/:id/focus-time", postFocusTime);

export default router;
