import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  createRazorpayOrder,
  fetchRazorpayOrder,
  verifyRazorpaySignature,
} from "../services/razorpayGateway.service";

type BillingCycle = "monthly" | "quarterly" | "yearly";
type CheckoutPlanKey = "rise" | "ascent";

const CHECKOUT_PLAN_CATALOG: Record<CheckoutPlanKey, Record<BillingCycle, { amount: number; durationDays: number; duration: string }>> = {
  rise: {
    monthly: { amount: 499, durationDays: 30, duration: "1 month" },
    quarterly: { amount: 1197, durationDays: 90, duration: "3 months" },
    yearly: { amount: 3588, durationDays: 365, duration: "12 months" },
  },
  ascent: {
    monthly: { amount: 999, durationDays: 30, duration: "1 month" },
    quarterly: { amount: 2397, durationDays: 90, duration: "3 months" },
    yearly: { amount: 7188, durationDays: 365, duration: "12 months" },
  },
};

function normalizeCycle(value: unknown): BillingCycle {
  return value === "quarterly" || value === "yearly" ? value : "monthly";
}

function normalizePlanKey(value: unknown): CheckoutPlanKey | null {
  return value === "rise" || value === "ascent" ? value : null;
}

function normalizePlanAmountInRupees(amount: number) {
  return amount >= 10000 ? Math.round(amount / 100) : amount;
}

async function findOrCreateCheckoutPlan(planKey: CheckoutPlanKey, cycle: BillingCycle) {
  const expected = CHECKOUT_PLAN_CATALOG[planKey][cycle];
  const checkoutPlanName = `${planKey === "rise" ? "Rise" : "Ascent"} ${cycle.charAt(0).toUpperCase()}${cycle.slice(1)}`;
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const matchingPlan = plans.find((plan) => {
    const exactGeneratedName = plan.name.toLowerCase() === checkoutPlanName.toLowerCase();
    const amountMatches = normalizePlanAmountInRupees(plan.price) === expected.amount;
    return exactGeneratedName && amountMatches;
  }) || plans.find((plan) => {
    const nameMatches = plan.name.toLowerCase().includes(planKey);
    const durationMatches = plan.durationDays === expected.durationDays || plan.duration.toLowerCase().includes(cycle);
    const amountMatches = normalizePlanAmountInRupees(plan.price) === expected.amount;
    return nameMatches && durationMatches && amountMatches;
  });

  if (matchingPlan) return matchingPlan;

  return prisma.pricingPlan.create({
    data: {
      name: checkoutPlanName,
      price: expected.amount,
      duration: expected.duration,
      durationDays: expected.durationDays,
      features: planKey === "rise"
        ? ["AI evaluations", "Mock tests", "Revision suite", "Jeet AI"]
        : ["Unlimited evaluations", "Weekly mentorship", "Personalised roadmap", "Priority support"],
      isPopular: planKey === "rise",
      order: planKey === "rise" ? 20 : 30,
      isActive: true,
    },
  });
}

function getRazorpayErrorStatus(error: unknown) {
  const statusCode = (error as { statusCode?: number; status?: number })?.statusCode || (error as { status?: number })?.status;
  if (statusCode === 401) return 401;
  if (statusCode === 400) return 400;
  return 500;
}

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
        amount: normalizePlanAmountInRupees(plan.price),
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
 * Create a Razorpay Standard Checkout order for a billing order.
 */
export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { orderId, planId, planKey: rawPlanKey, cycle: rawCycle } = req.body;

    let order = orderId
      ? await prisma.order.findFirst({
          where: { id: orderId, userId },
          include: { plan: true },
        })
      : null;

    if (!order) {
      const cycle = normalizeCycle(rawCycle);
      const planKey = normalizePlanKey(rawPlanKey);
      const plan = planId
        ? await prisma.pricingPlan.findFirst({ where: { id: planId, isActive: true } })
        : planKey
          ? await findOrCreateCheckoutPlan(planKey, cycle)
          : null;

      if (!plan) {
        return res.status(404).json({ status: "error", message: "Active billing plan not found" });
      }

      const existingSub = await prisma.subscription.findFirst({
        where: {
          userId,
          planId: plan.id,
          status: "active",
          endDate: { gte: new Date() },
        },
      });

      if (existingSub) {
        return res.status(400).json({ status: "error", message: "You already have an active subscription for this plan" });
      }

      order = await prisma.order.create({
        data: {
          userId,
          planId: plan.id,
          amount: normalizePlanAmountInRupees(plan.price),
          status: "pending",
        },
        include: { plan: true },
      });
    }

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: "error", message: "Order is not pending" });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount: order.amount,
        currency: "INR",
        status: "pending",
        provider: "razorpay",
      },
    });

    const razorpayOrder = await createRazorpayOrder({
      amount: order.amount * 100,
      currency: "INR",
      receipt: payment.id,
      notes: {
        localOrderId: order.id,
        localPaymentId: payment.id,
        planId: order.planId,
        userId,
      },
    });

    res.json({
      status: "success",
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        provider: "razorpay",
        key: process.env.RAZORPAY_KEY_ID,
        providerOrderId: razorpayOrder.id,
        order_id: razorpayOrder.id,
      },
    });
  } catch (error) {
    const statusCode = getRazorpayErrorStatus(error);
    if (statusCode !== 500) {
      return res.status(statusCode).json({ status: "error", message: (error as Error).message || "Unable to create Razorpay order" });
    }
    next(error);
  }
};

/**
 * POST /api/billing/payment/verify
 * Verify Razorpay signature and activate subscription
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      paymentId,
      providerPaymentId,
      status,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      failureReason,
    } = req.body;

    if (!paymentId) {
      return res.status(400).json({ status: "error", message: "paymentId is required" });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { order: { include: { plan: true } } },
    });

    if (!payment) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    if (status === "failed") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "failed",
          failedAt: new Date(),
          failureReason: failureReason || "Payment failed",
        },
      });

      if (payment.orderId) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "failed" },
        });
      }

      return res.status(400).json({ status: "error", message: failureReason || "Payment failed" });
    }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "razorpay_payment_id, razorpay_order_id, and razorpay_signature are required",
      });
    }

    if (!payment.order) {
      return res.status(400).json({ status: "error", message: "Payment is not linked to a billing order" });
    }

    if (payment.status === "success") {
      return res.json({
        status: "success",
        data: { payment },
        message: "Payment was already verified.",
      });
    }

    const validSignature = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!validSignature) {
      return res.status(400).json({ status: "error", message: "Invalid payment signature" });
    }

    const razorpayOrder = await fetchRazorpayOrder(razorpay_order_id);
    if (
      razorpayOrder.receipt !== payment.id ||
      Number(razorpayOrder.amount) !== payment.amount * 100 ||
      razorpayOrder.currency !== payment.currency
    ) {
      return res.status(400).json({ status: "error", message: "Payment order details do not match" });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (payment.order.plan.durationDays || 90));

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "success",
          providerPaymentId: providerPaymentId || razorpay_payment_id,
          paidAt: now,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId! },
        data: { status: "completed" },
      });

      const subscription = await tx.subscription.create({
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

      const linkedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { subscriptionId: subscription.id },
      });

      return { subscription, payment: { ...updatedPayment, subscriptionId: linkedPayment.subscriptionId } };
    });

    return res.json({
      status: "success",
      data: result,
      message: "Payment successful! Your subscription is now active.",
    });
  } catch (error) {
    const statusCode = getRazorpayErrorStatus(error);
    if (statusCode !== 500) {
      return res.status(statusCode).json({ status: "error", message: (error as Error).message || "Unable to verify payment" });
    }
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
