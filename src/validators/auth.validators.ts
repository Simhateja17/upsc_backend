import { z } from "zod";

export const signupBody = z.object({
  email: z.string().email("Invalid email format").transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const loginBody = z.object({
  email: z.string().email("Invalid email format").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const phoneOtpSendBody = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

export const phoneOtpVerifyBody = z.object({
  purpose: z.enum(["login", "signup", "link"]),
  phone: z.string().min(1, "Phone number is required"),
  token: z.string().regex(/^\d{6,10}$/, "OTP must be a 6 to 10 digit code"),
  profile: z
    .object({
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().min(1).optional(),
    })
    .optional(),
});
