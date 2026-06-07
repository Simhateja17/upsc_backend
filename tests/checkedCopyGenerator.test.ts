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
    expect(uploadedSvg).toContain("printed question area");
    expect(uploadedSvg).not.toContain('y="196"');
  });
});
