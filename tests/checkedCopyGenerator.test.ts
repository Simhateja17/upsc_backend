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

  it("marks answer text that starts near the top while excluding copied question text", async () => {
    const result = await generateCheckedCopy({
      attemptId: "attempt-top-answer",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      answerHints: {
        copiedQuestionText: "How far was the Industrial Revolution in England responsible for the decline of handicrafts and cottage industries in India?",
        ignoredPrintedText: ["Q. No. 5", "Marks 15"],
        answerStartText: "The Industrial Revolution in England during the 18th and 19th centuries",
        answerLineHints: [
          "The Industrial Revolution in England during the 18th and 19th centuries had a major impact",
          "Machine made goods",
        ],
      },
      annotationPlan: {
        version: 2,
        scoreText: "6/15",
        pagePlans: [
          {
            pageNumber: 1,
            visualMarks: [
              {
                type: "underline",
                targetText: "The Industrial Revolution in England during the 18th and 19th centuries",
                intent: "opening judgement should be marked even near the top",
              },
            ],
            marginComments: [
              {
                targetText: "The Industrial Revolution in England during the 18th and 19th centuries",
                severity: "major",
                comment: "Opening is relevant, but sharpen the 'how far' judgement and compare Industrial Revolution with colonial policy.",
                placementIntent: "right_margin",
              },
              {
                targetText: "How far was the Industrial Revolution",
                severity: "major",
                comment: "Copied question text must not receive a connector.",
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
        lines: [
          { text: "How far was the Industrial Revolution in England responsible for the decline", box: { x1: 0.18, y1: 0.12, x2: 0.78, y2: 0.15 } },
          { text: "The Industrial Revolution in England during the 18th and 19th centuries", box: { x1: 0.18, y1: 0.18, x2: 0.76, y2: 0.21 } },
          { text: "Machine made goods helped England produce cheaply", box: { x1: 0.18, y1: 0.38, x2: 0.72, y2: 0.41 } },
        ],
      },
    });

    expect(result.status).toBe("completed");
    expect(uploadedSvg).toContain("Opening is relevant");
    expect(uploadedSvg).toContain("Copied question text");
    const leaders = [...uploadedSvg.matchAll(/<path data-role="comment-leader"[^>]+d="M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)" \/>/g)];
    expect(leaders).toHaveLength(1);
    expect(Number(leaders[0][8])).toBeGreaterThanOrEqual(240);
    expect(Number(leaders[0][8])).toBeLessThanOrEqual(320);
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
    expect(uploadedSvg).toMatch(/x="12\d\d/);
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

    expect(uploadedSvg).toContain('width="1640" height="1687"');
    expect(uploadedSvg).toContain('x="220" y="35" width="1000" height="1400"');
    expect(uploadedSvg).toContain('text x="1242"');
    expect(uploadedSvg).toContain("Good point");
    expect(uploadedSvg).toContain("misses the challenges");

    const connector = [...uploadedSvg.matchAll(/<path data-role="comment-leader"[^>]+d="M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)" \/>/g)]
      .find((match) => Number(match[1]) > 1220);
    expect(connector).toBeTruthy();
    expect(Number(connector![7])).toBeLessThan(1000);
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
    expect(xValues.every((x) => x > 220 && x < 400)).toBe(true);
    const yValues = paths.map((match) => Number(match[2]));
    const uniqueRoundedY = new Set(yValues.map((y) => Math.round(y)));
    expect(uniqueRoundedY.size).toBe(3);
  });

  it("connects every matched margin comment to its page target and leaves unmatched comments unconnected", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-connectors",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        pagePlans: [
          {
            pageNumber: 1,
            marginComments: [
              {
                targetText: "Road safety improves through collision warnings",
                severity: "major",
                comment: "Right-side matched comment must end at the road-safety answer line.",
                placementIntent: "right_margin",
              },
              {
                targetText: "Traffic management uses adaptive signals",
                severity: "minor",
                comment: "Left-side matched comment must end at the traffic-management answer line.",
                placementIntent: "left_margin",
              },
              {
                targetText: "A target that is absent from the answer",
                severity: "major",
                comment: "Unmatched comment remains visible without a misleading connector.",
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
        lines: [
          { text: "Road safety improves through collision warnings", box: { x1: 0.18, y1: 0.4, x2: 0.72, y2: 0.43 } },
          { text: "Traffic management uses adaptive signals", box: { x1: 0.18, y1: 0.58, x2: 0.72, y2: 0.61 } },
        ],
      },
    });

    const leaders = [...uploadedSvg.matchAll(/<path data-role="comment-leader" data-side="(left|right)" d="M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)" \/>/g)];
    expect(leaders).toHaveLength(2);
    expect(leaders.map((leader) => leader[1]).sort()).toEqual(["left", "right"]);
    expect(leaders.every((leader) => Number(leader[8]) >= 220 && Number(leader[8]) <= 1220)).toBe(true);
    expect(leaders.find((leader) => leader[1] === "right")?.[8]).toBe("940");
    expect(leaders.find((leader) => leader[1] === "left")?.[8]).toBe("400");
    expect(uploadedSvg).toContain("misleading connector.");
  });

  it("does not truncate long margin or bottom comments", async () => {
    await generateCheckedCopy({
      attemptId: "attempt-7",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        pagePlans: [
          {
            pageNumber: 1,
            marginComments: [
              {
                targetText: "Simla Agreement",
                severity: "major",
                comment: "This is too sweeping. You needed historical context after the 1971 war and the key milestone value: bilateralism, normalization, and especially the durability of the framework.",
                placementIntent: "right_margin",
              },
              {
                targetText: "Lahore Declaration",
                severity: "minor",
                comment: "Point is underdeveloped. Write the precise provision on nuclear confidence building measures.",
                placementIntent: "left_margin",
              },
            ],
            bottomComment: "Relevant but incomplete. Add historical context, legal precision, current relevance, and a sharper judgement separating diplomatic continuity from political symbolism.",
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Simla Agreement created a framework for bilateral dispute resolution", box: { x1: 0.18, y1: 0.34, x2: 0.72, y2: 0.37 } },
          { text: "Lahore Declaration added confidence building", box: { x1: 0.18, y1: 0.56, x2: 0.72, y2: 0.59 } },
        ],
      },
    });

    expect(uploadedSvg).toContain("durability of the");
    expect(uploadedSvg).toContain("framework.");
    expect(uploadedSvg).toContain("nuclear confidence");
    expect(uploadedSvg).toContain("building measures.");
    expect(uploadedSvg).toContain("political symbolism");
  });

  it("expands for dense rail comments and keeps bottom feedback below connector lines", async () => {
    const marginComments = Array.from({ length: 24 }, (_, index) => ({
      targetText: "Road safety improves through collision warnings",
      severity: "major" as const,
      comment: `Dense matched comment ${index + 1} keeps every explanatory word visible through the final token preserved-${index + 1}.`,
      placementIntent: "right_margin" as const,
    }));

    await generateCheckedCopy({
      attemptId: "attempt-overflow",
      originalBuffer: pngBuffer(1000, 1400),
      mimeType: "image/png",
      annotationPlan: {
        version: 2,
        pagePlans: [
          {
            pageNumber: 1,
            marginComments,
            bottomComment: "Bottom summary must remain below every visible connector line.",
          },
        ],
      },
      layout: {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        lines: [
          { text: "Road safety improves through collision warnings", box: { x1: 0.18, y1: 0.4, x2: 0.72, y2: 0.43 } },
        ],
      },
    });

    const leaders = [...uploadedSvg.matchAll(/<path data-role="comment-leader"[^>]+d="M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)" \/>/g)];
    expect(leaders).toHaveLength(marginComments.length);
    expect(uploadedSvg).toContain("preserved-24.");

    const svgHeight = Number(uploadedSvg.match(/<svg[^>]+height="([\d.]+)"/)?.[1]);
    const bottomY = Number(uploadedSvg.match(/<text x="12" y="([\d.]+)"[^>]*><tspan x="12" dy="0">Bottom summary/)?.[1]);
    const connectorBottom = Math.max(...leaders.flatMap((leader) => [Number(leader[2]), Number(leader[4]), Number(leader[6]), Number(leader[8])]));
    expect(svgHeight).toBeGreaterThan(1687);
    expect(bottomY).toBeGreaterThan(connectorBottom);
    expect(svgHeight).toBeGreaterThan(bottomY);
  });
});
