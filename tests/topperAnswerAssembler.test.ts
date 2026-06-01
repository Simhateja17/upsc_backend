import { describe, expect, it } from "vitest";
import { assembleTopperAnswers } from "../src/services/topperAnswerAssembler";

describe("assembleTopperAnswers", () => {
  it("merges a single answer across two pages and keeps awarded marks", () => {
    const textA = "Introduction. V2X communication improves road safety, traffic flow, and emergency response. ".repeat(3);
    const textB = "It also enables connected mobility, but needs privacy safeguards, standards, spectrum, and infrastructure. ".repeat(3);

    const answers = assembleTopperAnswers([
      {
        pageId: "page-3",
        pageNo: 3,
        pageType: "answer_page",
        pageConfidence: {},
        answerBlocks: [
          {
            questionNo: 1,
            printedQuestionText: "Discuss the significance of V2X communication.",
            printedMaxMarks: 15,
            studentAnswerText: textA,
            evaluatorNotes: ["Relevant intro"],
            awardedMarksCandidates: [],
            startsAnswer: true,
            continuesPreviousAnswer: false,
            endsAnswer: false,
            confidence: { segmentation: 0.86, studentAnswerText: 0.9, awardedMarks: 0.5 },
          },
        ],
      },
      {
        pageId: "page-4",
        pageNo: 4,
        pageType: "answer_page",
        pageConfidence: {},
        answerBlocks: [
          {
            questionNo: 1,
            printedQuestionText: null,
            printedMaxMarks: null,
            studentAnswerText: textB,
            evaluatorNotes: ["Missing regulatory challenges"],
            awardedMarksCandidates: [4],
            startsAnswer: false,
            continuesPreviousAnswer: true,
            endsAnswer: true,
            confidence: { segmentation: 0.82, studentAnswerText: 0.88, awardedMarks: 0.8 },
          },
        ],
      },
    ]);

    expect(answers).toHaveLength(1);
    expect(answers[0].pageStart).toBe(3);
    expect(answers[0].pageEnd).toBe(4);
    expect(answers[0].awardedMarks).toBe(4);
    expect(answers[0].qualityStatus).toBe("gold");
    expect(answers[0].usableForRag).toBe(true);
    expect(answers[0].sourcePageIds).toEqual(["page-3", "page-4"]);
  });

  it("marks uncertain segmentation as bronze and excludes it from RAG", () => {
    const answers = assembleTopperAnswers([
      {
        pageId: "page-1",
        pageNo: 1,
        pageType: "answer_page",
        pageConfidence: {},
        answerBlocks: [
          {
            questionNo: null,
            printedQuestionText: null,
            printedMaxMarks: null,
            studentAnswerText: "Too little clear text.",
            evaluatorNotes: [],
            awardedMarksCandidates: [],
            startsAnswer: false,
            continuesPreviousAnswer: false,
            endsAnswer: true,
            confidence: { segmentation: 0.25, studentAnswerText: 0.4, awardedMarks: 0 },
          },
        ],
      },
    ]);

    expect(answers[0].qualityStatus).toBe("bronze");
    expect(answers[0].usableForRag).toBe(false);
  });
});
