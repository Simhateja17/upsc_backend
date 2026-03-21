import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { importJWK, jwtVerify, JWK } from "jose";
import { supabaseAdmin } from "../config/supabase";

// ── Local JWKS key — fetched once from Supabase, embedded here ──────────────
// Source: https://<project>.supabase.co/auth/v1/.well-known/jwks.json
// This eliminates ALL network calls for JWT verification.
const SUPABASE_JWKS_KEY: JWK = {
  alg: "ES256",
  crv: "P-256",
  kty: "EC",
  use: "sig",
  kid: "50978651-0bc9-4363-a4fd-e4e86ace7d8d",
  x: "3FmMGQHM8e_lx-O4cpbzr1byQtrTnb4IyY_RMV66_HM",
  y: "en9X02c6fbDYdwRr_K9-eg6ZwneUu8zgPIgJgHLBHus",
};

let cachedKey: CryptoKey | null = null;

async function getVerifyKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = (await importJWK(SUPABASE_JWKS_KEY, "ES256")) as CryptoKey;
  }
  return cachedKey;
}

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
  email: string;
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
  email: string;
  user_metadata?: SupabaseJwtPayload["user_metadata"];
  email_confirmed_at?: string;
}) {
  const metadata = authUser.user_metadata || {};
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

    // Verify token using embedded public key — zero network calls
    let payload: SupabaseJwtPayload;
    try {
      const key = await getVerifyKey();
      const { payload: jwtPayload } = await jwtVerify(token, key);
      payload = jwtPayload as unknown as SupabaseJwtPayload;
    } catch (err) {
      console.log(
        `[Auth] Invalid/expired token for ${req.method} ${req.originalUrl}`
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
      const key = await getVerifyKey();
      const { payload: jwtPayload } = await jwtVerify(token, key);
      payload = jwtPayload as unknown as SupabaseJwtPayload;
    } catch (err) {
      return next();
    }

    const authUser = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata,
      email_confirmed_at: payload.email_confirmed_at,
    };

    if (authUser.email) {
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
