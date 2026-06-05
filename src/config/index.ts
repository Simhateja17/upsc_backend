import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  cors: {
    origins: (process.env.CORS_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
  phoneAuth: {
    enabled: process.env.PHONE_AUTH_ENABLED === "true",
    twoFactorApiKey: process.env.TWOFACTOR_API_KEY || "",
    sendSmsHookSecrets: process.env.SEND_SMS_HOOK_SECRETS || "",
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
  },
};

export default config;
