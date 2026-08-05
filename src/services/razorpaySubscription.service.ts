import crypto from "crypto";
import Razorpay from "razorpay";

export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type PlanTier = "aspire" | "rise" | "ascent";

export type RazorpayPlanCreateInput = {
  name: string;
  amountPaise: number;
  currency?: string;
  cycle: BillingCycle;
  notes?: Record<string, string>;
};

export type RazorpaySubscriptionCreateInput = {
  planId: string;
  cycle: BillingCycle;
  notes: Record<string, string>;
  offerId?: string;
};

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error("Razorpay credentials are not configured");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  return { keyId, keySecret };
}

function getClient(): any {
  const { keyId, keySecret } = getCredentials();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  }) as any;
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID;
}

export function totalCountForCycle(cycle: BillingCycle) {
  if (cycle === "monthly") return 120;
  if (cycle === "quarterly") return 40;
  return 10;
}

function periodForCycle(cycle: BillingCycle) {
  if (cycle === "monthly") return "monthly";
  if (cycle === "quarterly") return "monthly";
  return "yearly";
}

function intervalForCycle(cycle: BillingCycle) {
  return cycle === "quarterly" ? 3 : 1;
}

export function unixToDate(value: unknown): Date | undefined {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return new Date(numeric * 1000);
}

export function fallbackEndDateFromCycle(start: Date, cycle: BillingCycle) {
  const end = new Date(start);
  if (cycle === "monthly") end.setMonth(end.getMonth() + 1);
  else if (cycle === "quarterly") end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

export async function createRazorpayPlan(input: RazorpayPlanCreateInput) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    const error = new Error("Minimum plan amount is 100 paise");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  return getClient().plans.create({
    period: periodForCycle(input.cycle),
    interval: intervalForCycle(input.cycle),
    item: {
      name: input.name,
      amount: input.amountPaise,
      currency: input.currency || "INR",
    },
    notes: input.notes,
  });
}

export async function fetchRazorpayPlan(planId: string) {
  return getClient().plans.fetch(planId);
}

export async function createRazorpaySubscription(input: RazorpaySubscriptionCreateInput) {
  const payload: Record<string, unknown> = {
    plan_id: input.planId,
    total_count: totalCountForCycle(input.cycle),
    quantity: 1,
    customer_notify: 1,
    notes: input.notes,
  };

  if (input.offerId) payload.offer_id = input.offerId;

  return getClient().subscriptions.create(payload);
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return getClient().subscriptions.fetch(subscriptionId);
}

export async function cancelRazorpaySubscription(subscriptionId: string, cancelAtCycleEnd = true) {
  return getClient().subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

export async function pauseRazorpaySubscription(subscriptionId: string) {
  return getClient().subscriptions.pause(subscriptionId, { pause_at: "now" });
}

export async function resumeRazorpaySubscription(subscriptionId: string) {
  return getClient().subscriptions.resume(subscriptionId, { resume_at: "now" });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return getClient().payments.fetch(paymentId);
}

export function verifySubscriptionCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  const { keySecret } = getCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.paymentId}|${params.subscriptionId}`)
    .digest("hex");

  return timingSafeHexEqual(expected, params.signature);
}

export function verifyWebhookSignature(rawBody: string, signature?: string | string[]) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const actual = Array.isArray(signature) ? signature[0] : signature;

  if (!secret || !actual) {
    return process.env.NODE_ENV !== "production" && process.env.RAZORPAY_WEBHOOK_ALLOW_UNSIGNED_DEV === "true";
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeHexEqual(expected, actual);
}

function timingSafeHexEqual(expected: string, actual: string) {
  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(actual, "hex");
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}
