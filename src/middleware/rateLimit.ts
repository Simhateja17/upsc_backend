import rateLimit, { Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis";

function createLimiter(opts: Partial<Options>) {
  const config: Partial<Options> = {
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  };

  if (redisClient) {
    config.store = new RedisStore({
      // @ts-expect-error - ioredis sendCommand is compatible
      sendCommand: (...args: string[]) => redisClient!.call(...(args as [string, ...string[]])),
      prefix: "rl:",
    });
  }

  return rateLimit(config);
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * General API rate limiter — 50,000 req/15min in production, 1000 in dev.
 * Skips preflight OPTIONS requests so CORS handshakes don't count against the limit.
 */
export const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 50000,
  skip: (req) => req.method === "OPTIONS",
  message: { status: "error", message: "Too many requests, please try again later" },
});

/**
 * Auth rate limiter — 20 requests per 15 minutes
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: "error", message: "Too many authentication attempts, please try again later" },
});

/**
 * Submission rate limiter — 30 requests per 15 minutes
 */
export const submissionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: "error", message: "Too many submissions, please try again later" },
});

/**
 * AI rate limiter — 10 requests per 15 minutes (expensive operations)
 */
export const aiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: "error", message: "Too many AI requests, please try again later" },
});
