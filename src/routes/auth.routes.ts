import { Router } from "express";
import {
  signup,
  login,
  getMe,
  logout,
  refreshToken,
  googleAuth,
  authCallback,
} from "../controllers/auth.controller";

const router = Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/google", googleAuth);
router.post("/callback", authCallback);

// Protected routes
router.get("/me", getMe);
router.post("/logout", logout);

export default router;
