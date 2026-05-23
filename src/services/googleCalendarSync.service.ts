import crypto from "crypto";
import prisma from "../config/database";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const PRIMARY_CALENDAR_ID = "primary";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

type StudyPlanTaskForSync = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  type?: string | null;
  date: Date;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: Date;
  googleCalendarEventId?: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "";
}

function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

function redirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_REDIRECT_URI ||
    "http://localhost:3000/auth/google-calendar/callback"
  );
}

function signingSecret(): string {
  return process.env.GOOGLE_CALENDAR_STATE_SECRET || googleClientSecret();
}

function encryptionSecret(): string {
  return process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || googleClientSecret();
}

function assertGoogleConfig() {
  if (!googleClientId() || !googleClientSecret()) {
    throw new Error("Google Calendar OAuth is not configured");
  }
}

function encrypt(value: string): string {
  const secret = encryptionSecret();
  if (!secret) throw new Error("Google token encryption secret is not configured");
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decrypt(value: string): string {
  if (!value.startsWith("v1:")) return value;
  const [, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  const secret = encryptionSecret();
  if (!secret || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Google token encryption secret is not configured");
  }
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function createState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      nonce: crypto.randomBytes(16).toString("hex"),
      exp: Date.now() + 10 * 60 * 1000,
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function validateState(state: string, userId: string): void {
  if (!signingSecret()) throw new Error("Google Calendar OAuth state secret is not configured");
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid Google Calendar OAuth state");
  const expected = crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid Google Calendar OAuth state");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string; exp: number };
  if (parsed.userId !== userId || Date.now() > parsed.exp) {
    throw new Error("Expired Google Calendar OAuth state");
  }
}

function datePart(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayDatePart(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isValidTime(value?: string | null): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function hasUsableTimeRange(task: StudyPlanTaskForSync): boolean {
  if (!isValidTime(task.startTime) || !isValidTime(task.endTime)) return false;
  return task.endTime > task.startTime;
}

function shouldCreateEventForTask(task: StudyPlanTaskForSync, enabledAt?: Date | null): boolean {
  if (!enabledAt || task.createdAt < enabledAt) return false;
  if (datePart(task.date) < todayDatePart()) return false;
  return hasUsableTimeRange(task);
}

function eventPayload(task: StudyPlanTaskForSync, timezone: string) {
  const date = datePart(task.date);
  const descriptionParts = [
    task.description,
    task.subject ? `Subject: ${task.subject}` : null,
    task.type ? `Type: ${task.type}` : null,
    "Created by RiseWithJeet Study Planner.",
  ].filter(Boolean);

  return {
    summary: task.title,
    description: descriptionParts.join("\n"),
    start: { dateTime: `${date}T${task.startTime}:00`, timeZone: timezone },
    end: { dateTime: `${date}T${task.endTime}:00`, timeZone: timezone },
  };
}

async function parseGoogleResponse<T>(response: Response): Promise<T> {
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.error_description || body?.error || `Google API error ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

async function refreshAccessToken(setting: any): Promise<string> {
  if (!setting.googleRefreshTokenEncrypted) {
    throw new Error("Google Calendar refresh token is missing");
  }

  const refreshToken = decrypt(setting.googleRefreshTokenEncrypted);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const token = await parseGoogleResponse<GoogleTokenResponse>(response);
  if (!token.access_token) throw new Error("Google did not return an access token");

  await prisma.calendarSyncSetting.update({
    where: { userId: setting.userId },
    data: {
      googleAccessTokenEncrypted: encrypt(token.access_token),
      googleTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      lastSyncError: null,
    },
  });

  return token.access_token;
}

async function getAccessToken(setting: any): Promise<string> {
  if (!setting.googleAccessTokenEncrypted) throw new Error("Google Calendar access token is missing");
  const expiresAt = setting.googleTokenExpiresAt ? new Date(setting.googleTokenExpiresAt).getTime() : 0;
  if (expiresAt && expiresAt > Date.now() + 60_000) {
    return decrypt(setting.googleAccessTokenEncrypted);
  }
  return refreshAccessToken(setting);
}

async function getEnabledSetting(userId: string) {
  const setting = await prisma.calendarSyncSetting.findUnique({ where: { userId } });
  if (!setting?.enabled) return null;
  return setting;
}

async function markTaskSyncError(taskId: string, message: string) {
  await prisma.studyPlanTask.update({
    where: { id: taskId },
    data: { googleCalendarSyncError: message.slice(0, 1000) },
  }).catch(() => {});
}

export async function getGoogleCalendarSyncStatus(userId: string) {
  const setting = await prisma.calendarSyncSetting.findUnique({ where: { userId } });
  return {
    connected: !!setting?.googleRefreshTokenEncrypted,
    enabled: !!setting?.enabled,
    provider: "google",
    calendarId: setting?.googleCalendarId || PRIMARY_CALENDAR_ID,
    timezone: setting?.timezone || DEFAULT_TIMEZONE,
    connectedAt: setting?.connectedAt || null,
    lastSyncError: setting?.lastSyncError || null,
  };
}

export function createGoogleCalendarAuthUrl(userId: string): string {
  assertGoogleConfig();
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: createState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function completeGoogleCalendarOAuth(userId: string, code: string, state: string) {
  assertGoogleConfig();
  validateState(state, userId);

  const existing = await prisma.calendarSyncSetting.findUnique({ where: { userId } });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });

  const token = await parseGoogleResponse<GoogleTokenResponse>(response);
  if (!token.access_token) throw new Error("Google did not return an access token");
  const refreshToken = token.refresh_token
    ? encrypt(token.refresh_token)
    : existing?.googleRefreshTokenEncrypted;

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect with consent and try again.");
  }

  const setting = await prisma.calendarSyncSetting.upsert({
    where: { userId },
    create: {
      userId,
      provider: "google",
      enabled: true,
      enabledAt: new Date(),
      googleAccessTokenEncrypted: encrypt(token.access_token),
      googleRefreshTokenEncrypted: refreshToken,
      googleTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      googleScope: token.scope || GOOGLE_CALENDAR_SCOPE,
      googleCalendarId: PRIMARY_CALENDAR_ID,
      timezone: DEFAULT_TIMEZONE,
      connectedAt: new Date(),
      lastSyncError: null,
    },
    update: {
      enabled: true,
      enabledAt: new Date(),
      googleAccessTokenEncrypted: encrypt(token.access_token),
      googleRefreshTokenEncrypted: refreshToken,
      googleTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      googleScope: token.scope || GOOGLE_CALENDAR_SCOPE,
      googleCalendarId: PRIMARY_CALENDAR_ID,
      connectedAt: new Date(),
      lastSyncError: null,
    },
  });

  return setting;
}

export async function setGoogleCalendarSyncEnabled(userId: string, enabled: boolean) {
  const existing = await prisma.calendarSyncSetting.findUnique({ where: { userId } });
  if (enabled && !existing?.googleRefreshTokenEncrypted) {
    return { needsAuth: true, authUrl: createGoogleCalendarAuthUrl(userId) };
  }

  const setting = await prisma.calendarSyncSetting.upsert({
    where: { userId },
    create: {
      userId,
      provider: "google",
      enabled,
      enabledAt: enabled ? new Date() : null,
      googleCalendarId: PRIMARY_CALENDAR_ID,
      timezone: DEFAULT_TIMEZONE,
    },
    update: {
      enabled,
      enabledAt: enabled ? new Date() : existing?.enabledAt,
      lastSyncError: enabled ? null : existing?.lastSyncError,
    },
  });

  return { needsAuth: false, setting };
}

export async function syncStudyPlanTaskToGoogle(task: StudyPlanTaskForSync) {
  const setting = await getEnabledSetting(task.userId);
  if (!setting) return;

  try {
    if (!task.googleCalendarEventId && !shouldCreateEventForTask(task, setting.enabledAt)) return;
    if (!hasUsableTimeRange(task)) {
      await markTaskSyncError(task.id, "Task has no valid start/end time for Google Calendar sync");
      return;
    }

    const accessToken = await getAccessToken(setting);
    const calendarId = encodeURIComponent(setting.googleCalendarId || PRIMARY_CALENDAR_ID);
    const payload = eventPayload(task, setting.timezone || DEFAULT_TIMEZONE);
    const url = task.googleCalendarEventId
      ? `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(task.googleCalendarEventId)}`
      : `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`;

    const response = await fetch(url, {
      method: task.googleCalendarEventId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const event = await parseGoogleResponse<{ id: string }>(response);
    await prisma.studyPlanTask.update({
      where: { id: task.id },
      data: {
        googleCalendarEventId: event.id,
        googleCalendarSyncedAt: new Date(),
        googleCalendarSyncError: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar sync failed";
    await Promise.allSettled([
      markTaskSyncError(task.id, message),
      prisma.calendarSyncSetting.update({
        where: { userId: task.userId },
        data: { lastSyncError: message.slice(0, 1000) },
      }),
    ]);
  }
}

export async function deleteStudyPlanTaskFromGoogle(task: StudyPlanTaskForSync) {
  if (!task.googleCalendarEventId) return;
  const setting = await getEnabledSetting(task.userId);
  if (!setting) return;

  try {
    const accessToken = await getAccessToken(setting);
    const calendarId = encodeURIComponent(setting.googleCalendarId || PRIMARY_CALENDAR_ID);
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(task.googleCalendarEventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.status !== 404 && response.status !== 410 && !response.ok) {
      await parseGoogleResponse(response);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar delete failed";
    await prisma.calendarSyncSetting.update({
      where: { userId: task.userId },
      data: { lastSyncError: message.slice(0, 1000) },
    }).catch(() => {});
  }
}
