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
import {
  cancelSubscriptionAutopay,
  createSubscriptionCheckout,
  pauseSubscriptionAutopay,
  resumeSubscriptionAutopay,
  verifySubscriptionCheckout,
} from "../controllers/razorpaySubscriptions.controller";

const router = Router();

// ==================== User Billing Routes ====================
router.get("/subscription", authenticate, getSubscription);
router.get("/history", authenticate, getBillingHistory);
router.post("/order", authenticate, createOrder);
router.post("/payment/initiate", authenticate, initiatePayment);
router.post("/payment/verify", authenticate, verifyPayment);
router.post("/subscription/cancel", authenticate, cancelSubscription);
router.post("/subscriptions/create", authenticate, createSubscriptionCheckout);
router.post("/subscriptions/verify", authenticate, verifySubscriptionCheckout);
router.post("/subscriptions/:id/cancel", authenticate, cancelSubscriptionAutopay);
router.post("/subscriptions/:id/pause", authenticate, pauseSubscriptionAutopay);
router.post("/subscriptions/:id/resume", authenticate, resumeSubscriptionAutopay);

// ==================== Admin Billing Routes ====================
router.get("/admin/subscriptions", authenticate, requireAdmin, getAllSubscriptions);
router.get("/admin/orders", authenticate, requireAdmin, getAllOrders);
router.get("/admin/payments", authenticate, requireAdmin, getAllPayments);
router.post("/admin/subscriptions/:id/extend", authenticate, requireAdmin, extendSubscription);

export default router;
