import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature,
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text) as T;
}
