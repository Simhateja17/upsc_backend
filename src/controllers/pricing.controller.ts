import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { sendBookingConfirmation } from "../services/emailService";

/**
 * GET /api/pricing/plans
 * Pricing plans with features
 */
export const getPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    res.json({ status: "success", data: plans });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mentorship/book-call
 * Book a free mentorship call
 */
export const bookCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ status: "error", message: "Name and email are required" });
    }

    const booking = await prisma.mentorBooking.create({
      data: { userId, name, email, phone, message },
    });
    console.log(`[Mentorship] Call booked by user: ${userId}, name: ${name}`);

    // Send confirmation email
    sendBookingConfirmation(email, name, phone || undefined, message || undefined)
      .then((sent) => console.log(`[Mentorship] Booking confirmation email ${sent ? "sent" : "skipped"} to ${email}`))
      .catch((err) => console.error("[Mentorship] Email send failed:", err));

    res.status(201).json({ status: "success", data: booking, message: "Call booked successfully! We'll reach out within 24 hours." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentorship/testimonials
 * Success stories/testimonials
 */
export const getTestimonials = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    res.json({ status: "success", data: testimonials });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/pricing/orders
 * Create a purchase order
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

    const order = await prisma.order.create({
      data: { userId, planId, amount: plan.price, status: "pending" },
      include: { plan: true },
    });

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pricing/orders
 * List user's orders
 */
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: orders });
  } catch (error) {
    next(error);
  }
};
