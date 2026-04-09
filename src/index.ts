import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express, { Application } from "express";
import cors from "cors";
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

// Request ID + structured logging
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: (req: any) => req.id,
  serializers: {
    req: (req: any) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res: any) => ({ statusCode: res.statusCode }),
  },
}));

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (config.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
