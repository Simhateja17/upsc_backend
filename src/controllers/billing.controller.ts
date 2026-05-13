import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── GET /api/billing/subscription ───────────────────────────────────────────

export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Find the user's most recent paid order
    const order = await prisma.order.findFirst({
      where: { userId, status: "paid" },
      orderBy: { updatedAt: "desc" },
    });

    if (!order) {
      return res.json({
        status: "success",
        data: null,
      });
    }

    res.json({
      status: "success",
      data: {
        id: order.id,
        status: order.status,
        plan: {
          id: order.itemId,
          name: order.itemName,
          price: order.amount / 100, // Convert paise to rupees
          duration: "",
          features: [],
          isPopular: false,
        },
        currentPeriodEnd: null,
        endDate: null,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({ status: "success", data: null });
    }
    next(error);
  }
};

// ── POST /api/billing/order ─────────────────────────────────────────────────

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ status: "error", message: "planId is required" });
    }

    // Look up the plan to get the price
    const plan = await prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      // Fallback: use planId as a numeric price
      const amount = parseInt(planId) * 100 || 499900; // Default to 4999 INR in paise
      const order = await prisma.order.create({
        data: {
          userId,
          itemType: "plan",
          itemId: planId,
          itemName: "Subscription Plan",
          amount,
          status: "pending",
        },
      });

      return res.status(201).json({
        status: "success",
        data: {
          id: order.id,
          status: order.status,
          amount: order.amount / 100,
          currency: "INR",
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        itemType: "plan",
        itemId: plan.id,
        itemName: plan.name,
        amount: plan.price * 100, // Convert rupees to paise
        status: "pending",
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        id: order.id,
        status: order.status,
        amount: order.amount / 100,
        currency: "INR",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Billing service not yet available" });
    }
    next(error);
  }
};

// ── POST /api/billing/payment/initiate ──────────────────────────────────────

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ status: "error", message: "orderId is required" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Return a mock payment initiation (Razorpay/UPI integration would go here)
    res.json({
      status: "success",
      data: {
        paymentId: `pay_${Date.now()}`,
        orderId: order.id,
        amount: order.amount / 100,
        currency: "INR",
        provider: "razorpay",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Payment service not yet available" });
    }
    next(error);
  }
};

// ── POST /api/billing/payment/verify ────────────────────────────────────────

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { paymentId, providerPaymentId, status } = req.body;

    if (!paymentId || !providerPaymentId || !status) {
      return res.status(400).json({ status: "error", message: "paymentId, providerPaymentId, and status are required" });
    }

    // Find the order associated with this payment
    const order = await prisma.order.findFirst({
      where: { userId, paymentId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: status === "success" ? "paid" : "failed",
          paymentMethod: "razorpay",
          paymentId: providerPaymentId,
        },
      });
    }

    res.json({
      status: "success",
      data: {
        subscription: status === "success"
          ? {
              id: order?.id || paymentId,
              status: "active",
              plan: null,
              currentPeriodEnd: null,
              endDate: null,
            }
          : null,
        payment: {
          paymentId,
          providerPaymentId,
          status,
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.status(503).json({ status: "error", message: "Payment verification not yet available" });
    }
    next(error);
  }
};
