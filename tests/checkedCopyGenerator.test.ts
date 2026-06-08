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
    expect(uploadedSvg).toContain("should fall back");
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
    expect(uploadedSvg).toMatch(/x="8\d\d/);
  });

  it("does not duplicate a single unnumbered v2 page plan across multiple rendered pages", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-3",
      pageNumber: 2,
      totalPages: 2,
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        scoreText: "4/15",
        pagePlans: [
          {
            marginComments: [
              {
                targetText: "Simla Agreement",
                severity: "major",
                comment: "This page-one comment must not be repeated on page two.",
                placementIntent: "right_margin",
              },
            ],
            bottomComment: "Final summary belongs to the last page only.",
          },
        ],
      },
      layout: {
        pageNumber: 2,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Lahore Declaration - Vajpayee wanted to make borders irrelevant", box: { x1: 0.18, y1: 0.16, x2: 0.72, y2: 0.19 } },
        ],
      },
    });

    expect(uploadedSvg).not.toContain("page-one comment");
    expect(uploadedSvg).not.toContain("Final summary");
  });

  it("keeps dense examiner markup including light comments and circles", async () => {
    const lines = Array.from({ length: 18 }, (_, index) => ({
      text: `answer line ${index + 1} with relevant content`,
      box: { x1: 0.18, y1: 0.3 + index * 0.025, x2: 0.72, y2: 0.315 + index * 0.025 },
    }));
    await generateCheckedCopy({
      attemptId: "attempt-4",
      pageNumber: 1,
      totalPages: 1,
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        scoreText: "6/15",
        pagePlans: [
          {
            pageNumber: 1,
            visualMarks: [
              ...lines.slice(0, 12).map((line) => ({
                type: "positive_tick" as const,
                targetText: line.text,
                intent: "correct/relevant line",
              })),
              { type: "circle", targetText: "answer line 13", intent: "weak phrase" },
            ],
            marginComments: [
              {
                targetText: "answer line 2",
                severity: "major",
                comment: "Detailed markup one explains the missing demand and names the exact evidence the student should add.",
                placementIntent: "right_margin",
              },
              {
                targetText: "answer line 6",
                severity: "major",
                comment: "Detailed markup two explains why the point is incomplete and how to connect it to the directive.",
                placementIntent: "right_margin",
              },
              {
                targetText: "answer line 10",
                severity: "major",
                comment: "Detailed markup three gives a concrete value addition and prevents the answer from staying generic.",
                placementIntent: "left_margin",
              },
              {
                targetText: "answer line 13",
                severity: "minor",
                comment: "Factually incorrect.",
                placementIntent: "right_margin",
              },
              {
                targetText: "answer line 15",
                severity: "minor",
                comment: "Needs example.",
                placementIntent: "left_margin",
              },
              {
                targetText: "answer line 17",
                severity: "major",
                comment: "Detailed markup four should still render on dense pages instead of being cut by a low cap.",
                placementIntent: "right_margin",
              },
            ],
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines,
      },
    });

    expect(uploadedSvg).toContain("Detailed markup four");
    expect(uploadedSvg).toContain("Factually incorrect.");
    expect(uploadedSvg).toContain("<ellipse");
  });

  it("expands the canvas while preserving the original page scale", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-5",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        scoreText: "7/15",
        pagePlans: [
          {
            pageNumber: 1,
            marginComments: [
              {
                targetText: "Enhanced Road Safety",
                severity: "major",
                comment: "Good point, but add a concrete India data point to make the significance measurable.",
                placementIntent: "right_margin",
              },
            ],
            bottomComment: "Covers significance but misses the challenges dimension and needs a crisp conclusion.",
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Enhanced Road Safety provides collision warnings", box: { x1: 0.18, y1: 0.45, x2: 0.72, y2: 0.48 } },
        ],
      },
    });

    expect(uploadedSvg).toContain('width="1355" height="1631"');
    expect(uploadedSvg).toContain('x="55" y="35" width="1000" height="1400"');
    expect(uploadedSvg).toContain("Good point");
    expect(uploadedSvg).toContain("misses the challenges");
  });

  it("renders one non-overlapping tick per semantic point in the left tick column", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-6",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        pagePlans: [
          {
            pageNumber: 1,
            visualMarks: [
              { type: "positive_tick", targetText: "Enhanced Road Safety", intent: "correct point" },
              { type: "positive_tick", targetText: "Improved Traffic Management", intent: "correct point" },
              { type: "positive_tick", targetText: "Efficient Urban Mobility", intent: "correct point" },
              { type: "positive_tick", targetText: "Efficient Urban Mobility", intent: "duplicate target should be ignored" },
            ],
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Enhanced Road Safety provides real-time collision warnings", box: { x1: 0.18, y1: 0.38, x2: 0.72, y2: 0.41 } },
          { text: "Improved Traffic Management facilitates adaptive traffic signal control", box: { x1: 0.18, y1: 0.47, x2: 0.72, y2: 0.5 } },
          { text: "Efficient Urban Mobility enables smoother public transport", box: { x1: 0.18, y1: 0.56, x2: 0.72, y2: 0.59 } },
        ],
      },
    });

    const paths = [...uploadedSvg.matchAll(/<path d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)" \/>/g)];
    expect(paths).toHaveLength(3);
    const xValues = paths.map((match) => Number(match[1]));
    expect(xValues.every((x) => x < 210)).toBe(true);
    const yValues = paths.map((match) => Number(match[2]));
    const uniqueRoundedY = new Set(yValues.map((y) => Math.round(y)));
    expect(uniqueRoundedY.size).toBe(3);
  });
});
