import { AzureOpenAI } from "openai";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01";

export const chatDeployment =
  process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o";

if (!endpoint || !apiKey) {
  console.warn(
    "[Azure] AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY is not set — Azure AI features will be unavailable."
  );
}

export const azureClient =
  endpoint && apiKey
    ? new AzureOpenAI({ endpoint, apiKey, apiVersion })
    : null;

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  if (!azureClient) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY."
    );
  }

  const response = await azureClient.chat.completions.create({
    model: chatDeployment,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature,
  });

  const text = response.choices[0]?.message?.content ?? "";

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
