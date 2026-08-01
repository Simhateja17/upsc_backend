export type PaidPlanTier = "aspire" | "rise" | "ascent";
export type PaidBillingCycle = "monthly" | "quarterly" | "yearly";

export const CANONICAL_PAID_PLAN_PRICES: Record<PaidPlanTier, Record<PaidBillingCycle, number>> = {
  aspire: { monthly: 199, quarterly: 479, yearly: 1439 },
  rise: { monthly: 499, quarterly: 1197, yearly: 3599 },
  ascent: { monthly: 1999, quarterly: 4799, yearly: 14399 },
};

export type RazorpayPlanShape = {
  period?: string;
  interval?: number | string;
  item?: {
    amount?: number | string;
    currency?: string;
  };
};

export type PaidPlanShape = {
  tier: string;
  billingCycle: string;
  price: number;
};

export function canonicalPaidPlanPrice(tier: string, billingCycle: string) {
  if (!isPaidPlanTier(tier) || !isPaidBillingCycle(billingCycle)) return undefined;
  return CANONICAL_PAID_PLAN_PRICES[tier][billingCycle];
}

export function planAmountPaise(priceInRupees: number) {
  if (!Number.isFinite(priceInRupees) || priceInRupees <= 0) {
    throw new Error(`Invalid pricing-plan amount: ${priceInRupees}`);
  }

  // PricingPlan.price is always stored in rupees. Do not infer units from
  // the magnitude: ₹14,399 must become 1,439,900 paise, not 14,399 paise.
  return Math.round(priceInRupees * 100);
}

export function isRazorpayPlanCompatible(
  remote: RazorpayPlanShape,
  priceInRupees: number,
  billingCycle: PaidBillingCycle,
) {
  const expectedPeriod = billingCycle === "yearly" ? "yearly" : "monthly";
  const expectedInterval = billingCycle === "quarterly" ? 3 : 1;

  return (
    Number(remote.item?.amount) === planAmountPaise(priceInRupees) &&
    (remote.item?.currency || "INR") === "INR" &&
    remote.period === expectedPeriod &&
    Number(remote.interval) === expectedInterval
  );
}

export function validateCanonicalPaidPlanCatalog(plans: PaidPlanShape[]) {
  const expectedKeys = Object.entries(CANONICAL_PAID_PLAN_PRICES).flatMap(([tier, cycles]) =>
    Object.keys(cycles).map((billingCycle) => `${tier}:${billingCycle}`),
  );
  const keyCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    const key = `${plan.tier}:${plan.billingCycle}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const actualKeys = new Set(Object.keys(keyCounts));
  const missing = expectedKeys.filter((key) => !actualKeys.has(key));
  const duplicates = Object.entries(keyCounts)
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const mismatched = plans
    .map((plan) => {
      const expected = canonicalPaidPlanPrice(plan.tier, plan.billingCycle);
      return expected !== undefined && plan.price !== expected
        ? { key: `${plan.tier}:${plan.billingCycle}`, actual: plan.price, expected }
        : null;
    })
    .filter((value): value is { key: string; actual: number; expected: number } => value !== null);

  return { missing, duplicates, mismatched };
}

function isPaidPlanTier(value: string): value is PaidPlanTier {
  return value === "aspire" || value === "rise" || value === "ascent";
}

function isPaidBillingCycle(value: string): value is PaidBillingCycle {
  return value === "monthly" || value === "quarterly" || value === "yearly";
}
