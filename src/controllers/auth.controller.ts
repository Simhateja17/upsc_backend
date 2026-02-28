import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import prisma from "../config/database";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists",
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({
        status: "error",
        message: authError.message,
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        status: "error",
        message: "Failed to create user account",
      });
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        emailVerified: !!authData.user.email_confirmed_at,
      },
    });

    // If email confirmation is required, session will be null
    // In that case, we still return success but without session
    if (!authData.session) {
      res.status(201).json({
        status: "success",
        message: "Account created successfully. Please check your email to verify your account.",
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          session: null,
          requiresEmailVerification: true,
        },
      });
      return;
    }

    res.status(201).json({
      status: "success",
      message: "Account created successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
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

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

    if (authError) {
      console.error("Login error:", authError);
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Get user from our database
    let user = await prisma.user.findUnique({
      where: { supabaseId: authData.user.id },
    });

    // If user doesn't exist in our DB (e.g., created via Google OAuth), create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: authData.user.email!.toLowerCase(),
          firstName: authData.user.user_metadata?.first_name,
          lastName: authData.user.user_metadata?.last_name,
          emailVerified: !!authData.user.email_confirmed_at,
        },
      });
    }

    // Update email verified status if changed
    if (authData.user.email_confirmed_at && !user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
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
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Get user from our database
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (invalidate session)
 * POST /api/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    }

    res.json({
      status: "success",
      message: "Logged out successfully",
    });
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
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required",
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
      });
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
    const redirectUrl = process.env.GOOGLE_REDIRECT_URL || "http://localhost:3000/auth/callback";
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }

    res.json({
      status: "success",
      data: {
        url: data.url,
      },
    });
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

    if (!accessToken) {
      return res.status(400).json({
        status: "error",
        message: "Access token is required",
      });
    }

    // Get user from Supabase
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !authUser) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    // Create user if doesn't exist
    if (!user) {
      const metadata = authUser.user_metadata || {};
      user = await prisma.user.create({
        data: {
          supabaseId: authUser.id,
          email: authUser.email!.toLowerCase(),
          firstName: metadata.first_name || metadata.full_name?.split(" ")[0],
          lastName: metadata.last_name || metadata.full_name?.split(" ").slice(1).join(" "),
          avatarUrl: metadata.avatar_url || metadata.picture,
          emailVerified: !!authUser.email_confirmed_at,
        },
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
        },
        session: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
