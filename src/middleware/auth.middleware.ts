import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { supabaseAdmin } from "../config/supabase";

// ── Dynamic JWKS — fetches keys from Supabase, cached in-memory ────────────
// Survives key rotation: on kid mismatch, re-fetches automatically.
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL env var");

const issuer = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
const JWKS = createRemoteJWKSet(
  new URL(`${issuer}/.well-known/jwks.json`),
  {
    cacheMaxAge: 3_600_000,    // cache keys for 1 hour
    cooldownDuration: 30_000,  // wait 30s between re-fetches on failure
  }
);

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        supabaseId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        role?: string;
      };
    }
  }
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };
  email_confirmed_at?: string;
}

/**
 * Look up user by supabase ID via REST API (HTTPS — reliable)
 */
async function findUserBySupabaseId(supabaseId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, supabase_id, email, first_name, last_name, role")
    .eq("supabase_id", supabaseId)
    .single();

  if (error) {
    console.error("[Auth] findUserBySupabaseId error:", error.message, error.code);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    supabaseId: data.supabase_id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
  };
}

/**
 * Create user via REST API (HTTPS — reliable)
 */
async function createUser(authUser: {
  id: string;
  email?: string;
  user_metadata?: SupabaseJwtPayload["user_metadata"];
  email_confirmed_at?: string;
}) {
  if (!authUser.email) return null;

  const metadata = authUser.user_metadata || {};
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: randomUUID(),
      supabase_id: authUser.id,
      email: authUser.email.toLowerCase(),
      first_name:
        metadata.first_name ||
        metadata.full_name?.split(" ")[0] ||
        null,
      last_name:
        metadata.last_name ||
        metadata.full_name?.split(" ").slice(1).join(" ") ||
        null,
      avatar_url: metadata.avatar_url || metadata.picture || null,
      email_verified: !!authUser.email_confirmed_at,
      created_at: now,
      updated_at: now,
    })
    .select("id, supabase_id, email, first_name, last_name, role")
    .single();

  if (error) {
    console.error("[Auth] createUser error:", error.message, error.code);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    supabaseId: data.supabase_id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
  };
}

/**
 * Middleware to authenticate requests using Supabase JWT (fully local verification)
 * Database queries use Supabase REST API (HTTPS) — no direct Postgres connection needed.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(
        `[Auth] No token provided for ${req.method} ${req.originalUrl}`
      );
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with remote JWKS so key rotation is handled automatically.
    // Fallback to Supabase Auth API when JWKS path fails unexpectedly.
    let payload: SupabaseJwtPayload;
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWKS, {
        issuer,
        audience: "authenticated",
      });
      payload = jwtPayload as unknown as SupabaseJwtPayload;
    } catch (err) {
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !authUser) throw error;

        payload = {
          sub: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata as SupabaseJwtPayload["user_metadata"],
          email_confirmed_at: authUser.email_confirmed_at ?? undefined,
        };
      } catch (fallbackErr) {
        const kid = (() => {
          try {
            return decodeProtectedHeader(token).kid;
          } catch {
            return undefined;
          }
        })();
        const reason =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
            ? err.message
            : "unknown";

        console.log(
          `[Auth] Invalid/expired token for ${req.method} ${req.originalUrl} (kid=${kid ?? "n/a"}, reason=${reason})`
        );
        return res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
        });
      }

      if (!payload.sub) {
        console.log(
          `[Auth] Invalid token payload for ${req.method} ${req.originalUrl} (missing sub)`
        );
        return res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
        });
      }
    }

    if (!payload.sub || !payload.email) {
      console.log(
        `[Auth] Invalid token payload for ${req.method} ${req.originalUrl} (missing sub/email)`
      );
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    const authUser = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata,
      email_confirmed_at: payload.email_confirmed_at,
    };

    // Get or auto-create user via REST API (HTTPS)
    let user = await findUserBySupabaseId(authUser.id);

    if (!user) {
      user = await createUser(authUser);
    }

    if (!user) {
      console.error("[Auth] Failed to find or create user");
      return res.status(500).json({
        status: "error",
        message: "Authentication failed",
      });
    }

    req.user = user;
    console.log(`[Auth] Authenticated user: ${user.email} (${user.id})`);
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    let payload: SupabaseJwtPayload;
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWKS, {
        issuer,
        audience: "authenticated",
      });
      payload = jwtPayload as unknown as SupabaseJwtPayload;
    } catch (err) {
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !authUser) return next();
        payload = {
          sub: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata as SupabaseJwtPayload["user_metadata"],
          email_confirmed_at: authUser.email_confirmed_at ?? undefined,
        };
      } catch {
        return next();
      }
    }

    const authUser = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata,
      email_confirmed_at: payload.email_confirmed_at,
    };

    if (authUser.email && authUser.id) {
      let user = await findUserBySupabaseId(authUser.id);

      if (!user) {
        user = await createUser(authUser);
      }

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
