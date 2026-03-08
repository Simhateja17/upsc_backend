import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import prisma from "../config/database";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        supabaseId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        role?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Supabase JWT
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Get or auto-create user in our database
    // Auto-create handles OAuth users who haven't hit /auth/callback yet
    let user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      const metadata = authUser.user_metadata || {};
      user = await prisma.user.create({
        data: {
          supabaseId: authUser.id,
          email: authUser.email!.toLowerCase(),
          firstName: metadata.first_name || metadata.full_name?.split(" ")[0] || null,
          lastName: metadata.last_name || metadata.full_name?.split(" ").slice(1).join(" ") || null,
          avatarUrl: metadata.avatar_url || metadata.picture || null,
          emailVerified: !!authUser.email_confirmed_at,
        },
        select: {
          id: true,
          supabaseId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser(token);

    if (authUser) {
      let user = await prisma.user.findUnique({
        where: { supabaseId: authUser.id },
        select: {
          id: true,
          supabaseId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!user && authUser.email) {
        const metadata = authUser.user_metadata || {};
        user = await prisma.user.create({
          data: {
            supabaseId: authUser.id,
            email: authUser.email.toLowerCase(),
            firstName: metadata.first_name || metadata.full_name?.split(" ")[0] || null,
            lastName: metadata.last_name || metadata.full_name?.split(" ").slice(1).join(" ") || null,
            avatarUrl: metadata.avatar_url || metadata.picture || null,
            emailVerified: !!authUser.email_confirmed_at,
          },
          select: {
            id: true,
            supabaseId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
      }

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
};
