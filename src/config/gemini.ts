import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[Gemini] GEMINI_API_KEY is not set — Gemini features will be unavailable.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  if (!ai) {
    throw new Error("Gemini API is not configured. Set GEMINI_API_KEY to use this feature.");
  }
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
