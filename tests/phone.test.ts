import { describe, expect, it } from "vitest";
import { normalizeIndianPhone } from "../src/utils/phone";

describe("normalizeIndianPhone", () => {
  it("accepts a plain 10 digit Indian mobile number", () => {
    expect(normalizeIndianPhone("9553577814")).toBe("+919553577814");
  });

  it("accepts common Indian phone number formats", () => {
    expect(normalizeIndianPhone("+91 95535 77814")).toBe("+919553577814");
    expect(normalizeIndianPhone("00919553577814")).toBe("+919553577814");
    expect(normalizeIndianPhone("09553577814")).toBe("+919553577814");
    expect(normalizeIndianPhone("95535-77814")).toBe("+919553577814");
  });

  it("ignores invisible format characters that can come from pasted input", () => {
    expect(normalizeIndianPhone("95535\u200B77814")).toBe("+919553577814");
  });

  it("throws a 400 validation error for invalid mobile numbers", () => {
    expect(() => normalizeIndianPhone("5553577814")).toThrow("Enter a valid 10 digit Indian mobile number");
    try {
      normalizeIndianPhone("5553577814");
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(400);
    }
  });
});
