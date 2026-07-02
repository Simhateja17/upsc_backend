interface NamedSubTopic {
  name: string;
}

interface NamedTopic<TSub extends NamedSubTopic> {
  name: string;
  subTopics: TSub[];
}

const dedupeBase = (s: string): string =>
  s
    .split(/\s*[—–]\s*/)[0]
    .toLowerCase()
    .replace(/isation\b/g, "ization")
    .replace(/\s+/g, " ")
    .trim();

function dedupeSubTopics<TSub extends NamedSubTopic>(subTopics: TSub[]): TSub[] {
  const seen = new Map<string, number>();
  const result: TSub[] = [];
  for (const sub of subTopics) {
    const key = dedupeBase(sub.name);
    if (seen.has(key)) {
      const idx = seen.get(key)!;
      if (sub.name.length > result[idx].name.length) {
        result[idx] = sub;
      }
    } else {
      seen.set(key, result.length);
      result.push(sub);
    }
  }
  return result;
}

/**
 * Merges topics (and their sub-topics) whose names are near-duplicates
 * (differing only by spelling variant or a "— detail" suffix), preserving
 * first-occurrence order. Mirrors the Syllabus Tracker page's client-side
 * normalizeSyllabusData() dedup exactly, so the resulting index positions
 * match what users' saved tracker progress is already keyed against.
 */
export function dedupeSyllabusTopics<TSub extends NamedSubTopic, T extends NamedTopic<TSub>>(
  topics: T[]
): T[] {
  const map = new Map<string, { name: string; subTopics: TSub[]; rest: T }>();
  for (const topic of topics) {
    const key = dedupeBase(topic.name);
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (topic.name.length > existing.name.length) {
        existing.name = topic.name;
      }
      existing.subTopics = existing.subTopics.concat(topic.subTopics);
    } else {
      map.set(key, { name: topic.name, subTopics: [...topic.subTopics], rest: topic });
    }
  }
  return Array.from(map.values()).map((entry) => ({
    ...entry.rest,
    name: entry.name,
    subTopics: dedupeSubTopics(entry.subTopics),
  }));
}

export interface SyllabusCoverageResult {
  totalTopics: number;
  coveredTopics: number;
}

/**
 * Dedupes topics/sub-topics the same way the Syllabus Tracker page does,
 * then counts "done" sub-topics against the tracker state map using the
 * same `${subjectId}__${topicIndex}__${subTopicIndex}` key scheme the
 * frontend writes state under (post-dedup indices).
 */
export function computeSyllabusCoverage<TSub extends NamedSubTopic, T extends NamedTopic<TSub>>(
  topics: T[],
  subjectId: string,
  stateMap: Record<string, { status?: string }>
): SyllabusCoverageResult {
  const dedupedTopics = dedupeSyllabusTopics(topics);
  let totalTopics = 0;
  let coveredTopics = 0;
  dedupedTopics.forEach((topic, topicIndex) => {
    topic.subTopics.forEach((_, subTopicIndex) => {
      totalTopics += 1;
      const key = `${subjectId}__${topicIndex}__${subTopicIndex}`;
      if (stateMap[key]?.status === "done") coveredTopics += 1;
    });
  });
  return { totalTopics, coveredTopics };
}
