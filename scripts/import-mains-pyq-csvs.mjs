import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const BACKEND_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const ENV_PATH = path.join(BACKEND_ROOT, ".env");
const CSV_DIR = path.join(REPO_ROOT, "mains_pyq");
const NORMALIZED_DIR = path.join(BACKEND_ROOT, "data", "imports", "pyq-mains", "normalized");
const REPORTS_DIR = path.join(BACKEND_ROOT, "data", "imports", "pyq-mains", "reports");
const TARGET_TABLE = "public.pyq_mains_question_bank";

const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);

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
  for (const dir of [NORMALIZED_DIR, REPORTS_DIR]) {
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

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeMarkdown(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function titleCaseDifficulty(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

function parseMarks(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 15;
}

function normalizeQuestionForFingerprint(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function questionFingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(normalizeQuestionForFingerprint(value))
    .digest("hex");
}

function inferPaperFromFile(fileName) {
  const normalized = fileName.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("gs1")) return "GS-I";
  if (normalized.includes("gs2")) return "GS-II";
  if (normalized.includes("gs3")) return "GS-III";
  if (normalized.includes("gs4")) return "GS-IV";
  return "GS";
}

function normalizeHeader(header) {
  const aliases = new Map([
    ["Sub-Subject", "Sub Subject"],
    ["Sub - Subject", "Sub Subject"],
    ["Model answer", "Model Answer"],
    ["Answer", "Model Answer"],
  ]);

  return header.map((name) => aliases.get(name) || name);
}

function getHeaderValue(row, header, names) {
  const candidates = Array.isArray(names) ? names : [names];
  for (const name of candidates) {
    const index = header.indexOf(name);
    if (index !== -1) return row[index] ?? "";
  }
  return "";
}

function shapeRowToHeader(row, header) {
  if (row.length === header.length) return { row, warnings: [] };
  if (row.length > header.length) {
    const extra = row.slice(header.length);
    if (extra.every((cell) => !String(cell || "").trim())) {
      return {
        row: row.slice(0, header.length),
        warnings: [`Ignored ${extra.length} trailing blank column${extra.length === 1 ? "" : "s"}`],
      };
    }
  }
  if (row.length < header.length) {
    return {
      row: [...row, ...Array.from({ length: header.length - row.length }, () => "")],
      warnings: [`Padded ${header.length - row.length} missing trailing column${header.length - row.length === 1 ? "" : "s"}`],
    };
  }
  return {
    row,
    warnings: [`Expected ${header.length} columns, found ${row.length}`],
  };
}

function normalizeRow(row, header, fileName, csvRowNumber, fallbackQuestionNumber) {
  const get = (name) => getHeaderValue(row, header, name);
  const paper = inferPaperFromFile(fileName);
  const year = Number.parseInt(get("Year"), 10);
  const parsedQuestionNumber = Number.parseInt(get("Question Number"), 10);
  const questionNumber = Number.isInteger(parsedQuestionNumber) ? parsedQuestionNumber : fallbackQuestionNumber;
  const questionText = normalizeMarkdown(get("Question"));
  const modelAnswer = normalizeMarkdown(get("Model Answer"));
  const subject = normalizeWhitespace(get("Subject")) || "General Studies";
  const subSubject = normalizeWhitespace(get("Sub Subject")) || null;
  const theme = normalizeWhitespace(get("Theme")) || null;
  const topic = normalizeWhitespace(get("Topic")) || null;
  const taxonomy = buildMainsTaxonomy({ paper, subject, subSubject, theme, topic });
  const difficulty = titleCaseDifficulty(get("Difficulty"));
  const marks = parseMarks(get("Marks"));
  const fingerprint = questionFingerprint(questionText);
  const importKey = ["mains", year, paper, questionNumber].join(":").toLowerCase();

  return {
    source: {
      file: fileName,
      rowNumber: csvRowNumber,
      questionNumber,
    },
    importKey,
    exam: "mains",
    year,
    paper,
    questionNumber,
    marks,
    questionFingerprint: fingerprint,
    question: {
      rawText: questionText,
      displayText: questionText,
    },
    modelAnswer: {
      rawText: modelAnswer,
      displayText: modelAnswer,
      format: "markdown",
    },
    subject,
    subSubject,
    theme,
    topic,
    taxonomyL1: taxonomy.l1,
    taxonomyL2: taxonomy.l2,
    taxonomyL3: taxonomy.l3,
    difficulty,
  };
}

function buildMainsTaxonomy({ paper, subject, subSubject, theme, topic }) {
  return {
    l1: subject,
    l2: theme || subSubject || null,
    l3: topic || null,
  };
}

function validateQuestion(q) {
  const errors = [];
  if (!Number.isInteger(q.year) || q.year < 1900 || q.year > 2100) errors.push("Invalid or missing year");
  if (!Number.isInteger(q.questionNumber) || q.questionNumber < 1) errors.push("Invalid or missing question number");
  if (!q.question.displayText || q.question.displayText.length < 10) errors.push("Missing question text");
  if (!q.modelAnswer.displayText || q.modelAnswer.displayText.length < 10) errors.push("Missing model answer");
  if (!q.subject) errors.push("Missing subject");
  if (!Number.isInteger(q.marks) || q.marks < 1 || q.marks > 50) errors.push("Invalid or missing marks");
  if (!q.questionFingerprint || q.questionFingerprint.length !== 64) errors.push("Invalid question fingerprint");
  if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push("Invalid difficulty");
  if (!["GS-I", "GS-II", "GS-III", "GS-IV"].includes(q.paper)) errors.push("Paper cannot be mapped to GS-I/II/III/IV");
  return errors;
}

function parseFile(filePath) {
  const fileName = path.basename(filePath);
  const rows = parseCSV(fs.readFileSync(filePath, "utf8"));
  if (rows.length < 2) return { fileName, questions: [], failures: [{ fileName, rowNumber: 0, errors: ["CSV has no data rows"] }] };

  const header = normalizeHeader(rows[0].map((h) => String(h || "").trim()));
  const required = ["Year", "Marks", "Question", "Model Answer", "Difficulty", "Subject", "Theme"];
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
  const warnings = [];
  for (let i = 1; i < rows.length; i++) {
    const csvRowNumber = i + 1;
    const shaped = shapeRowToHeader(rows[i], header);
    if (shaped.warnings.length > 0) {
      const isHardColumnFailure = shaped.row.length !== header.length;
      const warning = {
        fileName,
        rowNumber: csvRowNumber,
        questionNumber: shaped.row[0] || "",
        warnings: shaped.warnings,
      };
      if (isHardColumnFailure) {
        failures.push({ ...warning, errors: shaped.warnings });
        continue;
      }
      warnings.push(warning);
    }

    const normalized = normalizeRow(shaped.row, header, fileName, csvRowNumber, i);
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

  return { fileName, questions, failures, warnings };
}

function dbRowFromQuestion(q) {
  return {
    importKey: q.importKey,
    year: q.year,
    paper: q.paper,
    questionNum: q.questionNumber,
    questionText: q.question.displayText,
    modelAnswer: q.modelAnswer.displayText,
    subject: q.subject,
    subSubject: q.subSubject,
    theme: q.theme,
    topic: q.topic,
    taxonomyL1: q.taxonomyL1,
    taxonomyL2: q.taxonomyL2,
    taxonomyL3: q.taxonomyL3,
    difficulty: q.difficulty,
    marks: q.marks,
    questionFingerprint: q.questionFingerprint,
    structuredJson: q,
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
      year integer not null,
      paper text not null,
      question_num integer not null,
      question_text text not null,
      model_answer text,
      subject text not null,
      sub_subject text,
      theme text,
      topic text,
      taxonomy_l1 text,
      taxonomy_l2 text,
      taxonomy_l3 text,
      difficulty text not null default 'Medium',
      marks integer not null default 15,
      question_fingerprint text,
      structured_json jsonb not null default '{}'::jsonb,
      source_file text,
      source_row integer,
      status text not null default 'approved',
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `);
  await client.query(`alter table ${TARGET_TABLE} enable row level security`);
  await client.query(`alter table ${TARGET_TABLE} add column if not exists taxonomy_l1 text`);
  await client.query(`alter table ${TARGET_TABLE} add column if not exists taxonomy_l2 text`);
  await client.query(`alter table ${TARGET_TABLE} add column if not exists taxonomy_l3 text`);
  await client.query(`alter table ${TARGET_TABLE} add column if not exists marks integer not null default 15`);
  await client.query(`alter table ${TARGET_TABLE} add column if not exists question_fingerprint text`);
  await client.query(`create index if not exists pyq_mains_question_bank_subject_status_idx on ${TARGET_TABLE} (subject, status)`);
  await client.query(`create index if not exists pyq_mains_question_bank_sub_subject_idx on ${TARGET_TABLE} (sub_subject)`);
  await client.query(`create index if not exists pyq_mains_question_bank_theme_idx on ${TARGET_TABLE} (theme)`);
  await client.query(`create index if not exists pyq_mains_question_bank_topic_idx on ${TARGET_TABLE} (topic)`);
  await client.query(`create index if not exists pyq_mains_question_bank_taxonomy_l1_idx on ${TARGET_TABLE} (taxonomy_l1)`);
  await client.query(`create index if not exists pyq_mains_question_bank_taxonomy_l2_idx on ${TARGET_TABLE} (taxonomy_l2)`);
  await client.query(`create index if not exists pyq_mains_question_bank_taxonomy_l3_idx on ${TARGET_TABLE} (taxonomy_l3)`);
  await client.query(`create index if not exists pyq_mains_question_bank_question_fingerprint_idx on ${TARGET_TABLE} (question_fingerprint)`);
  await client.query(`create index if not exists pyq_mains_question_bank_year_paper_idx on ${TARGET_TABLE} (year, paper)`);
}

async function importQuestions(questions, options = {}) {
  loadEnv(ENV_PATH);
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required in upsc_backend/.env");

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  let archived = 0;
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
           set year = $2,
               paper = $3,
               question_num = $4,
               question_text = $5,
               model_answer = $6,
               subject = $7,
               sub_subject = $8,
               theme = $9,
               topic = $10,
               taxonomy_l1 = $11,
               taxonomy_l2 = $12,
               taxonomy_l3 = $13,
               difficulty = $14,
               marks = $15,
               question_fingerprint = $16,
               structured_json = $17::jsonb,
               source_file = $18,
               source_row = $19,
               status = $20,
               updated_at = now()
           where id = $1`,
          [
            existing.rows[0].id,
            row.year, row.paper, row.questionNum, row.questionText, row.modelAnswer,
            row.subject, row.subSubject, row.theme, row.topic,
            row.taxonomyL1, row.taxonomyL2, row.taxonomyL3, row.difficulty,
            row.marks, row.questionFingerprint,
            JSON.stringify(row.structuredJson), row.sourceFile, row.sourceRow, row.status,
          ]
        );
        updated++;
      } else {
        await client.query(
          `insert into ${TARGET_TABLE}
            (id, import_key, year, paper, question_num, question_text, model_answer, subject, sub_subject, theme, topic, taxonomy_l1, taxonomy_l2, taxonomy_l3, difficulty, marks, question_fingerprint, structured_json, source_file, source_row, status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21)`,
          [
            crypto.randomUUID(),
            row.importKey, row.year, row.paper, row.questionNum, row.questionText, row.modelAnswer,
            row.subject, row.subSubject, row.theme, row.topic,
            row.taxonomyL1, row.taxonomyL2, row.taxonomyL3, row.difficulty,
            row.marks, row.questionFingerprint,
            JSON.stringify(row.structuredJson), row.sourceFile, row.sourceRow, row.status,
          ]
        );
        inserted++;
      }
    }
    if (options.archiveStale) {
      const activeImportKeys = questions.map((question) => question.importKey);
      const archiveResult = await client.query(
        `update ${TARGET_TABLE}
         set status = 'archived',
             updated_at = now()
         where status = 'approved'
           and not (import_key = any($1::text[]))`,
        [activeImportKeys]
      );
      archived = archiveResult.rowCount || 0;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }

  return { inserted, updated, archived };
}

async function importQuestionsViaSupabase(questions, options = {}) {
  if (options.archiveStale) {
    throw new Error("--archive-stale requires direct Postgres access; Supabase HTTPS fallback cannot safely archive stale rows");
  }
  loadEnv(ENV_PATH);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for HTTPS import fallback");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let inserted = 0;
  let updated = 0;

  for (const question of questions) {
    const row = dbRowFromQuestion(question);
    const payload = {
      year: row.year,
      paper: row.paper,
      question_num: row.questionNum,
      question_text: row.questionText,
      model_answer: row.modelAnswer,
      subject: row.subject,
      sub_subject: row.subSubject,
      theme: row.theme,
      topic: row.topic,
      taxonomy_l1: row.taxonomyL1,
      taxonomy_l2: row.taxonomyL2,
      taxonomy_l3: row.taxonomyL3,
      difficulty: row.difficulty,
      marks: row.marks,
      question_fingerprint: row.questionFingerprint,
      structured_json: row.structuredJson,
      source_file: row.sourceFile,
      source_row: row.sourceRow,
      status: row.status,
      updated_at: new Date().toISOString(),
    };

    const existing = await supabase
      .from("pyq_mains_question_bank")
      .select("id")
      .eq("import_key", row.importKey)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data?.id) {
      const { error } = await supabase
        .from("pyq_mains_question_bank")
        .update(payload)
        .eq("id", existing.data.id);
      if (error) throw error;
      updated++;
    } else {
      const { error } = await supabase
        .from("pyq_mains_question_bank")
        .insert({ id: crypto.randomUUID(), import_key: row.importKey, ...payload });
      if (error) throw error;
      inserted++;
    }
  }

  return { inserted, updated, archived: 0 };
}

async function importQuestionsWithFallback(questions, options = {}) {
  try {
    return await importQuestions(questions, options);
  } catch (error) {
    if (!["ETIMEDOUT", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH"].includes(error?.code)) {
      throw error;
    }
    console.warn(`[pyq:mains:import-csvs] Postgres import failed (${error.code}); retrying via Supabase HTTPS API.`);
    return importQuestionsViaSupabase(questions, options);
  }
}

async function fetchExistingQuestionsForReconcile() {
  loadEnv(ENV_PATH);
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required in upsc_backend/.env");

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `select
         id,
         import_key,
         year,
         paper,
         question_num,
         question_text,
         source_file,
         source_row,
         status
       from ${TARGET_TABLE}
       where status = 'approved'
       order by year desc, paper asc, question_num asc`
    );
    return result.rows.map((row) => ({
      id: row.id,
      importKey: row.import_key,
      year: Number(row.year),
      paper: row.paper,
      questionNumber: Number(row.question_num),
      questionText: row.question_text,
      sourceFile: row.source_file,
      sourceRow: row.source_row == null ? null : Number(row.source_row),
      fingerprint: questionFingerprint(row.question_text),
    }));
  } finally {
    await client.end();
  }
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function writeCsvReport(fileName, header, rows) {
  const csv = [
    header.map(csvEscape).join(","),
    ...rows.map((row) => header.map((name) => csvEscape(row[name])).join(",")),
  ].join("\n");
  const outPath = path.join(REPORTS_DIR, fileName);
  fs.writeFileSync(outPath, csv + "\n");
  return outPath;
}

function buildReconciliation(fileResults, existingRows) {
  const csvQuestions = fileResults.flatMap((result) => result.questions);
  const csvByFingerprint = groupBy(csvQuestions, (q) => q.questionFingerprint);
  const dbByFingerprint = groupBy(existingRows, (row) => row.fingerprint);

  const duplicateCsvFingerprints = Array.from(csvByFingerprint.entries())
    .filter(([, rows]) => rows.length > 1)
    .flatMap(([fingerprint, rows]) =>
      rows.map((q) => ({
        type: "csv",
        fingerprint,
        idOrImportKey: q.importKey,
        file: q.source.file,
        rowNumber: q.source.rowNumber,
        year: q.year,
        paper: q.paper,
        questionNumber: q.questionNumber,
        preview: q.question.displayText.slice(0, 180),
      }))
    );

  const duplicateDbFingerprints = Array.from(dbByFingerprint.entries())
    .filter(([, rows]) => rows.length > 1)
    .flatMap(([fingerprint, rows]) =>
      rows.map((row) => ({
        type: "db",
        fingerprint,
        idOrImportKey: row.importKey,
        file: row.sourceFile || "",
        rowNumber: row.sourceRow || "",
        year: row.year,
        paper: row.paper,
        questionNumber: row.questionNumber,
        preview: row.questionText.slice(0, 180),
      }))
    );

  const matched = [];
  const unmatchedCsv = [];
  const ambiguousCsv = [];
  const matchedDbIds = new Set();

  for (const q of csvQuestions) {
    const dbMatches = dbByFingerprint.get(q.questionFingerprint) || [];
    if (dbMatches.length === 1) {
      const match = dbMatches[0];
      matchedDbIds.add(match.id);
      matched.push({
        csvFile: q.source.file,
        csvRow: q.source.rowNumber,
        csvImportKey: q.importKey,
        csvYear: q.year,
        csvPaper: q.paper,
        csvQuestionNumber: q.questionNumber,
        csvMarks: q.marks,
        dbId: match.id,
        dbImportKey: match.importKey,
        dbYear: match.year,
        dbPaper: match.paper,
        dbQuestionNumber: match.questionNumber,
        fingerprint: q.questionFingerprint,
        preview: q.question.displayText.slice(0, 180),
      });
    } else if (dbMatches.length === 0) {
      unmatchedCsv.push({
        csvFile: q.source.file,
        csvRow: q.source.rowNumber,
        csvImportKey: q.importKey,
        csvYear: q.year,
        csvPaper: q.paper,
        csvQuestionNumber: q.questionNumber,
        csvMarks: q.marks,
        fingerprint: q.questionFingerprint,
        preview: q.question.displayText.slice(0, 180),
      });
    } else {
      ambiguousCsv.push({
        csvFile: q.source.file,
        csvRow: q.source.rowNumber,
        csvImportKey: q.importKey,
        csvYear: q.year,
        csvPaper: q.paper,
        csvQuestionNumber: q.questionNumber,
        csvMarks: q.marks,
        matchCount: dbMatches.length,
        fingerprint: q.questionFingerprint,
        preview: q.question.displayText.slice(0, 180),
      });
    }
  }

  const existingNotInCsv = existingRows
    .filter((row) => !matchedDbIds.has(row.id) && !csvByFingerprint.has(row.fingerprint))
    .map((row) => ({
      dbId: row.id,
      dbImportKey: row.importKey,
      dbYear: row.year,
      dbPaper: row.paper,
      dbQuestionNumber: row.questionNumber,
      dbSourceFile: row.sourceFile || "",
      dbSourceRow: row.sourceRow || "",
      fingerprint: row.fingerprint,
      preview: row.questionText.slice(0, 180),
    }));

  const duplicateRows = [...duplicateCsvFingerprints, ...duplicateDbFingerprints];
  const paths = {
    matched: writeCsvReport(
      "reconciliation-matched.csv",
      ["csvFile", "csvRow", "csvImportKey", "csvYear", "csvPaper", "csvQuestionNumber", "csvMarks", "dbId", "dbImportKey", "dbYear", "dbPaper", "dbQuestionNumber", "fingerprint", "preview"],
      matched
    ),
    unmatchedCsv: writeCsvReport(
      "reconciliation-unmatched-csv.csv",
      ["csvFile", "csvRow", "csvImportKey", "csvYear", "csvPaper", "csvQuestionNumber", "csvMarks", "fingerprint", "preview"],
      unmatchedCsv
    ),
    ambiguousCsv: writeCsvReport(
      "reconciliation-ambiguous-csv.csv",
      ["csvFile", "csvRow", "csvImportKey", "csvYear", "csvPaper", "csvQuestionNumber", "csvMarks", "matchCount", "fingerprint", "preview"],
      ambiguousCsv
    ),
    existingNotInCsv: writeCsvReport(
      "reconciliation-existing-not-in-csv.csv",
      ["dbId", "dbImportKey", "dbYear", "dbPaper", "dbQuestionNumber", "dbSourceFile", "dbSourceRow", "fingerprint", "preview"],
      existingNotInCsv
    ),
    duplicates: writeCsvReport(
      "reconciliation-duplicates.csv",
      ["type", "fingerprint", "idOrImportKey", "file", "rowNumber", "year", "paper", "questionNumber", "preview"],
      duplicateRows
    ),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    csvRows: csvQuestions.length,
    existingRows: existingRows.length,
    matched: matched.length,
    unmatchedCsv: unmatchedCsv.length,
    ambiguousCsv: ambiguousCsv.length,
    existingNotInCsv: existingNotInCsv.length,
    duplicateCsvFingerprints: duplicateCsvFingerprints.length,
    duplicateDbFingerprints: duplicateDbFingerprints.length,
    paths,
  };
  fs.writeFileSync(path.join(REPORTS_DIR, "reconciliation-report.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

function writeArtifacts(fileResults, importStats) {
  const allQuestions = fileResults.flatMap((result) => result.questions);
  const allFailures = fileResults.flatMap((result) => result.failures);
  const allWarnings = fileResults.flatMap((result) => result.warnings || []);

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
      warned: (result.warnings || []).length,
    })),
    totals: {
      files: fileResults.length,
      parsedRows: allQuestions.length + allFailures.filter((f) => f.rowNumber !== 0).length,
      imported: allQuestions.length,
      skipped: allFailures.length,
      warned: allWarnings.length,
      inserted: importStats.inserted,
      updated: importStats.updated,
      archived: importStats.archived || 0,
    },
    failures: allFailures,
    warnings: allWarnings,
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

  const warningsCsv = [
    ["file", "rowNumber", "questionNumber", "warnings"].map(csvEscape).join(","),
    ...allWarnings.map((warning) =>
      [
        warning.fileName,
        warning.rowNumber,
        warning.questionNumber || "",
        (warning.warnings || []).join("; "),
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");
  fs.writeFileSync(path.join(REPORTS_DIR, "warning-rows.csv"), warningsCsv + "\n");

  return report;
}

async function main() {
  ensureDirs();
  const parseOnly = process.argv.includes("--parse-only");
  const reconcileOnly = process.argv.includes("--reconcile-only");
  const archiveStale = process.argv.includes("--archive-stale");
  const csvFiles = fs
    .readdirSync(CSV_DIR)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .sort();

  if (csvFiles.length === 0) {
    console.log(`No CSV files found in ${CSV_DIR}`);
    return;
  }

  const fileResults = csvFiles.map((name) => parseFile(path.join(CSV_DIR, name)));
  const validQuestions = fileResults.flatMap((result) => result.questions);
  const skipImport = parseOnly || reconcileOnly;
  const importStats = skipImport
    ? { inserted: 0, updated: 0, archived: 0 }
    : await importQuestionsWithFallback(validQuestions, { archiveStale });
  const report = writeArtifacts(fileResults, importStats);
  const reconciliation = reconcileOnly
    ? buildReconciliation(fileResults, await fetchExistingQuestionsForReconcile())
    : null;

  console.log(`CSV files: ${report.totals.files}`);
  console.log(`Rows parsed: ${report.totals.parsedRows}`);
  console.log(
    skipImport
      ? `Parsed valid rows: ${report.totals.imported} (database import skipped)`
      : `Imported: ${report.totals.imported} (${report.totals.inserted} inserted, ${report.totals.updated} updated, ${report.totals.archived} archived)`
  );
  console.log(`Warnings: ${report.totals.warned}`);
  console.log(`Skipped: ${report.totals.skipped}`);
  if (reconciliation) {
    console.log(`Reconciled against DB rows: ${reconciliation.existingRows}`);
    console.log(`Matched: ${reconciliation.matched}`);
    console.log(`Unmatched CSV rows: ${reconciliation.unmatchedCsv}`);
    console.log(`Ambiguous CSV rows: ${reconciliation.ambiguousCsv}`);
    console.log(`Existing DB rows not in CSV: ${reconciliation.existingNotInCsv}`);
    console.log(`Duplicate CSV fingerprint rows: ${reconciliation.duplicateCsvFingerprints}`);
    console.log(`Duplicate DB fingerprint rows: ${reconciliation.duplicateDbFingerprints}`);
    console.log(`Reconciliation report: ${path.join(REPORTS_DIR, "reconciliation-report.json")}`);
  }
  console.log(`Normalized: ${NORMALIZED_DIR}`);
  console.log(`Report: ${path.join(REPORTS_DIR, "import-report.json")}`);
  console.log(`Failed rows: ${path.join(REPORTS_DIR, "failed-rows.csv")}`);
  console.log(`Warning rows: ${path.join(REPORTS_DIR, "warning-rows.csv")}`);
}

main().catch((error) => {
  console.error("[pyq:mains:import-csvs] Failed:", error);
  process.exitCode = 1;
});
