import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Embed a single text using Gemini Embedding 2 (MRL 1536 dims)
 * taskType: RETRIEVAL_DOCUMENT for storing chunks, RETRIEVAL_QUERY for search queries
 */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
    config: {
      taskType,
      outputDimensionality: 1536,
    },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini embedding returned empty values");
  }
  return values;
}
