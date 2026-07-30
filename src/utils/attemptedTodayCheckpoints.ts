import { AttemptedTodayCheckpoint } from "./attemptedToday";

// Each list starts at minute 0 (midnight IST) with center 0 so the count
// ramps up from zero rather than jumping straight to the first checkpoint.
// Magnitudes are deliberately different per surface - a full mock test is a
// bigger commitment than a quick MCQ, so it should have fewer daily takers.

// Daily MCQ: 09:00, 12:00, 15:00, 18:00, 21:00 IST.
export const DAILY_MCQ_CHECKPOINTS: AttemptedTodayCheckpoint[] = [
  { minutesSinceMidnight: 0, center: 0, width: 0 },
  { minutesSinceMidnight: 9 * 60, center: 200, width: 35 },
  { minutesSinceMidnight: 12 * 60, center: 500, width: 110 },
  { minutesSinceMidnight: 15 * 60, center: 720, width: 100 },
  { minutesSinceMidnight: 18 * 60, center: 900, width: 60 },
  { minutesSinceMidnight: 21 * 60, center: 1200, width: 80 },
];

// Daily Answer (mains writing): ~900 by end of day.
export const DAILY_ANSWER_CHECKPOINTS: AttemptedTodayCheckpoint[] = [
  { minutesSinceMidnight: 0, center: 0, width: 0 },
  { minutesSinceMidnight: 9 * 60, center: 135, width: 27 },
  { minutesSinceMidnight: 12 * 60, center: 330, width: 83 },
  { minutesSinceMidnight: 15 * 60, center: 510, width: 75 },
  { minutesSinceMidnight: 18 * 60, center: 645, width: 45 },
  { minutesSinceMidnight: 21 * 60, center: 900, width: 60 },
];

// Mock Tests: ~550 by end of day - a full test is a bigger commitment.
export const MOCK_TEST_CHECKPOINTS: AttemptedTodayCheckpoint[] = [
  { minutesSinceMidnight: 0, center: 0, width: 0 },
  { minutesSinceMidnight: 9 * 60, center: 69, width: 17 },
  { minutesSinceMidnight: 12 * 60, center: 189, width: 43 },
  { minutesSinceMidnight: 15 * 60, center: 309, width: 43 },
  { minutesSinceMidnight: 18 * 60, center: 395, width: 26 },
  { minutesSinceMidnight: 21 * 60, center: 550, width: 34 },
];
