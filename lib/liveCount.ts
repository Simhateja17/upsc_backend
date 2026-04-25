// Deterministic-per-day student count that grows hour-by-hour.
// 7 AM start = 10; each hour adds a pseudo-random increment within a
// window that scales with time-of-day. Increments are seeded from the
// current date so the number stays stable across renders of the same day.

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86_400_000);
}

// Mulberry32 — small, deterministic PRNG
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function incrementWindow(hour: number): [number, number] {
  // Before 7AM: no increment.
  // 7AM-12PM: 15–25/hr
  // 12PM-5PM: 25–35/hr
  // 5PM-12AM: 35–45/hr
  if (hour < 7) return [0, 0];
  if (hour < 12) return [15, 25];
  if (hour < 17) return [25, 35];
  return [35, 45];
}

/**
 * Base count is salted per context so different pages produce independent numbers.
 */
export function liveStudentCount(context: string = 'generic', now: Date = new Date()): number {
  const seed = dayOfYear(now) * 1000 + hashContext(context);
  const rand = mulberry32(seed);

  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour < 7) return 10;

  let total = 10;
  for (let h = 7; h < hour; h++) {
    const [lo, hi] = incrementWindow(h);
    total += Math.floor(lo + rand() * (hi - lo));
  }

  // Partial increment for the current hour based on minutes elapsed
  const [lo, hi] = incrementWindow(hour);
  const partial = Math.floor((lo + rand() * (hi - lo)) * (minute / 60));
  total += partial;

  return total;
}

function hashContext(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 997;
}
