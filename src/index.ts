import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import config from "./config";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";
import { initStorageBuckets } from "./config/storage";
import { initScheduler } from "./jobs/scheduler";

const app: Application = express();

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} → ${statusCode} (${duration}ms)`);
  });

  next();
});

// Middleware
app.use(cors({
  origin: config.cors.origin,
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
});

export default app;
