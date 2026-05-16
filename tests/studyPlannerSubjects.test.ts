import { describe, expect, it } from "vitest";
import {
  isValidStudyPlannerSubject,
  normalizeStudyPlannerSubject,
} from "../src/constants/subjects";

describe("study planner subject normalization", () => {
  it("accepts Optional Paper subjects", () => {
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("Optional Paper 1"))).toBe(true);
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("optional paper i"))).toBe(true);
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("optional paper-2"))).toBe(true);
  });

  it("normalizes GS aliases", () => {
    expect(normalizeStudyPlannerSubject("gs 1")).toBe("GS1");
    expect(normalizeStudyPlannerSubject("gs 4")).toBe("GS4");
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("gs 2"))).toBe(true);
  });

  it("keeps strict rejection for unknown subjects", () => {
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("Random Subject"))).toBe(false);
  });
});
