import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabaseAdmin } from "../config/supabase";
import prisma from "../config/database";

type SessionRecency = "newer" | "older" | "unknown";

/**
 * Compares two Supabase auth sessions by creation time to resolve last-login-wins.
 * "newer"  → the incoming session logged in more recently and should take over.
 * "older"  → the incoming session is superseded (or revoked) and must be rejected.
 * "unknown"→ could not determine (DB error); caller should fail open, not lock out.
 */
async function sessionRecency(
  incomingId: string,
  activeId: string,
  supabaseUserId: string
): Promise<SessionRecency> {
  try {
    const rows = await prisma.$queryRaw<{ id: string; created_at: Date }[]>`
      SELECT id::text AS id, created_at
      FROM auth.sessions
      WHERE user_id = ${supabaseUserId}::uuid
        AND id IN (${incomingId}::uuid, ${activeId}::uuid)`;
    const inc = rows.find((r) => r.id === incomingId);
    const act = rows.find((r) => r.id === activeId);
    if (!inc) return "older"; // incoming session revoked/unknown → superseded
    if (!act) return "newer"; // active session gone → incoming takes over
    return new Date(inc.created_at).getTime() > new Date(act.created_at).getTime()
      ? "newer"
      : "older";
  } catch (err) {
    console.warn("[Auth] session recency check failed:", err);
    return "unknown";
  }
}

// ── Dynamic JWKS — fetches keys from Supabase, cached in-memory ────────────
// Survives key rotation: on kid mismatch, re-fetches automatically.
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL env var");

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
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
        // Supabase auth session_id claim from the current JWT (single-device gate)
        sessionId?: string | null;
      };
    }
  }
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  session_id?: string;
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
    .select("id, supabase_id, email, first_name, last_name, role, active_session_id")
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
    email: data.email || "",
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    activeSessionId: (data as { active_session_id?: string | null }).active_session_id ?? null,
  };
}

/**
 * Create user via REST API (HTTPS — reliable)
 */
async function createUser(authUser: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: SupabaseJwtPayload["user_metadata"];
  email_confirmed_at?: string;
}) {
  const metadata = authUser.user_metadata || {};
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: randomUUID(),
      supabase_id: authUser.id,
      email: authUser.email?.toLowerCase() || null,
      phone: authUser.phone || null,
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
    if (error.code === "23505") {
      return findUserBySupabaseId(authUser.id);
    }
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    supabaseId: data.supabase_id,
    email: data.email || "",
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    activeSessionId: null as string | null,
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
      const { payload: jwtPayload } = await jwtVerify(token, JWKS);
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
      email: payload.email || null,
      phone: payload.phone || null,
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

    // ── Single-device gate (last-login-wins, order-independent) ────────────
    // On a session mismatch, decide by recency: the more recently created
    // Supabase session wins. A newer login takes over the active slot; an older
    // (superseded) session is rejected. Because the decision is based on
    // auth.sessions.created_at — not on which request happens to arrive first —
    // the device that just logged in is never the one that gets barred.
    // Skipped for admins and when enforcement is off. A user with no active
    // session registered yet is never blocked (bootstrap case).
    if (
      process.env.ENFORCE_SINGLE_SESSION === "true" &&
      user.role !== "admin" &&
      user.activeSessionId &&
      payload.session_id &&
      payload.session_id !== user.activeSessionId
    ) {
      const recency = await sessionRecency(payload.session_id, user.activeSessionId, user.supabaseId);
      if (recency === "newer") {
        // This device logged in more recently — hand it the active slot.
        await supabaseAdmin
          .from("users")
          .update({ active_session_id: payload.session_id })
          .eq("id", user.id);
        user.activeSessionId = payload.session_id;
      } else if (recency === "older") {
        console.log(`[Auth] Session superseded for ${user.email} (${user.id})`);
        return res.status(401).json({
          status: "error",
          code: "SESSION_SUPERSEDED",
          message: "You were signed out because your account was signed in on another device.",
        });
      }
      // "unknown" → fail open: allow this request through without changing the slot.
    }

    req.user = { ...user, sessionId: payload.session_id ?? null };
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
      const { payload: jwtPayload } = await jwtVerify(token, JWKS);
      payload = jwtPayload as unknown as SupabaseJwtPayload;
    } catch (err) {
      return next();
    }

    const authUser = {
      id: payload.sub,
      email: payload.email || null,
      phone: payload.phone || null,
      user_metadata: payload.user_metadata,
      email_confirmed_at: payload.email_confirmed_at,
    };

    let user = await findUserBySupabaseId(authUser.id);

    if (!user) {
      user = await createUser(authUser);
    }

    if (user) {
      req.user = { ...user, sessionId: payload.session_id ?? null };
    }

    next();
  } catch (error) {
    next();
  }
};
