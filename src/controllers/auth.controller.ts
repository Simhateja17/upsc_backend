import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { supabase, supabaseAdmin } from "../config/supabase";
import { sendWelcomeEmail } from "../services/emailService";

type PublicUser = {
  id: string;
  supabase_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  email_verified: boolean;
};

interface SignupBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapAuthError(error: any): { statusCode: number; message: string; code?: string } {
  const code = error?.code;
  const status = error?.status;
  const rawMessage = String(error?.message || "");
  const message = rawMessage.toLowerCase();

  if (message.includes("email rate limit exceeded")) {
    return {
      statusCode: 429,
      code: "email_rate_limit_exceeded",
      message: "Signup emails are temporarily rate-limited. Please try again later, or contact support if this continues.",
    };
  }

  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("security purposes") ||
    message.includes("only request this after")
  ) {
    return {
      statusCode: 429,
      code: "over_email_send_rate_limit",
      message: "A confirmation email was just sent. Please check your inbox, or wait a minute before trying again.",
    };
  }

  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")) {
    return {
      statusCode: 409,
      code: "user_already_exists",
      message: "An account already exists for this email. Please sign in instead.",
    };
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return {
      statusCode: 403,
      code: "email_not_confirmed",
      message: "Please verify your email before signing in.",
    };
  }

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return {
      statusCode: 401,
      code: "invalid_credentials",
      message: "Invalid email or password.",
    };
  }

  return {
    statusCode: status && status >= 400 && status < 500 ? status : 400,
    code,
    message: rawMessage || "Authentication failed",
  };
}

async function findPublicUserBySupabaseId(supabaseId: string): Promise<PublicUser | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("supabase_id", supabaseId)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Public user lookup by Supabase id failed:", error.message, error.code);
  }

  return (data as PublicUser | null) || null;
}

async function findPublicUserByEmail(email: string): Promise<PublicUser | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Public user lookup by email failed:", error.message, error.code);
  }

  return (data as PublicUser | null) || null;
}

async function ensurePublicUser(params: {
  supabaseId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
}): Promise<PublicUser | null> {
  const email = normalizeEmail(params.email);

  const existingBySupabaseId = await findPublicUserBySupabaseId(params.supabaseId);
  if (existingBySupabaseId) {
    const updates: Record<string, unknown> = {
      email,
      email_verified: params.emailVerified || existingBySupabaseId.email_verified,
    };
    if (!existingBySupabaseId.first_name && params.firstName) updates.first_name = params.firstName;
    if (!existingBySupabaseId.last_name && params.lastName) updates.last_name = params.lastName;
    if (!existingBySupabaseId.phone && params.phone) updates.phone = params.phone;
    if (!existingBySupabaseId.avatar_url && params.avatarUrl) updates.avatar_url = params.avatarUrl;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", existingBySupabaseId.id)
      .select("*")
      .single();

    if (error) {
      console.error("[Auth] Public user update failed:", error.message, error.code);
      return existingBySupabaseId;
    }

    return data as PublicUser;
  }

  const existingByEmail = await findPublicUserByEmail(email);
  if (existingByEmail) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        supabase_id: params.supabaseId,
        email_verified: params.emailVerified || existingByEmail.email_verified,
        first_name: existingByEmail.first_name || params.firstName,
        last_name: existingByEmail.last_name || params.lastName,
        phone: existingByEmail.phone || params.phone,
        avatar_url: existingByEmail.avatar_url || params.avatarUrl,
      })
      .eq("id", existingByEmail.id)
      .select("*")
      .single();

    if (error) {
      console.error("[Auth] Public user relink failed:", error.message, error.code);
      return existingByEmail;
    }

    return data as PublicUser;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: randomUUID(),
      supabase_id: params.supabaseId,
      email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      avatar_url: params.avatarUrl,
      email_verified: params.emailVerified,
    })
    .select("*")
    .single();

  if (!error && data) {
    return data as PublicUser;
  }

  console.error("[Auth] Public user insert failed:", error?.message, error?.code);
  return (await findPublicUserBySupabaseId(params.supabaseId)) || (await findPublicUserByEmail(email));
}

/**
 * Sign up a new user
 * POST /api/auth/signup
 */
export const signup = async (
  req: Request<{}, {}, SignupBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    console.log(`[Signup] Attempt for email: ${normalizedEmail}`);

    // Zod validation middleware guarantees email + password are present and valid.
    // Direct to Supabase — avoids user enumeration via timing discrimination.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      const mapped = mapAuthError(authError);
      return res.status(mapped.statusCode).json({
        status: "error",
        message: mapped.message,
        code: mapped.code,
      });
    }

    if (!authData.user) {
      return res.status(500).json({ status: "error", message: "Failed to create user account" });
    }

    const user = await ensurePublicUser({
      supabaseId: authData.user.id,
      email: normalizedEmail,
      firstName,
      lastName,
      phone,
      emailVerified: !!authData.user.email_confirmed_at,
    });

    if (!user) {
      console.error("Failed to create or recover user record for:", normalizedEmail);
      if (!authData.session) {
        return res.status(201).json({
          status: "success",
          message: "Account created successfully. Please check your email to verify your account.",
          data: {
            user: {
              id: authData.user.id,
              email: normalizedEmail,
              firstName: firstName || null,
              lastName: lastName || null,
            },
            session: null,
            requiresEmailVerification: true,
          },
        });
      }

      return res.status(500).json({ status: "error", message: "Unable to sync user profile" });
    }

    console.log(`[Signup] User created successfully: ${user.email} (${user.id})`);

    sendWelcomeEmail(normalizedEmail, firstName || "").catch((err) =>
      console.error("Welcome email failed:", err)
    );

    if (!authData.session) {
      return res.status(201).json({
        status: "success",
        message: "Account created successfully. Please check your email to verify your account.",
        data: {
          user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
          session: null,
          requiresEmailVerification: true,
        },
      });
    }

    res.status(201).json({
      status: "success",
      message: "Account created successfully",
      data: {
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login an existing user
 * POST /api/auth/login
 */
export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    console.log(`[Login] Attempt for email: ${normalizedEmail}`);

    // Zod validation middleware guarantees email + password are present.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      console.error("Login error:", authError);
      const mapped = mapAuthError(authError);
      return res.status(mapped.statusCode).json({
        status: "error",
        message: mapped.message,
        code: mapped.code,
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const user = await ensurePublicUser({
      supabaseId: authData.user.id,
      email: authData.user.email || normalizedEmail,
      firstName: authData.user.user_metadata?.first_name,
      lastName: authData.user.user_metadata?.last_name,
      avatarUrl: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.picture,
      emailVerified: !!authData.user.email_confirmed_at,
    });

    if (!user) {
      return res.status(500).json({ status: "error", message: "Unable to sync user profile" });
    }

    console.log(`[Login] Successful for: ${user.email} (${user.id})`);
    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          role: user.role,
        },
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 * The auth middleware already verified the JWT and looked up the user.
 * This endpoint just returns the user data — no additional network calls needed.
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Not authenticated" });
    }

    // Fetch full user data via REST (middleware only attaches a subset)
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          emailVerified: user.email_verified,
          role: user.role,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(`[Logout] User: ${req.user?.email || "unknown"}`);
    if (supabaseAdmin && req.user) {
      await supabaseAdmin.auth.admin.signOut(
        req.headers.authorization?.split(" ")[1] || "",
        "local"
      );
    } else {
      await supabase.auth.signOut();
    }

    res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ status: "error", message: "Refresh token is required" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return res.status(401).json({ status: "error", message: "Invalid refresh token" });
    }

    res.json({
      status: "success",
      data: {
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth - Get OAuth URL
 * GET /api/auth/google
 */
export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[GoogleAuth] Initiating OAuth flow");
    const redirectUrl = process.env.GOOGLE_REDIRECT_URL || "http://localhost:3000/auth/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });

    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }

    res.json({ status: "success", data: { url: data.url } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle OAuth callback
 * POST /api/auth/callback
 */
export const authCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accessToken, refreshToken } = req.body;
    console.log("[AuthCallback] Processing OAuth callback");

    if (!accessToken) {
      return res.status(400).json({ status: "error", message: "Access token is required" });
    }

    // Use admin client to get user details (HTTPS, reliable)
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authUser) {
      return res.status(401).json({ status: "error", message: "Invalid token" });
    }

    if (!authUser.email) {
      return res.status(400).json({ status: "error", message: "Authenticated user email is missing" });
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("supabase_id", authUser.id)
      .maybeSingle();

    if (lookupError) {
      console.error("[AuthCallback] User lookup failed:", lookupError.message, lookupError.code);
    }

    let user = existingUser;

    const metadata = authUser.user_metadata || {};
    const metaFirst = metadata.first_name || metadata.full_name?.split(" ")[0] || null;
    const metaLast = metadata.last_name || metadata.full_name?.split(" ").slice(1).join(" ") || null;

    if (!user) {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          id: randomUUID(),
          supabase_id: authUser.id,
          email: authUser.email.toLowerCase(),
          first_name: metaFirst,
          last_name: metaLast,
          avatar_url: metadata.avatar_url || metadata.picture,
          email_verified: !!authUser.email_confirmed_at,
        })
        .select("*")
        .maybeSingle();
      user = newUser;

      if (insertError) {
        console.error("[AuthCallback] User insert failed:", insertError.message, insertError.code);

        // If a previous request created the user, recover instead of crashing.
        const { data: recoveredBySupabaseId, error: recoverBySupabaseIdError } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("supabase_id", authUser.id)
          .maybeSingle();

        if (recoverBySupabaseIdError) {
          console.error("[AuthCallback] User recovery by Supabase id failed:", recoverBySupabaseIdError.message, recoverBySupabaseIdError.code);
        }

        if (recoveredBySupabaseId) {
          user = recoveredBySupabaseId;
        } else {
          const { data: recoveredByEmail, error: recoverByEmailError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", authUser.email.toLowerCase())
            .maybeSingle();

          if (recoverByEmailError) {
            console.error("[AuthCallback] User recovery by email failed:", recoverByEmailError.message, recoverByEmailError.code);
          }

          if (recoveredByEmail && recoveredByEmail.supabase_id !== authUser.id) {
            const { data: relinkedUser, error: relinkError } = await supabaseAdmin
              .from("users")
              .update({ supabase_id: authUser.id })
              .eq("id", recoveredByEmail.id)
              .select("*")
              .maybeSingle();

            if (relinkError) {
              console.error("[AuthCallback] User relink failed:", relinkError.message, relinkError.code);
            }

            user = relinkedUser || recoveredByEmail;
          } else {
            user = recoveredByEmail;
          }
        }
      }
    } else if (!user.first_name && !user.last_name && (metaFirst || metaLast)) {
      const { data: updated } = await supabaseAdmin
        .from("users")
        .update({ first_name: metaFirst, last_name: metaLast })
        .eq("id", user.id)
        .select("*")
        .single();
      user = updated || user;
    }

    if (!user) {
      return res.status(500).json({
        status: "error",
        message: "Unable to sync user profile",
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          firstName: user!.first_name,
          lastName: user!.last_name,
          avatarUrl: user!.avatar_url,
          role: user!.role,
        },
        session: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    next(error);
  }
};
