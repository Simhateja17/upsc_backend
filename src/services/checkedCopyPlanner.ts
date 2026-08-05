export interface CheckedCopyAnnotationPlan {
  comments: Array<{ anchor: string; text: string; style: "tick" | "underline" | "bracket" | "margin_comment" }>;
  bottomComment: string;
  scoreText: string;
}

export interface EvaluatorCheckedCopyAnnotation {
  type:
    | "positive_tick"
    | "underline"
    | "circle"
    | "bracket"
    | "margin_comment"
    | "missing_demand"
    | "overall_comment"
    | "score";
  targetText?: string;
  comment: string;
  placement: "left_margin" | "right_margin" | "bottom" | "near_target" | "top";
  severity?: "minor" | "major";
  intent?: string;
  pageNumber?: number;
}

export interface CheckedCopyV2VisualMark {
  type: "positive_tick" | "underline" | "circle" | "bracket" | "cross" | "arrow";
  targetText?: string;
  intent?: string;
}

export interface CheckedCopyV2MarginComment {
  targetText?: string;
  severity?: "minor" | "major";
  comment: string;
  placementIntent?: "left_margin" | "right_margin" | "near_target";
}

export interface CheckedCopyV2PagePlan {
  pageNumber?: number;
  visualMarks?: CheckedCopyV2VisualMark[];
  marginComments?: CheckedCopyV2MarginComment[];
  bottomComment?: string;
}

export interface CheckedCopyV2Plan {
  version: 2;
  scoreText?: string;
  pagePlans: CheckedCopyV2PagePlan[];
}

export type EvaluatorCheckedCopyPlan = EvaluatorCheckedCopyAnnotation[] | CheckedCopyV2Plan;

export function planCheckedCopyAnnotations(params: {
  score: number;
  maxScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallFeedback: string;
}): CheckedCopyAnnotationPlan {
  const comments = [
    ...params.strengths.slice(0, 2).map((text) => ({ anchor: "relevant point", text, style: "tick" as const })),
    ...params.weaknesses.slice(0, 3).map((text) => ({ anchor: "missing/weak area", text, style: "margin_comment" as const })),
    ...params.suggestions.slice(0, 2).map((text) => ({ anchor: "value addition", text, style: "underline" as const })),
  ];

  return {
    comments,
    bottomComment: params.overallFeedback.slice(0, 260),
    scoreText: `${params.score}/${params.maxScore}`,
  };
}
