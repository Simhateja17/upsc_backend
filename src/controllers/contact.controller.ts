import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

/**
 * POST /api/contact
 */
export const submitContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ status: "error", message: "All fields are required" });
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        userId: req.user?.id || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    console.log(`[Contact] New submission from ${email}: ${subject}`);

    res.status(201).json({
      status: "success",
      message: "Message sent! We'll get back to you within 4 hours.",
      data: { id: submission.id },
    });
  } catch (error) {
    next(error);
  }
};
