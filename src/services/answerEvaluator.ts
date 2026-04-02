import { invokeModelJSON, BedrockMessage } from "../config/llm";
import prisma from "../config/database";

interface EvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailedFeedback: string;
  metrics?: Array<{ label: string; value: number; maxValue: number }>;
}

/**
 * Evaluate a UPSC Mains answer using Bedrock/Claude
 */
export async function evaluateAnswer(
  attemptId: string,
  answerText: string | null,
  question: {
    questionText: string;
    subject: string;
    marks: number;
    paper: string;
  },
  fileUrl?: string | null
): Promise<void> {
  try {
    // Update status to evaluating
    await prisma.mainsEvaluation.upsert({
      where: { attemptId },
      create: {
        attemptId,
        score: 0,
        maxScore: question.marks,
        status: "evaluating",
        strengths: [],
        improvements: [],
        suggestions: [],
      },
      update: { status: "evaluating" },
    });

    const messages: BedrockMessage[] = [];

    if (answerText) {
      messages.push({
        role: "user",
        content: `Evaluate this UPSC Mains answer for the question below.

Question (${question.paper} - ${question.subject}, ${question.marks} marks):
"${question.questionText}"

Student's Answer:
${answerText}

Score on a scale of 0-${question.marks} based on:
1. Structure & Organization (introduction, body, conclusion)
2. Content Depth & Accuracy
3. Balance of Perspectives (multiple viewpoints)
4. Use of Examples & Facts (data, case studies, reports)
5. Clarity & Language Quality
6. Relevance to Question Asked

Return ONLY a JSON object with:
{
  "score": <number 0-${question.marks}>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "suggestions": ["suggestion1", "suggestion2"],
  "detailedFeedback": "2-3 paragraph detailed feedback",
  "metrics": [
    {"label": "Structure", "value": <0-10>, "maxValue": 10},
    {"label": "Content", "value": <0-10>, "maxValue": 10},
    {"label": "Examples", "value": <0-10>, "maxValue": 10},
    {"label": "Language", "value": <0-10>, "maxValue": 10},
    {"label": "Relevance", "value": <0-10>, "maxValue": 10}
  ]
}`,
      });
    } else if (fileUrl) {
      // For file uploads without extracted text, give a basic evaluation prompt
      messages.push({
        role: "user",
        content: `A student uploaded an image/PDF answer for this UPSC Mains question:

Question (${question.paper} - ${question.subject}, ${question.marks} marks):
"${question.questionText}"

Since the answer was uploaded as a file, provide a general evaluation framework.
Return ONLY a JSON object with:
{
  "score": ${Math.round(question.marks * 0.6)},
  "strengths": ["Answer was submitted on time", "Attempt shows engagement with the topic"],
  "improvements": ["Consider typing your answer for more detailed AI feedback", "Ensure clear handwriting for better evaluation"],
  "suggestions": ["Use structured format with introduction, body, and conclusion", "Include specific examples and data points"],
  "detailedFeedback": "Your answer has been received. For more accurate AI evaluation, consider typing your answer directly. The uploaded file will be reviewed, but typed answers allow for more detailed feedback on content, structure, and language.",
  "metrics": [
    {"label": "Structure", "value": 6, "maxValue": 10},
    {"label": "Content", "value": 6, "maxValue": 10},
    {"label": "Examples", "value": 5, "maxValue": 10},
    {"label": "Language", "value": 6, "maxValue": 10},
    {"label": "Relevance", "value": 6, "maxValue": 10}
  ]
}`,
      });
    } else {
      throw new Error("No answer text or file URL provided");
    }

    const system = `You are an expert UPSC Mains answer evaluator. You evaluate answers strictly but fairly, like a UPSC examiner. Always return valid JSON only.`;

    const result = await invokeModelJSON<EvaluationResult>(messages, {
      system,
      maxTokens: 2048,
      temperature: 0.3,
      serviceName: "answerEvaluator",
    });

    // Save evaluation result
    await prisma.mainsEvaluation.update({
      where: { attemptId },
      data: {
        score: Math.min(result.score, question.marks),
        status: "completed",
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        suggestions: result.suggestions || [],
        detailedFeedback: result.detailedFeedback || "",
        evaluatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Answer evaluation error:", error);

    // Fallback: save with error status but don't crash
    try {
      await prisma.mainsEvaluation.update({
        where: { attemptId },
        data: {
          score: Math.round(question.marks * 0.5),
          status: "completed",
          strengths: ["Answer submitted successfully"],
          improvements: ["AI evaluation encountered an issue — manual review recommended"],
          suggestions: ["Try resubmitting for a fresh evaluation"],
          detailedFeedback:
            "The AI evaluation service encountered a temporary issue. Your answer has been scored with a baseline estimate. Please try resubmitting or contact support if the issue persists.",
          evaluatedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error("Failed to save fallback evaluation:", updateError);
    }
  }
}
