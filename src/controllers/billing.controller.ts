import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ==================== USER BILLING APIs ====================

/**
 * GET /api/billing/subscription
 * Get current user's active subscription
 */
export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["active", "pending"] },
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    res.json({ status: "success", data: subscription });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/history
 * Get user's billing history (payments + orders)
 */
export const getBillingHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [payments, subscriptions] = await Promise.all([
      prisma.payment.findMany({
        where: { userId, status: { in: ["success", "refunded"] } },
        orderBy: { createdAt: "desc" },
        include: { order: { include: { plan: true } }, subscription: { include: { plan: true } } },
      }),
      prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { plan: true, payments: true },
      }),
    ]);

    const history = payments.map((p) => ({
      id: p.id,
      date: p.paidAt || p.createdAt,
      plan: p.order?.plan?.name || p.subscription?.plan?.name || "Unknown",
      amount: `₹${p.amount.toLocaleString()}`,
      status: p.status,
      receiptUrl: p.receiptUrl,
      providerPaymentId: p.providerPaymentId,
    }));

    res.json({ status: "success", data: { history, subscriptions } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/order
 * Create a new order for a plan
 */
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ status: "error", message: "planId is required" });
    }

    const plan = await prisma.pricingPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return res.status(404).json({ status: "error", message: "Plan not found or inactive" });
    }

    // Check if user already has an active subscription for this plan
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId,
        planId,
        status: "active",
        endDate: { gte: new Date() },
      },
    });

    if (existingSub) {
      return res.status(400).json({ status: "error", message: "You already have an active subscription for this plan" });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        planId,
        amount: plan.price,
        status: "pending",
      },
      include: { plan: true },
    });

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/payment/initiate
 * Initiate a payment for an order (returns mock data for now - integrate Razorpay/Stripe later)
 */
export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ status: "error", message: "orderId is required" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { plan: true },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: "error", message: "Order is not pending" });
    }

    // Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        amount: order.amount,
        currency: "INR",
        status: "pending",
        provider: "razorpay",
      },
    });

    // TODO: Integrate actual Razorpay/Stripe here
    // For now, return mock payment details
    res.json({
      status: "success",
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: order.amount,
        currency: "INR",
        provider: "razorpay",
        // Mock key and order details - replace with actual gateway integration
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
        providerOrderId: `order_${Date.now()}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/payment/verify
 * Verify payment and activate subscription
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { paymentId, providerPaymentId, status } = req.body;

    if (!paymentId || !status) {
      return res.status(400).json({ status: "error", message: "paymentId and status are required" });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { order: { include: { plan: true } } },
    });

    if (!payment) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    if (status === "success") {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (payment.order?.plan?.durationDays || 90));

      // Update payment
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "success",
          providerPaymentId: providerPaymentId || `pay_${Date.now()}`,
          paidAt: now,
        },
      });

      // Update order
      if (payment.orderId) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "completed" },
        });
      }

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: payment.order!.planId,
          status: "active",
          startDate: now,
          endDate,
          autoRenew: true,
        },
        include: { plan: true },
      });

      // Update payment with subscription link
      await prisma.payment.update({
        where: { id: paymentId },
        data: { subscriptionId: subscription.id },
      });

      return res.json({
        status: "success",
        data: { subscription, payment },
        message: "Payment successful! Your subscription is now active.",
      });
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "failed",
          failedAt: new Date(),
          failureReason: req.body.failureReason || "Payment failed",
        },
      });

      if (payment.orderId) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "failed" },
        });
      }

      return res.status(400).json({
        status: "error",
        message: req.body.failureReason || "Payment failed",
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/subscription/cancel
 * Cancel active subscription
 */
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { subscriptionId } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId, status: "active" },
    });

    if (!subscription) {
      return res.status(404).json({ status: "error", message: "Active subscription not found" });
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "cancelled",
        autoRenew: false,
        cancelledAt: new Date(),
      },
    });

    res.json({ status: "success", message: "Subscription cancelled. You will have access until the end date." });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN BILLING APIs ====================

/**
 * GET /api/admin/billing/subscriptions
 * List all subscriptions
 */
export const getAllSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          plan: true,
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({ status: "success", data: { subscriptions, total, page, limit } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/billing/orders
 * List all orders
 */
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          plan: true,
          payments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ status: "success", data: { orders, total, page, limit } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/billing/payments
 * List all payments
 */
export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          order: { include: { plan: true } },
          subscription: { include: { plan: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ status: "success", data: { payments, total, page, limit } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/billing/subscriptions/:id/extend
 * Admin: Extend a subscription
 */
export const extendSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({ status: "error", message: "Valid days required" });
    }

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      return res.status(404).json({ status: "error", message: "Subscription not found" });
    }

    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + Number(days));

    await prisma.subscription.update({
      where: { id },
      data: { endDate: newEndDate, status: "active" },
    });

    res.json({ status: "success", message: `Subscription extended by ${days} days` });
  } catch (error) {
    next(error);
  }
};
