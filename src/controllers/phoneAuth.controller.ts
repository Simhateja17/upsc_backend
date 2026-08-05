import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { Webhook } from "standardwebhooks";
import config from "../config";
import { supabaseAdmin } from "../config/supabase";
import { normalizeIndianPhone } from "../utils/phone";
import { parseSendSmsHookPayload, toSupabaseHookError } from "../utils/supabaseAuthHooks";

type PhonePurpose = "login" | "signup" | "link";

interface VerifyPhoneBody {
  purpose: PhonePurpose;
  phone: string;
  token: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  user_metadata?: Record<string, any>;
}

function ensurePhoneAuthEnabled(res: Response): boolean {
  if (config.phoneAuth.enabled) return true;
  res.status(404).json({ status: "error", message: "Phone authentication is not enabled" });
  return false;
}

function phoneForTwoFactor(phone: string): string {
  return phone.replace(/^\+/, "");
}

async function findUserByPhone(phone: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("[PhoneAuth] findUserByPhone failed:", error.message, error.code);
  }

  return data || null;
}

async function ensureNoPhoneConflict(phone: string, currentUserId?: string) {
  const existing = await findUserByPhone(phone);
  if (existing && existing.id !== currentUserId) {
    const err = new Error("This phone number is already linked to another account. Please contact support.");
    (err as any).statusCode = 409;
    throw err;
  }
}

function toUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email || "",
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    role: user.role,
    emailVerified: !!user.email_verified,
    createdAt: user.created_at,
  };
}

async function syncPublicUser(authUser: SupabaseAuthUser, patch: Record<string, any> = {}) {
  const metadata = authUser.user_metadata || {};
  const email = authUser.email?.toLowerCase() || null;
  const phone = authUser.phone || patch.phone || null;

  const base = {
    email,
    phone,
    first_name:
      patch.first_name ??
      metadata.first_name ??
      metadata.firstName ??
      metadata.full_name?.split(" ")[0] ??
      null,
    last_name:
      patch.last_name ??
      metadata.last_name ??
      metadata.lastName ??
      metadata.full_name?.split(" ").slice(1).join(" ") ??
      null,
    avatar_url: metadata.avatar_url || metadata.picture || null,
    email_verified: !!authUser.email_confirmed_at,
    ...patch,
  };

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("supabase_id", authUser.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[PhoneAuth] sync lookup failed:", lookupError.message, lookupError.code);
  }

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from("users")
      .update(base)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update user profile: ${error.message}`);
    return updated;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: randomUUID(),
      supabase_id: authUser.id,
      role: "user",
      is_active: true,
      ...base,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create user profile: ${error.message}`);
  return inserted;
}

async function supabaseAuthRequest<T>(
  path: string,
  body: Record<string, any>,
  accessToken?: string,
  method: "POST" | "PUT" = "POST"
): Promise<T> {
  const res = await fetch(`${config.supabase.url}/auth/v1${path}`, {
    method,
    headers: {
      apikey: config.supabase.anonKey,
      Authorization: `Bearer ${accessToken || config.supabase.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = new Error(json.error_description || json.msg || json.message || "Supabase auth request failed");
    (err as any).statusCode = res.status;
    throw err;
  }

  return json as T;
}

async function startOtp(phone: string, shouldCreateUser: boolean) {
  await supabaseAuthRequest("/otp", {
    phone,
    create_user: shouldCreateUser,
  });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export const sendPhoneLoginOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!ensurePhoneAuthEnabled(res)) return;
    const phone = normalizeIndianPhone(req.body.phone);
    const existing = await findUserByPhone(phone);

    if (!existing) {
      return res.status(404).json({
        status: "error",
        message: "No account found with this phone number. Create an account or sign in with email.",
      });
    }

    await startOtp(phone, false);
    res.json({ status: "success", message: "OTP sent successfully", data: { phone } });
  } catch (error) {
    next(error);
  }
};

export const sendPhoneSignupOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!ensurePhoneAuthEnabled(res)) return;
    const phone = normalizeIndianPhone(req.body.phone);
    await ensureNoPhoneConflict(phone);
    await startOtp(phone, true);
    res.json({ status: "success", message: "OTP sent successfully", data: { phone } });
  } catch (error) {
    next(error);
  }
};

export const sendPhoneLinkOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!ensurePhoneAuthEnabled(res)) return;
    if (!req.user) return res.status(401).json({ status: "error", message: "Not authenticated" });

    const accessToken = bearerToken(req);
    if (!accessToken) return res.status(401).json({ status: "error", message: "Access token is required" });

    const phone = normalizeIndianPhone(req.body.phone);
    await ensureNoPhoneConflict(phone, req.user.id);

    await supabaseAuthRequest("/user", { phone }, accessToken, "PUT");
    res.json({ status: "success", message: "OTP sent successfully", data: { phone } });
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOtp = async (
  req: Request<{}, {}, VerifyPhoneBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!ensurePhoneAuthEnabled(res)) return;
    const purpose = req.body.purpose;
    const phone = normalizeIndianPhone(req.body.phone);

    if (purpose === "signup") {
      if (!req.body.profile?.firstName?.trim() || !req.body.profile?.lastName?.trim()) {
        return res.status(400).json({
          status: "error",
          message: "First name and last name are required to create an account",
        });
      }
      await ensureNoPhoneConflict(phone);
    }

    if (purpose === "link") {
      const accessToken = bearerToken(req);
      if (!accessToken) return res.status(401).json({ status: "error", message: "Access token is required" });
      if (!req.user) {
        const { data: authData, error } = await supabaseAdmin.auth.getUser(accessToken);
        if (error || !authData.user) return res.status(401).json({ status: "error", message: "Invalid token" });
      }
      await supabaseAuthRequest("/verify", { phone, token: req.body.token, type: "phone_change" }, accessToken);
      const { data: authData, error } = await supabaseAdmin.auth.getUser(accessToken);
      if (error || !authData.user) return res.status(401).json({ status: "error", message: "Invalid token" });
      const user = await syncPublicUser(authData.user as SupabaseAuthUser, { phone });
      return res.json({ status: "success", message: "Phone linked successfully", data: { user: toUserResponse(user), session: null } });
    }

    const authResponse = await supabaseAuthRequest<{
      access_token: string;
      refresh_token: string;
      expires_at?: number;
      user: SupabaseAuthUser;
    }>("/verify", { phone, token: req.body.token, type: "sms" });

    const session: SupabaseAuthSession = {
      access_token: authResponse.access_token,
      refresh_token: authResponse.refresh_token,
      expires_at: authResponse.expires_at,
    };

    let authUser = authResponse.user;
    if (!authUser && session.access_token) {
      const { data } = await supabaseAdmin.auth.getUser(session.access_token);
      authUser = data.user as SupabaseAuthUser;
    }

    if (!authUser) {
      return res.status(401).json({ status: "error", message: "OTP verification failed" });
    }

    const profilePatch =
      purpose === "signup"
        ? {
            first_name: req.body.profile!.firstName!.trim(),
            last_name: req.body.profile!.lastName!.trim(),
            phone,
          }
        : { phone };

    if (purpose === "signup") {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...(authUser.user_metadata || {}),
          first_name: profilePatch.first_name,
          last_name: profilePatch.last_name,
        },
      });
    }

    const user = await syncPublicUser(authUser, profilePatch);

    res.json({
      status: "success",
      message: "Phone OTP verified successfully",
      data: {
        user: toUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

function verifySendSmsHook(req: Request) {
  const rawBody = (req as any).rawBody;
  if (!rawBody) throw new Error("Missing raw request body");
  if (!config.phoneAuth.sendSmsHookSecrets) throw new Error("Send SMS hook secret is not configured");

  const headers = Object.fromEntries(
    Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value || ""])
  );

  const secrets = config.phoneAuth.sendSmsHookSecrets
    .split("|")
    .map((secret) => secret.trim())
    .filter(Boolean)
    .map((secret) => secret.replace(/^v1,whsec_/, ""));

  for (const secret of secrets) {
    try {
      return new Webhook(secret).verify(rawBody, headers);
    } catch {
      // Try next secret to allow rotation.
    }
  }

  const err = new Error("Invalid Send SMS hook signature");
  (err as any).statusCode = 401;
  throw err;
}

async function sendTwoFactorOtp(phone: string, otp: string) {
  if (!config.phoneAuth.twoFactorApiKey) {
    throw new Error("2Factor API key is not configured");
  }

  const templateName = config.phoneAuth.twoFactorOtpTemplateName || "OTP";
  const url = `https://2factor.in/API/V1/${encodeURIComponent(config.phoneAuth.twoFactorApiKey)}/SMS/${encodeURIComponent(phoneForTwoFactor(phone))}/${encodeURIComponent(otp)}/${encodeURIComponent(templateName)}`;
  const response = await fetch(url, { method: "GET" });
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok || payload?.Status === "Error") {
    const err = new Error(payload?.Details || payload?.raw || "2Factor SMS send failed");
    (err as any).statusCode = response.status >= 500 || response.status === 429 ? 503 : 400;
    throw err;
  }

  return payload;
}

export const sendSmsHook = async (req: Request, res: Response) => {
  try {
    if (!ensurePhoneAuthEnabled(res)) return;
    const event = verifySendSmsHook(req) as any;
    const { phone, otp } = parseSendSmsHookPayload(event);

    await sendTwoFactorOtp(phone, otp);
    res.json({ ok: true });
  } catch (error: any) {
    const hookError = toSupabaseHookError(error);
    console.warn("[PhoneAuth] Send SMS hook failed:", {
      statusCode: hookError.status,
      message: error?.message || "Failed to send SMS",
      requestId: req.id,
      hasRawBody: !!(req as any).rawBody,
      contentType: req.headers["content-type"] || null,
      contentLength: req.headers["content-length"] || null,
    });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (hookError.status === 429 || hookError.status === 503) headers["retry-after"] = "true";
    res.status(hookError.status).set(headers).json(hookError.body);
  }
};
