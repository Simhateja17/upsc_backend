import { Request, Response, NextFunction } from "express";
import { randomInt } from "crypto";
import prisma from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import config from "../config";
import { VALID_OPTIONAL_SUBJECTS } from "../constants/subjects";
import { sendOtpEmail, sendPhoneOtpEmail } from "../services/emailService";
import { buildStoragePath, getPublicUrl, STORAGE_BUCKETS, uploadFile } from "../config/storage";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

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
        gender: profileExtra.gender || "",
        dateOfBirth: profileExtra.dateOfBirth || "",
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
    const { firstName, lastName, phone, bio, state, targetYear, optionalSubject, gender, dateOfBirth } = req.body;

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
    if (gender !== undefined) profileExtra.gender = gender;
    if (dateOfBirth !== undefined) profileExtra.dateOfBirth = dateOfBirth;
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
        gender: returnedProfile.gender || "",
        dateOfBirth: returnedProfile.dateOfBirth || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/profile/avatar
 */
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: "error", message: "Avatar image is required" });
    }

    if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ status: "error", message: "Avatar must be a JPG or PNG image" });
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return res.status(400).json({ status: "error", message: "Avatar must be 5MB or smaller" });
    }

    const extension = file.mimetype === "image/png" ? "png" : "jpg";
    const path = buildStoragePath(req.user!.id, `avatar-${Date.now()}.${extension}`);
    await uploadFile(STORAGE_BUCKETS.AVATARS, path, file.buffer, file.mimetype);
    const avatarUrl = getPublicUrl(STORAGE_BUCKETS.AVATARS, path);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", req.user!.id)
      .select("id, avatar_url")
      .single();

    if (error) {
      console.error("[User] uploadAvatar profile update error:", error.message);
      return res.status(500).json({ status: "error", message: "Avatar uploaded, but profile update failed" });
    }

    res.json({
      status: "success",
      data: {
        id: user.id,
        avatarUrl: user.avatar_url,
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
// ── Session / device helpers ────────────────────────────────────────────
function parseUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";
  const os = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown OS";
  return `${browser} · ${os}`;
}

function requestLocation(req: Request): string | null {
  const city = (req.headers["x-vercel-ip-city"] || req.headers["cf-ipcity"]) as string | undefined;
  const country = (req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"]) as string | undefined;
  const parts = [city ? decodeURIComponent(city) : null, country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function clientIp(req: Request): string | null {
  const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return fwd || req.ip || null;
}

/**
 * POST /api/user/sessions/register
 * Called by the frontend right after Supabase login. Marks the caller's session
 * as the account's single active session (last-login-wins) and, when enforcement
 * is on, revokes the user's other Supabase sessions.
 */
export const registerSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user!.sessionId;
    if (!sessionId) {
      return res.status(400).json({ status: "error", message: "Token is missing a session_id claim" });
    }

    const ua = (req.headers["user-agent"] as string) || "Unknown";
    const now = new Date().toISOString();
    const meta = {
      device: parseUserAgent(ua),
      userAgent: ua,
      ip: clientIp(req),
      location: requestLocation(req),
      registeredAt: now,
      lastSeenAt: now,
    };

    const { error } = await supabaseAdmin
      .from("users")
      .update({ active_session_id: sessionId, active_session_meta: meta })
      .eq("id", req.user!.id);

    if (error) {
      console.error("[Sessions] register error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to register session" });
    }

    // Belt-and-suspenders: the middleware gate already blocks other sessions,
    // but dropping their Supabase session rows kills their refresh tokens too.
    if (process.env.ENFORCE_SINGLE_SESSION === "true") {
      try {
        await prisma.$executeRaw`
          DELETE FROM auth.sessions
          WHERE user_id = ${req.user!.supabaseId}::uuid
            AND id <> ${sessionId}::uuid`;
      } catch (err) {
        console.warn("[Sessions] could not revoke other auth.sessions:", err);
      }
    }

    res.json({ status: "success", data: { id: sessionId, ...meta, isCurrent: true } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/sessions
 * Returns the single active session for the Active Sessions panel. Also serves
 * as the frontend heartbeat: if the caller's session has been superseded, the
 * auth middleware returns 401 SESSION_SUPERSEDED before this handler runs.
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabaseAdmin
      .from("users")
      .select("active_session_id, active_session_meta")
      .eq("id", req.user!.id)
      .single();

    const activeId = (data?.active_session_id as string | null) ?? null;
    const meta = (data?.active_session_meta as Record<string, any> | null) ?? null;

    if (!activeId) {
      // Not registered yet (e.g. logged in before this feature shipped) — describe
      // the current request so the panel still shows something meaningful.
      const ua = (req.headers["user-agent"] as string) || "Unknown";
      return res.json({
        status: "success",
        data: [{
          id: req.user!.sessionId || "current",
          device: parseUserAgent(ua),
          location: requestLocation(req),
          lastSeenAt: new Date().toISOString(),
          isCurrent: true,
        }],
      });
    }

    res.json({
      status: "success",
      data: [{
        id: activeId,
        device: meta?.device || "Unknown device",
        location: meta?.location || null,
        lastSeenAt: meta?.lastSeenAt || meta?.registeredAt || null,
        isCurrent: req.user!.sessionId === activeId,
      }],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/sessions/:id
 * Single-device model: revoking = sign out everywhere. Clears the active session
 * pointer and drops the user's Supabase sessions; the caller then signs out too.
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabaseAdmin
      .from("users")
      .update({ active_session_id: null, active_session_meta: null })
      .eq("id", req.user!.id);

    try {
      await prisma.$executeRaw`
        DELETE FROM auth.sessions WHERE user_id = ${req.user!.supabaseId}::uuid`;
    } catch (err) {
      console.warn("[Sessions] revoke: could not delete auth.sessions:", err);
    }

    res.json({ status: "success", message: "Signed out on all devices" });
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
