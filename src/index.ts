import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import config from "./config";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";
import { requestId } from "./middleware/requestId";
import logger from "./config/logger";
import pinoHttp from "pino-http";
import { initStorageBuckets } from "./config/storage";
import { initScheduler } from "./jobs/scheduler";
import { runLatestNewsJob } from "./jobs/latestNewsJob";

const app: Application = express();

// Trust the reverse proxy (Render, AWS ELB, etc.) so req.ip reflects the real client IP
app.set("trust proxy", 1);

// Request ID + structured logging
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: (req) => (req as any).id,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(helmet());

app.use((req, _res, next) => {
  if (req.method === "POST" && /^\/api\/pyq\/mains\/[^/]+\/submit$/.test(req.path)) {
    console.log("[PYQ Upload] Incoming submit request", {
      requestId: req.id,
      origin: req.headers.origin || null,
      contentType: req.headers["content-type"] || null,
      contentLength: req.headers["content-length"] || null,
      userAgent: req.headers["user-agent"] || null,
    });
  }
  next();
});

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "25mb" }));
app.use(express.urlencoded({ extended: false, limit: process.env.URLENCODED_BODY_LIMIT || "5mb" }));

// Apply general rate limiter to all API routes
app.use("/api", generalLimiter);
console.log("[Server] Rate limiter applied");

// Routes
app.use("/api", routes);
console.log("[Server] API routes mounted");

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);
console.log("[Server] Error handlers registered");

// Start server
const PORT = config.port;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Initialize storage buckets
  try {
    await initStorageBuckets();
    console.log("Storage buckets initialized");
  } catch (err) {
    console.warn("Storage bucket init skipped:", err);
  }

  // Initialize cron scheduler
  initScheduler();

  // Populate editorials immediately on startup — critical for Render free tier
  // which spins down between requests, killing cron jobs. This ensures the DB
  // always has fresh articles after every cold start. Fire-and-forget.
  runLatestNewsJob().catch((err) =>
    console.warn("[Startup] RSS fetch failed (non-fatal):", err?.message)
  );
});

export default app;
