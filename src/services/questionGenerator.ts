import { generateJSON } from "../config/azure";

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
    const result = await generateJSON<GeneratedQuestion[]>(prompt, system, 0.7);

    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Question generation error:", error);
    return [];
  }
}
