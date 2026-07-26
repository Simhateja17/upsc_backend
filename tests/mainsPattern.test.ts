import { describe, it, expect } from "vitest";
import {
  mainsWordLimit,
  mainsTimeLimit,
  wordCountStatus,
  mainsWordRange,
} from "../src/utils/mainsPattern";

describe("mainsPattern", () => {
  it("maps marks to the official UPSC word limits", () => {
    expect(mainsWordLimit(10)).toBe(150);
    expect(mainsWordLimit(15)).toBe(250);
    expect(mainsWordLimit(20)).toBe(250);
  });

  it("maps marks to the timing pattern", () => {
    expect(mainsTimeLimit(10)).toBe(7);
    expect(mainsTimeLimit(15)).toBe(11);
    expect(mainsTimeLimit(20)).toBe(14);
  });

  it("treats marks between the bands by the floor rule", () => {
    // A 12-marker falls in the 10-mark band (>=10, <15).
    expect(mainsWordLimit(12)).toBe(150);
  });

  it("flags over-length answers", () => {
    // 15-marker → 250 word limit, 275 max acceptable (110%).
    expect(wordCountStatus(250, 15)).toBe("within");
    expect(wordCountStatus(275, 15)).toBe("within");
    expect(wordCountStatus(276, 15)).toBe("over");
    expect(wordCountStatus(427, 15)).toBe("over");
  });

  it("flags under-length answers", () => {
    // 15-marker → 250 word limit, 175 min acceptable (70%).
    expect(wordCountStatus(175, 15)).toBe("within");
    expect(wordCountStatus(174, 15)).toBe("under");
    expect(wordCountStatus(50, 15)).toBe("under");
  });

  it("exposes the acceptable range", () => {
    expect(mainsWordRange(15)).toEqual({ limit: 250, min: 175, max: 275 });
    expect(mainsWordRange(10)).toEqual({ limit: 150, min: 105, max: 165 });
  });
});
