/**
 * Shared admin utility: safely extract first value from Express query params.
 */
export function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}
