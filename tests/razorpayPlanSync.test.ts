import { describe, expect, it } from "vitest";
import {
  isRazorpayPlanCompatible,
  planAmountPaise,
  validateCanonicalPaidPlanCatalog,
} from "../src/services/razorpayPlanSync.service";

describe("Razorpay paid-plan synchronization", () => {
  it("converts every canonical rupee amount to paise, including Ascent yearly", () => {
    expect(planAmountPaise(199)).toBe(19_900);
    expect(planAmountPaise(14_399)).toBe(1_439_900);
  });

  it("rejects an incomplete or stale pricing catalog before creating Razorpay plans", () => {
    const result = validateCanonicalPaidPlanCatalog([
      { tier: "rise", billingCycle: "monthly", price: 499 },
      { tier: "ascent", billingCycle: "monthly", price: 999 },
    ]);

    expect(result.missing).toContain("aspire:monthly");
    expect(result.missing).toContain("ascent:yearly");
    expect(result.duplicates).toEqual([]);
    expect(result.mismatched).toEqual([{ key: "ascent:monthly", actual: 999, expected: 1999 }]);
  });

  it("only reuses a Razorpay plan with the matching amount and billing interval", () => {
    expect(
      isRazorpayPlanCompatible(
        { period: "monthly", interval: 1, item: { amount: 199_900, currency: "INR" } },
        1999,
        "monthly",
      ),
    ).toBe(true);
    expect(
      isRazorpayPlanCompatible(
        { period: "monthly", interval: 1, item: { amount: 99_900, currency: "INR" } },
        1999,
        "monthly",
      ),
    ).toBe(false);
  });
});
