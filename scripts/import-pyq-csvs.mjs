import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const BACKEND_ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(BACKEND_ROOT, ".env");
const CSV_DIR = path.join(BACKEND_ROOT, "data", "imports", "pyq", "csv");
const NORMALIZED_DIR = path.join(BACKEND_ROOT, "data", "imports", "pyq", "normalized");
const REPORTS_DIR = path.join(BACKEND_ROOT, "data", "imports", "pyq", "reports");
const TARGET_TABLE = "public.pyq_question_bank";

const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const DEFAULT_PAPER = "GS-I";
const DEFAULT_EXAM = "prelims";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    const comment = value.indexOf(" #");
    if (comment !== -1) value = value.slice(0, comment).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function ensureDirs() {
  for (const dir of [CSV_DIR, NORMALIZED_DIR, REPORTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => String(c || "").trim()));
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function slugName(fileName) {
  return path.basename(fileName, path.extname(fileName)).replace(/[^\w.-]+/g, "_");
}

function inferSubjectFromFile(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  const match = base.match(/PYQ\s*-\s*(.+)$/i);
  return (match?.[1] || base).trim();
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripOptionPrefix(value) {
  return normalizeWhitespace(value)
    .replace(/^\(?\s*([a-dA-D])\s*\)?[\).:-]?\s*/, "")
    .trim();
}

function titleCaseDifficulty(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

function normalizeSubject(value, fallback) {
  const subject = String(value || fallback || "").trim();
  if (!subject) return fallback || "Current Affairs";
  if (/^science\s*&?\s*tech/i.test(subject)) return "Science & Technology";
  if (/^environment$/i.test(subject)) return "Environment & Ecology";
  return subject;
}

function normalizeTopic(value) {
  const topic = normalizeWhitespace(value);
  return topic || "Miscellaneous & Current Affairs";
}

function insertMarkerLineBreaks(text) {
  let out = normalizeWhitespace(text);

  // UPSC statements are often collapsed into "I. ... II. ... III. ...".
  out = out.replace(
    /([^\n])\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+/g,
    (_, before, marker) => `${before}\n${marker}. `
  );

  // Same for numbered statements. The guard keeps ordinary decimals mostly intact.
  out = out.replace(
    /([^\n\d])\s+([1-9]\d?)\.\s+(?=[A-Z"'(])/g,
    (_, before, marker) => `${before}\n${marker}. `
  );

  out = out.replace(
    /([^\n])\s+(Statement-[IVX]+)\s*:/gi,
    (_, before, marker) => `${before}\n${marker}:`
  );

  out = out.replace(
    /([^\n])\s+(Statement\s*[12])\s*:/gi,
    (_, before, marker) => `${before}\n${marker}:`
  );

  // Put the final ask/code instruction on its own paragraph.
  out = out.replace(
    /([^\n])\s+(Which (?:one |of |among )?.+?\?)\s*$/i,
    (_, before, prompt) => `${before}\n\n${prompt}`
  );
  out = out.replace(
    /([^\n])\s+(How many .+?\?)\s*$/i,
    (_, before, prompt) => `${before}\n\n${prompt}`
  );
  out = out.replace(
    /([^\n])\s+(In how many .+?\?)\s*$/i,
    (_, before, prompt) => `${before}\n\n${prompt}`
  );
  out = out.replace(
    /([^\n])\s+(Select the answer using the code given below:?)\s*$/i,
    (_, before, prompt) => `${before}\n\n${prompt}`
  );

  return out
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDisplayText(value) {
  return insertMarkerLineBreaks(value);
}

function detectQuestionFormat(displayText) {
  if (/\|/.test(displayText)) return "table";
  if (/following pairs/i.test(displayText) || /\n\s*(?:\d+|I{1,3}|IV|V)\.\s+.+\s[-:]\s.+/i.test(displayText)) {
    return "pairs";
  }
  if (/\n\s*(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(displayText)) return "statements_roman";
  if (/\n\s*\d{1,2}\.\s+/.test(displayText)) return "statements_numbered";
  if (/Statement-[IVX]+|Statement\s*[12]/i.test(displayText)) return "statements_labeled";
  return "plain";
}

function extractQuestionParts(displayText, format) {
  const lines = displayText.split("\n").map((line) => line.trim());
  const itemRe =
    format === "pairs"
      ? /^(\d{1,2}|I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i
      : format === "statements_roman"
        ? /^(I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i
        : /^(\d{1,2})\.\s+(.+)$/;
  const items = [];
  const intro = [];
  const prompt = [];
  let seenItem = false;

  for (const line of lines) {
    if (!line) continue;
    const item = line.match(itemRe);
    if (item) {
      seenItem = true;
      items.push({ label: item[1].toUpperCase(), text: item[2].trim() });
    } else if (!seenItem) {
      intro.push(line);
    } else {
      prompt.push(line);
    }
  }

  return {
    intro: intro.join("\n\n") || null,
    items,
    prompt: prompt.join("\n\n") || null,
  };
}

function normalizeCorrectOption(rawCorrect, options) {
  const raw = normalizeWhitespace(rawCorrect);
  const direct = raw.match(/^\(?\s*([a-dA-D])\s*\)?(?:[\).:-]|\s|$)/);
  if (direct) return direct[1].toUpperCase();

  const strippedCorrect = stripOptionPrefix(raw).toLowerCase();
  if (strippedCorrect) {
    const exact = options.find((opt) => opt.displayText.toLowerCase() === strippedCorrect);
    if (exact) return exact.label;
    const contained = options.find(
      (opt) =>
        opt.displayText.toLowerCase().includes(strippedCorrect) ||
        strippedCorrect.includes(opt.displayText.toLowerCase())
    );
    if (contained) return contained.label;
  }

  return null;
}

function validateQuestion(q) {
  const errors = [];
  if (!Number.isInteger(q.year) || q.year < 1900 || q.year > 2100) errors.push("Invalid or missing year");
  if (!Number.isInteger(q.questionNumber) || q.questionNumber < 1) errors.push("Invalid or missing question number");
  if (!q.question.displayText || q.question.displayText.length < 10) errors.push("Missing question text");
  if (!q.subject) errors.push("Missing subject");
  if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push("Invalid difficulty");
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push("Expected exactly 4 options");
  for (const opt of q.options) {
    if (!opt.displayText) errors.push(`Missing option ${opt.label}`);
  }
  if (!["A", "B", "C", "D"].includes(q.correctOption || "")) errors.push("Correct option cannot be mapped to A/B/C/D");
  return errors;
}

function normalizeRow(row, header, fileName, csvRowNumber) {
  const get = (name) => row[header.indexOf(name)] ?? "";
  const fallbackSubject = inferSubjectFromFile(fileName);
  const year = Number.parseInt(get("Year"), 10);
  const questionNumber = Number.parseInt(get("Question Number"), 10);
  const rawQuestion = normalizeWhitespace(get("Question"));
  const displayText = formatDisplayText(rawQuestion);
  const format = detectQuestionFormat(displayText);
  const options = [1, 2, 3, 4].map((num, index) => {
    const rawText = normalizeWhitespace(get(`Option ${num}`));
    return {
      label: String.fromCharCode(65 + index),
      rawText,
      displayText: stripOptionPrefix(rawText),
    };
  });

  const normalized = {
    source: {
      file: fileName,
      rowNumber: csvRowNumber,
      questionNumber,
    },
    exam: DEFAULT_EXAM,
    year,
    paper: DEFAULT_PAPER,
    questionNumber,
    subject: normalizeSubject(fallbackSubject, "Polity"),
    subSubject: normalizeSubject(get("Sub Subject"), fallbackSubject),
    topic: normalizeTopic(get("Topic")),
    difficulty: titleCaseDifficulty(get("Difficulty")),
    format,
    question: {
      rawText: rawQuestion,
      displayText,
      parts: extractQuestionParts(displayText, format),
    },
    options,
    correctOption: null,
    explanation: {
      rawText: normalizeWhitespace(get("Detailed Explanation")),
      displayText: formatDisplayText(get("Detailed Explanation")),
    },
  };

  normalized.correctOption = normalizeCorrectOption(get("Correct Option"), options);
  return normalized;
}

function parseFile(filePath) {
  const fileName = path.basename(filePath);
  const rows = parseCSV(fs.readFileSync(filePath, "utf8"));
  if (rows.length < 2) return { fileName, questions: [], failures: [{ fileName, rowNumber: 0, errors: ["CSV has no data rows"] }] };

  const header = rows[0].map((h) => String(h || "").trim());
  const required = [
    "Question Number",
    "Year",
    "Question",
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Correct Option",
    "Detailed Explanation",
    "Difficulty",
    "Sub Subject",
    "Topic",
  ];
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    return {
      fileName,
      questions: [],
      failures: [{ fileName, rowNumber: 0, errors: [`Missing columns: ${missing.join(", ")}`] }],
    };
  }

  const questions = [];
  const failures = [];
  for (let i = 1; i < rows.length; i++) {
    const csvRowNumber = i + 1;
    const row = rows[i];
    if (row.length !== header.length) {
      failures.push({
        fileName,
        rowNumber: csvRowNumber,
        questionNumber: row[0] || "",
        errors: [`Expected ${header.length} columns, found ${row.length}`],
      });
      continue;
    }

    const normalized = normalizeRow(row, header, fileName, csvRowNumber);
    const errors = validateQuestion(normalized);
    if (errors.length > 0) {
      failures.push({
        fileName,
        rowNumber: csvRowNumber,
        questionNumber: normalized.questionNumber || "",
        errors,
        questionPreview: normalized.question.displayText.slice(0, 180),
      });
    } else {
      questions.push(normalized);
    }
  }

  return { fileName, questions, failures };
}

function dbRowFromQuestion(q) {
  const importKey = [q.exam, q.year, q.paper, q.questionNumber, q.subject]
    .map((part) => String(part || "").trim().toLowerCase())
    .join(":");

  return {
    importKey,
    exam: q.exam,
    year: q.year,
    paper: q.paper,
    questionNum: q.questionNumber,
    questionText: q.question.displayText,
    subject: q.subject,
    subSubject: q.subSubject,
    topic: q.topic,
    difficulty: q.difficulty,
    options: q.options.map((opt) => ({ label: opt.label, text: opt.displayText })),
    correctOption: q.correctOption,
    explanation: q.explanation.displayText || null,
    structuredJson: q,
    questionStructure: q.question.parts,
    sourceFile: q.source.file,
    sourceRow: q.source.rowNumber,
    status: "approved",
  };
}

async function ensureImportTable(client) {
  await client.query(`
    create table if not exists ${TARGET_TABLE} (
      id text primary key default (gen_random_uuid())::text,
      import_key text not null unique,
      exam text not null default 'prelims',
      year integer not null,
      paper text not null,
      question_num integer not null,
      question_text text not null,
      question_structure jsonb not null default '{}'::jsonb,
      subject text not null,
      sub_subject text,
      topic text,
      difficulty text not null default 'Medium',
      options jsonb not null default '[]'::jsonb,
      correct_option text,
      explanation text,
      structured_json jsonb not null default '{}'::jsonb,
      source_file text,
      source_row integer,
      status text not null default 'approved',
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `);
  await client.query(`alter table ${TARGET_TABLE} enable row level security`);
  await client.query(`create index if not exists pyq_question_bank_subject_status_idx on ${TARGET_TABLE} (subject, status)`);
  await client.query(`create index if not exists pyq_question_bank_sub_subject_idx on ${TARGET_TABLE} (sub_subject)`);
  await client.query(`create index if not exists pyq_question_bank_topic_idx on ${TARGET_TABLE} (topic)`);
  await client.query(`create index if not exists pyq_question_bank_year_paper_idx on ${TARGET_TABLE} (year, paper)`);
}

async function importQuestions(questions) {
  loadEnv(ENV_PATH);
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required in upsc_backend/.env");

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  try {
    await client.query("begin");
    await ensureImportTable(client);
    for (const question of questions) {
      const row = dbRowFromQuestion(question);
      const existing = await client.query(
        `select id from ${TARGET_TABLE} where import_key = $1 limit 1`,
        [row.importKey]
      );

      if (existing.rowCount > 0) {
        await client.query(
          `update ${TARGET_TABLE}
           set exam = $2,
               year = $3,
               paper = $4,
               question_num = $5,
               question_text = $6,
               question_structure = $7::jsonb,
               subject = $8,
               sub_subject = $9,
               topic = $10,
               difficulty = $11,
               options = $12::jsonb,
               correct_option = $13,
               explanation = $14,
               structured_json = $15::jsonb,
               source_file = $16,
               source_row = $17,
               status = $18,
               updated_at = now()
           where id = $1`,
          [
            existing.rows[0].id,
            row.exam, row.year, row.paper, row.questionNum, row.questionText,
            JSON.stringify(row.questionStructure), row.subject, row.subSubject, row.topic,
            row.difficulty, JSON.stringify(row.options), row.correctOption, row.explanation,
            JSON.stringify(row.structuredJson), row.sourceFile, row.sourceRow, row.status,
          ]
        );
        updated++;
      } else {
        await client.query(
          `insert into ${TARGET_TABLE}
            (id, import_key, exam, year, paper, question_num, question_text, question_structure, subject, sub_subject, topic, difficulty, options, correct_option, explanation, structured_json, source_file, source_row, status)
           values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13::jsonb,$14,$15,$16::jsonb,$17,$18,$19)`,
          [
            crypto.randomUUID(),
            row.importKey, row.exam, row.year, row.paper, row.questionNum, row.questionText,
            JSON.stringify(row.questionStructure), row.subject, row.subSubject, row.topic,
            row.difficulty, JSON.stringify(row.options), row.correctOption, row.explanation,
            JSON.stringify(row.structuredJson), row.sourceFile, row.sourceRow, row.status,
          ]
        );
        inserted++;
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }

  return { inserted, updated };
}

function writeArtifacts(fileResults, importStats) {
  const allQuestions = fileResults.flatMap((result) => result.questions);
  const allFailures = fileResults.flatMap((result) => result.failures);

  for (const result of fileResults) {
    const outPath = path.join(NORMALIZED_DIR, `${slugName(result.fileName)}.normalized.json`);
    fs.writeFileSync(outPath, JSON.stringify(result.questions, null, 2) + "\n");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    csvDirectory: CSV_DIR,
    files: fileResults.map((result) => ({
      file: result.fileName,
      normalized: result.questions.length,
      failed: result.failures.length,
    })),
    totals: {
      files: fileResults.length,
      parsedRows: allQuestions.length + allFailures.filter((f) => f.rowNumber !== 0).length,
      imported: allQuestions.length,
      skipped: allFailures.length,
      inserted: importStats.inserted,
      updated: importStats.updated,
    },
    failures: allFailures,
  };

  fs.writeFileSync(path.join(REPORTS_DIR, "import-report.json"), JSON.stringify(report, null, 2) + "\n");

  const failedCsv = [
    ["file", "rowNumber", "questionNumber", "errors", "questionPreview"].map(csvEscape).join(","),
    ...allFailures.map((failure) =>
      [
        failure.fileName,
        failure.rowNumber,
        failure.questionNumber || "",
        (failure.errors || []).join("; "),
        failure.questionPreview || "",
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");
  fs.writeFileSync(path.join(REPORTS_DIR, "failed-rows.csv"), failedCsv + "\n");

  return report;
}

async function main() {
  ensureDirs();
  const csvFiles = fs
    .readdirSync(CSV_DIR)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .sort();

  if (csvFiles.length === 0) {
    console.log(`No CSV files found in ${CSV_DIR}`);
    console.log("Put files like `PYQ - Polity.csv` in that folder and rerun `npm run pyq:import-csvs`.");
    return;
  }

  const fileResults = csvFiles.map((name) => parseFile(path.join(CSV_DIR, name)));
  const validQuestions = fileResults.flatMap((result) => result.questions);
  const importStats = await importQuestions(validQuestions);
  const report = writeArtifacts(fileResults, importStats);

  console.log(`CSV files: ${report.totals.files}`);
  console.log(`Rows parsed: ${report.totals.parsedRows}`);
  console.log(`Imported: ${report.totals.imported} (${report.totals.inserted} inserted, ${report.totals.updated} updated)`);
  console.log(`Skipped: ${report.totals.skipped}`);
  console.log(`Normalized: ${NORMALIZED_DIR}`);
  console.log(`Report: ${path.join(REPORTS_DIR, "import-report.json")}`);
  console.log(`Failed rows: ${path.join(REPORTS_DIR, "failed-rows.csv")}`);
}

main().catch((error) => {
  console.error("[pyq:import-csvs] Failed:", error);
  process.exitCode = 1;
});
