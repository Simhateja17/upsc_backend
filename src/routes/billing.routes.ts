import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminAuth";
import {
  getSubscription,
  getBillingHistory,
  createOrder,
  initiatePayment,
  verifyPayment,
  cancelSubscription,
  getAllSubscriptions,
  getAllOrders,
  getAllPayments,
  extendSubscription,
} from "../controllers/billing.controller";

const router = Router();

// ==================== User Billing Routes ====================
router.get("/subscription", authenticate, getSubscription);
router.get("/history", authenticate, getBillingHistory);
router.post("/order", authenticate, createOrder);
router.post("/payment/initiate", authenticate, initiatePayment);
router.post("/payment/verify", authenticate, verifyPayment);
router.post("/subscription/cancel", authenticate, cancelSubscription);

// ==================== Admin Billing Routes ====================
router.get("/admin/subscriptions", authenticate, requireAdmin, getAllSubscriptions);
router.get("/admin/orders", authenticate, requireAdmin, getAllOrders);
router.get("/admin/payments", authenticate, requireAdmin, getAllPayments);
router.post("/admin/subscriptions/:id/extend", authenticate, requireAdmin, extendSubscription);

export default router;
