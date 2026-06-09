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

const indianPhone = z
  .string()
  .transform((phone) => phone.replace(/\D/g, ""))
  .refine(
    (digits) => /^(?:91)?[6-9]\d{9}$/.test(digits),
    "Enter a valid 10-digit Indian mobile number"
  )
  .transform((digits) => `+91${digits.length === 12 ? digits.slice(2) : digits}`);

export const phoneOtpSendBody = z.object({
  phone: indianPhone,
});

export const phoneOtpVerifyBody = z.object({
  purpose: z.enum(["signup", "login", "link"]),
  phone: indianPhone,
  token: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  profile: z
    .object({
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().optional(),
    })
    .optional(),
});
