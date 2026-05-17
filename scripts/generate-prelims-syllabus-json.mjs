import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CSV_PATH = path.join(ROOT, 'Syllabus - Prelims.csv');
const OUT_PATH = path.join(ROOT, 'upsc_frontend', 'data', 'syllabus', 'prelimsSyllabus.json');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function clean(value) {
  return String(value || '')
    .replace(/_x0014_/g, '')
    .replace(/[\u0014]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pushUnique(arr, value) {
  if (value && !arr.includes(value)) arr.push(value);
}

export function buildPrelimsSyllabus(csvText) {
  const rows = parseCSV(csvText);
  const groups = [
    ['History', 0, 1, 2],
    ['Geography', 4, 5, 6],
    ['Polity', 8, null, 9],
    ['Economy', 11, 12, 13],
    ['Environment & Ecology', 15, 16, 17],
    ['Science & Technology', 19, 20, 21],
  ];

  return groups.map(([defaultSubject, subjectCol, subCol, topicCol]) => {
    let subject = defaultSubject;
    let subSubject = defaultSubject;
    const subMap = new Map();

    for (const row of rows) {
      const subjectValue = clean(row[subjectCol]);
      if (subjectValue && !/^subject$/i.test(subjectValue)) subject = subjectValue;

      if (subCol !== null) {
        const subValue = clean(row[subCol]);
        if (subValue && !/^sub - subject$/i.test(subValue)) subSubject = subValue;
      } else {
        subSubject = subject;
      }

      const topic = clean(row[topicCol]);
      if (!topic || /^(subject|sub - subject|micro - topic)$/i.test(topic)) continue;

      if (!subMap.has(subSubject)) subMap.set(subSubject, { label: subSubject, topics: [] });
      pushUnique(subMap.get(subSubject).topics, topic);
    }

    return { subject, subSubjects: [...subMap.values()] };
  });
}

const syllabus = buildPrelimsSyllabus(fs.readFileSync(CSV_PATH, 'utf8'));
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, `${JSON.stringify(syllabus, null, 2)}\n`);
console.log(`Wrote ${OUT_PATH}`);
