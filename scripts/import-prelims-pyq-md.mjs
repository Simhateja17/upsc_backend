import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const MD_PATH = path.join(ROOT, 'prelims_pyq.md');
const ENV_PATH = path.join(ROOT, 'upsc_backend', '.env');
const SYLLABUS_JSON_PATH = path.join(ROOT, 'upsc_frontend', 'data', 'syllabus', 'prelimsSyllabus.json');
const SOURCE_FILE = 'prelims_pyq.md';
const RECENT_YEAR_MIN = 2011;
const RECENT_YEAR_MAX = 2025;
const MAX_RECENT_YEAR_QUESTIONS = 100;
const PRELIMS_2025_START_LINE = 296;
const PRELIMS_2025_END_LINE = 4738;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    const hash = val.indexOf(' #');
    if (hash !== -1) val = val.slice(0, hash).trim();
    val = val.replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function cleanText(input) {
  return String(input || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/_/g, '')
    .replace(/[\uFFFD�]+/g, ' ')
    .replace(/[•]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?])/g, '$1')
    .trim();
}

function normalizeOptionLabel(label) {
  return String(label || '').trim().toUpperCase();
}

function extractAnswer(block) {
  const head = block.slice(0, 5000);
  const answerPrefix = head.match(/\bAns\.?\s*:?\s*([\s\S]{0,100})/i);
  if (!answerPrefix) return null;
  const match = answerPrefix[1].match(/_([a-dA-D])_/)
    || answerPrefix[1].match(/\b([a-dA-D])\b/);
  return match ? normalizeOptionLabel(match[1]) : null;
}

function extractOptions(block) {
  const beforeAns = block.split(/\bAns\.?\s*:/i)[0];
  const options = [];
  const markers = [...beforeAns.matchAll(/\(\s*_?([a-dA-D])_?\s*\)/g)];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const label = normalizeOptionLabel(marker[1]);
    const start = (marker.index || 0) + marker[0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index || beforeAns.length : beforeAns.length;
    const text = cleanText(beforeAns.slice(start, end));
    if (text && !options.some((o) => o.label === label)) options.push({ label, text });
  }
  if (options.length > 0) return options;

  const re = /\(\s*_?([a-dA-D])_?\s*\)\s*([^()\n]+?)(?=\s*\(\s*_?[a-dA-D]_?\s*\)|\n\s*\n|$)/g;
  let m;
  while ((m = re.exec(beforeAns)) !== null) {
    const label = normalizeOptionLabel(m[1]);
    const text = cleanText(m[2]);
    if (text && !options.some((o) => o.label === label)) options.push({ label, text });
  }
  return options;
}

function extractExplanation(block) {
  const parts = block.split(/\bAns\.?\s*:/i);
  if (parts.length < 2) return null;
  const explanation = cleanText(parts.slice(1).join('Ans:'));
  return explanation || null;
}

const SUBJECT_KEYWORDS = [
  ['Ancient History', 'History'],
  ['Medieval History', 'History'],
  ['Modern History', 'History'],
  ['Art and Culture', 'Art & Culture'],
  ['Art & Culture', 'Art & Culture'],
  ['Polity', 'Polity'],
  ['Indian Economy', 'Economy'],
  ['Economy', 'Economy'],
  ['Geography', 'Geography'],
  ['Environment and Ecology', 'Environment'],
  ['Environment', 'Environment'],
  ['Science and Technology', 'Science & Tech'],
  ['Science & Technology', 'Science & Tech'],
  ['International Relations', 'International Relations'],
  ['Current Affairs', 'Current Affairs'],
  ['General Knowledge', 'Current Affairs'],
];

function inferSubject(text, fallback = 'Current Affairs') {
  const lower = text.toLowerCase();
  const probes = [
    [/constitution|parliament|president|governor|panchayat|court|judicial|article|fundamental right|directive principle|lok sabha|rajya sabha/, 'Polity'],
    [/gdp|inflation|bank|rbi|tax|budget|finance|market|agriculture|industry|plan|subsidy|wto|currency|fiscal/, 'Economy'],
    [/biodiversity|wildlife|pollution|pollutant|ecosystem|climate change|wetland|species|national park|sanctuary|plastic|microplastic|waste|carbon|emission|environment/, 'Environment & Ecology'],
    [/dna|virus|space|satellite|battery|technology|nuclear|biotech|disease|drug|uav|missile|semiconductor|quantum|majorana|monoclonal|chemistry|explosive|graphite|lithium|cobalt|nickel|electric vehicle/, 'Science & Technology'],
    [/river|lake|monsoon|climate|soil|plateau|mountain|ocean|latitude|longitude|cyclone|forest|delta/, 'Geography'],
    [/dance|music|temple|painting|architecture|literature|sculpture|jain|buddhist|sufi|bhakti/, 'History'],
    [/buddha|maury|gupta|vedic|harapp|chola|mughal|sultan|british|congress|gandhi|revolt|act of 19|movement/, 'History'],
    [/united nations|asean|brics|g20|neighbour|treaty|international|country|border|bilateral/, 'International Relations'],
  ];
  for (const [re, subject] of probes) if (re.test(lower)) return subject;
  return fallback;
}

function normalizeSyllabusSubject(subject) {
  const value = String(subject || '').trim();
  if (value === 'Environment') return 'Environment & Ecology';
  if (value === 'Science & Tech') return 'Science & Technology';
  if (value === 'Art & Culture') return 'History';
  return value;
}

function tokenize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

const STOPWORDS = new Set([
  'with', 'reference', 'following', 'consider', 'statement', 'statements',
  'which', 'among', 'given', 'above', 'below', 'correct', 'incorrect',
  'india', 'indian', 'country', 'countries', 'only', 'three', 'four',
  'about', 'under', 'during', 'terms', 'respect', 'context', 'known',
  'best', 'most', 'more', 'less', 'type', 'types', 'system', 'systems',
]);

function loadSyllabusEntries() {
  const tree = JSON.parse(fs.readFileSync(SYLLABUS_JSON_PATH, 'utf8'));
  const entries = [];
  for (const subjectNode of tree) {
    for (const sub of subjectNode.subSubjects || []) {
      for (const topic of sub.topics || []) {
        const phrase = `${subjectNode.subject} ${sub.label} ${topic}`;
        entries.push({
          subject: subjectNode.subject,
          subSubject: sub.label,
          topic,
          phrase: cleanText(phrase).toLowerCase(),
          tokens: tokenize(phrase),
        });
      }
    }
  }
  entries.push({
    subject: 'Current Affairs',
    subSubject: 'Current Affairs and Miscellaneous',
    topic: 'Current Affairs and Miscellaneous',
    phrase: 'current affairs miscellaneous reports indices schemes policies places persons awards appointments',
    tokens: tokenize('current affairs miscellaneous reports indices schemes policies places persons awards appointments'),
  });
  return entries;
}

const SYLLABUS_ENTRIES = loadSyllabusEntries();

function classifySyllabus(questionText, explanation, fallbackSubject) {
  const questionOnly = cleanText(questionText).toLowerCase();
  const haystack = cleanText(`${questionText} ${String(explanation || '').slice(0, 350)}`).toLowerCase();
  const haystackTokens = new Set(tokenize(haystack));
  const questionTokens = new Set(tokenize(questionOnly));

  if (/plastic|cigarette butt|tyre|e-waste|solid waste|microplastic/.test(questionOnly)) {
    return {
      subject: 'Environment & Ecology',
      subSubject: 'Pollution',
      topic: 'Solid Waste, e-waste Management',
    };
  }
  if (/carbon dioxide|carbon emission|cop\\d+|climate change|greenhouse|unfccc|cement industry/.test(questionOnly)) {
    return {
      subject: 'Environment & Ecology',
      subSubject: 'Climate Change',
      topic: 'Basics of Climate change, GHG, Ozone, Acid Rain',
    };
  }
  if (/uav|drone|missile|defence|ballistic|cruise missile/.test(questionOnly)) {
    return {
      subject: 'Science & Technology',
      subSubject: 'Defence',
      topic: 'Defense technology: missiles, drones, indigenous weapons',
    };
  }
  if (/quantum|majorana|semiconductor|artificial intelligence|cyber|blockchain|internet|computer/.test(questionOnly)) {
    return {
      subject: 'Science & Technology',
      subSubject: 'Electronics & Communications & IT',
      topic: 'Emerging trends, blockchain, virtual reality',
    };
  }
  if (/monoclonal|virus|bacteria|vaccine|immunity|disease|antibod/.test(questionOnly)) {
    return {
      subject: 'Science & Technology',
      subSubject: 'Human Health & Diseases',
      topic: 'Immunity and its types',
    };
  }
  if (/battery|lithium|cobalt|nickel|graphite|ethanol|nitroglycerine|urea|cl-20|hmx|llm-\\s*105|chemical substances/.test(questionOnly)) {
    return {
      subject: 'Science & Technology',
      subSubject: 'General Science',
      topic: 'Chemistry: Atomic structure, Periodic table, Chemical bonding, Acids-bases, Salts, Environmental chemistry, Polymers, Fertilizers, Drugs',
    };
  }

  const inferred = normalizeSyllabusSubject(inferSubject(haystack, fallbackSubject));
  const scopedEntries = SYLLABUS_ENTRIES.filter(
    (entry) => entry.subject === inferred || entry.subSubject === inferred
  );
  const candidates = scopedEntries.length > 0 ? scopedEntries : SYLLABUS_ENTRIES;

  let best = null;
  let bestScore = -Infinity;
  for (const entry of candidates) {
    let score = 0;
    if (entry.subject === inferred) score += 10;
    if (entry.subSubject === inferred) score += 10;
    if (haystack.includes(entry.subSubject.toLowerCase())) score += 12;
    if (haystack.includes(entry.topic.toLowerCase())) score += 20;

    for (const token of entry.tokens) {
      if (questionTokens.has(token)) score += token.length >= 8 ? 5 : 2.5;
      if (haystackTokens.has(token)) score += token.length >= 8 ? 3 : 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 8) {
    return {
      subject: inferred,
      subSubject: inferred === 'Current Affairs' ? 'Current Affairs and Miscellaneous' : 'Miscellaneous',
      topic: inferred === 'Current Affairs' ? 'Current Affairs and Miscellaneous' : 'Miscellaneous',
    };
  }

  return {
    subject: best.subject,
    subSubject: best.subSubject,
    topic: best.topic,
  };
}

function rawQuestionStarts(text) {
  const byIndex = new Map();
  const patterns = [
    /(?:^|\n)\s*\*\*(\d{1,3})\.\s+(.{12,260}?)(?:\*\*)?(?=\n|$)/g,
    /(?:^|\n)\s*(?:\*\*)?(\d{1,3})\.\s+(?=(?:Consider|With|Which|Who|What|How|In|By|The|Assertion|Statement|Regarding|Among|Under)\b).{12,260}?(?:\*\*)?(?=\n|$)/g,
    /(?:^|\n)\s*(?:\*\*)?(\d{1,3})\.\s+[\s\S]{0,500}?\((?:19\d{2}|20\d{2})\)\s*\*\*/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const full = m[0];
      const idx = m.index + (full.startsWith('\n') ? 1 : 0);
      const num = Number(m[1]);
      const title = cleanText(full);
      if (!title) continue;
      if (/^(Full battery|Hydrogen fuel|Cobalt|Graphite|Lithium|Nickel|Ethanol|Nitroglycerine|Urea)\b/i.test(title)) continue;
      if (/^(The|It|This|From|During|In India|There|No virus|All types)\b/i.test(title) && !/[?]$/.test(title) && !/consider|which|with reference|statement/i.test(title)) continue;
      const until = text.slice(idx, idx + 3000);
      if (!/\bAns\.?\s*:/i.test(until)) continue;
      byIndex.set(idx, { index: idx, num });
    }
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function findQuestionStarts(text) {
  const starts = rawQuestionStarts(text);
  return starts.filter((start, i) => {
    const nextHigher = starts
      .slice(i + 1)
      .find((candidate) => candidate.num > start.num);
    const end = nextHigher?.index ?? starts[i + 1]?.index ?? text.length;
    const block = text.slice(start.index, end);
    return /\bAns\.?\s*:?/i.test(block) && /\(\s*_?[a-dA-D]_?\s*\)/.test(block);
  });
}

function buildQuestionFromBlock(text, block, start, defaultYear = null) {
  const firstLine = block.split('\n')[0];
  const title = cleanText(firstLine.replace(/^\**\d{1,3}\.\s*/, '').replace(/\*+$/, ''));
  if (!title || title.length < 12) return null;

  const yearMatch = title.match(/\((20\d{2}|19\d{2})\)\s*$/) || block.slice(0, 900).match(/\((20\d{2}|19\d{2})\)\s*\*\*/);
  let year = yearMatch ? Number(yearMatch[1]) : null;
  if (!year && defaultYear) year = defaultYear;
  if (!year || year < 1995 || year > 2025) return null;

  const beforeAnswer = block.split(/\bAns\.?\s*:?/i)[0];
  const firstOptionIndex = beforeAnswer.search(/\(\s*_?[a-dA-D]_?\s*\)/);
  const stem = firstOptionIndex === -1 ? beforeAnswer : beforeAnswer.slice(0, firstOptionIndex);
  const questionText = cleanText(stem)
    .replace(/^\d{1,3}\.\s*/, '')
    .replace(/^[A-Z][A-Z\s&,-]{6,}\s+\d{1,3}\.\s*/, '')
    .replace(/\((20\d{2}|19\d{2})\)\s*$/, '')
    .trim();
  if (questionText.length < 20) return null;

  const prefix = text.slice(Math.max(0, start.index - 2200), start.index);
  let fallbackSubject = 'Current Affairs';
  for (const [needle, subject] of SUBJECT_KEYWORDS) {
    if (new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(prefix)) fallbackSubject = subject;
  }

  const options = extractOptions(block);
  const correctOption = extractAnswer(block);
  const explanation = extractExplanation(block);
  const syllabus = classifySyllabus(questionText, explanation, fallbackSubject);
  return {
    year,
    paper: 'GS-I',
    questionNum: start.num,
    questionText,
    subject: syllabus.subject,
    subSubject: syllabus.subSubject,
    topic: syllabus.topic,
    difficulty: 'Medium',
    options,
    correctOption,
    explanation,
    sourceFile: SOURCE_FILE,
    status: 'approved',
  };
}

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((q) => {
    const key = `${q.year}:${q.questionText.toLowerCase().replace(/\W+/g, ' ').slice(0, 180)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseMarkdownText(text, options = {}) {
  const starts = findQuestionStarts(text);
  const defaultYear = options.defaultYear ?? null;
  const questions = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const block = text.slice(start.index, end).trim();
    const question = buildQuestionFromBlock(text, block, start, defaultYear);
    if (question) questions.push(question);
  }

  return dedupeQuestions(questions);
}

function parseRecentTaggedQuestions(text) {
  const candidates = [];
  // Non-2025 questions in this markdown carry the year at the end of the
  // stem, immediately followed by the closing markdown bold marker.
  const re = /(?:^|\n)\s*(?:\*\*)?(\d{1,3})\.\s+[\s\S]{0,700}?\((20(?:1[1-9]|2[0-4]))\)\s*\*\*/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const index = match.index + (match[0].startsWith('\n') ? 1 : 0);
    candidates.push({ index, num: Number(match[1]) });
  }

  const questions = [];
  for (let i = 0; i < candidates.length; i++) {
    const start = candidates[i];
    const end = candidates[i + 1]?.index ?? text.length;
    const block = text.slice(start.index, end).trim();
    if (!/\bAns\.?\s*:?/i.test(block) || !/\(\s*_?[a-dA-D]_?\s*\)/.test(block)) continue;
    const question = buildQuestionFromBlock(text, block, start);
    if (question && question.year >= RECENT_YEAR_MIN && question.year < RECENT_YEAR_MAX) {
      questions.push(question);
    }
  }

  return dedupeQuestions(questions);
}

function limitRecentYears(rows) {
  const counts = new Map();
  return rows.filter((row) => {
    if (row.year < RECENT_YEAR_MIN || row.year > RECENT_YEAR_MAX) return true;
    const count = counts.get(row.year) || 0;
    if (count >= MAX_RECENT_YEAR_QUESTIONS) return false;
    row.questionNum = count + 1;
    counts.set(row.year, row.questionNum);
    return true;
  });
}

function parseMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const prelims2025 = lines.slice(PRELIMS_2025_START_LINE - 1, PRELIMS_2025_END_LINE).join('\n');
  const rest = [
    ...lines.slice(0, PRELIMS_2025_START_LINE - 1),
    ...lines.slice(PRELIMS_2025_END_LINE),
  ].join('\n');

  return limitRecentYears([
    ...parseMarkdownText(prelims2025, { defaultYear: 2025 }),
    ...parseRecentTaggedQuestions(rest),
    ...parseMarkdownText(rest),
  ]);
}

function byYear(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.year, (counts.get(row.year) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[0] - a[0]);
}

async function importRows(rows) {
  loadEnv(ENV_PATH);
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin');
    await client.query(`
      do $$
      begin
        if to_regclass('public.pyq_chunks') is not null then
          delete from public.pyq_chunks where pyq_question_id in (select id from public.pyq_questions);
        end if;
      end $$;
    `);
    await client.query('delete from public.pyq_questions');

    const sql = `insert into public.pyq_questions
      (id, year, paper, question_num, question_text, subject, sub_subject, topic, difficulty, options, correct_option, explanation, source_file, status)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)`;
    for (const row of rows) {
      await client.query(sql, [
        crypto.randomUUID(), row.year, row.paper, row.questionNum, row.questionText,
        row.subject, row.subSubject, row.topic, row.difficulty, JSON.stringify(row.options), row.correctOption,
        row.explanation, row.sourceFile, row.status,
      ]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

const rows = parseMarkdown(fs.readFileSync(MD_PATH, 'utf8'));
console.log(`Parsed ${rows.length} questions from ${MD_PATH}`);
for (const [year, count] of byYear(rows)) console.log(`${year}: ${count}`);

if (process.argv.includes('--apply')) {
  await importRows(rows);
  console.log(`Imported ${rows.length} rows into public.pyq_questions`);
}
