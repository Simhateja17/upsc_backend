import { generateJSON } from "../config/azure";

function coerceToArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    for (const v of Object.values(result as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

interface GeneratedQuestion {
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctOption: string;
  explanation: string;
  subject: string;
  category: string;
  difficulty: string;
}

/**
 * Generate UPSC MCQ questions using Bedrock/Claude
 */
export async function generateMCQQuestions(params: {
  subject: string;
  difficulty: string;
  count: number;
  examMode?: string;
}): Promise<GeneratedQuestion[]> {
  const { subject, difficulty, count, examMode = "prelims" } = params;

  const difficultyGuide =
    difficulty === "easy"
      ? "Foundation level — straightforward factual questions"
      : difficulty === "hard"
      ? "Advanced — requires deep conceptual understanding, multi-layered analysis"
      : "Standard UPSC exam difficulty — requires good conceptual clarity";

  const prompt = `Generate ${count} unique UPSC ${examMode === "prelims" ? "Prelims" : "Mains"} MCQ questions on "${subject}".

Difficulty: ${difficulty} (${difficultyGuide})

Requirements:
- Questions should be factually accurate and exam-relevant
- Each question should test a different concept/topic
- Options should be plausible (avoid obviously wrong answers)
- Include statement-based questions (e.g., "Which of the following statements is/are correct?")
- Include "match the following" style where appropriate
- Cover different topics within ${subject}

Return a JSON array of objects, each with:
{
  "questionText": "full question text",
  "options": [
    {"id": "A", "text": "option text"},
    {"id": "B", "text": "option text"},
    {"id": "C", "text": "option text"},
    {"id": "D", "text": "option text"}
  ],
  "correctOption": "A"/"B"/"C"/"D",
  "explanation": "brief explanation of the correct answer",
  "subject": "${subject}",
  "category": "${subject}",
  "difficulty": "${difficulty}"
}`;

  const system = `You are a UPSC exam question paper setter. Generate high-quality, factually accurate MCQ questions suitable for UPSC Civil Services Examination. Always return valid JSON arrays only.`;

  try {
    const result = await generateJSON<unknown>(prompt, system, 0.7);
    return coerceToArray<GeneratedQuestion>(result);
  } catch (error) {
    console.error("Question generation error:", error);
    return [];
  }
}

interface GeneratedMainsQuestion {
  questionText: string;
  subject: string;
  category: string;
  difficulty: string;
  topic?: string;
  marks?: number;
}

/**
 * Generate UPSC Mains open-ended questions.
 * No options, no correct answer — mains questions require written answers
 * that are evaluated by the AI evaluator after submission.
 */
export async function generateMainsQuestions(params: {
  subject: string;
  difficulty: string;
  count: number;
  paperType?: string;
  marksPerQuestion?: number;
}): Promise<GeneratedMainsQuestion[]> {
  const { subject, difficulty, count, paperType, marksPerQuestion = 15 } = params;

  const difficultyGuide =
    difficulty === "easy"
      ? "Foundation level — direct, single-dimension questions focused on core concepts"
      : difficulty === "hard"
      ? "Advanced — multi-dimensional, analytical, requires critical thinking, inter-linkages and case-based application"
      : "Standard UPSC Mains difficulty — balanced analysis, examples and contemporary relevance expected";

  const wordLimitHint =
    marksPerQuestion >= 15 ? "250 words" : marksPerQuestion >= 10 ? "150 words" : "100 words";

  const paperHint = paperType ? `Target paper: ${paperType}.` : "";

  const prompt = `Generate ${count} unique UPSC Civil Services Mains questions on "${subject}".

Difficulty: ${difficulty} (${difficultyGuide})
Marks per question: ${marksPerQuestion} (expected answer length ~${wordLimitHint})
${paperHint}

Requirements:
- Open-ended analytical questions in the style of actual UPSC Mains papers
- Use directive verbs like "Discuss", "Examine", "Critically analyse", "Evaluate", "Comment", "Elucidate"
- Each question must test a distinct theme or sub-topic within ${subject}
- Questions should demand structured answers with introduction, body, conclusion
- Avoid yes/no or purely factual recall questions
- Do NOT include any options, answer, or model answer — only the question text
- Keep each question self-contained (no "refer to the passage above" style)

Return a JSON array of objects, each with:
{
  "questionText": "full question text ending with directive and marks, e.g. 'Critically examine ... (${marksPerQuestion} marks)'",
  "subject": "${subject}",
  "category": "${subject}",
  "difficulty": "${difficulty}",
  "topic": "sub-topic within ${subject}",
  "marks": ${marksPerQuestion}
}`;

  const system = `You are a UPSC Mains exam question paper setter with decades of experience. Generate high-quality, analytical, open-ended questions in the style of actual UPSC Civil Services Mains papers. Never include answers, options, or hints. Always return valid JSON arrays only.`;

  try {
    console.log(
      `[MainsGen] subject="${subject}" difficulty="${difficulty}" count=${count} paper=${paperType || "—"}`
    );
    const result = await generateJSON<unknown>(prompt, system, 0.7);
    const arr = coerceToArray<GeneratedMainsQuestion>(result);
    console.log(`[MainsGen] AI returned ${arr.length} question(s)`);
    return arr;
  } catch (error) {
    console.error("Mains question generation error:", error);
    return [];
  }
}
