import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { getEntitlementSummary } from "../services/entitlements.service";
import {
  BillingCycle,
  PlanTier,
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  fallbackEndDateFromCycle,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  getRazorpayKeyId,
  pauseRazorpaySubscription,
  resumeRazorpaySubscription,
  unixToDate,
  verifySubscriptionCheckoutSignature,
  verifyWebhookSignature,
} from "../services/razorpaySubscription.service";

const TIER_RANK: Record<"free" | PlanTier, number> = { free: 0, aspire: 1, rise: 2, ascent: 3 };
const BILLING_STATUSES = ["active", "cancelled", "paused", "past_due", "halted"];

function normalizeTier(value: unknown): PlanTier | null {
  const tier = String(value || "").toLowerCase();
  return tier === "aspire" || tier === "rise" || tier === "ascent" ? tier : null;
}

function normalizeCycle(value: unknown): BillingCycle | null {
  const cycle = String(value || "").toLowerCase();
  return cycle === "monthly" || cycle === "quarterly" || cycle === "yearly" ? cycle : null;
}

function planAmountRupees(amount: number) {
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

function isSubscriptionAccessValid(subscription: {
  status: string;
  endDate: Date;
  graceEndsAt?: Date | null;
}) {
  const now = new Date();
  if (["active", "cancelled", "paused"].includes(subscription.status)) return subscription.endDate > now;
  if (["past_due", "halted"].includes(subscription.status)) return Boolean(subscription.graceEndsAt && subscription.graceEndsAt > now);
  return false;
}

async function getCurrentBillingSubscription(userId: string) {
  const candidates = await prisma.subscription.findMany({
    where: { userId, status: { in: BILLING_STATUSES } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return candidates
    .filter(isSubscriptionAccessValid)
    .sort((a, b) => {
      const rankDelta = TIER_RANK[normalizeTier(b.plan.tier) || "free"] - TIER_RANK[normalizeTier(a.plan.tier) || "free"];
      return rankDelta || b.createdAt.getTime() - a.createdAt.getTime();
    })[0] || null;
}

async function validateCoupon(params: {
  code?: string;
  userId: string;
  planTier: PlanTier;
  cycle: BillingCycle;
  isUpgrade: boolean;
}) {
  const code = params.code?.trim().toUpperCase();
  if (!code) return null;
  if (params.isUpgrade) {
    const error = new Error("Coupons are available only for first paid purchases, not upgrades.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const now = new Date();
  const coupon = await prisma.subscriptionCoupon.findFirst({ where: { code, isActive: true } });
  if (!coupon) {
    const error = new Error("Invalid or expired coupon code.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    const error = new Error("This coupon is not active yet.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    const error = new Error("This coupon has expired.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    const error = new Error("This coupon has reached its redemption limit.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.allowedTiers.length > 0 && !coupon.allowedTiers.includes(params.planTier)) {
    const error = new Error("This coupon is not valid for the selected plan.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.allowedBillingCycles.length > 0 && !coupon.allowedBillingCycles.includes(params.cycle)) {
    const error = new Error("This coupon is not valid for the selected billing cycle.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.maxRedemptionsPerUser !== null) {
    const userRedemptions = await prisma.subscriptionCouponRedemption.count({
      where: { couponId: coupon.id, userId: params.userId, status: "redeemed" },
    });
    if (userRedemptions >= coupon.maxRedemptionsPerUser) {
      const error = new Error("You have already used this coupon.");
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }
  }

  return coupon;
}

function subscriptionPeriodData(razorpaySubscription: any, fallbackStart: Date, cycle: BillingCycle) {
  const currentStart = unixToDate(razorpaySubscription?.current_start) || fallbackStart;
  const currentEnd = unixToDate(razorpaySubscription?.current_end) || fallbackEndDateFromCycle(currentStart, cycle);
  return {
    currentStart,
    currentEnd,
    chargeAt: unixToDate(razorpaySubscription?.charge_at),
    endDate: currentEnd,
  };
}

async function supersedeLowerSubscription(newSubscriptionId: string) {
  const newSub = await prisma.subscription.findUnique({
    where: { id: newSubscriptionId },
    include: { plan: true },
  });
  const upgradeFromSubscriptionId =
    newSub?.metadata && typeof newSub.metadata === "object" && !Array.isArray(newSub.metadata)
      ? String((newSub.metadata as Record<string, unknown>).upgradeFromSubscriptionId || "")
      : "";

  if (!newSub || !upgradeFromSubscriptionId) return;

  const oldSub = await prisma.subscription.findUnique({ where: { id: upgradeFromSubscriptionId } });
  if (!oldSub || oldSub.status === "superseded") return;

  if (oldSub.razorpaySubscriptionId) {
    await cancelRazorpaySubscription(oldSub.razorpaySubscriptionId, true).catch((error) => {
      console.warn("[Billing] Failed to cancel superseded Razorpay subscription", {
        subscriptionId: oldSub.id,
        razorpaySubscriptionId: oldSub.razorpaySubscriptionId,
        message: error?.message,
      });
    });
  }

  await prisma.subscription.update({
    where: { id: oldSub.id },
    data: {
      status: "superseded",
      autoRenew: false,
      supersededAt: new Date(),
      supersededBySubscriptionId: newSub.id,
    },
  });
}

async function markCouponRedeemed(subscriptionId: string, paymentId?: string) {
  const pending = await prisma.subscriptionCouponRedemption.findFirst({
    where: { subscriptionId, status: "pending" },
  });
  if (!pending) return;

  await prisma.$transaction([
    prisma.subscriptionCouponRedemption.update({
      where: { id: pending.id },
      data: { status: "redeemed", paymentId, redeemedAt: new Date() },
    }),
    prisma.subscriptionCoupon.update({
      where: { id: pending.couponId },
      data: { redeemedCount: { increment: 1 } },
    }),
  ]);
}

async function recordSubscriptionPayment(params: {
  userId: string;
  subscriptionId: string;
  payment: any;
  webhookEventId?: string;
}) {
  const providerPaymentId = params.payment?.id;
  if (!providerPaymentId) return null;
  const existing = await prisma.payment.findFirst({ where: { providerPaymentId, provider: "razorpay" } });
  if (existing) return existing;

  const amount = Math.round(Number(params.payment.amount || 0) / 100);
  return prisma.payment.create({
    data: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      amount,
      currency: params.payment.currency || "INR",
      status: params.payment.status === "captured" || params.payment.status === "authorized" ? "success" : "failed",
      provider: "razorpay",
      providerPaymentId,
      providerOrderId: params.payment.order_id || undefined,
      paidAt: params.payment.status === "captured" || params.payment.status === "authorized" ? new Date() : undefined,
      failedAt: params.payment.status === "failed" ? new Date() : undefined,
      failureReason: params.payment.error_description || params.payment.error_reason || undefined,
      metadata: {
        razorpaySubscriptionId: params.payment.subscription_id,
        razorpayInvoiceId: params.payment.invoice_id,
        webhookEventId: params.webhookEventId,
      },
    },
  });
}

async function activateFromRazorpaySubscription(localSubscriptionId: string, razorpaySubscription: any, payment?: any, webhookEventId?: string) {
  const existing = await prisma.subscription.findUnique({
    where: { id: localSubscriptionId },
    include: { plan: true },
  });
  if (!existing) return null;

  const cycle = normalizeCycle(existing.plan.billingCycle) || "monthly";
  const now = new Date();
  const period = subscriptionPeriodData(razorpaySubscription, now, cycle);
  const paymentRow = payment
    ? await recordSubscriptionPayment({ userId: existing.userId, subscriptionId: existing.id, payment, webhookEventId })
    : null;

  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "active",
      razorpayStatus: razorpaySubscription?.status || "active",
      currentStart: period.currentStart,
      currentEnd: period.currentEnd,
      chargeAt: period.chargeAt,
      startDate: existing.startDate < period.currentStart ? existing.startDate : period.currentStart,
      endDate: period.endDate,
      autoRenew: true,
      graceEndsAt: null,
      failureReason: null,
    },
    include: { plan: true },
  });

  await markCouponRedeemed(existing.id, paymentRow?.id);
  await supersedeLowerSubscription(existing.id);
  return updated;
}

async function findSubscriptionFromRazorpayEntity(entity: any) {
  const razorpaySubscriptionId = entity?.id || entity?.subscription_id;
  const notes = entity?.notes || {};
  const localSubscriptionId = notes.localSubscriptionId;

  if (localSubscriptionId) {
    const byLocal = await prisma.subscription.findUnique({ where: { id: String(localSubscriptionId) }, include: { plan: true } });
    if (byLocal) return byLocal;
  }

  if (razorpaySubscriptionId) {
    const byRazorpay = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: String(razorpaySubscriptionId) },
      include: { plan: true },
    });
    if (byRazorpay) return byRazorpay;
  }

  const userId = notes.userId;
  const planId = notes.pricingPlanId;
  if (!userId || !planId || !razorpaySubscriptionId) return null;

  const plan = await prisma.pricingPlan.findUnique({ where: { id: String(planId) } });
  if (!plan) return null;
  const now = new Date();
  const cycle = normalizeCycle(plan.billingCycle) || "monthly";
  return prisma.subscription.create({
    data: {
      userId: String(userId),
      planId: plan.id,
      status: "pending",
      startDate: now,
      endDate: now,
      autoRenew: true,
      razorpaySubscriptionId: String(razorpaySubscriptionId),
      razorpayPlanId: entity?.plan_id || plan.razorpayPlanId,
      razorpayStatus: entity?.status || "created",
      metadata: { recoveredFromWebhook: true, cycle },
    },
    include: { plan: true },
  });
}

export const createSubscriptionCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const planKey = normalizeTier(req.body.planKey);
    const cycle = normalizeCycle(req.body.cycle);
    const couponCode = typeof req.body.couponCode === "string" ? req.body.couponCode : undefined;

    if (!planKey || !cycle) {
      return res.status(400).json({ status: "error", message: "planKey and cycle are required" });
    }

    const [plan, current] = await Promise.all([
      prisma.pricingPlan.findFirst({
        where: { tier: planKey, billingCycle: cycle, isActive: true },
        orderBy: { order: "asc" },
      }),
      getCurrentBillingSubscription(userId),
    ]);

    if (!plan) return res.status(404).json({ status: "error", message: "Active billing plan not found" });
    if (!plan.razorpayPlanId) {
      return res.status(409).json({
        status: "error",
        message: "This plan is not ready for AutoPay checkout. Run billing:sync-razorpay-plans first.",
      });
    }

    const currentTier = normalizeTier(current?.plan.tier) || "free";
    const isUpgrade = TIER_RANK[currentTier] > 0;
    if (current && TIER_RANK[planKey] <= TIER_RANK[currentTier]) {
      return res.status(400).json({ status: "error", message: "Only higher-tier upgrades are available during an active billing period." });
    }

    const coupon = await validateCoupon({ code: couponCode, userId, planTier: planKey, cycle, isUpgrade });
    const now = new Date();
    const localSubscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: "pending",
        startDate: now,
        endDate: now,
        autoRenew: true,
        razorpayPlanId: plan.razorpayPlanId,
        razorpayStatus: "created",
        metadata: {
          checkoutCycle: cycle,
          requestedPlanKey: planKey,
          upgradeFromSubscriptionId: current?.id,
          couponCode: coupon?.code,
        },
      },
      include: { plan: true },
    });

    try {
      const razorpaySubscription = await createRazorpaySubscription({
        planId: plan.razorpayPlanId,
        cycle,
        offerId: coupon?.razorpayOfferId,
        notes: {
          userId,
          pricingPlanId: plan.id,
          localSubscriptionId: localSubscription.id,
          planKey,
          cycle,
          ...(coupon ? { couponCode: coupon.code } : {}),
        },
      });

      const updatedSubscription = await prisma.subscription.update({
        where: { id: localSubscription.id },
        data: {
          razorpaySubscriptionId: razorpaySubscription.id,
          razorpayStatus: razorpaySubscription.status || "created",
        },
        include: { plan: true },
      });

      if (coupon) {
        await prisma.subscriptionCouponRedemption.create({
          data: {
            couponId: coupon.id,
            userId,
            subscriptionId: updatedSubscription.id,
            status: "pending",
          },
        });
      }

      return res.status(201).json({
        status: "success",
        data: {
          subscriptionId: updatedSubscription.id,
          razorpaySubscriptionId: updatedSubscription.razorpaySubscriptionId,
          key: getRazorpayKeyId(),
          status: updatedSubscription.status,
          razorpayStatus: updatedSubscription.razorpayStatus,
        },
      });
    } catch (error) {
      await prisma.subscription.update({
        where: { id: localSubscription.id },
        data: { status: "failed", failureReason: getRazorpayErrorMessage(error, "Unable to create Razorpay subscription") },
      });
      throw error;
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode || getRazorpayErrorStatus(error);
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        status: "error",
        message: getRazorpayErrorMessage(error, error instanceof Error ? error.message : "Unable to create subscription"),
      });
    }
    next(error);
  }
};

export const verifySubscriptionCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { subscriptionId, razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!subscriptionId || !razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "subscriptionId, razorpay_payment_id, razorpay_subscription_id, and razorpay_signature are required",
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { plan: true },
    });
    if (!subscription) return res.status(404).json({ status: "error", message: "Subscription not found" });
    if (subscription.razorpaySubscriptionId && subscription.razorpaySubscriptionId !== razorpay_subscription_id) {
      return res.status(400).json({ status: "error", message: "Subscription details do not match" });
    }

    const validSignature = verifySubscriptionCheckoutSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    });
    if (!validSignature) return res.status(400).json({ status: "error", message: "Invalid subscription signature" });

    const [razorpaySubscription, razorpayPayment] = await Promise.all([
      fetchRazorpaySubscription(razorpay_subscription_id),
      fetchRazorpayPayment(razorpay_payment_id),
    ]);

    if (razorpayPayment.subscription_id && razorpayPayment.subscription_id !== razorpay_subscription_id) {
      return res.status(400).json({ status: "error", message: "Payment is not linked to this subscription" });
    }

    let updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayStatus: razorpaySubscription.status || subscription.razorpayStatus,
      },
      include: { plan: true },
    });

    if (["active", "charged"].includes(String(razorpaySubscription.status)) || razorpayPayment.status === "captured") {
      updated = await activateFromRazorpaySubscription(subscription.id, razorpaySubscription, razorpayPayment) || updated;
    } else if (razorpayPayment.status === "failed") {
      updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "failed", failureReason: razorpayPayment.error_description || "Payment failed" },
        include: { plan: true },
      });
    }

    const entitlements = await getEntitlementSummary(userId);
    const activationStatus = updated.status === "active" && entitlements.subscription?.id === updated.id ? "active" : "pending";
    return res.json({ status: "success", data: { subscription: updated, entitlements, activationStatus } });
  } catch (error) {
    const statusCode = getRazorpayErrorStatus(error);
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        status: "error",
        message: getRazorpayErrorMessage(error, "Unable to verify subscription"),
      });
    }
    next(error);
  }
};

export const cancelSubscriptionAutopay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ status: "error", message: "Subscription id is required" });
    const subscription = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!subscription) return res.status(404).json({ status: "error", message: "Subscription not found" });
    if (subscription.razorpaySubscriptionId) {
      await cancelRazorpaySubscription(subscription.razorpaySubscriptionId, true);
    }
    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: "cancelled", autoRenew: false, cancelledAt: new Date(), razorpayStatus: "cancelled" },
      include: { plan: true },
    });
    res.json({ status: "success", data: updated, message: "AutoPay cancelled. Access continues until your current period ends." });
  } catch (error) {
    next(error);
  }
};

export const pauseSubscriptionAutopay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ status: "error", message: "Subscription id is required" });
    const subscription = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!subscription) return res.status(404).json({ status: "error", message: "Subscription not found" });
    if (subscription.razorpaySubscriptionId) {
      await pauseRazorpaySubscription(subscription.razorpaySubscriptionId);
    }
    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: "paused", autoRenew: false, pausedAt: new Date(), razorpayStatus: "paused" },
      include: { plan: true },
    });
    res.json({ status: "success", data: updated, message: "AutoPay paused. Access continues until your current period ends." });
  } catch (error) {
    next(error);
  }
};

export const resumeSubscriptionAutopay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ status: "error", message: "Subscription id is required" });
    const subscription = await prisma.subscription.findFirst({ where: { id, userId }, include: { plan: true } });
    if (!subscription) return res.status(404).json({ status: "error", message: "Subscription not found" });
    const remote = subscription.razorpaySubscriptionId
      ? await resumeRazorpaySubscription(subscription.razorpaySubscriptionId)
      : null;
    const now = new Date();
    const stillValid = subscription.endDate > now;
    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: stillValid ? "active" : "pending",
        autoRenew: true,
        resumedAt: now,
        razorpayStatus: remote?.status || "resumed",
      },
      include: { plan: true },
    });
    res.json({ status: "success", data: updated, message: stillValid ? "AutoPay resumed." : "AutoPay resumed. Access will restore after the next successful charge." });
  } catch (error) {
    next(error);
  }
};

async function processSubscriptionWebhook(eventType: string, subscriptionEntity: any, eventId: string) {
  const local = await findSubscriptionFromRazorpayEntity(subscriptionEntity);
  if (!local) return;
  const now = new Date();
  const cycle = normalizeCycle(local.plan.billingCycle) || "monthly";
  const period = subscriptionPeriodData(subscriptionEntity, now, cycle);

  if (eventType === "subscription.authenticated") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: { razorpayStatus: "authenticated" },
    });
    return;
  }

  if (eventType === "subscription.activated") {
    await activateFromRazorpaySubscription(local.id, subscriptionEntity, undefined, eventId);
    return;
  }

  if (eventType === "subscription.charged") {
    const payment = subscriptionEntity?.payment_id ? await fetchRazorpayPayment(subscriptionEntity.payment_id).catch(() => null) : undefined;
    await activateFromRazorpaySubscription(local.id, subscriptionEntity, payment, eventId);
    return;
  }

  if (eventType === "subscription.pending") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: local.endDate > now ? "active" : "past_due",
        razorpayStatus: subscriptionEntity.status || "pending",
        currentStart: period.currentStart,
        currentEnd: period.currentEnd,
        chargeAt: period.chargeAt,
        endDate: local.endDate > period.endDate ? local.endDate : period.endDate,
        graceEndsAt: local.endDate > now ? local.graceEndsAt : new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    return;
  }

  if (eventType === "subscription.halted") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: "halted",
        razorpayStatus: "halted",
        graceEndsAt: local.graceEndsAt || new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    return;
  }

  if (eventType === "subscription.cancelled") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: { status: "cancelled", autoRenew: false, cancelledAt: local.cancelledAt || now, razorpayStatus: "cancelled" },
    });
    return;
  }

  if (eventType === "subscription.completed") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: { status: "completed", autoRenew: false, razorpayStatus: "completed" },
    });
    return;
  }

  if (eventType === "subscription.paused") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: { status: "paused", autoRenew: false, pausedAt: local.pausedAt || now, razorpayStatus: "paused" },
    });
    return;
  }

  if (eventType === "subscription.resumed") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: local.endDate > now ? "active" : "pending",
        autoRenew: true,
        resumedAt: now,
        razorpayStatus: subscriptionEntity.status || "resumed",
      },
    });
    return;
  }

  if (eventType === "subscription.updated") {
    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        razorpayStatus: subscriptionEntity.status || local.razorpayStatus,
        currentStart: period.currentStart,
        currentEnd: period.currentEnd,
        chargeAt: period.chargeAt,
      },
    });
  }
}

async function processPaymentWebhook(eventType: string, paymentEntity: any, eventId: string) {
  const razorpaySubscriptionId = paymentEntity?.subscription_id;
  if (!razorpaySubscriptionId) return;
  const local = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: String(razorpaySubscriptionId) },
    include: { plan: true },
  });
  if (!local) return;

  const payment = await recordSubscriptionPayment({
    userId: local.userId,
    subscriptionId: local.id,
    payment: paymentEntity,
    webhookEventId: eventId,
  });

  if (eventType === "payment.captured") {
    const remote = await fetchRazorpaySubscription(razorpaySubscriptionId).catch(() => null);
    await activateFromRazorpaySubscription(local.id, remote || { id: razorpaySubscriptionId, status: "active" }, paymentEntity, eventId);
    if (payment) await markCouponRedeemed(local.id, payment.id);
    return;
  }

  if (eventType === "payment.failed") {
    const now = new Date();
    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: local.status === "pending" ? "failed" : "past_due",
        failureReason: paymentEntity.error_description || paymentEntity.error_reason || "Payment failed",
        graceEndsAt: local.status === "pending" ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
  }
}

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
  const validSignature = verifyWebhookSignature(rawBody, req.headers["x-razorpay-signature"]);
  if (!validSignature) return res.status(400).json({ status: "error", message: "Invalid Razorpay webhook signature" });

  const payload = req.body || {};
  const eventType = String(payload.event || "");
  const subscriptionEntity = payload.payload?.subscription?.entity;
  const paymentEntity = payload.payload?.payment?.entity;
  const entity = subscriptionEntity ? "subscription" : paymentEntity ? "payment" : undefined;
  const entityId = subscriptionEntity?.id || paymentEntity?.id || undefined;
  const eventId = String(req.headers["x-razorpay-event-id"] || payload.id || `${eventType}:${entityId || "unknown"}:${payload.created_at || ""}`);

  if (!eventType) return res.status(400).json({ status: "error", message: "Webhook event is required" });

  let storedEvent;
  try {
    storedEvent = await prisma.razorpayWebhookEvent.create({
      data: {
        eventId,
        eventType,
        entity,
        entityId,
        payload,
        processingStatus: "processing",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      const existing = await prisma.razorpayWebhookEvent.findUnique({ where: { eventId } });
      if (existing?.processingStatus === "processed") {
        return res.json({ status: "success", message: "Webhook already processed" });
      }
      storedEvent = existing;
      if (storedEvent) {
        await prisma.razorpayWebhookEvent.update({
          where: { id: storedEvent.id },
          data: { processingStatus: "processing", error: null },
        });
      }
    } else {
      throw error;
    }
  }

  try {
    if (eventType.startsWith("subscription.") && subscriptionEntity) {
      await processSubscriptionWebhook(eventType, subscriptionEntity, eventId);
    } else if ((eventType === "payment.captured" || eventType === "payment.failed") && paymentEntity) {
      await processPaymentWebhook(eventType, paymentEntity, eventId);
    }

    if (storedEvent) {
      await prisma.razorpayWebhookEvent.update({
        where: { id: storedEvent.id },
        data: { processingStatus: "processed", processedAt: new Date(), error: null },
      });
    }
    return res.json({ status: "success" });
  } catch (error: any) {
    if (storedEvent) {
      await prisma.razorpayWebhookEvent.update({
        where: { id: storedEvent.id },
        data: { processingStatus: "failed", error: error?.message || "Webhook processing failed" },
      });
    }
    console.error("[Billing] Razorpay webhook failed", { eventType, eventId, message: error?.message });
    return res.status(500).json({ status: "error", message: "Webhook processing failed" });
  }
};
