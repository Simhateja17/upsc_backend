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

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply general rate limiter to all API routes
app.use("/api", generalLimiter);

// Routes
app.use("/api", routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

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
