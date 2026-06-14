import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import {
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
} from "../services/razorpayGateway.service";

type TestSeriesCheckoutRow = {
  id: string;
  title: string;
  price_inr: number | null;
  price: number | null;
  published: boolean | null;
  listing_status: string | null;
  total_tests: number | null;
  compare_at_price_inr: number | null;
};
type TestSeriesPaymentMetadata = {
  itemType?: string;
  itemId?: string;
  itemName?: string;
};

function normalizePlanAmountInRupees(amount: number) {
  return amount >= 10000 ? Math.round(amount / 100) : amount;
}

function getRazorpayErrorStatus(error: unknown) {
  const statusCode = (error as { statusCode?: number; status?: number })?.statusCode || (error as { status?: number })?.status;
  if (statusCode === 401) return 401;
  if (statusCode === 400) return 400;
  return 500;
}

function getRazorpayErrorMessage(error: unknown, fallback: string) {
  const razorpayError = error as {
    message?: string;
    statusCode?: number;
    status?: number;
    error?: { description?: string; reason?: string; code?: string };
  };
  const statusCode = razorpayError.statusCode || razorpayError.status;

  if (statusCode === 401) {
    return "Razorpay authentication failed. Check backend RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then restart the backend with updated env.";
  }

  return razorpayError.error?.description || razorpayError.message || fallback;
}

function getTestSeriesPaymentMetadata(payment: { metadata?: unknown | null }): TestSeriesPaymentMetadata | null {
  const metadata = payment.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const parsed = metadata as TestSeriesPaymentMetadata;
  return parsed.itemType === "test_series" && parsed.itemId ? parsed : null;
}

async function getTestSeriesForCheckout(seriesId: string): Promise<TestSeriesCheckoutRow | null> {
  const rows = await prisma.$queryRaw<TestSeriesCheckoutRow[]>`
    SELECT id, title, price_inr, price, published, listing_status, total_tests, compare_at_price_inr
    FROM public.test_series
    WHERE id = ${seriesId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function ensureTestSeriesEnrollment(userSupabaseId: string, seriesId: string, tx: { $executeRaw: typeof prisma.$executeRaw } = prisma) {
  await tx.$executeRaw`
    INSERT INTO public.test_series_enrollments (user_id, series_id)
    VALUES (${userSupabaseId}, ${seriesId})
    ON CONFLICT (user_id, series_id) DO NOTHING
  `;
}

async function hasTestSeriesEnrollment(userSupabaseId: string, seriesId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM public.test_series_enrollments
    WHERE user_id = ${userSupabaseId} AND series_id = ${seriesId}
    LIMIT 1
  `;
  return rows.length > 0;
}

// ==================== USER BILLING APIs ====================

/**
 * GET /api/billing/subscription
 * Get current user's active subscription
 */
export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ["active", "pending", "cancelled", "paused", "past_due", "halted", "failed"] },
      },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });
    const subscription =
      subscriptions.find((sub) => ["active", "cancelled", "paused"].includes(sub.status) && sub.endDate >= now) ||
      subscriptions.find((sub) => ["past_due", "halted"].includes(sub.status) && sub.graceEndsAt && sub.graceEndsAt >= now) ||
      subscriptions[0] ||
      null;

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
      plan: p.order?.plan?.name || p.subscription?.plan?.name || getTestSeriesPaymentMetadata(p)?.itemName || "Unknown",
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
export const createOrder = async (_req: Request, res: Response) => {
  return res.status(410).json({
    status: "error",
    message: "Paid plan checkout now uses Razorpay Subscriptions. Use /api/billing/subscriptions/create.",
  });
};

/**
 * POST /api/billing/payment/initiate
 * Create a Razorpay Standard Checkout order for a billing order.
 */
export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { orderId, planId, planKey, cycle, itemType, itemId } = req.body;

    if (itemType === "test_series") {
      if (!itemId || typeof itemId !== "string") {
        return res.status(400).json({ status: "error", message: "itemId is required for test series checkout" });
      }

      const series = await getTestSeriesForCheckout(itemId);
      if (!series || !series.published || series.listing_status !== "open") {
        return res.status(404).json({ status: "error", message: "Test series not found or not available for purchase" });
      }

      const amount = Number(series.price_inr ?? series.price ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ status: "error", message: "This test series does not require payment" });
      }

      if (await hasTestSeriesEnrollment(req.user!.supabaseId, itemId)) {
        return res.json({
          status: "success",
          data: {
            alreadyPurchased: true,
            seriesId: itemId,
            itemName: series.title,
          },
          message: "You already have access to this test series.",
        });
      }

      const successfulPayments = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM public.payments
        WHERE user_id = ${userId}
          AND provider = 'razorpay'
          AND status = 'success'
          AND metadata->>'itemType' = 'test_series'
          AND metadata->>'itemId' = ${itemId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (successfulPayments.length > 0) {
        await ensureTestSeriesEnrollment(req.user!.supabaseId, itemId);
        return res.json({
          status: "success",
          data: {
            alreadyPurchased: true,
            seriesId: itemId,
            itemName: series.title,
          },
          message: "You already have access to this test series.",
        });
      }

      const reusablePayments = await prisma.$queryRaw<Array<{
        id: string;
        amount: number;
        currency: string;
        provider_order_id: string;
      }>>`
        SELECT id, amount, currency, provider_order_id
        FROM public.payments
        WHERE user_id = ${userId}
          AND provider = 'razorpay'
          AND status = 'pending'
          AND amount = ${amount}
          AND metadata->>'itemType' = 'test_series'
          AND metadata->>'itemId' = ${itemId}
          AND provider_order_id IS NOT NULL
          AND created_at > now() - interval '30 minutes'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const reusablePayment = reusablePayments[0];
      if (reusablePayment) {
        return res.json({
          status: "success",
          data: {
            paymentId: reusablePayment.id,
            amount: reusablePayment.amount * 100,
            currency: reusablePayment.currency,
            provider: "razorpay",
            key: process.env.RAZORPAY_KEY_ID,
            providerOrderId: reusablePayment.provider_order_id,
            order_id: reusablePayment.provider_order_id,
            itemType: "test_series",
            itemId,
            itemName: series.title,
          },
        });
      }

      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency: "INR",
          status: "pending",
          provider: "razorpay",
          metadata: {
            itemType: "test_series",
            itemId,
            itemName: series.title,
          },
        },
      });

      const razorpayOrder = await createRazorpayOrder({
        amount: amount * 100,
        currency: "INR",
        receipt: payment.id,
        notes: {
          localPaymentId: payment.id,
          itemType: "test_series",
          itemId,
          userId,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerOrderId: razorpayOrder.id },
      });

      return res.json({
        status: "success",
        data: {
          paymentId: payment.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          provider: "razorpay",
          key: process.env.RAZORPAY_KEY_ID,
          providerOrderId: razorpayOrder.id,
          order_id: razorpayOrder.id,
          itemType: "test_series",
          itemId,
          itemName: series.title,
        },
      });
    }

    if (!itemType || itemType !== "test_series") {
      return res.status(410).json({
        status: "error",
        message: "Paid plan checkout now uses Razorpay Subscriptions. Use /api/billing/subscriptions/create.",
      });
    }

    let order = orderId
      ? await prisma.order.findFirst({
          where: { id: orderId, userId },
          include: { plan: true },
        })
      : null;

    if (!order) {
      const plan = planId
        ? await prisma.pricingPlan.findFirst({ where: { id: planId, isActive: true } })
        : planKey && cycle
          ? await prisma.pricingPlan.findFirst({
              where: {
                tier: String(planKey).toLowerCase(),
                billingCycle: String(cycle).toLowerCase(),
                isActive: true,
              },
              orderBy: { order: "asc" },
            })
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

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: razorpayOrder.id },
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
      console.error("[Billing] Razorpay order creation failed:", {
        statusCode,
        message: getRazorpayErrorMessage(error, "Unable to create Razorpay order"),
      });
      return res.status(statusCode).json({
        status: "error",
        message: getRazorpayErrorMessage(error, "Unable to create Razorpay order"),
      });
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
      if (payment.status === "success") {
        return res.json({
          status: "success",
          data: { payment },
          message: "Payment was already verified.",
        });
      }

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

    if (payment.status === "success") {
      const testSeriesMetadata = getTestSeriesPaymentMetadata(payment);
      if (testSeriesMetadata) {
        await ensureTestSeriesEnrollment(req.user!.supabaseId, testSeriesMetadata.itemId!);
      }
      return res.json({
        status: "success",
        data: {
          payment,
          itemType: testSeriesMetadata?.itemType,
          itemId: testSeriesMetadata?.itemId,
          itemName: testSeriesMetadata?.itemName,
        },
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

    const [razorpayOrder, razorpayPayment] = await Promise.all([
      fetchRazorpayOrder(razorpay_order_id),
      fetchRazorpayPayment(razorpay_payment_id),
    ]);
    if (
      razorpayOrder.receipt !== payment.id ||
      Number(razorpayOrder.amount) !== payment.amount * 100 ||
      razorpayOrder.currency !== payment.currency ||
      (payment.providerOrderId && razorpayOrder.id !== payment.providerOrderId)
    ) {
      return res.status(400).json({ status: "error", message: "Payment order details do not match" });
    }
    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      Number(razorpayPayment.amount) !== payment.amount * 100 ||
      razorpayPayment.currency !== payment.currency ||
      !["authorized", "captured"].includes(razorpayPayment.status)
    ) {
      return res.status(400).json({ status: "error", message: "Payment details do not match or payment is not authorized" });
    }

    const testSeriesMetadata = getTestSeriesPaymentMetadata(payment);
    if (testSeriesMetadata) {
      const now = new Date();
      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "success",
            providerPaymentId: providerPaymentId || razorpay_payment_id,
            providerOrderId: razorpay_order_id,
            paidAt: now,
          },
        });

        await ensureTestSeriesEnrollment(req.user!.supabaseId, testSeriesMetadata.itemId!, tx);

        return {
          payment: updatedPayment,
          itemType: "test_series",
          itemId: testSeriesMetadata.itemId,
          itemName: testSeriesMetadata.itemName,
        };
      });

      return res.json({
        status: "success",
        data: result,
        message: "Payment successful! Your test series is now unlocked.",
      });
    }

    if (!payment.order) {
      return res.status(400).json({ status: "error", message: "Payment is not linked to a billing order" });
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
      console.error("[Billing] Razorpay payment verification failed:", {
        statusCode,
        message: getRazorpayErrorMessage(error, "Unable to verify payment"),
      });
      return res.status(statusCode).json({
        status: "error",
        message: getRazorpayErrorMessage(error, "Unable to verify payment"),
      });
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
