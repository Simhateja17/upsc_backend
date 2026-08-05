export function normalizeIndianPhone(input: string): string {
  const compact = input.trim().replace(/[\s\p{Cf}().-]/gu, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (digits.startsWith("0091")) digits = digits.slice(2);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

  if (!/^[6-9]\d{9}$/.test(digits)) {
    const err = new Error("Enter a valid 10 digit Indian mobile number");
    (err as any).statusCode = 400;
    throw err;
  }

  return `+91${digits}`;
}
