/**
 * Derives a short "key points checklist" from a curated model answer written
 * in markdown, using its section headings (##/###/####). Shared by the Daily
 * Answer and PYQ Mains results endpoints so both surface the same checklist
 * for curated model answers.
 */
export function deriveKeyPointsFromMarkdown(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const points: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}#{2,4}\s+(.*)$/);
    if (!match) continue;
    const heading = match[1]
      .replace(/^\d+[.)]\s*/, "") // drop leading "1. " numbering
      .replace(/[*_`]/g, "") // strip markdown emphasis
      .trim();
    if (!heading) continue;
    if (/^(introduction|conclusion)$/i.test(heading)) continue;
    if (points.some((p) => p.toLowerCase() === heading.toLowerCase())) continue;
    points.push(heading);
    if (points.length >= 8) break;
  }
  return points;
}

/** Structured form used by Mains results and PDF reports. */
export type StructuredModelAnswer = {
  introduction: string;
  sections: Array<{ heading: string; points: string[] }>;
  conclusion: string;
};

const cleanStructuredText = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/**
 * Treat LLM output as untrusted at the API boundary. This keeps malformed
 * sections from reaching the stored JSON or breaking a results PDF.
 */
export function normalizeStructuredModelAnswer(value: unknown): StructuredModelAnswer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const introduction = cleanStructuredText(source.introduction);
  const conclusion = cleanStructuredText(source.conclusion);
  const sections = Array.isArray(source.sections)
    ? source.sections
        .map((section) => {
          if (!section || typeof section !== "object" || Array.isArray(section)) return null;
          const entry = section as Record<string, unknown>;
          const heading = cleanStructuredText(entry.heading);
          const points = Array.isArray(entry.points)
            ? entry.points.map(cleanStructuredText).filter(Boolean).slice(0, 6)
            : [];
          return heading && points.length ? { heading, points } : null;
        })
        .filter((section): section is { heading: string; points: string[] } => Boolean(section))
        .slice(0, 5)
    : [];

  return introduction || sections.length || conclusion
    ? { introduction, sections, conclusion }
    : null;
}
