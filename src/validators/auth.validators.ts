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
