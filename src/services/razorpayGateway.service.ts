import crypto from "crypto";
import Razorpay from "razorpay";

export type RazorpayOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
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

function getClient() {
  const { keyId, keySecret } = getCredentials();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function createRazorpayOrder(input: RazorpayOrderInput) {
  if (!Number.isInteger(input.amount) || input.amount < 100) {
    const error = new Error("Minimum order amount is 100 paise");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  return getClient().orders.create({
    amount: input.amount,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });
}

export async function fetchRazorpayOrder(orderId: string) {
  return getClient().orders.fetch(orderId);
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = getCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(params.signature, "hex");

  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
