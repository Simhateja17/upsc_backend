import { Request, Response, NextFunction } from "express";
import { randomInt } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import config from "../config";
import { VALID_OPTIONAL_SUBJECTS } from "../constants/subjects";
import { sendOtpEmail, sendPhoneOtpEmail } from "../services/emailService";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

async function sendSmsViaTwoFactor(phone: string, otp: string) {
  if (!config.phoneAuth.twoFactorApiKey) {
    throw new Error("2Factor API key is not configured. Set TWOFACTOR_API_KEY in .env");
  }
  const digits = phone.replace(/^\+/, "");
  const templateName = config.phoneAuth.twoFactorOtpTemplateName || "OTP";
  const url = `https://2factor.in/API/V1/${encodeURIComponent(config.phoneAuth.twoFactorApiKey)}/SMS/${encodeURIComponent(digits)}/${encodeURIComponent(otp)}/${encodeURIComponent(templateName)}`;
  const response = await fetch(url, { method: "GET" });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok || payload?.Status === "Error") {
    throw new Error(payload?.Details || payload?.raw || "2Factor SMS send failed");
  }
  return payload;
}

/**
 * GET /api/user/profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, phone, avatar_url, bio, settings, created_at")
      .eq("id", req.user!.id)
      .single();

    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const settings = (user.settings as Record<string, any>) || {};
    const profileExtra = settings.profile || {};

    res.json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        settings: user.settings || {},
        createdAt: user.created_at,
        state: profileExtra.state || "",
        targetYear: profileExtra.targetYear || "",
        optionalSubject: profileExtra.optionalSubject || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, bio, state, targetYear, optionalSubject } = req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;

    // Merge profile extras into settings JSON
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const profileExtra: Record<string, any> = { ...currentSettings.profile };
    if (state !== undefined) profileExtra.state = state;
    if (targetYear !== undefined) profileExtra.targetYear = targetYear;
    if (optionalSubject !== undefined) {
      if (optionalSubject && !VALID_OPTIONAL_SUBJECTS.includes(optionalSubject as any)) {
        return res.status(400).json({ status: "error", message: `Invalid optionalSubject. Must be one of: ${VALID_OPTIONAL_SUBJECTS.join(", ")}` });
      }
      profileExtra.optionalSubject = optionalSubject;
    }

    const hasProfileExtra = Object.keys(profileExtra).length > 0;
    if (hasProfileExtra) {
      updates.settings = { ...currentSettings, profile: profileExtra };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: "error", message: "No fields to update" });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", req.user!.id)
      .select("id, email, first_name, last_name, phone, avatar_url, bio, settings")
      .single();

    if (error) {
      console.error("[User] updateProfile error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to update profile" });
    }

    const returnedSettings = (user.settings as Record<string, any>) || {};
    const returnedProfile = returnedSettings.profile || {};

    res.json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        settings: user.settings || {},
        state: returnedProfile.state || "",
        targetYear: returnedProfile.targetYear || "",
        optionalSubject: returnedProfile.optionalSubject || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/send-email-otp
 */
export const sendEmailOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: "error", message: "Valid email is required" });
    }

    const otp = String(randomInt(100000, 999999));
    const key = `${req.user!.id}:${email.toLowerCase()}`;
    otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    const sent = await sendOtpEmail(email, otp);
    if (!sent) {
      return res.status(500).json({ status: "error", message: "Failed to send OTP email" });
    }

    res.json({ status: "success", message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/verify-email-otp
 */
export const verifyEmailOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: "error", message: "Email and OTP are required" });
    }

    const key = `${req.user!.id}:${email.toLowerCase()}`;
    const entry = otpStore.get(key);

    if (!entry || entry.otp !== otp) {
      return res.status(400).json({ status: "error", message: "Invalid OTP" });
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ status: "error", message: "OTP has expired. Please request a new one." });
    }

    otpStore.delete(key);

    // Update email in Supabase auth
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("supabase_id")
      .eq("id", req.user!.id)
      .single();

    if (userData?.supabase_id) {
      await supabaseAdmin.auth.admin.updateUserById(userData.supabase_id, { email: email.toLowerCase() });
    }

    // Update email in users table
    await supabaseAdmin
      .from("users")
      .update({ email: email.toLowerCase() })
      .eq("id", req.user!.id);

    res.json({ status: "success", message: "Email verified and updated" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/send-phone-otp
 */
export const sendPhoneOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ status: "error", message: "Valid 10-digit Indian phone number is required" });
    }

    const otp = String(randomInt(100000, 999999));
    const key = `phone:${req.user!.id}:${phone}`;
    otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    await sendSmsViaTwoFactor(`91${phone}`, otp);

    res.json({ status: "success", message: "OTP sent to your phone" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/verify-phone-otp
 */
export const verifyPhoneOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ status: "error", message: "Phone and OTP are required" });
    }

    const key = `phone:${req.user!.id}:${phone}`;
    const entry = otpStore.get(key);

    if (!entry || entry.otp !== otp) {
      return res.status(400).json({ status: "error", message: "Invalid OTP" });
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ status: "error", message: "OTP has expired. Please request a new one." });
    }

    otpStore.delete(key);

    await supabaseAdmin
      .from("users")
      .update({ phone })
      .eq("id", req.user!.id);

    res.json({ status: "success", message: "Phone number verified and updated" });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/settings
 */
/**
 * GET /api/user/sessions
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return current session info based on request metadata
    // In a full implementation this would query an active_sessions table
    const ua = req.headers["user-agent"] || "Unknown";
    const currentSession = {
      id: "current",
      userAgent: ua,
      lastSeenAt: new Date().toISOString(),
      isCurrent: true,
    };
    res.json({ status: "success", data: [currentSession] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/sessions/:id
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (id === "current") {
      return res.status(400).json({ status: "error", message: "Cannot revoke current session via this endpoint" });
    }
    // Mock: in production this would delete the session from DB/Redis
    res.json({ status: "success", message: "Session revoked" });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notifications, preferences, privacy } = req.body;

    // Merge with existing settings
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const merged: Record<string, any> = { ...currentSettings };
    if (notifications !== undefined) merged.notifications = notifications;
    if (preferences !== undefined) merged.preferences = preferences;
    if (privacy !== undefined) merged.privacy = privacy;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ settings: merged })
      .eq("id", req.user!.id);

    if (error) {
      console.error("[User] updateSettings error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to update settings" });
    }

    res.json({ status: "success", data: merged });
  } catch (error) {
    next(error);
  }
};
