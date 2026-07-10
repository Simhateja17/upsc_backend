import { describe, expect, it } from "vitest";
import { istDateKey, istDayWindow, istMonthWindow } from "../src/utils/istDate";

describe("IST editorial date windows", () => {
  it("selects the previous IST date across a UTC date boundary", () => {
    expect(istDateKey(new Date("2026-07-10T02:00:00.000Z"), -1)).toBe("2026-07-09");
  });

  it("maps an IST calendar day to its exact UTC range", () => {
    const window = istDayWindow("2026-07-09");
    expect(window.since.toISOString()).toBe("2026-07-08T18:30:00.000Z");
    expect(window.until.toISOString()).toBe("2026-07-09T18:29:59.999Z");
  });

  it("buckets late-evening UTC timestamps into the next IST date", () => {
    expect(istDateKey(new Date("2026-07-09T20:00:00.000Z"))).toBe("2026-07-10");
  });

  it("builds month availability boundaries in IST", () => {
    const window = istMonthWindow("2026-07");
    expect(window.since.toISOString()).toBe("2026-06-30T18:30:00.000Z");
    expect(window.until.toISOString()).toBe("2026-07-31T18:29:59.999Z");
  });
});
