import { Request, Response, NextFunction } from "express";
import {
  FeatureKey,
  getEffectiveEntitlements,
  getFeatureStatus,
  recordUsageEvent,
} from "../services/entitlements.service";

declare global {
  namespace Express {
    interface Request {
      entitlement?: {
        featureKey: FeatureKey;
        source?: string;
      };
    }
  }
}

function blockStatus(code?: string) {
  return code === "FEATURE_THROTTLED" ? 429 : 403;
}

export function enforceUsage(featureKey: FeatureKey, source?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: "error",
          code: "AUTH_REQUIRED",
          message: "Please sign in to use this feature.",
        });
      }

      const featureStatus = await getFeatureStatus(userId, featureKey);
      if (!featureStatus.allowed) {
        console.warn("[Entitlements] Blocking feature usage", {
          requestId: req.id,
          userId,
          featureKey,
          source,
          code: featureStatus.code,
          tier: featureStatus.tier,
          used: featureStatus.used,
          limit: featureStatus.limit,
          remaining: featureStatus.remaining,
          period: featureStatus.period,
          resetAt: featureStatus.resetAt,
          throttle: featureStatus.throttle,
          path: req.originalUrl,
          method: req.method,
        });

        return res.status(blockStatus(featureStatus.code)).json({
          status: "error",
          code: featureStatus.code,
          feature: featureKey,
          tier: featureStatus.tier,
          limit: featureStatus.limit,
          used: featureStatus.used,
          remaining: featureStatus.remaining,
          period: featureStatus.period,
          resetAt: featureStatus.resetAt,
          throttle: featureStatus.throttle,
          upgrade: featureStatus.upgrade,
          message: featureStatus.message || "Feature limit reached.",
        });
      }

      req.entitlement = { featureKey, source };
      const originalJson = res.json.bind(res);
      res.json = ((body?: any) => {
        const shouldRecord =
          res.statusCode < 400 &&
          body &&
          typeof body === "object" &&
          body.status !== "error";

        if (shouldRecord) {
          const idempotencyKey =
            req.headers["idempotency-key"]?.toString() ||
            req.headers["x-idempotency-key"]?.toString();
          recordUsageEvent({
            userId,
            featureKey,
            source,
            idempotencyKey,
            metadata: {
              method: req.method,
              path: req.originalUrl,
            },
          }).catch((error) => {
            console.error("[Entitlements] Failed to record usage event", {
              userId,
              featureKey,
              source,
              error,
            });
          });
        }

        return originalJson(body);
      }) as Response["json"];

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAccess(accessKey: string, allowed: string[] = ["full", "limited"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: "error",
          code: "AUTH_REQUIRED",
          message: "Please sign in to use this feature.",
        });
      }

      const effective = await getEffectiveEntitlements(userId);
      const access = effective.policy.access[accessKey] || "none";
      if (!allowed.includes(access)) {
        return res.status(403).json({
          status: "error",
          code: "FEATURE_ACCESS_REQUIRED",
          feature: accessKey,
          tier: effective.tier,
          access,
          upgrade: {
            recommendedTier: accessKey === "mentorship" ? "ascent" : "aspire",
            message: "Upgrade your plan to unlock this feature.",
          },
          message: "Upgrade your plan to unlock this feature.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
