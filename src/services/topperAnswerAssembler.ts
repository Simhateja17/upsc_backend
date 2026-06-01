import type { TopperStructuredPage, TopperAnswerBlock } from "./topperPageStructurer";

export interface AssembledTopperAnswer {
  questionNo: number | null;
  questionText: string | null;
  maxMarks: number | null;
  awardedMarks: number | null;
  studentAnswerText: string;
  evaluatorNotes: string[];
  pageStart: number;
  pageEnd: number;
  sourcePageIds: string[];
  qualityStatus: "gold" | "silver" | "bronze";
  usableForRag: boolean;
  confidence: Record<string, unknown>;
}

type PageInput = TopperStructuredPage & { pageId: string };

function averageConfidence(blocks: TopperAnswerBlock[], key: string): number {
  const vals = blocks
    .map((b) => Number(b.confidence?.[key]))
    .filter((n) => Number.isFinite(n));
  if (!vals.length) return 0;
  return vals.reduce((sum, n) => sum + n, 0) / vals.length;
}

function gradeQuality(answer: Omit<AssembledTopperAnswer, "qualityStatus" | "usableForRag">, blocks: TopperAnswerBlock[]) {
  const hasQuestion = Boolean(answer.questionNo || answer.questionText);
  const hasAnswer = answer.studentAnswerText.trim().length >= 120;
  const hasMarks = Boolean(answer.maxMarks && answer.awardedMarks !== null);
  const segmentationConfidence = averageConfidence(blocks, "segmentation");
  const textConfidence = averageConfidence(blocks, "studentAnswerText");
  const highConfidence = segmentationConfidence >= 0.7 && textConfidence >= 0.7;

  if (hasQuestion && hasAnswer && hasMarks && highConfidence) {
    return { qualityStatus: "gold" as const, usableForRag: true };
  }
  if (hasAnswer && (hasQuestion || hasMarks) && textConfidence >= 0.55) {
    return { qualityStatus: "silver" as const, usableForRag: true };
  }
  return { qualityStatus: "bronze" as const, usableForRag: false };
}

export function assembleTopperAnswers(pages: PageInput[]): AssembledTopperAnswer[] {
  const answers: AssembledTopperAnswer[] = [];
  let current:
    | {
        blocks: TopperAnswerBlock[];
        pageStart: number;
        pageEnd: number;
        sourcePageIds: string[];
      }
    | null = null;

  const finalize = () => {
    if (!current || current.blocks.length === 0) return;
    const firstQuestionBlock = current.blocks.find((b) => b.questionNo || b.printedQuestionText);
    const maxMarks = current.blocks.find((b) => b.printedMaxMarks)?.printedMaxMarks ?? null;
    const awardedMarks =
      [...current.blocks].reverse().find((b) => b.awardedMarksCandidates?.length)?.awardedMarksCandidates?.[0] ?? null;
    const base = {
      questionNo: firstQuestionBlock?.questionNo ?? null,
      questionText: firstQuestionBlock?.printedQuestionText ?? null,
      maxMarks,
      awardedMarks,
      studentAnswerText: current.blocks.map((b) => b.studentAnswerText).filter(Boolean).join("\n\n").trim(),
      evaluatorNotes: current.blocks.flatMap((b) => b.evaluatorNotes || []),
      pageStart: current.pageStart,
      pageEnd: current.pageEnd,
      sourcePageIds: current.sourcePageIds,
      confidence: {
        segmentation: averageConfidence(current.blocks, "segmentation"),
        studentAnswerText: averageConfidence(current.blocks, "studentAnswerText"),
        awardedMarks: averageConfidence(current.blocks, "awardedMarks"),
      },
    };
    const quality = gradeQuality(base, current.blocks);
    answers.push({ ...base, ...quality });
    current = null;
  };

  for (const page of pages.sort((a, b) => a.pageNo - b.pageNo)) {
    for (const block of page.answerBlocks || []) {
      const startsNew = block.startsAnswer || (!block.continuesPreviousAnswer && Boolean(block.questionNo));
      if (startsNew && current) finalize();
      if (!current) {
        current = { blocks: [], pageStart: page.pageNo, pageEnd: page.pageNo, sourcePageIds: [] };
      }
      current.blocks.push(block);
      current.pageEnd = page.pageNo;
      if (!current.sourcePageIds.includes(page.pageId)) current.sourcePageIds.push(page.pageId);
      if (block.endsAnswer) finalize();
    }
  }
  finalize();

  return answers.filter((answer) => answer.studentAnswerText.length > 0);
}
