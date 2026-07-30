// Synthetic "students attempted today" counter, shared across daily-mcq,
// daily-answer, and mock-tests banners. Each caller supplies its own
// checkpoints (magnitudes differ per surface) but shares the same math:
//
// - Starts near 0 at IST midnight and ramps to each checkpoint in turn.
// - Never decreases within a day: jitter is accumulated minute-by-minute
//   as small non-negative steps (not symmetric +/-), so unlike a live
//   "attempting now" gauge, this is safe to read as a cumulative total.
// - Fully stateless: a pure function of the wall clock, recomputed fresh
//   on every call. No persisted "last value" anywhere.
// - The real attempted count for the day is added on top by the caller's
//   own query; this module only produces the synthetic component.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface AttemptedTodayCheckpoint {
  minutesSinceMidnight: number;
  center: number;
  width: number;
}

function getISTParts(now: Date): { dateKey: string; minutesSinceMidnight: number } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const dateKey = ist.toISOString().slice(0, 10); // YYYY-MM-DD in IST
  const minutesSinceMidnight = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return { dateKey, minutesSinceMidnight };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Deterministic string -> [0,1) hash (xmur3 + mulberry32), so the same
// minute-bucket always produces the same value for everyone.
function seededRandom01(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function findSegment(
  checkpoints: AttemptedTodayCheckpoint[],
  minutesSinceMidnight: number
): { prev: AttemptedTodayCheckpoint; next: AttemptedTodayCheckpoint } {
  const first = checkpoints[0];
  const last = checkpoints[checkpoints.length - 1];

  if (minutesSinceMidnight <= first.minutesSinceMidnight) return { prev: first, next: first };
  if (minutesSinceMidnight >= last.minutesSinceMidnight) return { prev: last, next: last };

  for (let i = 0; i < checkpoints.length - 1; i++) {
    if (
      minutesSinceMidnight >= checkpoints[i].minutesSinceMidnight &&
      minutesSinceMidnight <= checkpoints[i + 1].minutesSinceMidnight
    ) {
      return { prev: checkpoints[i], next: checkpoints[i + 1] };
    }
  }
  return { prev: first, next: first };
}

function baseCenterAt(checkpoints: AttemptedTodayCheckpoint[], minutesSinceMidnight: number): number {
  const { prev, next } = findSegment(checkpoints, minutesSinceMidnight);
  const span = next.minutesSinceMidnight - prev.minutesSinceMidnight;
  const frac = span > 0 ? (minutesSinceMidnight - prev.minutesSinceMidnight) / span : 0;
  return lerp(prev.center, next.center, frac);
}

// Accumulates a non-negative "step" for every minute from midnight up to
// (and including) minutesSinceMidnight, so the running total only ever
// grows. Each step is sized relative to the local segment's width/span,
// so the average accumulated noise over a segment lands near width/2 -
// comparable in scale to the old symmetric +/-width jitter, just one-sided.
function accumulatedNoise(
  checkpoints: AttemptedTodayCheckpoint[],
  dateKey: string,
  minutesSinceMidnight: number
): number {
  let total = 0;
  const lastMinute = checkpoints[checkpoints.length - 1].minutesSinceMidnight;
  const cappedMinute = Math.min(minutesSinceMidnight, lastMinute);
  if (lastMinute <= 0) return 0;

  // Normalize each step against the full day's span (not the local segment's
  // span) so noise accumulated across many segments still averages out to
  // roughly half of the local width by the end of the day, matching the
  // scale of the old symmetric jitter instead of compounding per-segment.
  for (let m = 0; m <= cappedMinute; m++) {
    const { prev, next } = findSegment(checkpoints, m);
    const span = next.minutesSinceMidnight - prev.minutesSinceMidnight;
    const width = span > 0 ? lerp(prev.width, next.width, (m - prev.minutesSinceMidnight) / span) : 0;
    const stepMax = width / lastMinute;

    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const seed = `${dateKey}-${hh}-${mm}`;

    total += seededRandom01(seed) * stepMax;
  }

  return total;
}

function computeSyntheticCount(now: Date, checkpoints: AttemptedTodayCheckpoint[]): number {
  const { dateKey, minutesSinceMidnight } = getISTParts(now);
  const base = baseCenterAt(checkpoints, minutesSinceMidnight);
  const noise = accumulatedNoise(checkpoints, dateKey, minutesSinceMidnight);
  return Math.max(0, Math.round(base + noise));
}

export function computeAttemptedTodayCount(
  now: Date,
  realAttemptedCount: number,
  checkpoints: AttemptedTodayCheckpoint[]
): number {
  if (process.env.STUDENTS_ATTEMPTED_TODAY_SYNTHETIC_ENABLED === "false") {
    return realAttemptedCount;
  }
  return computeSyntheticCount(now, checkpoints) + realAttemptedCount;
}
