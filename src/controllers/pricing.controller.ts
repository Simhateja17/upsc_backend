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

    // Return defaults if empty
    if (plans.length === 0) {
      return res.json({
        status: "success",
        data: [
          {
            id: "1",
            name: "3 Month Plan",
            price: 4999,
            duration: "3 months",
            features: [
              "All Daily MCQs & Answer Writing",
              "Basic Mock Tests",
              "Editorial Analysis",
              "Study Planner",
              "Email Support",
            ],
            isPopular: false,
          },
          {
            id: "2",
            name: "6 Month Plan",
            price: 7999,
            duration: "6 months",
            features: [
              "Everything in 3 Month Plan",
              "Unlimited Mock Tests",
              "AI Answer Evaluation",
              "Video Lectures Access",
              "Personal Mentor Support",
              "Priority Support",
            ],
            isPopular: true,
          },
          {
            id: "3",
            name: "12 Month Plan",
            price: 11999,
            duration: "12 months",
            features: [
              "Everything in 6 Month Plan",
              "1-on-1 Mentorship Sessions",
              "Complete Study Material Library",
              "Interview Preparation",
              "Lifetime Community Access",
              "Dedicated Study Manager",
            ],
            isPopular: false,
          },
        ],
      });
    }

    res.json({ status: "success", data: plans });
  } catch (error: any) {
    // If the table doesn't exist yet, return defaults instead of 500
    if (error?.code === "P2021" || error?.code === "P2010" || error?.message?.includes("does not exist")) {
      return res.json({
        status: "success",
        data: [
          { id: "1", name: "3 Month Plan", price: 4999, duration: "3 months", features: ["All Daily MCQs & Answer Writing", "Basic Mock Tests", "Editorial Analysis", "Study Planner", "Email Support"], isPopular: false },
          { id: "2", name: "6 Month Plan", price: 7999, duration: "6 months", features: ["Everything in 3 Month Plan", "Unlimited Mock Tests", "AI Answer Evaluation", "Video Lectures Access", "Personal Mentor Support", "Priority Support"], isPopular: true },
          { id: "3", name: "12 Month Plan", price: 11999, duration: "12 months", features: ["Everything in 6 Month Plan", "1-on-1 Mentorship Sessions", "Complete Study Material Library", "Interview Preparation", "Lifetime Community Access", "Dedicated Study Manager"], isPopular: false },
        ],
      });
    }
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

    // Return defaults if empty
    if (testimonials.length === 0) {
      return res.json({
        status: "success",
        data: [
          {
            id: "1",
            name: "Priya Sharma",
            title: "IAS 2024 - AIR 45",
            content: "The daily MCQ practice and personalized study planner were game-changers for my preparation. Jeet Sir's mentorship made all the difference.",
            rating: 5,
          },
          {
            id: "2",
            name: "Rahul Verma",
            title: "IAS 2024 - AIR 112",
            content: "The AI-powered answer evaluation helped me improve my mains writing significantly. I saw a 30% improvement in my scores within 2 months.",
            rating: 5,
          },
          {
            id: "3",
            name: "Anita Patel",
            title: "IPS 2023 - AIR 89",
            content: "The mock test analytics and subject-wise breakdown helped me identify and fix my weak areas systematically.",
            rating: 5,
          },
        ],
      });
    }

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

/**
 * POST /api/admin/pricing/plans
 * Admin: Create a new pricing plan
 */
export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, price, duration, durationDays, features, isPopular, order } = req.body;

    if (!name || price === undefined || !duration) {
      return res.status(400).json({ status: "error", message: "name, price, and duration are required" });
    }

    const plan = await prisma.pricingPlan.create({
      data: {
        name,
        price: Number(price),
        duration,
        durationDays: durationDays ? Number(durationDays) : null,
        features: features || [],
        isPopular: isPopular || false,
        order: order || 0,
        isActive: true,
      },
    });

    res.status(201).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/pricing/plans/:id
 * Admin: Update a pricing plan
 */
export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, price, duration, durationDays, features, isPopular, order, isActive } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = Number(price);
    if (duration !== undefined) updates.duration = duration;
    if (durationDays !== undefined) updates.durationDays = Number(durationDays);
    if (features !== undefined) updates.features = features;
    if (isPopular !== undefined) updates.isPopular = isPopular;
    if (order !== undefined) updates.order = Number(order);
    if (isActive !== undefined) updates.isActive = isActive;

    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: updates,
    });

    res.json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/pricing/plans/:id
 * Admin: Delete a pricing plan (soft delete by setting isActive to false)
 */
export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.pricingPlan.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ status: "success", message: "Plan deactivated" });
  } catch (error) {
    next(error);
  }
};
