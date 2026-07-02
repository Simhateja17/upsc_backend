import { describe, expect, it } from "vitest";
import { computeSyllabusCoverage, dedupeSyllabusTopics } from "../src/utils/syllabusDedup";

interface SubTopic { name: string }
interface Topic { name: string; subTopics: SubTopic[] }

describe("dedupeSyllabusTopics", () => {
  it("merges topics whose names normalize to the same value, keeping the longer name", () => {
    const topics: Topic[] = [
      { name: "Modern India", subTopics: [{ name: "1857 Revolt" }] },
      { name: "Modern India — Freedom Struggle", subTopics: [{ name: "Quit India Movement" }] },
    ];

    const result = dedupeSyllabusTopics(topics);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Modern India — Freedom Struggle");
    expect(result[0].subTopics.map((s) => s.name)).toEqual(["1857 Revolt", "Quit India Movement"]);
  });

  it("dedupes sub-topics differing only by spelling variant, keeping the longer label", () => {
    const topics: Topic[] = [
      {
        name: "Governance",
        subTopics: [
          { name: "Civil Society Organisation" },
          { name: "Civil Society Organization — role in policy" },
        ],
      },
    ];

    const result = dedupeSyllabusTopics(topics);

    expect(result[0].subTopics).toHaveLength(1);
    expect(result[0].subTopics[0].name).toBe("Civil Society Organization — role in policy");
  });

  it("preserves first-occurrence order for unrelated topics", () => {
    const topics: Topic[] = [
      { name: "Polity", subTopics: [{ name: "Constitution" }] },
      { name: "Economy", subTopics: [{ name: "Fiscal Policy" }] },
    ];

    const result = dedupeSyllabusTopics(topics);

    expect(result.map((t) => t.name)).toEqual(["Polity", "Economy"]);
  });
});

describe("computeSyllabusCoverage", () => {
  it("counts 'done' state against post-dedup indices, not raw indices", () => {
    // Raw order has two topics that will merge into one at deduped index 0,
    // and a third topic that becomes deduped index 1.
    const topics: Topic[] = [
      { name: "Modern India", subTopics: [{ name: "1857 Revolt" }] },
      { name: "Modern India — Freedom Struggle", subTopics: [{ name: "Quit India Movement" }] },
      { name: "Post-Independence", subTopics: [{ name: "Partition" }] },
    ];

    // State was saved by the frontend using deduped indices: subject "s1",
    // topic 0 ("Modern India" merged, 2 sub-topics), sub-topic 1 done, and
    // topic 1 ("Post-Independence"), sub-topic 0 done.
    const stateMap = {
      "s1__0__1": { status: "done" },
      "s1__1__0": { status: "done" },
    };

    const { totalTopics, coveredTopics } = computeSyllabusCoverage(topics, "s1", stateMap);

    // Deduped: 2 topics, 3 sub-topics total (2 + 1).
    expect(totalTopics).toBe(3);
    expect(coveredTopics).toBe(2);
  });

  it("would undercount if raw (undeduped) indices were used instead — regression guard", () => {
    const topics: Topic[] = [
      { name: "Modern India", subTopics: [{ name: "1857 Revolt" }] },
      { name: "Modern India — Freedom Struggle", subTopics: [{ name: "Quit India Movement" }] },
    ];

    // Saved against deduped index 0 (the merged topic), sub-topic 1.
    const stateMap = { "s1__0__1": { status: "done" } };

    const { coveredTopics } = computeSyllabusCoverage(topics, "s1", stateMap);

    // Raw iteration would look for "s1__1__0" (second raw topic, first
    // sub-topic) and miss this key entirely, giving coveredTopics = 0.
    expect(coveredTopics).toBe(1);
  });
});
