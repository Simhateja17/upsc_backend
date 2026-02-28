import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

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
