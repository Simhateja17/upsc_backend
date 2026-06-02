import { Request, Response, NextFunction } from "express";
import multer from "multer";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isPayloadTooLarge =
    err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
  const statusCode = isPayloadTooLarge ? 413 : err.statusCode || 500;
  const status = err.status || "error";

  console.error(`[Error] ${err.message}`, {
    statusCode,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Never expose stack traces in API responses — log them server-side only
  const message = isPayloadTooLarge
    ? "Uploaded file is too large. Please upload an image below 25MB."
    : statusCode === 500
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({ status, message });
};

export const notFoundHandler = (req: Request, res: Response) => {
  console.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
};
