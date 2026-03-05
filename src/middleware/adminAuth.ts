import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if the authenticated user is an admin.
 * Must be used AFTER the `authenticate` middleware.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  if ((req.user as any).role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }

  next();
};
