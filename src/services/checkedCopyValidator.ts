export function validateCheckedCopy(original: Buffer, generated: Buffer): { ok: boolean; reason?: string } {
  if (generated.length < Math.max(1024, original.length * 0.15)) {
    return { ok: false, reason: "Generated checked copy is unexpectedly small" };
  }
  return { ok: true };
}
