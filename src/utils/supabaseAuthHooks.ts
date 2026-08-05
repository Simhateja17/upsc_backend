import { normalizeIndianPhone } from "./phone";

export interface SendSmsHookPayload {
  phone: string;
  otp: string;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function parseSendSmsHookPayload(event: any): SendSmsHookPayload {
  const phone = normalizeIndianPhone(
    firstString(
      event?.sms?.phone,
      event?.sms?.phone_number,
      event?.user?.new_phone,
      event?.user?.phone_change,
      event?.user?.phone,
      event?.user?.identities?.[0]?.identity_data?.phone
    )
  );
  const otp = firstString(event?.sms?.otp, event?.sms?.token);

  if (!/^\d{6,10}$/.test(otp)) {
    const err = new Error("Send SMS hook payload is missing a valid OTP");
    (err as any).statusCode = 400;
    throw err;
  }

  return { phone, otp };
}

export function toSupabaseHookError(error: any) {
  const status = error?.statusCode || 500;
  return {
    status,
    body: {
      error: {
        http_code: status,
        message: error?.message || "Failed to send SMS",
      },
    },
  };
}
