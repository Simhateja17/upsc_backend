import type { TopperStructuredPage, TopperAnswerBlock, TopperQuestionIndexItem } from "./topperPageStructurer";

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
type PaperGroup = "Essay" | "GS Paper 1" | "GS Paper 2" | "GS Paper 3" | "GS Paper 4" | string;

function averageConfidence(blocks: TopperAnswerBlock[], key: string): number {
  const vals = blocks
    .map((b) => Number(b.confidence?.[key]))
    .filter((n) => Number.isFinite(n));
  if (!vals.length) return 0;
  return vals.reduce((sum, n) => sum + n, 0) / vals.length;
}

function nonEmpty(text: string | null | undefined): string | null {
  const trimmed = (text || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function gradeQuality(
  answer: Omit<AssembledTopperAnswer, "qualityStatus" | "usableForRag">,
  blocks: TopperAnswerBlock[],
  paperGroup?: PaperGroup
) {
  const hasQuestion = Boolean(nonEmpty(answer.questionText));
  const hasAnswer = answer.studentAnswerText.trim().length >= 120;
  const hasMarks = Boolean(answer.maxMarks && answer.awardedMarks !== null);
  const segmentationConfidence = averageConfidence(blocks, "segmentation");
  const textConfidence = averageConfidence(blocks, "studentAnswerText");
  const highConfidence = segmentationConfidence >= 0.7 && textConfidence >= 0.7;
  const isEssay = paperGroup === "Essay";

  if (hasQuestion && hasAnswer && hasMarks && highConfidence) {
    return { qualityStatus: "gold" as const, usableForRag: true };
  }
  if (isEssay && hasQuestion && hasAnswer && textConfidence >= 0.55) {
    return { qualityStatus: "silver" as const, usableForRag: true };
  }
  if (!isEssay && hasQuestion && hasAnswer && hasMarks && textConfidence >= 0.55) {
    return { qualityStatus: "silver" as const, usableForRag: true };
  }
  return { qualityStatus: "bronze" as const, usableForRag: false };
}

function collectQuestionIndex(pages: PageInput[]): Map<number, TopperQuestionIndexItem> {
  const index = new Map<number, TopperQuestionIndexItem>();
  for (const page of pages) {
    for (const item of page.questionIndex || []) {
      if (item.questionNo && nonEmpty(item.questionText) && !index.has(item.questionNo)) {
        index.set(item.questionNo, {
          questionNo: item.questionNo,
          questionText: item.questionText.trim(),
          maxMarks: item.maxMarks ?? null,
          wordLimit: item.wordLimit ?? null,
        });
      }
    }

    // Backward compatibility for already-structured pages that placed printed
    // index questions inside answerBlocks on cover/index pages.
    if (page.pageType === "cover_index") {
      for (const block of page.answerBlocks || []) {
        const questionText = nonEmpty(block.printedQuestionText);
        if (block.questionNo && questionText && !index.has(block.questionNo)) {
          index.set(block.questionNo, {
            questionNo: block.questionNo,
            questionText,
            maxMarks: block.printedMaxMarks ?? null,
          });
        }
      }
    }
  }
  return index;
}

export function assembleTopperAnswers(
  pages: PageInput[],
  options: { paperGroup?: PaperGroup } = {}
): AssembledTopperAnswer[] {
  const answers: AssembledTopperAnswer[] = [];
  const questionIndex = collectQuestionIndex(pages);
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
    const indexedQuestion = firstQuestionBlock?.questionNo ? questionIndex.get(firstQuestionBlock.questionNo) : undefined;
    const questionText =
      nonEmpty(firstQuestionBlock?.printedQuestionText) || indexedQuestion?.questionText || null;
    const maxMarks =
      current.blocks.find((b) => b.printedMaxMarks)?.printedMaxMarks ??
      indexedQuestion?.maxMarks ??
      null;
    const awardedMarks =
      [...current.blocks].reverse().find((b) => b.awardedMarksCandidates?.length)?.awardedMarksCandidates?.[0] ?? null;
    const base = {
      questionNo: firstQuestionBlock?.questionNo ?? null,
      questionText,
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
    const quality = gradeQuality(base, current.blocks, options.paperGroup);
    answers.push({ ...base, ...quality });
    current = null;
  };

  for (const page of pages.sort((a, b) => a.pageNo - b.pageNo)) {
    if (page.pageType === "cover_index") continue;
    for (const block of page.answerBlocks || []) {
      if (!nonEmpty(block.studentAnswerText)) continue;
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
