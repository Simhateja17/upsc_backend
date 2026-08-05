import prisma from "../config/database";
import { invokeModelJSON } from "../config/llm";

export interface SyllabusPath {
  stage: string;
  subjectId: string;
  subject: string;
  topicId: string;
  topic: string;
  subTopicId: string;
  subTopic: string;
}

export interface EditorialSyllabusMapping {
  primary: SyllabusPath | null;
  secondary: SyllabusPath[];
  source: "deterministic" | "ai" | "unmapped";
  confidence: number;
}

type TaxonomyPath = SyllabusPath & { searchText: string };

type Rule = {
  subject: string;
  topic: string;
  subTopic: string;
  phrases: string[];
  weight?: number;
};

// These are matching cues only. The returned paths always come from the
// backend syllabus tables, which remain the source of truth for names and IDs.
const RULES: Rule[] = [
  { subject: "Economy", topic: "Financial System", subTopic: "RBI & Monetary Policy", phrases: ["reserve bank", "rbi", "monetary policy", "repo rate", "reverse repo", "monetary policy committee", "mpc", "crr", "slr"], weight: 5 },
  { subject: "Economy", topic: "External Sector", subTopic: "Balance of Payments", phrases: ["foreign direct investment", " fdi", "net fdi", "capital outflow", "capital inflow", "balance of payments", "bop", "current account deficit", "cad"], weight: 5 },
  { subject: "Economy", topic: "External Sector", subTopic: "Foreign Trade", phrases: ["export", "import", "trade deficit", "free trade agreement", "fta", "tariff"], weight: 3 },
  { subject: "Economy", topic: "Economic Fundamentals", subTopic: "Inflation", phrases: ["inflation", "consumer price index", "cpi", "wholesale price index", "wpi"], weight: 4 },
  { subject: "Economy", topic: "Public Finance", subTopic: "Government Budget", phrases: ["union budget", "budget estimate", "fiscal deficit", "government expenditure"], weight: 4 },
  { subject: "Environment & Ecology", topic: "Climate Change", subTopic: "Climate Mitigation & Adaptation", phrases: ["climate change", "climate crisis", "global warming", "climate mitigation", "climate adaptation", "emission", "greenhouse gas", "carbon market"], weight: 5 },
  { subject: "Environment & Ecology", topic: "Sustainable Development", subTopic: "Renewable Energy", phrases: ["clean energy", "renewable energy", "solar power", "wind power", "green energy"], weight: 4 },
  { subject: "Environment & Ecology", topic: "Environmental Governance & Institutions", subTopic: "International Environmental Governance", phrases: ["unfccc", "cop", "paris agreement", "climate convention", "un climate change"], weight: 5 },
  { subject: "International Relations", topic: "Global Issues", subTopic: "Climate Diplomacy", phrases: ["climate diplomacy", "cop", "unfccc", "paris agreement", "un climate change"], weight: 4 },
  { subject: "Geography", topic: "Indian Geography", subTopic: "Indian Climate & Monsoon", phrases: ["monsoon", "el niño", "la niña", "indian climate"], weight: 4 },
  { subject: "Geography", topic: "Physical Geography", subTopic: "Earthquakes, Volcanoes & Tsunamis", phrases: ["earthquake", "volcano", "tsunami"], weight: 4 },
  { subject: "Polity", topic: "Legislature", subTopic: "Parliament", phrases: ["parliament", "lok sabha", "rajya sabha", "parliamentary committee"], weight: 4 },
  { subject: "Polity", topic: "Judiciary", subTopic: "Supreme Court", phrases: ["supreme court", "constitutional bench", "judicial review"], weight: 4 },
  { subject: "Science & Technology", topic: "Space Technology", subTopic: "ISRO & Indian Space Programme", phrases: ["isro", "space mission", "launch vehicle", "satellite launch"], weight: 5 },
  { subject: "Science & Technology", topic: "Information & Communication Technology (ICT)", subTopic: "Artificial Intelligence, Machine Learning & Robotics", phrases: ["artificial intelligence", "generative ai", "machine learning", "robotics"], weight: 4 },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalSubject(value: string): string {
  const normalized = normalize(value);
  if (normalized === "environment" || normalized === "environment and ecology") return "Environment & Ecology";
  return value;
}

async function loadPaths(): Promise<TaxonomyPath[]> {
  const subjects = await prisma.syllabusSubject.findMany({
    where: { stage: { in: ["prelims", "mains"] } },
    include: { topics: { include: { subTopics: true } } },
  });

  return subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      topic.subTopics.map((subTopic) => ({
        stage: subject.stage,
        subjectId: subject.id,
        subject: canonicalSubject(subject.name),
        topicId: topic.id,
        topic: topic.name,
        subTopicId: subTopic.id,
        subTopic: subTopic.name,
        searchText: [subject.name, topic.name, subTopic.name].map(normalize).join(" "),
      }))
    )
  );
}

export async function getEditorialSyllabusPaths(): Promise<SyllabusPath[]> {
  const paths = await loadPaths();
  return paths.map(({ searchText: _searchText, ...path }) => path);
}

export async function resolveEditorialSyllabusPaths(
  primarySubTopicId: string,
  secondarySubTopicIds: string[] = []
): Promise<{ primary: SyllabusPath; secondary: SyllabusPath[] } | null> {
  const paths = await loadPaths();
  const byId = new Map(paths.map((path) => [path.subTopicId, path]));
  const primary = byId.get(primarySubTopicId);
  if (!primary || primary.stage !== "prelims") return null;
  const secondary = stableUnique(
    secondarySubTopicIds.map((id) => byId.get(id)).filter((path): path is TaxonomyPath => !!path)
  ).filter((path) => path.subTopicId !== primary.subTopicId).slice(0, 2);
  const { searchText: _searchText, ...primaryPath } = primary;
  return { primary: primaryPath, secondary: secondary.map(({ searchText: _ignored, ...path }) => path) };
}

function findPath(paths: TaxonomyPath[], rule: Rule): TaxonomyPath | undefined {
  const subject = normalize(rule.subject);
  const topic = normalize(rule.topic);
  const subTopic = normalize(rule.subTopic);
  return paths.find((path) =>
    normalize(path.subject) === subject && normalize(path.topic) === topic && normalize(path.subTopic) === subTopic
  );
}

function scoreRule(text: string, rule: Rule): number {
  const hits = rule.phrases.filter((phrase) => text.includes(phrase)).length;
  return hits * (rule.weight ?? 1);
}

function stableUnique(paths: TaxonomyPath[]): TaxonomyPath[] {
  const ids = new Set<string>();
  return paths.filter((path) => {
    if (ids.has(path.subTopicId)) return false;
    ids.add(path.subTopicId);
    return true;
  });
}

async function classifyWithAi(text: string, paths: TaxonomyPath[]): Promise<SyllabusPath[] | null> {
  const allowed = paths.map((path) => ({
    stage: path.stage,
    subjectId: path.subjectId,
    subject: path.subject,
    topicId: path.topicId,
    topic: path.topic,
    subTopicId: path.subTopicId,
    subTopic: path.subTopic,
  }));
  try {
    const result = await invokeModelJSON<{ primarySubTopicId?: string; secondarySubTopicIds?: string[] }>(
      [{ role: "user", content: `Article:\n${text.slice(0, 6000)}\n\nAllowed syllabus paths:\n${JSON.stringify(allowed)}` }],
      {
        system: "Map this UPSC current-affairs article to the provided syllabus paths. Return JSON only: {primarySubTopicId:string|null, secondarySubTopicIds:string[]}. Choose one primary and up to two genuinely independent secondary paths. Use only IDs supplied in Allowed syllabus paths.",
        maxTokens: 220,
        temperature: 0,
        serviceName: "editorialSyllabusMapper",
      }
    );
    const byId = new Map(paths.map((path) => [path.subTopicId, path]));
    const selected = [result.primarySubTopicId, ...(result.secondarySubTopicIds || [])]
      .filter((id): id is string => typeof id === "string")
      .map((id) => byId.get(id))
      .filter((path): path is TaxonomyPath => !!path);
    const unique = stableUnique(selected);
    const primary = unique.find((path) => path.stage === "prelims");
    return primary ? [primary, ...unique.filter((path) => path.subTopicId !== primary.subTopicId)].slice(0, 3) : null;
  } catch (error) {
    console.warn("[Editorial syllabus] AI fallback failed", error);
    return null;
  }
}

export async function mapEditorialToSyllabus(
  title: string,
  summary?: string | null,
  content?: string | null
): Promise<EditorialSyllabusMapping> {
  const paths = await loadPaths();
  if (!paths.length) return { primary: null, secondary: [], source: "unmapped", confidence: 0 };

  const text = `${title} ${summary || ""} ${content || ""}`.toLowerCase();
  const scored = RULES
    .map((rule) => ({ path: findPath(paths, rule), score: scoreRule(text, rule) }))
    .filter((item): item is { path: TaxonomyPath; score: number } => !!item.path && item.score > 0)
    .sort((a, b) => b.score - a.score);

  const primaryScored = scored.filter((item) => item.path.stage === "prelims");
  const best = primaryScored[0];
  const runnerUp = primaryScored[1];
  const isConfident = !!best && best.score >= 4 && (!runnerUp || best.score - runnerUp.score >= 2);
  if (isConfident) {
    const secondary = stableUnique(scored.slice(1).map((item) => item.path)).slice(0, 2);
    return { primary: best.path, secondary, source: "deterministic", confidence: Math.min(1, best.score / 10) };
  }

  const aiPaths = await classifyWithAi(text, paths);
  if (aiPaths?.length) {
    return { primary: aiPaths[0], secondary: aiPaths.slice(1, 3), source: "ai", confidence: 0.7 };
  }

  if (best) {
    return { primary: best.path, secondary: stableUnique(scored.slice(1).map((item) => item.path)).slice(0, 2), source: "deterministic", confidence: Math.min(0.6, best.score / 10) };
  }
  return { primary: null, secondary: [], source: "unmapped", confidence: 0 };
}

export function mappingDisplayTags(mapping: EditorialSyllabusMapping): string[] {
  if (!mapping.primary) return [];
  return [mapping.primary.subject, mapping.primary.subTopic, ...mapping.secondary.map((path) => path.subTopic)];
}
