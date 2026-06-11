import { describe, expect, it } from "vitest";
import { parseSendSmsHookPayload, toSupabaseHookError } from "../src/utils/supabaseAuthHooks";

describe("parseSendSmsHookPayload", () => {
  it("uses sms.phone for phone-change hook payloads", () => {
    expect(
      parseSendSmsHookPayload({
        user: { phone: "" },
        sms: { phone: "+91 93463 74344", otp: "123456" },
      })
    ).toEqual({ phone: "+919346374344", otp: "123456" });
  });

  it("falls back to user phone fields", () => {
    expect(
      parseSendSmsHookPayload({
        user: { new_phone: "9346374344" },
        sms: { otp: "654321" },
      })
    ).toEqual({ phone: "+919346374344", otp: "654321" });
  });

  it("throws a 400 when the hook payload is missing an OTP", () => {
    expect(() =>
      parseSendSmsHookPayload({
        user: { phone: "9346374344" },
        sms: {},
      })
    ).toThrow("Send SMS hook payload is missing a valid OTP");
  });
});

describe("toSupabaseHookError", () => {
  it("formats errors in Supabase Auth hook shape", () => {
    const error = new Error("SMS provider rejected the request") as Error & { statusCode?: number };
    error.statusCode = 400;

    expect(toSupabaseHookError(error)).toEqual({
      status: 400,
      body: {
        error: {
          http_code: 400,
          message: "SMS provider rejected the request",
        },
      },
    });
  });
});
