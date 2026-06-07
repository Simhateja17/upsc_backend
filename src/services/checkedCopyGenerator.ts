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
};

type ImageSize = { width: number; height: number };

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

function shorten(value: string, max = 72): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = shorten(text, maxChars * 4).split(/\s+/).filter(Boolean);
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
  return lines.slice(0, 4);
}

function normalizePlan(
  plan: CheckedCopyAnnotationPlan | EvaluatorCheckedCopyPlan,
  pageNumber: number,
  totalPages: number
): { annotations: OverlayAnnotation[]; scoreText: string; bottomComment: string } {
  if (Array.isArray(plan)) {
    const annotations = plan
      .filter((item) => pageNumber === 1 || item.type !== "score")
      .map((item) => ({
        type: item.type,
        targetText: item.targetText,
        comment: item.comment,
        placement: item.placement,
      }));

    return {
      annotations,
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

  return {
    annotations: plan.comments.map((comment) => ({
      type: comment.style,
      comment: comment.text,
      placement: comment.style === "margin_comment" ? "right_margin" : "near_target",
    })),
    scoreText: pageNumber === 1 ? plan.scoreText : "",
    bottomComment: pageNumber === totalPages ? plan.bottomComment : "",
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
}): string {
  const lines = wrapText(params.text, params.maxChars);
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

function findTargetBox(annotation: OverlayAnnotation, layout: DocumentPageLayout | null | undefined): NormalizedBox | null {
  if (!layout?.lines.length || !annotation.targetText?.trim()) return null;

  const target = normalizeForMatch(annotation.targetText);
  if (!target) return null;

  let best: { score: number; box: NormalizedBox } | null = null;
  for (const line of layout.lines) {
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
  const fontSize = Math.max(18, Math.round(width * 0.022));
  const scoreSize = Math.max(32, Math.round(width * 0.052));
  const strokeWidth = Math.max(3, Math.round(width * 0.004));
  const leftX = Math.max(18, width * 0.03);
  const rightX = width * 0.82;
  const contentLeft = width * 0.18;
  const contentRight = width * 0.78;
  const contentTop = height * 0.2;
  const contentStep = height * 0.105;

  const hasLayoutLines = Boolean(params.layout?.lines.length);
  const annotations = plan.annotations
    .filter((item) => item.comment && item.type !== "score" && item.type !== "overall_comment")
    .slice(0, 8);

  const marks: string[] = [];

  if (plan.scoreText) {
    marks.push(
      textBlock({
        x: width * 0.78,
        y: height * 0.08,
        text: plan.scoreText,
        maxChars: 10,
        fontSize: scoreSize,
        rotate: -4,
      })
    );
  }

  annotations.forEach((annotation, index) => {
    const targetBox = findTargetBox(annotation, params.layout);
    if (hasLayoutLines && !targetBox) return;
    const targetPx = targetBox ? boxToPixels(targetBox, width, height) : null;
    const row = targetPx ? Math.max(contentTop, Math.min(targetPx.y1, height * 0.8)) : contentTop + index * contentStep;
    const isLeft = annotation.placement === "left_margin" || (annotation.placement !== "right_margin" && index % 3 === 0);
    const noteX = isLeft ? leftX : rightX;
    const noteY = Math.min(row, height * 0.78);
    const anchorX = targetPx ? (isLeft ? targetPx.x1 : targetPx.x2) : isLeft ? contentLeft : contentRight;
    const anchorY = targetPx ? targetPx.y2 + fontSize * 0.2 : noteY + fontSize * 0.4;
    const comment = shorten(annotation.comment, annotation.placement === "bottom" ? 120 : 76);

    if (annotation.type === "positive_tick") {
      marks.push(tickPath(anchorX, anchorY - fontSize, fontSize * 1.4));
      if (comment) {
        marks.push(
          textBlock({
            x: noteX,
            y: noteY,
            text: comment,
            maxChars: 15,
            fontSize,
            rotate: isLeft ? -2 : 1.5,
          })
        );
      }
      return;
    }

    if (annotation.type === "underline") {
      marks.push(underlinePath(targetPx ? targetPx.x1 : contentLeft, anchorY, targetPx ? Math.max(60, targetPx.x2 - targetPx.x1) : width * 0.28));
    } else if (annotation.type === "bracket" || annotation.type === "missing_demand") {
      const bracketX = targetPx ? (isLeft ? targetPx.x1 - 18 : targetPx.x2 + 18) : isLeft ? contentLeft - 20 : contentRight + 10;
      const bracketTop = targetPx ? targetPx.y1 - 4 : anchorY - fontSize * 1.4;
      const bracketBottom = targetPx ? targetPx.y2 + 8 : anchorY + fontSize * 1.2;
      marks.push(`<path d="M ${bracketX} ${bracketTop} L ${bracketX} ${bracketBottom}" />`);
      marks.push(`<path d="M ${bracketX} ${bracketTop} L ${bracketX + (isLeft ? 18 : -18)} ${bracketTop}" />`);
      marks.push(`<path d="M ${bracketX} ${bracketBottom} L ${bracketX + (isLeft ? 18 : -18)} ${bracketBottom}" />`);
    } else {
      marks.push(underlinePath(targetPx ? targetPx.x1 : contentLeft + (index % 4) * width * 0.08, anchorY, targetPx ? Math.max(60, targetPx.x2 - targetPx.x1) : width * 0.18));
    }

    marks.push(arrowPath(isLeft ? noteX + width * 0.1 : noteX - 10, noteY + fontSize * 0.3, anchorX, anchorY));
    marks.push(
      textBlock({
        x: noteX,
        y: noteY,
        text: comment,
        maxChars: isLeft ? 12 : 15,
        fontSize,
        rotate: isLeft ? -2 : 1.5,
      })
    );
  });

  if (plan.bottomComment) {
    const bottomY = height * 0.9;
    marks.push(`<path d="M ${width * 0.16} ${bottomY - fontSize * 1.4} C ${width * 0.35} ${bottomY - fontSize * 2.1}, ${width * 0.62} ${bottomY - fontSize * 1.2}, ${width * 0.82} ${bottomY - fontSize * 1.7}" />`);
    marks.push(
      textBlock({
        x: width * 0.18,
        y: bottomY,
        text: plan.bottomComment,
        maxChars: 54,
        fontSize,
        rotate: -1,
      })
    );
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${imageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  <g fill="none" stroke="${red}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.96">
    ${marks.filter((mark) => mark.startsWith("<path")).join("\n    ")}
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
