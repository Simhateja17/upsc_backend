import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { signupBody, loginBody } from "../validators/auth.validators";
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

// Public routes (rate limited + Zod validated)
router.post("/signup", authLimiter, validate({ body: signupBody }), signup);
router.post("/login", authLimiter, validate({ body: loginBody }), login);
router.post("/refresh", authLimiter, refreshToken);
router.get("/google", googleAuth);
router.post("/callback", authLimiter, authCallback);

// Protected routes
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

export default router;
