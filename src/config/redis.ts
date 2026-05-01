import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

let redisClient: Redis | null = null;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redisClient.connect().catch((err) => {
      console.warn("[Redis] Connection failed, falling back to in-memory:", err.message);
      redisClient = null;
    });
    console.log("[Redis] Client initialized");
  } catch (err: any) {
    console.warn("[Redis] Init failed, using in-memory store:", err.message);
    redisClient = null;
  }
} else {
  console.log("[Redis] No REDIS_URL set, using in-memory rate limiting");
}

export { redisClient };
