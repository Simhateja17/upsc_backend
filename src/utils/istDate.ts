const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function istDateKey(date: Date = new Date(), dayOffset = 0): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS + dayOffset * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

export function istDayWindow(dateKey: string): { since: Date; until: Date } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const sinceMs = Date.UTC(year, month - 1, day) - IST_OFFSET_MS;
  return {
    since: new Date(sinceMs),
    until: new Date(sinceMs + DAY_MS - 1),
  };
}

export function istMonthWindow(monthKey: string): { since: Date; until: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  const sinceMs = Date.UTC(year, month - 1, 1) - IST_OFFSET_MS;
  const nextMonthMs = Date.UTC(year, month, 1) - IST_OFFSET_MS;
  return {
    since: new Date(sinceMs),
    until: new Date(nextMonthMs - 1),
  };
}
