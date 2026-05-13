import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSubscription,
  createOrder,
  initiatePayment,
  verifyPayment,
} from "../controllers/billing.controller";

const router = Router();

// All billing routes require authentication
router.use(authenticate);

router.get("/subscription", getSubscription);
router.post("/order", createOrder);
router.post("/payment/initiate", initiatePayment);
router.post("/payment/verify", verifyPayment);

export default router;
