import { STORAGE_BUCKETS, uploadFile } from "../config/storage";
import type { CheckedCopyAnnotationPlan, EvaluatorCheckedCopyPlan } from "./checkedCopyPlanner";
import type { DocumentPageLayout, NormalizedBox } from "./documentLayout.service";

type CheckedCopyResult =
  | { status: "completed"; storagePath: string }
  | { status: "failed"; reason: string };

type OverlayAnnotation = {
  type: string;
  targetText?: string;
  comment: string;
  placement: "left_margin" | "right_margin" | "bottom" | "near_target" | "top";
  severity?: "minor" | "major";
  intent?: string;
};

type ImageSize = { width: number; height: number };
type PixelBox = { x1: number; y1: number; x2: number; y2: number };
type PageZones = {
  headerBottom: number;
  answerTop: number;
  answerBottom: number;
  contentLeft: number;
  contentRight: number;
  leftMargin: PixelBox;
  rightMargin: PixelBox;
  bottom: PixelBox;
};
type PageRenderPlan = {
  visualMarks: OverlayAnnotation[];
  marginComments: OverlayAnnotation[];
  scoreText: string;
  bottomComment: string;
};

function isV2Plan(plan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan): plan is Extract<EvaluatorCheckedCopyPlan, { version: 2 }> {
  return Boolean(plan && typeof plan === "object" && !Array.isArray(plan) && "version" in plan && plan.version === 2);
}

function getPngSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 24) return null;
  if (buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getImageSize(buffer: Buffer, mimeType: string): ImageSize {
  const parsed =
    mimeType.includes("png") ? getPngSize(buffer) : mimeType.includes("jpeg") || mimeType.includes("jpg") ? getJpegSize(buffer) : null;
  if (parsed && parsed.width > 0 && parsed.height > 0) return parsed;

  // Conservative fallback for rendered UPSC answer pages.
  return { width: 1024, height: 1448 };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function shorten(value: string, max = 120): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function wrapText(text: string, maxChars: number, maxLines = 5): string[] {
  const words = shorten(text, maxChars * maxLines).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function normalizePlan(
  plan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan,
  pageNumber: number,
  totalPages: number
): PageRenderPlan {
  if (isV2Plan(plan)) {
    const explicitPage = plan.pagePlans.find((page) => page.pageNumber === pageNumber);
    const unnumberedPages = plan.pagePlans.filter((page) => page.pageNumber == null);
    const orderedPage = unnumberedPages[pageNumber - 1];
    const sharedSinglePage = totalPages === 1 ? unnumberedPages[0] : undefined;
    const page = explicitPage || orderedPage || sharedSinglePage || { visualMarks: [], marginComments: [] };
    return {
      visualMarks: (page.visualMarks || []).map((mark) => ({
        type: mark.type,
        targetText: mark.targetText,
        comment: mark.intent || "",
        intent: mark.intent,
        placement: "near_target",
      })),
      marginComments: (page.marginComments || []).map((comment) => ({
        type: "margin_comment",
        targetText: comment.targetText,
        comment: comment.comment,
        placement: comment.placementIntent || "right_margin",
        severity: comment.severity || "major",
      })),
      scoreText: pageNumber === 1 ? plan.scoreText || "" : "",
      bottomComment: pageNumber === totalPages ? page.bottomComment || "" : "",
    };
  }

  if (Array.isArray(plan)) {
    const pageItems = plan
      .filter((item) => item.pageNumber == null || item.pageNumber === pageNumber)
      .filter((item) => pageNumber === 1 || item.type !== "score");
    const visualMarks = pageItems
      .filter((item) => ["positive_tick", "underline", "circle", "bracket"].includes(item.type))
      .map((item) => ({
        type: item.type,
        targetText: item.targetText,
        comment: item.comment,
        placement: item.placement,
        severity: item.severity,
        intent: item.intent,
      }));
    const marginComments = pageItems
      .filter((item) => ["margin_comment", "missing_demand"].includes(item.type))
      .map((item) => ({
        type: item.type,
        targetText: item.targetText,
        comment: item.comment,
        placement: item.placement,
        severity: item.severity || "major",
        intent: item.intent,
      }));

    return {
      visualMarks,
      marginComments,
      scoreText:
        pageNumber === 1
          ? plan.find((item) => item.type === "score")?.comment.match(/\d+\s*\/\s*\d+/)?.[0] || ""
          : "",
      bottomComment:
        pageNumber === totalPages
          ? plan.find((item) => item.type === "overall_comment" || item.placement === "bottom")?.comment || ""
          : "",
    };
  }

  const legacyPlan = plan as CheckedCopyAnnotationPlan;
  return {
    visualMarks: legacyPlan.comments
      .filter((comment) => comment.style !== "margin_comment")
      .map((comment) => ({
        type: comment.style,
        comment: comment.text,
        placement: "near_target",
      })),
    marginComments: legacyPlan.comments.filter((comment) => comment.style === "margin_comment").map((comment) => ({
      type: comment.style,
      comment: comment.text,
      placement: "right_margin",
      severity: "major",
    })),
    scoreText: pageNumber === 1 ? legacyPlan.scoreText : "",
    bottomComment: pageNumber === totalPages ? legacyPlan.bottomComment : "",
  };
}

function textBlock(params: {
  x: number;
  y: number;
  text: string;
  maxChars: number;
  fontSize: number;
  rotate?: number;
  anchor?: "start" | "middle" | "end";
  maxLines?: number;
}): string {
  const lines = wrapText(params.text, params.maxChars, params.maxLines || 5);
  const transform = params.rotate ? ` transform="rotate(${params.rotate} ${params.x} ${params.y})"` : "";
  const anchor = params.anchor || "start";

  return `<text x="${params.x}" y="${params.y}" text-anchor="${anchor}"${transform}>${lines
    .map((line, index) => `<tspan x="${params.x}" dy="${index === 0 ? 0 : params.fontSize * 1.12}">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

function tickPath(x: number, y: number, scale: number): string {
  return `<path d="M ${x} ${y + scale * 0.45} L ${x + scale * 0.28} ${y + scale * 0.78} L ${x + scale} ${y}" />`;
}

function underlinePath(x: number, y: number, width: number): string {
  return `<path d="M ${x} ${y} C ${x + width * 0.25} ${y + 5}, ${x + width * 0.75} ${y - 5}, ${x + width} ${y}" />`;
}

function bracketPath(x: number, y1: number, y2: number, direction: "left" | "right"): string {
  const arm = direction === "left" ? -18 : 18;
  return `<path d="M ${x} ${y1} L ${x} ${y2}" />
  <path d="M ${x} ${y1} L ${x + arm} ${y1}" />
  <path d="M ${x} ${y2} L ${x + arm} ${y2}" />`;
}

function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const head = 12;
  return `<path d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" />
  <path d="M ${x2 - head} ${y2 - head / 2} L ${x2} ${y2} L ${x2 - head} ${y2 + head / 2}" />`;
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalizeForMatch(text).split(/\s+/).filter((token) => token.length > 2));
}

function similarity(a: string, b: string): number {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function boxToPixels(box: NormalizedBox, width: number, height: number) {
  return {
    x1: box.x1 * width,
    y1: box.y1 * height,
    x2: box.x2 * width,
    y2: box.y2 * height,
  };
}

function inferZones(width: number, height: number, layout: DocumentPageLayout | null | undefined): PageZones {
  const lineBoxes = (layout?.lines || []).map((line) => boxToPixels(line.box, width, height));
  const xs = lineBoxes.flatMap((box) => [box.x1, box.x2]).filter((value) => Number.isFinite(value));
  const contentLeft = xs.length ? Math.max(width * 0.1, Math.min(...xs)) : width * 0.16;
  const contentRight = xs.length ? Math.min(width * 0.86, Math.max(...xs)) : width * 0.78;
  const configuredTop = Number(process.env.CHECKED_COPY_ANSWER_TOP_RATIO || 0.28) * height;
  const answerTop = Math.max(configuredTop, height * 0.22);
  const answerBottom = height * Number(process.env.CHECKED_COPY_ANSWER_BOTTOM_RATIO || 0.86);

  return {
    headerBottom: height * 0.18,
    answerTop,
    answerBottom,
    contentLeft,
    contentRight,
    leftMargin: {
      x1: Math.max(8, width * 0.018),
      y1: answerTop,
      x2: Math.max(width * 0.14, contentLeft - width * 0.03),
      y2: answerBottom,
    },
    rightMargin: {
      x1: Math.min(width * 0.82, contentRight + width * 0.025),
      y1: answerTop,
      x2: width * 0.985,
      y2: answerBottom,
    },
    bottom: {
      x1: Math.max(width * 0.08, contentLeft - width * 0.05),
      y1: height * 0.875,
      x2: Math.min(width * 0.94, contentRight + width * 0.1),
      y2: height * 0.98,
    },
  };
}

function intersects(a: PixelBox, b: PixelBox): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

function reserveRect(used: PixelBox[], rect: PixelBox): boolean {
  if (used.some((item) => intersects(item, rect))) return false;
  used.push(rect);
  return true;
}

function isInsideAnswerZone(box: NormalizedBox, zones: PageZones, width: number, height: number): boolean {
  const px = boxToPixels(box, width, height);
  return px.y1 >= zones.answerTop && px.y2 <= zones.answerBottom && px.x1 >= zones.contentLeft - width * 0.08 && px.x2 <= zones.contentRight + width * 0.08;
}

function findTargetBox(annotation: OverlayAnnotation, layout: DocumentPageLayout | null | undefined, zones: PageZones, width: number, height: number): NormalizedBox | null {
  if (!layout?.lines.length || !annotation.targetText?.trim()) return null;

  const target = normalizeForMatch(annotation.targetText);
  if (!target) return null;

  let best: { score: number; box: NormalizedBox } | null = null;
  for (const line of layout.lines) {
    if (!isInsideAnswerZone(line.box, zones, width, height)) continue;
    const lineText = normalizeForMatch(line.text);
    const containsScore = lineText.includes(target) || target.includes(lineText);
    const score = containsScore ? 1 : similarity(target, lineText);
    if (!best || score > best.score) {
      best = { score, box: line.box };
    }
  }

  const threshold = Number(process.env.CHECKED_COPY_TARGET_MATCH_THRESHOLD || 0.34);
  return best && best.score >= threshold ? best.box : null;
}

function placeInLane(params: {
  lane: PixelBox;
  preferredY: number;
  width: number;
  height: number;
  used: PixelBox[];
}): PixelBox | null {
  const top = Math.max(params.lane.y1, params.preferredY - params.height * 0.25);
  const candidates = [top];
  const step = Math.max(22, params.height * 0.45);
  for (let offset = step; offset < params.lane.y2 - params.lane.y1; offset += step) {
    candidates.push(top + offset, top - offset);
  }

  for (const y of candidates) {
    const clampedY = Math.max(params.lane.y1, Math.min(y, params.lane.y2 - params.height));
    const rect = {
      x1: params.lane.x1,
      y1: clampedY,
      x2: Math.min(params.lane.x2, params.lane.x1 + params.width),
      y2: clampedY + params.height,
    };
    if (rect.x2 <= rect.x1 || rect.y2 > params.lane.y2) continue;
    if (reserveRect(params.used, rect)) return rect;
  }

  return null;
}

function commentLane(annotation: OverlayAnnotation, index: number, zones: PageZones): "left" | "right" {
  if (annotation.placement === "left_margin") return "left";
  if (annotation.placement === "right_margin") return "right";
  return index % 3 === 0 && zones.leftMargin.x2 - zones.leftMargin.x1 > 90 ? "left" : "right";
}

function renderOverlaySvg(params: {
  originalBuffer: Buffer;
  mimeType: string;
  annotationPlan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan;
  pageNumber: number;
  totalPages: number;
  layout?: DocumentPageLayout | null;
}): Buffer {
  const { width, height } = getImageSize(params.originalBuffer, params.mimeType);
  const plan = normalizePlan(params.annotationPlan, params.pageNumber, params.totalPages);
  const imageHref = `data:${params.mimeType};base64,${params.originalBuffer.toString("base64")}`;

  const red = "#A12418";
  const zones = inferZones(width, height, params.layout);
  const fontSize = Math.max(17, Math.round(width * 0.02));
  const smallFontSize = Math.max(15, Math.round(width * 0.017));
  const scoreSize = Math.max(32, Math.round(width * 0.052));
  const strokeWidth = Math.max(3, Math.round(width * 0.004));

  const hasLayoutLines = Boolean(params.layout?.lines.length);
  const answerLineCount = Math.max(1, (params.layout?.lines || []).filter((line) => isInsideAnswerZone(line.box, zones, width, height)).length || 10);
  const visualLimit = Math.min(24, Math.max(10, Math.ceil(answerLineCount * 0.7)));
  const commentLimit = Math.min(10, Math.max(5, Math.ceil(answerLineCount / 3.4)));
  const visualMarks = plan.visualMarks.filter((item) => item.type !== "score").slice(0, visualLimit);
  const marginComments = plan.marginComments.filter((item) => item.comment).slice(0, commentLimit);

  const marks: string[] = [];
  const usedCommentRects: PixelBox[] = [];
  const usedMarkRects: PixelBox[] = [];

  if (plan.scoreText) {
    marks.push(
      textBlock({
        x: Math.min(width * 0.84, zones.contentRight + width * 0.02),
        y: height * 0.075,
        text: plan.scoreText,
        maxChars: 10,
        fontSize: scoreSize,
        rotate: -4,
      })
    );
  }

  visualMarks.forEach((annotation, index) => {
    const targetBox = findTargetBox(annotation, params.layout, zones, width, height);
    if (hasLayoutLines && !targetBox) return;
    const targetPx = targetBox ? boxToPixels(targetBox, width, height) : null;
    const row = targetPx ? targetPx.y2 + smallFontSize * 0.25 : zones.answerTop + index * height * 0.075;
    const x1 = targetPx ? targetPx.x1 : zones.contentLeft + (index % 4) * width * 0.1;
    const x2 = targetPx ? targetPx.x2 : Math.min(zones.contentRight, x1 + width * 0.18);
    const markRect = { x1: x1 - 8, y1: row - smallFontSize * 1.4, x2: x2 + smallFontSize * 1.8, y2: row + smallFontSize * 1.2 };
    if (!reserveRect(usedMarkRects, markRect)) return;

    if (annotation.type === "positive_tick") {
      marks.push(tickPath(x2 + 8, row - smallFontSize * 1.2, smallFontSize * 1.25));
      return;
    }
    if (annotation.type === "circle") {
      const cx = (x1 + x2) / 2;
      const cy = row - smallFontSize * 0.55;
      marks.push(`<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(28, (x2 - x1) / 2 + 10)}" ry="${smallFontSize * 1.15}" transform="rotate(-2 ${cx} ${cy})" />`);
      return;
    }
    if (annotation.type === "bracket") {
      marks.push(bracketPath(x2 + 12, Math.max(zones.answerTop, row - smallFontSize * 2), row + smallFontSize * 0.4, "right"));
      return;
    }
    marks.push(underlinePath(x1, row, Math.max(60, x2 - x1)));
  });

  const deferredComments: string[] = [];
  marginComments.forEach((annotation, index) => {
    const targetBox = findTargetBox(annotation, params.layout, zones, width, height);
    const targetPx = targetBox ? boxToPixels(targetBox, width, height) : null;

    const side = commentLane(annotation, index, zones);
    const lane = side === "left" ? zones.leftMargin : zones.rightMargin;
    const laneWidth = lane.x2 - lane.x1;
    const maxChars = Math.max(10, Math.floor(laneWidth / (smallFontSize * 0.56)));
    const commentFontSize = annotation.severity === "minor" ? Math.max(13, Math.round(smallFontSize * 0.88)) : smallFontSize;
    const lines = wrapText(annotation.comment, maxChars, annotation.severity === "minor" ? 2 : 6);
    const blockHeight = lines.length * commentFontSize * 1.12 + commentFontSize * 0.3;
    const preferredY = targetPx ? Math.max(zones.answerTop, targetPx.y1 - smallFontSize * 0.5) : zones.answerTop + index * height * 0.12;
    const rect = placeInLane({
      lane,
      preferredY,
      width: laneWidth,
      height: blockHeight,
      used: usedCommentRects,
    });

    if (!rect) {
      deferredComments.push(annotation.comment);
      return;
    }

    const textX = side === "left" ? rect.x1 : rect.x1 + 2;
    const textY = rect.y1 + commentFontSize;
    const anchorX = targetPx ? (side === "left" ? targetPx.x1 : targetPx.x2) : side === "left" ? zones.contentLeft : zones.contentRight;
    const anchorY = targetPx ? targetPx.y1 + (targetPx.y2 - targetPx.y1) * 0.55 : rect.y1 + blockHeight * 0.5;
    const fromX = side === "left" ? rect.x2 - 4 : rect.x1 + 2;
    const fromY = rect.y1 + Math.min(blockHeight * 0.5, smallFontSize * 2.2);

    if (targetPx) {
      marks.push(arrowPath(fromX, fromY, anchorX, anchorY));
      if (annotation.type === "missing_demand") {
        marks.push(bracketPath(side === "left" ? targetPx.x1 - 12 : targetPx.x2 + 12, targetPx.y1 - 5, targetPx.y2 + 8, side === "left" ? "right" : "left"));
      }
    }
    marks.push(
      textBlock({
        x: textX,
        y: textY,
        text: annotation.comment,
        maxChars,
        maxLines: annotation.severity === "minor" ? 2 : 6,
        fontSize: commentFontSize,
        rotate: side === "left" ? -1.8 : 1.2,
      })
    );
  });

  if (plan.bottomComment) {
    deferredComments.unshift(plan.bottomComment);
  }

  if (deferredComments.length > 0) {
    const bottomText = shorten(deferredComments.join(" "), 260);
    const bottomY = Math.min(zones.bottom.y2 - smallFontSize * 2.2, zones.bottom.y1 + smallFontSize * 1.4);
    marks.push(`<path d="M ${zones.bottom.x1} ${bottomY - smallFontSize * 1.1} C ${width * 0.35} ${bottomY - smallFontSize * 1.8}, ${width * 0.62} ${bottomY - smallFontSize * 0.9}, ${zones.bottom.x2} ${bottomY - smallFontSize * 1.3}" />`);
    marks.push(
      textBlock({
        x: zones.bottom.x1,
        y: bottomY,
        text: bottomText,
        maxChars: Math.max(42, Math.floor((zones.bottom.x2 - zones.bottom.x1) / (smallFontSize * 0.54))),
        maxLines: 4,
        fontSize: smallFontSize,
        rotate: -1,
      })
    );
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${imageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  <g fill="none" stroke="${red}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.96">
    ${marks.filter((mark) => mark.startsWith("<path") || mark.startsWith("<ellipse")).join("\n    ")}
  </g>
  <g fill="${red}" stroke="none" font-family="'Comic Sans MS', 'Bradley Hand', 'Segoe Print', cursive" font-size="${fontSize}" font-weight="700" opacity="0.98">
    ${marks.filter((mark) => mark.startsWith("<text")).join("\n    ")}
  </g>
</svg>`;

  return Buffer.from(svg, "utf8");
}

export async function generateCheckedCopy(params: {
  attemptId: string;
  pageNumber?: number;
  totalPages?: number;
  originalBuffer: Buffer;
  mimeType: string;
  annotationPlan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan;
  layout?: DocumentPageLayout | null;
}): Promise<CheckedCopyResult> {
  const startedAt = Date.now();
  const pageNumber = params.pageNumber || 1;
  const totalPages = params.totalPages || 1;

  try {
    if (!params.mimeType.startsWith("image/")) {
      return { status: "failed", reason: `Deterministic checked-copy renderer requires image input, got ${params.mimeType}` };
    }

    const svg = renderOverlaySvg({
      originalBuffer: params.originalBuffer,
      mimeType: params.mimeType,
      annotationPlan: params.annotationPlan,
      pageNumber,
      totalPages,
      layout: params.layout,
    });

    const storagePath = `${params.attemptId}/page_${pageNumber}_${Date.now()}_checked.svg`;
    await uploadFile(STORAGE_BUCKETS.CHECKED_COPIES, storagePath, svg, "image/svg+xml");

    console.log("[checked-copy] deterministic overlay completed", {
      attemptId: params.attemptId,
      pageNumber,
      totalPages,
      elapsed: `${Date.now() - startedAt}ms`,
      inputBytes: params.originalBuffer.length,
      outputBytes: svg.length,
      storagePath,
    });

    return { status: "completed", storagePath };
  } catch (error) {
    console.error("[checked-copy] deterministic overlay failed", {
      attemptId: params.attemptId,
      pageNumber,
      elapsed: `${Date.now() - startedAt}ms`,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
