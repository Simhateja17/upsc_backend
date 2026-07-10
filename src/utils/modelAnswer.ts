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
