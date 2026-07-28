// Synthetic "aspirants attempting now" counter for the Daily MCQ banner.
// Ramps a fake bot count through fixed IST checkpoints, re-rolled once per
// minute from a deterministic seed (same minute -> same number for everyone),
// then adds the real attempt count on top.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

interface Checkpoint {
  minutesSinceMidnight: number;
  center: number;
  width: number;
}

// 09:00, 12:00, 15:00, 18:00, 21:00 IST.
const CHECKPOINTS: Checkpoint[] = [
  { minutesSinceMidnight: 9 * 60, center: 200, width: 35 },
  { minutesSinceMidnight: 12 * 60, center: 500, width: 110 },
  { minutesSinceMidnight: 15 * 60, center: 720, width: 100 },
  { minutesSinceMidnight: 18 * 60, center: 900, width: 60 },
  { minutesSinceMidnight: 21 * 60, center: 1200, width: 80 },
];

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
// minute-bucket always produces the same jitter.
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

function computeSyntheticCount(now: Date): number {
  const { dateKey, minutesSinceMidnight } = getISTParts(now);

  const first = CHECKPOINTS[0];
  const last = CHECKPOINTS[CHECKPOINTS.length - 1];

  let prev: Checkpoint = first;
  let next: Checkpoint = first;

  if (minutesSinceMidnight <= first.minutesSinceMidnight) {
    prev = first;
    next = first;
  } else if (minutesSinceMidnight >= last.minutesSinceMidnight) {
    prev = last;
    next = last;
  } else {
    for (let i = 0; i < CHECKPOINTS.length - 1; i++) {
      if (
        minutesSinceMidnight >= CHECKPOINTS[i].minutesSinceMidnight &&
        minutesSinceMidnight <= CHECKPOINTS[i + 1].minutesSinceMidnight
      ) {
        prev = CHECKPOINTS[i];
        next = CHECKPOINTS[i + 1];
        break;
      }
    }
  }

  const span = next.minutesSinceMidnight - prev.minutesSinceMidnight;
  const frac = span > 0 ? (minutesSinceMidnight - prev.minutesSinceMidnight) / span : 0;

  const center = lerp(prev.center, next.center, frac);
  const width = lerp(prev.width, next.width, frac);

  // Bucket by IST date+hour+minute so every request in the same minute gets
  // an identical result, and the number only moves when the clock ticks.
  const hh = String(Math.floor(minutesSinceMidnight / 60)).padStart(2, "0");
  const mm = String(minutesSinceMidnight % 60).padStart(2, "0");
  const seed = `${dateKey}-${hh}-${mm}`;

  const jitter = (seededRandom01(seed) * 2 - 1) * width;
  return Math.round(center + jitter);
}

export function computeLiveAspirantsCount(now: Date, realAttemptedCount: number): number {
  if (process.env.LIVE_ASPIRANTS_SYNTHETIC_ENABLED === "false") {
    return realAttemptedCount;
  }
  return computeSyntheticCount(now) + realAttemptedCount;
}
