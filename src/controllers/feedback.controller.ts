import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { sendFeedbackNotification } from "../services/emailService";

/**
 * POST /api/feedback
 */
export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, category, workingWell, couldBeBetter } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: "error", message: "Rating must be between 1 and 5" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user!.id,
        rating,
        category: category || null,
        workingWell: workingWell || null,
        couldBeBetter: couldBeBetter || null,
      },
    });

    console.log(`[Feedback] New feedback from ${req.user!.email}: ${rating}/5 [${category}]`);

    // Send email notification to admin team
    sendFeedbackNotification(
      process.env.ADMIN_EMAIL || "together@risewithjeet.com",
      {
        rating,
        category: category || "General",
        workingWell: workingWell || "",
        couldBeBetter: couldBeBetter || "",
        userEmail: req.user!.email,
      }
    ).catch((err) => console.error("[Feedback] Email notification failed:", err));

    res.status(201).json({
      status: "success",
      message: "Thank you for your feedback!",
      data: { id: feedback.id },
    });
  } catch (error) {
    next(error);
  }
};
