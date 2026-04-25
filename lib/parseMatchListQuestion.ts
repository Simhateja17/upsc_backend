// Parse "Match List I with List II" UPSC-style prelims questions and
// return a heading, a 2-column table, and the original codes/options block.

export interface ParsedMatchList {
  isMatchList: boolean;
  heading?: string;
  listAHeader?: string;
  listBHeader?: string;
  rows?: Array<{ left: string; right: string }>;
  codesBlock?: string;
}

const HEAD_REGEX = /Match\s+List[\s-]*I[\s-]*with\s+List[\s-]*II/i;

export function parseMatchListQuestion(text: string): ParsedMatchList {
  if (!text || !HEAD_REGEX.test(text)) return { isMatchList: false };

  // Try to capture two parenthesized list captions like
  // "(Cricketers)" / "(Country)" or "(Sport/Game)".
  const captionMatches = text.match(/\(([^)]+)\)\s+and\s+List[\s-]*II\s*\(([^)]+)\)/i);
  const listAHeader = captionMatches?.[1];
  const listBHeader = captionMatches?.[2];

  // Find pairs like "1. Foo  A. Bar" or "A. Foo  1. Bar".
  // We look for sequences of "letter. text" then "digit. text" within the same chunk.
  const lines = text.split(/\n|;\s*/).map((l) => l.trim()).filter(Boolean);

  const lefts: { key: string; text: string }[] = [];
  const rights: { key: string; text: string }[] = [];

  for (const line of lines) {
    // Inline "A. Foo  1. Bar"
    const inline = line.match(/^([A-D])\.\s+([^.]+?)\s+(\d)\.\s+(.+)$/);
    if (inline) {
      lefts.push({ key: inline[1], text: inline[2].trim() });
      rights.push({ key: inline[3], text: inline[4].trim() });
      continue;
    }
    // Standalone "A. Barry Richards"
    const left = line.match(/^([A-D])\.\s+(.+)$/);
    if (left && lefts.length < 4) {
      lefts.push({ key: left[1], text: left[2].trim() });
      continue;
    }
    // Standalone "1. England"
    const right = line.match(/^(\d)\.\s+(.+)$/);
    if (right && rights.length < 4) {
      rights.push({ key: right[1], text: right[2].trim() });
      continue;
    }
  }

  if (lefts.length < 2 || rights.length < 2) {
    return { isMatchList: false };
  }

  const rows = lefts.map((l, i) => ({
    left: `${l.key}. ${l.text}`,
    right: rights[i] ? `${rights[i].key}. ${rights[i].text}` : '',
  }));

  // Pull a "Codes:" block (a-d/1-4) for display below the table if present
  const codesIdx = text.search(/Codes\s*:/i);
  const codesBlock = codesIdx >= 0 ? text.slice(codesIdx).trim() : undefined;

  return {
    isMatchList: true,
    heading: 'Match List I with List II and select the correct answer:',
    listAHeader: listAHeader || 'List I',
    listBHeader: listBHeader || 'List II',
    rows,
    codesBlock,
  };
}
