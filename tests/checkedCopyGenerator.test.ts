import { describe, expect, it, vi, beforeEach } from "vitest";

let uploadedSvg = "";

vi.mock("../src/config/storage", () => ({
  STORAGE_BUCKETS: { CHECKED_COPIES: "checked-copies" },
  uploadFile: vi.fn(async (_bucket: string, _path: string, buffer: Buffer) => {
    uploadedSvg = buffer.toString("utf8");
  }),
}));

import { generateCheckedCopy } from "../src/services/checkedCopyGenerator";

function pngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(32);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe("generateCheckedCopy", () => {
  beforeEach(() => {
    uploadedSvg = "";
  });

  it("renders v2 plans and keeps printed-question targets out of the answer anchor zone", async () => {
    const result = await generateCheckedCopy({
      attemptId: "attempt-1",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        scoreText: "4/15",
        pagePlans: [
          {
            visualMarks: [
              { type: "underline", targetText: "Simla Agreement", intent: "question text should not be marked" },
              { type: "positive_tick", targetText: "both sides agreed to settle disputes", intent: "valid Simla point" },
            ],
            marginComments: [
              {
                targetText: "Simla Agreement",
                severity: "major",
                comment: "Do not mark the printed question area; this should fall back into the summary instead.",
                placementIntent: "right_margin",
              },
              {
                targetText: "both sides agreed to settle disputes",
                severity: "major",
                comment: "Core Simla point. Add LoC, 1971 war context, and why bilateralism mattered historically.",
                placementIntent: "right_margin",
              },
            ],
            bottomComment: "Too short; mostly provisions, not discussion of historical significance.",
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines: [
          { text: "The Simla Agreement (1972) and Lahore Declaration (1999)", box: { x1: 0.18, y1: 0.14, x2: 0.78, y2: 0.17 } },
          { text: "both sides agreed to settle disputes bilaterally", box: { x1: 0.18, y1: 0.52, x2: 0.74, y2: 0.55 } },
        ],
      },
    });

    expect(result.status).toBe("completed");
    expect(uploadedSvg).toContain("4/15");
    expect(uploadedSvg).toContain("Core Simla point");
    expect(uploadedSvg).toContain("printed question");
    expect(uploadedSvg).toContain("area; this should");
    expect(uploadedSvg).not.toContain('y="196"');
  });

  it("renders unmatched target comments in the margins instead of collapsing the page to a bottom note", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-2",
      pageNumber: 2,
      totalPages: 2,
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        scoreText: "4/15",
        pagePlans: [
          {
            pageNumber: 2,
            marginComments: [
              {
                targetText: "bus diplomacy and nuclear CBMs",
                severity: "major",
                comment: "Add bus diplomacy, 1998 nuclear context, and CBMs to explain Lahore's historical significance.",
                placementIntent: "right_margin",
              },
              {
                targetText: "common currency in South Asia",
                severity: "major",
                comment: "Incorrect here. Replace common currency with concrete Lahore provisions and confidence-building measures.",
                placementIntent: "right_margin",
              },
            ],
            bottomComment: "Too short; mostly provisions, not discussion of historical significance.",
          },
        ],
      },
      layout: {
        pageNumber: 2,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Lahore Declaration - Vajpayee wanted to make borders irrelevant", box: { x1: 0.18, y1: 0.16, x2: 0.72, y2: 0.19 } },
          { text: "Again Kashmir dispute was to be resolved bilaterally", box: { x1: 0.18, y1: 0.5, x2: 0.7, y2: 0.53 } },
        ],
      },
    });

    expect(uploadedSvg).toContain("Add bus diplomacy");
    expect(uploadedSvg).toContain("Incorrect here");
    expect(uploadedSvg).toContain("Too short");
    expect(uploadedSvg).toMatch(/x="7\d\d/);
  });
});
