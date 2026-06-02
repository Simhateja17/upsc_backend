import { Request, Response, NextFunction } from "express";
import multer from "multer";
import config from "../config";

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
  const isBodyTooLarge =
    err.statusCode === 413 ||
    err.status === "entity.too.large" ||
    err.message?.toLowerCase().includes("request entity too large");
  const statusCode = isPayloadTooLarge ? 413 : err.statusCode || 500;
  const status = err.status || "error";
  const origin = req.headers.origin;

  if (origin && config.cors.origins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  console.error(`[Error] ${err.message}`, {
    requestId: req.id,
    method: req.method,
    originalUrl: req.originalUrl,
    statusCode,
    origin: origin || null,
    contentType: req.headers["content-type"] || null,
    contentLength: req.headers["content-length"] || null,
    multerCode: err instanceof multer.MulterError ? err.code : null,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Never expose stack traces in API responses — log them server-side only
  const maxMb = process.env.ANSWER_UPLOAD_MAX_MB || "50";
  const message = isPayloadTooLarge || isBodyTooLarge
    ? `Uploaded file is too large. Please upload an image below ${maxMb}MB.`
    : statusCode === 500
      ? "Internal server error"
      : err.message;

  res.status(isBodyTooLarge ? 413 : statusCode).json({ status, message, requestId: req.id });
};

export const notFoundHandler = (req: Request, res: Response) => {
  console.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
};
