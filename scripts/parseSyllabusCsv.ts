// One-off migration helper: parses the client's Prelims/Mains syllabus CSVs
// (exported from Google Sheets) into the same seed-data shape seedSyllabus.ts
// already uses, so replaceSyllabusPrelimsMains.ts can feed it straight to Prisma.
//
// Every source file follows one rule, confirmed against all 14 files during
// investigation: locate every column where the header row says exactly
// "Subject", treat each as the start of a 3-column `Subject | Theme | Topic`
// block, and use only the LAST (rightmost) block — earlier blocks are raw,
// unedited syllabus wording kept for reference, not clean data. Prelims is
// the one file with several subjects packed into one wide sheet (7 blocks,
// one subject each); Mains files are one subject per file.

import * as fs from "fs";
import * as path from "path";

export interface SeedTopic {
  name: string;
  subs: string[];
}

export interface SeedSubject {
  name: string;
  short: string;
  icon: string;
  color: string;
  bg: string;
  topics: SeedTopic[];
}

// Metadata reused from the existing prisma/seedSyllabus.ts subject styling,
// so the Tracker UI's icons/colors stay consistent with what's already there.
const SUBJECT_META: Record<string, { short: string; icon: string; color: string; bg: string }> = {
  // Prelims
  History: { short: "History", icon: "🏛️", color: "#e07b39", bg: "rgba(224,123,57,.11)" },
  Geography: { short: "Geog.", icon: "🌍", color: "#2e7dd4", bg: "rgba(46,125,212,.10)" },
  Polity: { short: "Polity", icon: "⚖️", color: "#7c3aed", bg: "rgba(124,58,237,.09)" },
  Economy: { short: "Economy", icon: "💰", color: "#059669", bg: "rgba(5,150,105,.09)" },
  Environment: { short: "Environment", icon: "🌿", color: "#16a34a", bg: "rgba(22,163,74,.09)" },
  "International Relations": { short: "IR", icon: "🌐", color: "#2563eb", bg: "rgba(37,99,235,.09)" },
  // Mains-only (some also override a prelims-only entry above by stage, that's fine — different rows)
  "Indian Society": { short: "Society", icon: "👥", color: "#0891b2", bg: "rgba(8,145,178,.09)" },
  Governance: { short: "Governance", icon: "🏛️", color: "#6366f1", bg: "rgba(99,102,241,.09)" },
  "Social Justice": { short: "Social Justice", icon: "⚖️", color: "#dc2626", bg: "rgba(220,38,38,.09)" },
  "Science & Technology": { short: "Science", icon: "🔬", color: "#d97706", bg: "rgba(217,119,6,.09)" },
  "Disaster Management": { short: "Disaster Mgmt", icon: "🚨", color: "#f59e0b", bg: "rgba(245,158,11,.09)" },
  "Internal Security": { short: "Int. Security", icon: "🛡️", color: "#ea580c", bg: "rgba(234,88,12,.09)" },
  Ethics: { short: "Ethics", icon: "🧭", color: "#6366f1", bg: "rgba(99,102,241,.09)" },
};

// Prelims uses its own Science & Technology palette (kept distinct from the
// mains one above — different stage, different row, no conflict).
const PRELIMS_SCIENCE_TECH_META = { short: "Science", icon: "🔬", color: "#0891b2", bg: "rgba(8,145,178,.10)" };

function withMeta(subject: { name: string; topics: SeedTopic[] }, stage: "prelims" | "mains"): SeedSubject {
  const meta =
    stage === "prelims" && subject.name === "Science & Technology"
      ? PRELIMS_SCIENCE_TECH_META
      : SUBJECT_META[subject.name];
  if (!meta) {
    throw new Error(`No icon/color/bg metadata defined for subject "${subject.name}" (stage: ${stage})`);
  }
  return { name: subject.name, ...meta, topics: subject.topics };
}

// ---- CSV parsing ----

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsvRows(filePath: string): string[][] {
  const text = fs.readFileSync(filePath, "utf8");
  return parseCsvText(text);
}

interface BlockStart {
  startCol: number;
  headerRow: number;
}

// Finds every column, within the first few rows, whose cell reads exactly
// "Subject" — each marks the start of a Subject|Theme|Topic block.
function findSubjectBlocks(rows: string[][], maxHeaderRow = 3): BlockStart[] {
  const seen = new Set<number>();
  const blocks: BlockStart[] = [];
  for (let r = 0; r < Math.min(maxHeaderRow, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c].trim() === "Subject" && !seen.has(c)) {
        seen.add(c);
        blocks.push({ startCol: c, headerRow: r });
      }
    }
  }
  blocks.sort((a, b) => a.startCol - b.startCol);
  return blocks;
}

// Reads one 3-column block (Subject, Theme/Sub-Subject, Topic), forward-filling
// blank Subject/Theme cells (merged-cell CSV export behaviour), and groups into
// { name: subject, topics: [{ name: theme, subs: [topic, ...] }] }[]. A block
// may contain more than one subject (Prelims); Mains files have exactly one.
function extractBlock(
  rows: string[][],
  startCol: number,
  dataStartRow: number,
  dataEndRowExclusive: number
): { name: string; topics: SeedTopic[] }[] {
  const topicsBySubject = new Map<string, Map<string, string[]>>();
  const subjectOrder: string[] = [];
  const topicOrderBySubject = new Map<string, string[]>();

  let currentSubject = "";
  let currentTopic = "";

  for (let r = dataStartRow; r < Math.min(dataEndRowExclusive, rows.length); r++) {
    const row = rows[r] ?? [];
    const subjectCell = (row[startCol] ?? "").trim();
    const topicCell = (row[startCol + 1] ?? "").trim();
    const subCell = (row[startCol + 2] ?? "").trim();

    if (subjectCell) currentSubject = subjectCell;
    if (topicCell) currentTopic = topicCell;

    if (!currentSubject || !currentTopic || !subCell) continue;

    if (!topicsBySubject.has(currentSubject)) {
      topicsBySubject.set(currentSubject, new Map());
      topicOrderBySubject.set(currentSubject, []);
      subjectOrder.push(currentSubject);
    }
    const topicsMap = topicsBySubject.get(currentSubject)!;
    if (!topicsMap.has(currentTopic)) {
      topicsMap.set(currentTopic, []);
      topicOrderBySubject.get(currentSubject)!.push(currentTopic);
    }
    // Some source sheets have an accidental duplicated block (e.g. the same
    // "Agriculture" topic pasted twice in GS3_Economy.csv) — skip exact
    // repeat sub-topic names within the same topic rather than fail on the
    // DB's (topic_id, name) uniqueness constraint.
    const subs = topicsMap.get(currentTopic)!;
    if (!subs.includes(subCell)) subs.push(subCell);
  }

  return subjectOrder.map((name) => ({
    name,
    topics: topicOrderBySubject.get(name)!.map((t) => ({ name: t, subs: topicsBySubject.get(name)!.get(t)! })),
  }));
}

// Prelims: one wide file, 7 subject blocks side by side, ends before the
// summary/legend rows near the bottom of the sheet.
export function parsePrelimsCsv(filePath: string): SeedSubject[] {
  const rows = readCsvRows(filePath);
  const DATA_END_ROW = 85; // 1-indexed CSV row 85 is the last real data row; rows 86+ are blank/summary
  const blocks = findSubjectBlocks(rows);
  const subjects: SeedSubject[] = [];
  for (const block of blocks) {
    const extracted = extractBlock(rows, block.startCol, block.headerRow + 1, DATA_END_ROW);
    for (const subj of extracted) {
      subjects.push(withMeta(subj, "prelims"));
    }
  }
  return subjects;
}

// Mains: one file per subject. Always use the LAST block (rightmost = clean/final).
export function parseMainsSubjectCsv(filePath: string): SeedSubject {
  const rows = readCsvRows(filePath);
  const blocks = findSubjectBlocks(rows);
  if (blocks.length === 0) {
    throw new Error(`No "Subject" header column found in ${filePath}`);
  }
  const lastBlock = blocks[blocks.length - 1];
  const extracted = extractBlock(rows, lastBlock.startCol, lastBlock.headerRow + 1, rows.length);
  if (extracted.length !== 1) {
    throw new Error(
      `Expected exactly one subject in the final block of ${filePath}, got ${extracted.length}: ${extracted
        .map((s) => s.name)
        .join(", ")}`
    );
  }
  return withMeta(extracted[0], "mains");
}

export const SYLLABUS_CSV_DIR = "c:\\Users\\manas\\Desktop\\UPSC";

export const MAINS_CSV_FILES = [
  "Syllabus - GS1_History.csv",
  "Syllabus - GS1_Society.csv",
  "Syllabus - GS1_Geography.csv",
  "Syllabus - GS2_Polity.csv",
  "Syllabus - GS2_Governance.csv",
  "Syllabus - GS2_Social_Justice.csv",
  "Syllabus - GS2_International Relations.csv",
  "Syllabus - GS3_Economy.csv",
  "Syllabus - GS3_Science & Technology.csv",
  "Syllabus - GS3_Environment.csv",
  "Syllabus - GS3_Disaster_Management.csv",
  "Syllabus - GS3_Internal_Security.csv",
  "Syllabus - GS4_Ethics.csv",
];

export function parseAllMains(): SeedSubject[] {
  return MAINS_CSV_FILES.map((f) => parseMainsSubjectCsv(path.join(SYLLABUS_CSV_DIR, f)));
}

export function parseAllPrelims(): SeedSubject[] {
  return parsePrelimsCsv(path.join(SYLLABUS_CSV_DIR, "Syllabus - Prelims.csv"));
}
