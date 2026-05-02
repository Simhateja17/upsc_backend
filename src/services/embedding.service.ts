import { AzureOpenAI } from "openai";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
const apiVersion = process.env.AZURE_OPENAI_EMBEDDING_API_VERSION || "2023-05-15";

// text-embedding-ada-002 produces 1536 dimensions — matches existing Supabase vector columns
const embeddingDeployment =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-ada-002";

const embeddingClient = new AzureOpenAI({ endpoint, apiKey, apiVersion });

function l2normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

/**
 * Embed a single text using Azure OpenAI embeddings (1536 dims).
 * taskType is kept for API compatibility but is not used by Azure.
 */
export async function embedText(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const result = await embeddingClient.embeddings.create({
    model: embeddingDeployment,
    input: text,
  });

  const values = result.data[0]?.embedding;
  if (!values || values.length === 0) {
    throw new Error("Azure embedding returned empty values");
  }
  return l2normalize(values);
}
