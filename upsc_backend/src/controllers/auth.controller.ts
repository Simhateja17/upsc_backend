import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { supabase, supabaseAdmin } from "../config/supabase";
import { sendWelcomeEmail } from "../services/emailService";

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
    console.log(`[Signup] Attempt for email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: "error", message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: "error", message: "Password must be at least 6 characters" });
    }

    // Check if user already exists via REST
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({ status: "error", message: "An account with this email already exists" });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({ status: "error", message: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ status: "error", message: "Failed to create user account" });
    }

    // Create user in our database via REST
    const { data: user, error: createErr } = await supabaseAdmin
      .from("users")
      .insert({
        id: randomUUID(),
        supabase_id: authData.user.id,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        phone,
        email_verified: !!authData.user.email_confirmed_at,
      })
      .select("id, email, first_name, last_name, role")
      .single();

    if (createErr || !user) {
      console.error("Failed to create user record:", createErr);
      return res.status(500).json({ status: "error", message: "Failed to create user record" });
    }

    console.log(`[Signup] User created successfully: ${user.email} (${user.id})`);

    sendWelcomeEmail(email, firstName || "").catch((err) =>
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
    console.log(`[Login] Attempt for email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are required" });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      console.error("Login error:", authError);
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    // Get user from our database via REST
    let { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("supabase_id", authData.user.id)
      .single();

    if (!user) {
      const { data: newUser } = await supabaseAdmin
        .from("users")
        .insert({
          id: randomUUID(),
          supabase_id: authData.user.id,
          email: authData.user.email!.toLowerCase(),
          first_name: authData.user.user_metadata?.first_name,
          last_name: authData.user.user_metadata?.last_name,
          email_verified: !!authData.user.email_confirmed_at,
        })
        .select("*")
        .single();
      user = newUser;
    }

    if (authData.user.email_confirmed_at && !user?.email_verified) {
      await supabaseAdmin
        .from("users")
        .update({ email_verified: true })
        .eq("id", user!.id);
    }

    console.log(`[Login] Successful for: ${user!.email} (${user!.id})`);
    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          firstName: user!.first_name,
          lastName: user!.last_name,
          avatarUrl: user!.avatar_url,
          role: user!.role,
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
